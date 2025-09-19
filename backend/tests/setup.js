// Load test environment variables first
require('dotenv').config({ path: '.env.test' });

// Set NODE_ENV to test before importing models
process.env.NODE_ENV = 'test';

const { sequelize } = require('../src/models');

// Setup test database
beforeAll(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Test database connection established');
  } catch (error) {
    console.error('❌ Unable to connect to test database:', error);
    throw error;
  }
}, 60000);

// Clean up after all tests
afterAll(async () => {
  try {
    await sequelize.close();
    console.log('✅ Test database connection closed');
  } catch (error) {
    console.error('❌ Error closing test database:', error);
  }
});

// Global test timeout
jest.setTimeout(30000);