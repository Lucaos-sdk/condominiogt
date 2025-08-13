const { sequelize } = require('../src/models');
require('dotenv').config({ path: '.env.test' });

// Setup test database
beforeAll(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Test database connection established');
  } catch (error) {
    console.error('❌ Unable to connect to test database:', error);
  }
});

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