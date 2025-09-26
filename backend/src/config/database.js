require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'condominiogt123',
    database: process.env.DB_NAME || 'condominiogt',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  },
  test: {
    username: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || null,
    database: process.env.TEST_DB_NAME || 'condominiogt_test',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 0,
    dialect: process.env.TEST_DB_DIALECT || 'sqlite',
    storage: process.env.TEST_DB_STORAGE || ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      ssl: {
        require: false,
        rejectUnauthorized: false,
      },
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
  },
};