const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/models');
const { User, Condominium, Unit, Resident, UnitHistory } = require('../../src/models');

describe('Resident Controller Tests', () => {
  let testUser, testCondominium, testUnit, authToken;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });

    testCondominium = await Condominium.create({
      name: 'Test Condominium',
      address: 'Test Address 123',
      city: 'Test City',
      state: 'TS',
      zip_code: '12345678',
      total_units: 10,
    });

    testUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpassword123',
      role: 'admin',
      is_active: true,
    });

    testUnit = await Unit.create({
      condominium_id: testCondominium.id,
      number: '101',
      type: 'apartment',
      status: 'vacant',
      condominium_fee: 500.00,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'hashedpassword123',
      });

    authToken = response.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/units/:unitId/residents', () => {
    it('should create a new resident successfully', async () => {
      const residentData = {
        name: 'João Silva',
        cpf: '12345678901',
        email: 'joao@test.com',
        phone: '11999999999',
        relationship: 'owner',
        is_main_resident: true,
      };

      const response = await request(app)
        .post(`/api/units/${testUnit.id}/residents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(residentData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('João Silva');
      expect(response.body.cpf).toBe('12345678901');
      expect(response.body.is_main_resident).toBe(true);
    });

    it('should fail with duplicate CPF', async () => {
      const residentData = {
        name: 'Maria Silva',
        cpf: '12345678901', // Same CPF as above
        email: 'maria@test.com',
        relationship: 'tenant',
      };

      const response = await request(app)
        .post(`/api/units/${testUnit.id}/residents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(residentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('CPF');
    });

    it('should fail with invalid unit ID', async () => {
      const residentData = {
        name: 'Pedro Santos',
        cpf: '98765432100',
      };

      const response = await request(app)
        .post('/api/units/99999/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(residentData);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Unidade não encontrada');
    });
  });

  describe('GET /api/units/:unitId/residents', () => {
    it('should get residents by unit', async () => {
      const response = await request(app)
        .get(`/api/units/${testUnit.id}/residents`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].name).toBe('João Silva');
    });

    it('should return empty array for unit with no residents', async () => {
      const emptyUnit = await Unit.create({
        condominium_id: testCondominium.id,
        number: '102',
        type: 'apartment',
        status: 'vacant',
        condominium_fee: 500.00,
      });

      const response = await request(app)
        .get(`/api/units/${emptyUnit.id}/residents`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/units/residents/:id', () => {
    it('should update resident successfully', async () => {
      const resident = await Resident.findOne({ where: { cpf: '12345678901' } });
      
      const updateData = {
        name: 'João Silva Santos',
        email: 'joao.santos@test.com',
        phone: '11888888888',
      };

      const response = await request(app)
        .put(`/api/units/residents/${resident.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('João Silva Santos');
      expect(response.body.email).toBe('joao.santos@test.com');
    });
  });

  describe('DELETE /api/units/residents/:id', () => {
    it('should soft delete resident (mark as inactive)', async () => {
      const resident = await Resident.findOne({ where: { cpf: '12345678901' } });

      const response = await request(app)
        .delete(`/api/units/residents/${resident.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('inativo');

      // Verify resident is marked as inactive
      const updatedResident = await Resident.findByPk(resident.id);
      expect(updatedResident.is_active).toBe(false);
      expect(updatedResident.move_out_date).toBeTruthy();
    });

    it('should permanently delete resident', async () => {
      // Create another resident for permanent deletion
      const newResident = await Resident.create({
        unit_id: testUnit.id,
        name: 'Test Delete',
        cpf: '11111111111',
        relationship: 'guest',
      });

      const response = await request(app)
        .delete(`/api/units/residents/${newResident.id}?permanent=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('permanentemente');

      // Verify resident is deleted
      const deletedResident = await Resident.findByPk(newResident.id);
      expect(deletedResident).toBeNull();
    });
  });

  describe('POST /api/units/residents/:id/reactivate', () => {
    it('should reactivate inactive resident', async () => {
      const inactiveResident = await Resident.findOne({ where: { cpf: '12345678901' } });

      const response = await request(app)
        .post(`/api/units/residents/${inactiveResident.id}/reactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.is_active).toBe(true);
      expect(response.body.move_out_date).toBeNull();
    });
  });

  describe('GET /api/units/:unitId/history', () => {
    it('should get unit history', async () => {
      const response = await request(app)
        .get(`/api/units/${testUnit.id}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter history by action type', async () => {
      const response = await request(app)
        .get(`/api/units/${testUnit.id}/history?action_type=resident_added`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.history).toBeDefined();
      if (response.body.history.length > 0) {
        expect(response.body.history[0].action_type).toBe('resident_added');
      }
    });
  });

  describe('GET /api/units/:unitId/history/stats', () => {
    it('should get history statistics', async () => {
      const response = await request(app)
        .get(`/api/units/${testUnit.id}/history/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total_entries).toBeDefined();
      expect(response.body.action_stats).toBeDefined();
      expect(response.body.recent_activity).toBeDefined();
      expect(Array.isArray(response.body.action_stats)).toBe(true);
      expect(Array.isArray(response.body.recent_activity)).toBe(true);
    });
  });
});