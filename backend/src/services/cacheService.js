const redis = require('redis');
const winston = require('winston');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connect();
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            winston.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            winston.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            winston.error('Redis max attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        winston.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        winston.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        winston.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      winston.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      winston.info('Redis client disconnected');
    }
  }

  // Método genérico para cache com TTL
  async get(key) {
    if (!this.isConnected) {
      winston.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const result = await this.client.get(key);
      if (result) {
        winston.debug(`Cache HIT for key: ${key}`);
        return JSON.parse(result);
      }
      winston.debug(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      winston.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.isConnected) {
      winston.warn('Redis not connected, skipping cache set');
      return false;
    }

    try {
      const result = await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      winston.debug(`Cache SET for key: ${key}, TTL: ${ttlSeconds}s`);
      return result === 'OK';
    } catch (error) {
      winston.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      winston.warn('Redis not connected, skipping cache delete');
      return false;
    }

    try {
      const result = await this.client.del(key);
      winston.debug(`Cache DELETE for key: ${key}`);
      return result > 0;
    } catch (error) {
      winston.error('Cache delete error:', error);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.isConnected) {
      winston.warn('Redis not connected, skipping cache delete pattern');
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        const result = await this.client.del(keys);
        winston.debug(`Cache DELETE PATTERN: ${pattern}, deleted ${result} keys`);
        return result;
      }
      return 0;
    } catch (error) {
      winston.error('Cache delete pattern error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      winston.error('Cache exists error:', error);
      return false;
    }
  }

  async getTTL(key) {
    if (!this.isConnected) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      winston.error('Cache TTL error:', error);
      return -1;
    }
  }

  // Cache inteligente para estatísticas de condomínios
  async getCachedCondominiumStats(condominiumId) {
    const key = `condominium:stats:${condominiumId}`;
    return await this.get(key);
  }

  async setCachedCondominiumStats(condominiumId, stats, ttl = 600) {
    const key = `condominium:stats:${condominiumId}`;
    return await this.set(key, stats, ttl);
  }

  // Cache para relatórios financeiros
  async getCachedFinancialReport(condominiumId, filters) {
    const filterHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex');
    const key = `financial:report:${condominiumId}:${filterHash}`;
    return await this.get(key);
  }

  async setCachedFinancialReport(condominiumId, filters, report, ttl = 300) {
    const filterHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex');
    const key = `financial:report:${condominiumId}:${filterHash}`;
    return await this.set(key, report, ttl);
  }

  // Cache para saldo financeiro
  async getCachedFinancialBalance(condominiumId) {
    const key = `financial:balance:${condominiumId}`;
    return await this.get(key);
  }

  async setCachedFinancialBalance(condominiumId, balance, ttl = 60) {
    const key = `financial:balance:${condominiumId}`;
    return await this.set(key, balance, ttl);
  }

  // Cache para estatísticas de manutenção
  async getCachedMaintenanceStats(condominiumId, filters) {
    const filterHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex');
    const key = `maintenance:stats:${condominiumId}:${filterHash}`;
    return await this.get(key);
  }

  async setCachedMaintenanceStats(condominiumId, filters, stats, ttl = 300) {
    const filterHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex');
    const key = `maintenance:stats:${condominiumId}:${filterHash}`;
    return await this.set(key, stats, ttl);
  }

  // Cache para listas paginadas
  async getCachedList(type, condominiumId, page, limit, filters) {
    const filterHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify({ page, limit, ...filters }))
      .digest('hex');
    const key = `list:${type}:${condominiumId}:${filterHash}`;
    return await this.get(key);
  }

  async setCachedList(type, condominiumId, page, limit, filters, data, ttl = 180) {
    const filterHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify({ page, limit, ...filters }))
      .digest('hex');
    const key = `list:${type}:${condominiumId}:${filterHash}`;
    return await this.set(key, data, ttl);
  }

  // Invalidação inteligente de cache
  async invalidateCondominiumCache(condominiumId) {
    const patterns = [
      `condominium:stats:${condominiumId}`,
      `financial:*:${condominiumId}:*`,
      `maintenance:*:${condominiumId}:*`,
      `booking:*:${condominiumId}:*`,
      `communication:*:${condominiumId}:*`,
      `list:*:${condominiumId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.delPattern(pattern);
      totalDeleted += deleted;
    }

    winston.info(`Invalidated ${totalDeleted} cache keys for condominium ${condominiumId}`);
    return totalDeleted;
  }

  async invalidateFinancialCache(condominiumId) {
    const patterns = [
      `financial:*:${condominiumId}:*`,
      `condominium:stats:${condominiumId}`,
      `list:transactions:${condominiumId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.delPattern(pattern);
      totalDeleted += deleted;
    }

    winston.info(`Invalidated ${totalDeleted} financial cache keys for condominium ${condominiumId}`);
    return totalDeleted;
  }

  async invalidateMaintenanceCache(condominiumId) {
    const patterns = [
      `maintenance:*:${condominiumId}:*`,
      `list:maintenance:${condominiumId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.delPattern(pattern);
      totalDeleted += deleted;
    }

    winston.info(`Invalidated ${totalDeleted} maintenance cache keys for condominium ${condominiumId}`);
    return totalDeleted;
  }

  // Método para obter estatísticas do cache
  async getCacheStats() {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbSize();
      
      return {
        connected: true,
        totalKeys: dbSize,
        memoryInfo: this.parseRedisInfo(info)
      };
    } catch (error) {
      winston.error('Error getting cache stats:', error);
      return { connected: false, error: error.message };
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const parsed = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = value;
      }
    });
    
    return {
      usedMemory: parsed.used_memory_human,
      usedMemoryPeak: parsed.used_memory_peak_human,
      totalSystemMemory: parsed.total_system_memory_human
    };
  }

  // Middleware para cache automático
  createCacheMiddleware(keyGenerator, ttl = 300) {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = keyGenerator(req);
      const cachedData = await this.get(cacheKey);

      if (cachedData) {
        res.header('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      res.header('X-Cache', 'MISS');
      
      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200) {
          this.set(cacheKey, data, ttl).catch(err => 
            winston.error('Cache middleware set error:', err)
          );
        }
        return originalJson(data);
      };

      next();
    };
  }
}

// Singleton instance
const cacheService = new CacheService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cacheService.disconnect();
});

process.on('SIGINT', async () => {
  await cacheService.disconnect();
});

module.exports = cacheService;