const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const { User, Condominium, FinancialTransaction, UserCondominium } = require('../../src/models');

// Create test app (simulate main app)
const app = express();
app.use(express.json());

// Add all routes
app.use('/api/auth', require('../../src/routes/authRoutes'));
app.use('/api/condominiums', require('../../src/routes/condominiumRoutes'));
app.use('/api/financial', require('../../src/routes/financialRoutes'));
app.use('/api/users', require('../../src/routes/userRoutes'));

describe('API Integration Tests', () => {
  let adminUser;
  let managerUser;
  let testCondominium;
  let adminToken;
  let managerToken;

  beforeAll(async () => {
    // Create test condominium
    testCondominium = await Condominium.create({
      name: 'Integration Test Condominium',
      address: 'Integration Test Address 123',
      city: 'Integration City',
      state: 'IC',
      zip_code: '12345678',
      total_units: 25,
      status: 'active'
    });

    // Create admin user
    const hashedPasswordAdmin = await bcrypt.hash('adminpass123', 10);
    adminUser = await User.create({
      name: 'Integration Admin',
      email: 'admin@integration.com',
      password: hashedPasswordAdmin,
      phone: '11111111111',
      role: 'admin',
      status: 'active'
    });

    // Create manager user
    const hashedPasswordManager = await bcrypt.hash('managerpass123', 10);
    managerUser = await User.create({
      name: 'Integration Manager',
      email: 'manager@integration.com',
      password: hashedPasswordManager,
      phone: '11222222222',
      role: 'manager',
      status: 'active'
    });

    // Associate manager with condominium
    await UserCondominium.create({
      user_id: managerUser.id,
      condominium_id: testCondominium.id,
      role: 'manager',
      status: 'active'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await FinancialTransaction.destroy({ where: { condominium_id: testCondominium.id } });
    await UserCondominium.destroy({ where: { user_id: managerUser.id } });
    await User.destroy({ where: { id: adminUser.id } });
    await User.destroy({ where: { id: managerUser.id } });
    await Condominium.destroy({ where: { id: testCondominium.id } });
  });

  describe('Complete Authentication Flow', () => {
    test('should complete full authentication workflow', async () => {
      // 1. Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@integration.com',
          password: 'adminpass123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('token');
      
      adminToken = loginResponse.body.data.token;

      // 2. Get profile with token
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.user.role).toBe('admin');

      // 3. Change password
      const changePasswordResponse = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'adminpass123',
          newPassword: 'newadminpass123'
        });

      expect(changePasswordResponse.status).toBe(200);

      // 4. Login with new password
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@integration.com',
          password: 'newadminpass123'
        });

      expect(newLoginResponse.status).toBe(200);

      // Reset password for other tests
      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'newadminpass123',
          newPassword: 'adminpass123'
        });
    });

    test('should login manager and validate permissions', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@integration.com',
          password: 'managerpass123'
        });

      expect(loginResponse.status).toBe(200);
      managerToken = loginResponse.body.data.token;

      // Verify manager can access their condominium
      const condominiumResponse = await request(app)
        .get(`/api/condominiums/${testCondominium.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(condominiumResponse.status).toBe(200);
    });
  });

  describe('Cross-Module Integration', () => {
    test('should create condominium and add financial transaction', async () => {
      // 1. Create new condominium as admin
      const condominiumData = {
        name: 'Financial Integration Condominium',
        address: 'Financial Integration Address',
        city: 'Financial City',
        state: 'FC',
        zip_code: '87654321',
        total_units: 20
      };

      const createCondominiumResponse = await request(app)
        .post('/api/condominiums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(condominiumData);

      expect(createCondominiumResponse.status).toBe(201);
      const newCondominiumId = createCondominiumResponse.body.data.condominium.id;

      // 2. Add financial transaction to the condominium
      const transactionData = {
        condominium_id: newCondominiumId,
        title: 'Integration Test Transaction',
        description: 'Test transaction for integration',
        type: 'income',
        category: 'condominium_fee',
        amount: 1000.00,
        due_date: new Date().toISOString(),
        payment_method: 'pix'
      };

      const createTransactionResponse = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(transactionData);

      expect(createTransactionResponse.status).toBe(201);
      expect(createTransactionResponse.body.data.transaction.condominium_id).toBe(newCondominiumId);

      // 3. Get condominium balance
      const balanceResponse = await request(app)
        .get(`/api/financial/balance/${newCondominiumId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.data).toHaveProperty('balance');

      // 4. Get condominium statistics
      const statsResponse = await request(app)
        .get(`/api/condominiums/${newCondominiumId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.data.stats.total_units).toBe(20);

      // Clean up
      await FinancialTransaction.destroy({ where: { condominium_id: newCondominiumId } });
      await Condominium.destroy({ where: { id: newCondominiumId } });
    });

    test('should create user and associate with condominium', async () => {
      // 1. Create new user as admin
      const userData = {
        name: 'Integration Test User',
        email: 'integration.user@test.com',
        password: 'userpass123',
        phone: '11333333333',
        role: 'resident'
      };

      const createUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(createUserResponse.status).toBe(201);
      const newUserId = createUserResponse.body.data.user.id;

      // 2. Associate user with condominium
      const associationData = {
        condominium_id: testCondominium.id,
        role: 'resident'
      };

      const associateResponse = await request(app)
        .post(`/api/users/${newUserId}/condominiums`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(associationData);

      expect(associateResponse.status).toBe(201);

      // 3. Get users by condominium
      const usersResponse = await request(app)
        .get(`/api/users/condominium/${testCondominium.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(usersResponse.status).toBe(200);
      
      // Should find at least our new user
      const foundUser = usersResponse.body.data.users.find(user => user.id === newUserId);
      expect(foundUser).toBeDefined();

      // Clean up
      await UserCondominium.destroy({ where: { user_id: newUserId } });
      await User.destroy({ where: { id: newUserId } });
    });
  });

  describe('Permission and Access Control Integration', () => {
    test('should enforce role-based access control across modules', async () => {
      // Manager should be able to create financial transactions for their condominium
      const transactionData = {
        condominium_id: testCondominium.id,
        title: 'Manager Transaction',
        description: 'Transaction created by manager',
        type: 'expense',
        category: 'utilities',
        amount: 500.00,
        due_date: new Date().toISOString(),
        payment_method: 'cash'
      };

      const managerTransactionResponse = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(transactionData);

      expect(managerTransactionResponse.status).toBe(201);

      // Manager should be able to update their condominium
      const updateData = {
        name: 'Updated Integration Test Condominium'
      };

      const updateResponse = await request(app)
        .put(`/api/condominiums/${testCondominium.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(updateResponse.status).toBe(200);

      // Manager should NOT be able to create admin users
      const adminUserData = {
        name: 'Unauthorized Admin',
        email: 'unauthorized.admin@test.com',
        password: 'adminpass123',
        phone: '11444444444',
        role: 'admin'
      };

      const createAdminResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(adminUserData);

      expect(createAdminResponse.status).toBe(403);

      // Clean up
      await FinancialTransaction.destroy({ 
        where: { 
          condominium_id: testCondominium.id,
          title: 'Manager Transaction'
        } 
      });
    });
  });

  describe('Error Handling and Validation Integration', () => {
    test('should handle validation errors consistently across endpoints', async () => {
      // Test invalid condominium creation
      const invalidCondominiumResponse = await request(app)
        .post('/api/condominiums')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '' // empty name should fail validation
        });

      expect(invalidCondominiumResponse.status).toBe(400);
      expect(invalidCondominiumResponse.body.success).toBe(false);
      expect(invalidCondominiumResponse.body.errors).toBeDefined();

      // Test invalid financial transaction creation
      const invalidTransactionResponse = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Invalid Transaction',
          amount: -100 // negative amount should fail validation
        });

      expect(invalidTransactionResponse.status).toBe(400);
      expect(invalidTransactionResponse.body.success).toBe(false);
      expect(invalidTransactionResponse.body.errors).toBeDefined();

      // Test invalid user registration
      const invalidUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'invalid-email-format',
          password: '123' // too short
        });

      expect(invalidUserResponse.status).toBe(400);
      expect(invalidUserResponse.body.success).toBe(false);
      expect(invalidUserResponse.body.errors).toBeDefined();
    });

    test('should handle not found errors consistently', async () => {
      // Test non-existent condominium
      const nonExistentCondominiumResponse = await request(app)
        .get('/api/condominiums/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(nonExistentCondominiumResponse.status).toBe(404);
      expect(nonExistentCondominiumResponse.body.success).toBe(false);

      // Test non-existent financial transaction
      const nonExistentTransactionResponse = await request(app)
        .get('/api/financial/transactions/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(nonExistentTransactionResponse.status).toBe(404);
      expect(nonExistentTransactionResponse.body.success).toBe(false);

      // Test non-existent user
      const nonExistentUserResponse = await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(nonExistentUserResponse.status).toBe(404);
      expect(nonExistentUserResponse.body.success).toBe(false);
    });
  });

  describe('Performance and Caching Integration', () => {
    test('should implement caching for frequently accessed data', async () => {
      // First request should miss cache
      const firstStatsResponse = await request(app)
        .get(`/api/condominiums/${testCondominium.id}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(firstStatsResponse.status).toBe(200);
      expect(firstStatsResponse.headers['x-cache']).toBe('MISS');

      // Second request should hit cache
      const secondStatsResponse = await request(app)
        .get(`/api/condominiums/${testCondominium.id}/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(secondStatsResponse.status).toBe(200);
      expect(secondStatsResponse.headers['x-cache']).toBe('HIT');
    });
  });
});