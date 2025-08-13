const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar middlewares
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const condominiumRoutes = require('./routes/condominiumRoutes');
const unitRoutes = require('./routes/unitRoutes');
const userRoutes = require('./routes/userRoutes');
const communicationRoutes = require('./routes/communicationRoutes');
const financialRoutes = require('./routes/financialRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const commonAreaRoutes = require('./routes/commonAreaRoutes');
const commonAreaBookingRoutes = require('./routes/commonAreaBookingRoutes');
const autoBillingRoutes = require('./routes/autoBillingRoutes');

// Importar scheduler
const Scheduler = require('./utils/scheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Mais permissivo em dev
  message: {
    success: false,
    message: 'Muitas requisições, tente novamente em 15 minutos'
  }
});

// Rate limiting específico para login
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduzido de 15)
  max: 10, // Limite de 10 tentativas de login por IP por 5 minutos (aumentado de 5)
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Muitas tentativas de login, tente novamente em 5 minutos'
  }
});

// Middlewares de segurança
app.use(helmet());
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
app.use(limiter);
app.use('/api/auth/login', authLimiter);

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Access logging middleware
const { accessLogMiddleware } = require('./middleware/auditMiddleware');
app.use(accessLogMiddleware);

// Disable ETags for API routes to prevent 304 caching issues
// Test hot reload - Ubuntu setup complete!
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  app.set('etag', false);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CondominioGT API v1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      condominiums: '/api/condominiums',
      users: '/api/users',
      financial: '/api/financial',
      maintenance: '/api/maintenance',
      communications: '/api/communications',
      commonAreas: '/api/common-areas',
      bookings: '/api/bookings'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CondominioGT Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/condominiums', condominiumRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/common-areas', commonAreaRoutes);
app.use('/api/bookings', commonAreaBookingRoutes);
app.use('/api/auto-billing', autoBillingRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'CondominioGT API v1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      login: '/api/auth/login',
      register: '/api/auth/register',
      profile: '/api/auth/profile',
      condominiums: '/api/condominiums',
      units: '/api/units',
      users: '/api/users',
      communications: '/api/communications',
      financial: '/api/financial',
      maintenance: '/api/maintenance'
    }
  });
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandler);

// Socket.io configuration
require('./sockets/notificationSocket')(io);

// Configurar notification service
const notificationService = require('./services/notificationService');
notificationService.setSocketIO(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CondominioGT Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`🔔 WebSocket notifications enabled`);
  
  // Inicializar scheduler para cobrança automática
  if (process.env.NODE_ENV !== 'test') {
    Scheduler.init();
    console.log(`⏰ Auto-billing scheduler initialized`);
  }
});

module.exports = { app, server, io };