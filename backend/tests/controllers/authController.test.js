const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Condominium, UserCondominium } = require('../../src/models');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', require('../../src/routes/authRoutes'));

describe('Auth Controller Tests', () => {
  let testUser;
  let testCondominium;
  let validToken;

  beforeAll(async () => {
    // Create test condominium
    testCondominium = await Condominium.create({
      name: 'Test Condominium',
      address: 'Test Address 123',
      city: 'Test City',
      state: 'TS',
      zip_code: '12345678',
      total_units: 50,
      status: 'active'
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    testUser = await User.create({
      name: 'Test User',
      email: 'test@test.com',
      password: hashedPassword,
      phone: '11999999999',
      role: 'admin',
      status: 'active'
    });

    // Generate valid token for authenticated tests
    validToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await UserCondominium.destroy({ where: { user_id: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
    await Condominium.destroy({ where: { id: testCondominium.id } });
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login realizado com sucesso');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('test@test.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should fail login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Credenciais inválidas');
    });

    test('should fail login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Credenciais inválidas');
    });

    test('should fail login with inactive user', async () => {
      // Create inactive user
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      const inactiveUser = await User.create({
        name: 'Inactive User',
        email: 'inactive@test.com',
        password: hashedPassword,
        phone: '11888888888',
        role: 'resident',
        status: 'inactive'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Usuário inativo');

      // Clean up
      await User.destroy({ where: { id: inactiveUser.id } });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com'
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/auth/profile', () => {
    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Perfil obtido com sucesso');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe('test@test.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should fail to get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token não fornecido');
    });

    test('should fail to get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token inválido');
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register new user successfully', async () => {
      const newUserData = {
        name: 'New Test User',
        email: 'newuser@test.com',
        password: 'newpass123',
        phone: '11777777777',
        role: 'resident'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUserData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Usuário criado com sucesso');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('newuser@test.com');
      expect(response.body.data.user).not.toHaveProperty('password');

      // Clean up
      await User.destroy({ where: { email: 'newuser@test.com' } });
    });

    test('should fail to register with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'test@test.com', // existing email
          password: 'anotherpass123',
          phone: '11666666666',
          role: 'resident'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email já está em uso');
    });

    test('should validate required fields for registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Incomplete User',
          email: 'incomplete@test.com'
          // missing password, phone, role
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'invalid-email',
          password: 'validpass123',
          phone: '11555555555',
          role: 'resident'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak Password User',
          email: 'weak@test.com',
          password: '123', // too short
          phone: '11444444444',
          role: 'resident'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/auth/change-password', () => {
    test('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'testpass123',
          newPassword: 'newtestpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Senha alterada com sucesso');

      // Reset password back to original for other tests
      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'newtestpass123',
          newPassword: 'testpass123'
        });
    });

    test('should fail to change password with wrong current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'wrongcurrentpass',
          newPassword: 'newtestpass123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Senha atual incorreta');
    });

    test('should require authentication for password change', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .send({
          currentPassword: 'testpass123',
          newPassword: 'newtestpass123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token não fornecido');
    });
  });
});