const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Condominium, Unit, UserCondominium } = require('../../src/models');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/condominiums', require('../../src/routes/condominiumRoutes'));

describe('Condominium Controller Tests', () => {
  let testUser;
  let testCondominium;
  let validToken;

  beforeAll(async () => {
    // Create test user (admin)
    const hashedPassword = await bcrypt.hash('condominiumpass123', 10);
    testUser = await User.create({
      name: 'Condominium Test Admin',
      email: 'condominium@test.com',
      password: hashedPassword,
      phone: '11777777777',
      role: 'admin',
      status: 'active'
    });

    // Generate valid token
    validToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Create test condominium
    testCondominium = await Condominium.create({
      name: 'Test Condominium Controller',
      cnpj: '12.345.678/0001-90',
      address: 'Controller Test Address 456',
      city: 'Controller City',
      state: 'CC',
      zip_code: '12345678',
      phone: '11987654321',
      email: 'controller@testcondominium.com',
      total_units: 50,
      total_blocks: 2,
      status: 'active'
    });

    // Create test units
    await Unit.bulkCreate([
      {
        condominium_id: testCondominium.id,
        number: '101',
        block: 'A',
        type: 'apartment',
        status: 'available'
      },
      {
        condominium_id: testCondominium.id,
        number: '102',
        block: 'A',
        type: 'apartment',
        status: 'occupied'
      }
    ]);

    // Associate user with condominium
    await UserCondominium.create({
      user_id: testUser.id,
      condominium_id: testCondominium.id,
      role: 'admin',
      status: 'active'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await Unit.destroy({ where: { condominium_id: testCondominium.id } });
    await UserCondominium.destroy({ where: { user_id: testUser.id } });
    await Condominium.destroy({ where: { id: testCondominium.id } });
    await User.destroy({ where: { id: testUser.id } });
  });

  describe('GET /api/condominiums', () => {
    test('should get condominiums list successfully', async () => {
      const response = await request(app)
        .get('/api/condominiums')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Condomínios obtidos com sucesso');
      expect(response.body.data).toHaveProperty('condominiums');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.condominiums)).toBe(true);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/condominiums?page=1&limit=5')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.itemsPerPage).toBe(5);
    });

    test('should support search functionality', async () => {
      const response = await request(app)
        .get(`/api/condominiums?search=${encodeURIComponent('Test Condominium Controller')}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.condominiums.length).toBeGreaterThan(0);
      
      // Check if the test condominium is in the results
      const foundCondominium = response.body.data.condominiums.find(
        cond => cond.id === testCondominium.id
      );
      expect(foundCondominium).toBeDefined();
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/condominiums?status=active')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      
      // Check if all returned condominiums have active status
      response.body.data.condominiums.forEach(condominium => {
        expect(condominium.status).toBe('active');
      });
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/condominiums');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token não fornecido');
    });
  });

  describe('GET /api/condominiums/:id', () => {
    test('should get condominium by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/condominiums/${testCondominium.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Condomínio obtido com sucesso');
      expect(response.body.data).toHaveProperty('condominium');
      expect(response.body.data.condominium.id).toBe(testCondominium.id);
      expect(response.body.data.condominium.name).toBe('Test Condominium Controller');
      expect(response.body.data.condominium).toHaveProperty('units');
    });

    test('should return 404 for non-existent condominium', async () => {
      const response = await request(app)
        .get('/api/condominiums/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Condomínio não encontrado');
    });
  });

  describe('POST /api/condominiums', () => {
    test('should create condominium successfully', async () => {
      const newCondominium = {
        name: 'New Test Condominium',
        cnpj: '98.765.432/0001-10',
        address: 'New Test Address 789',
        city: 'New Test City',
        state: 'NT',
        zip_code: '87654321',
        phone: '11123456789',
        email: 'new@testcondominium.com',
        total_units: 30,
        total_blocks: 1
      };

      const response = await request(app)
        .post('/api/condominiums')
        .set('Authorization', `Bearer ${validToken}`)
        .send(newCondominium);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Condomínio criado com sucesso');
      expect(response.body.data).toHaveProperty('condominium');
      expect(response.body.data.condominium.name).toBe('New Test Condominium');
      expect(response.body.data.condominium.status).toBe('active');

      // Clean up
      await Condominium.destroy({ where: { id: response.body.data.condominium.id } });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/condominiums')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Incomplete Condominium'
          // missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should prevent duplicate CNPJ', async () => {
      const response = await request(app)
        .post('/api/condominiums')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Duplicate CNPJ Condominium',
          cnpj: '12.345.678/0001-90', // same as test condominium
          address: 'Duplicate Address',
          city: 'Duplicate City',
          state: 'DC',
          zip_code: '11111111',
          total_units: 20
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('CNPJ já está em uso');
    });

    test('should prevent duplicate email', async () => {
      const response = await request(app)
        .post('/api/condominiums')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Duplicate Email Condominium',
          cnpj: '11.111.111/0001-11',
          address: 'Duplicate Email Address',
          city: 'Duplicate Email City',
          state: 'DE',
          zip_code: '22222222',
          email: 'controller@testcondominium.com', // same as test condominium
          total_units: 25
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email já está em uso');
    });
  });

  describe('PUT /api/condominiums/:id', () => {
    test('should update condominium successfully', async () => {
      const updateData = {
        name: 'Updated Test Condominium',
        total_units: 60,
        phone: '11999888777'
      };

      const response = await request(app)
        .put(`/api/condominiums/${testCondominium.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Condomínio atualizado com sucesso');
      expect(response.body.data.condominium.name).toBe('Updated Test Condominium');
      expect(response.body.data.condominium.total_units).toBe(60);
      expect(response.body.data.condominium.phone).toBe('11999888777');
    });

    test('should return 404 for non-existent condominium update', async () => {
      const response = await request(app)
        .put('/api/condominiums/99999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Non-existent Condominium'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Condomínio não encontrado');
    });

    test('should validate unique CNPJ on update', async () => {
      // Create another condominium first
      const anotherCondominium = await Condominium.create({
        name: 'Another Condominium',
        cnpj: '55.555.555/0001-55',
        address: 'Another Address',
        city: 'Another City',
        state: 'AC',
        zip_code: '55555555',
        total_units: 25,
        status: 'active'
      });

      const response = await request(app)
        .put(`/api/condominiums/${anotherCondominium.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          cnpj: '12.345.678/0001-90' // trying to use test condominium's CNPJ
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('CNPJ já está em uso');

      // Clean up
      await Condominium.destroy({ where: { id: anotherCondominium.id } });
    });
  });

  describe('GET /api/condominiums/:id/stats', () => {
    test('should get condominium statistics successfully', async () => {
      const response = await request(app)
        .get(`/api/condominiums/${testCondominium.id}/stats`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Estatísticas obtidas com sucesso');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.stats).toHaveProperty('total_units');
      expect(response.body.data.stats).toHaveProperty('occupied_units');
      expect(response.body.data.stats).toHaveProperty('available_units');
      expect(response.body.data.stats).toHaveProperty('total_residents');
      expect(response.body.data.stats).toHaveProperty('occupancy_rate');
      
      // Verify calculations
      expect(response.body.data.stats.total_units).toBe(2); // we created 2 units
      expect(response.body.data.stats.occupied_units).toBe(1); // one is occupied
      expect(response.body.data.stats.available_units).toBe(1); // one is available
    });

    test('should return cache headers', async () => {
      const response = await request(app)
        .get(`/api/condominiums/${testCondominium.id}/stats`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      // Should have either X-Cache: HIT or X-Cache: MISS
      expect(['HIT', 'MISS']).toContain(response.headers['x-cache']);
    });

    test('should return 404 for non-existent condominium stats', async () => {
      const response = await request(app)
        .get('/api/condominiums/99999/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Condomínio não encontrado');
    });
  });

  describe('DELETE /api/condominiums/:id', () => {
    test('should prevent deletion of condominium with units', async () => {
      const response = await request(app)
        .delete(`/api/condominiums/${testCondominium.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Não é possível deletar condomínio com unidades cadastradas');
    });

    test('should delete condominium without units successfully', async () => {
      // Create a condominium without units
      const emptyCondominium = await Condominium.create({
        name: 'Empty Condominium',
        cnpj: '99.999.999/0001-99',
        address: 'Empty Address',
        city: 'Empty City',
        state: 'EC',
        zip_code: '99999999',
        total_units: 0,
        status: 'active'
      });

      const response = await request(app)
        .delete(`/api/condominiums/${emptyCondominium.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Condomínio deletado com sucesso');

      // Verify condominium was actually deleted
      const deletedCondominium = await Condominium.findByPk(emptyCondominium.id);
      expect(deletedCondominium).toBeNull();
    });

    test('should return 404 for non-existent condominium deletion', async () => {
      const response = await request(app)
        .delete('/api/condominiums/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Condomínio não encontrado');
    });
  });
});