const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Condominium, FinancialTransaction, UserCondominium } = require('../../src/models');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/financial', require('../../src/routes/financialRoutes'));

describe('Financial Controller Tests', () => {
  let testUser;
  let testCondominium;
  let validToken;
  let testTransaction;

  beforeAll(async () => {
    // Create test condominium
    testCondominium = await Condominium.create({
      name: 'Test Financial Condominium',
      address: 'Financial Test Address 123',
      city: 'Financial City',
      state: 'FC',
      zip_code: '87654321',
      total_units: 30,
      status: 'active'
    });

    // Create test user (admin)
    const hashedPassword = await bcrypt.hash('adminpass123', 10);
    testUser = await User.create({
      name: 'Financial Test Admin',
      email: 'financial@test.com',
      password: hashedPassword,
      phone: '11888888888',
      role: 'admin',
      status: 'active'
    });

    // Associate user with condominium
    await UserCondominium.create({
      user_id: testUser.id,
      condominium_id: testCondominium.id,
      role: 'admin',
      status: 'active'
    });

    // Generate valid token
    validToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Create test transaction
    testTransaction = await FinancialTransaction.create({
      condominium_id: testCondominium.id,
      title: 'Test Transaction',
      description: 'Test transaction for testing',
      type: 'income',
      category: 'condominium_fee',
      amount: 1000.00,
      due_date: new Date(),
      status: 'pending',
      payment_method: 'pix',
      created_by: testUser.id
    });
  });

  afterAll(async () => {
    // Clean up test data
    await FinancialTransaction.destroy({ where: { condominium_id: testCondominium.id } });
    await UserCondominium.destroy({ where: { user_id: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
    await Condominium.destroy({ where: { id: testCondominium.id } });
  });

  describe('GET /api/financial/transactions', () => {
    test('should get transactions list successfully', async () => {
      const response = await request(app)
        .get('/api/financial/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transações obtidas com sucesso');
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
    });

    test('should filter transactions by condominium', async () => {
      const response = await request(app)
        .get(`/api/financial/transactions?condominium=${testCondominium.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions.length).toBeGreaterThan(0);
      
      // Check if all transactions belong to the test condominium
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.condominium_id).toBe(testCondominium.id);
      });
    });

    test('should filter transactions by type', async () => {
      const response = await request(app)
        .get('/api/financial/transactions?type=income')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Check if all transactions are income type
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.type).toBe('income');
      });
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/financial/transactions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token não fornecido');
    });
  });

  describe('GET /api/financial/transactions/:id', () => {
    test('should get transaction by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/financial/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transação obtida com sucesso');
      expect(response.body.data).toHaveProperty('transaction');
      expect(response.body.data.transaction.id).toBe(testTransaction.id);
      expect(response.body.data.transaction.title).toBe('Test Transaction');
    });

    test('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/financial/transactions/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Transação não encontrada');
    });
  });

  describe('POST /api/financial/transactions', () => {
    test('should create income transaction successfully', async () => {
      const newTransaction = {
        condominium_id: testCondominium.id,
        title: 'New Income Transaction',
        description: 'Test income transaction',
        type: 'income',
        category: 'condominium_fee',
        amount: 500.00,
        due_date: new Date().toISOString(),
        payment_method: 'pix'
      };

      const response = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send(newTransaction);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transação criada com sucesso');
      expect(response.body.data).toHaveProperty('transaction');
      expect(response.body.data.transaction.title).toBe('New Income Transaction');
      expect(response.body.data.transaction.amount).toBe('500.00');

      // Clean up
      await FinancialTransaction.destroy({ where: { id: response.body.data.transaction.id } });
    });

    test('should create expense transaction successfully', async () => {
      const newTransaction = {
        condominium_id: testCondominium.id,
        title: 'New Expense Transaction',
        description: 'Test expense transaction',
        type: 'expense',
        category: 'maintenance',
        amount: 300.00,
        due_date: new Date().toISOString(),
        payment_method: 'cash'
      };

      const response = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send(newTransaction);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.type).toBe('expense');
      expect(response.body.data.transaction.category).toBe('maintenance');

      // Clean up
      await FinancialTransaction.destroy({ where: { id: response.body.data.transaction.id } });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Incomplete Transaction'
          // missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate amount as positive number', async () => {
      const response = await request(app)
        .post('/api/financial/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          condominium_id: testCondominium.id,
          title: 'Invalid Amount Transaction',
          description: 'Test invalid amount',
          type: 'income',
          category: 'condominium_fee',
          amount: -100.00, // negative amount
          due_date: new Date().toISOString(),
          payment_method: 'pix'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/financial/transactions/:id', () => {
    test('should update transaction successfully', async () => {
      const updateData = {
        title: 'Updated Test Transaction',
        description: 'Updated description',
        amount: 1500.00
      };

      const response = await request(app)
        .put(`/api/financial/transactions/${testTransaction.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transação atualizada com sucesso');
      expect(response.body.data.transaction.title).toBe('Updated Test Transaction');
      expect(response.body.data.transaction.amount).toBe('1500.00');
    });

    test('should return 404 for non-existent transaction update', async () => {
      const response = await request(app)
        .put('/api/financial/transactions/99999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Non-existent Transaction'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Transação não encontrada');
    });
  });

  describe('GET /api/financial/balance/:condominiumId', () => {
    test('should get condominium balance successfully', async () => {
      const response = await request(app)
        .get(`/api/financial/balance/${testCondominium.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Saldo obtido com sucesso');
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('totalIncome');
      expect(response.body.data).toHaveProperty('totalExpenses');
      expect(response.body.data).toHaveProperty('pendingIncome');
      expect(response.body.data).toHaveProperty('pendingExpenses');
      expect(typeof response.body.data.balance).toBe('string');
    });

    test('should return 404 for non-existent condominium balance', async () => {
      const response = await request(app)
        .get('/api/financial/balance/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Condomínio não encontrado');
    });
  });

  describe('POST /api/financial/transactions/:id/confirm-cash', () => {
    test('should confirm cash payment successfully', async () => {
      // Create a cash transaction first
      const cashTransaction = await FinancialTransaction.create({
        condominium_id: testCondominium.id,
        title: 'Cash Payment Transaction',
        description: 'Test cash payment',
        type: 'income',
        category: 'condominium_fee',
        amount: 200.00,
        due_date: new Date(),
        status: 'pending',
        payment_method: 'cash',
        created_by: testUser.id
      });

      const response = await request(app)
        .post(`/api/financial/transactions/${cashTransaction.id}/confirm-cash`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pagamento em dinheiro confirmado com sucesso');
      expect(response.body.data.transaction.cash_confirmed).toBe(true);
      expect(response.body.data.transaction.status).toBe('paid');

      // Clean up
      await FinancialTransaction.destroy({ where: { id: cashTransaction.id } });
    });

    test('should fail to confirm non-cash payment', async () => {
      const response = await request(app)
        .post(`/api/financial/transactions/${testTransaction.id}/confirm-cash`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Apenas pagamentos em dinheiro podem ser confirmados');
    });
  });

  describe('DELETE /api/financial/transactions/:id', () => {
    test('should delete pending transaction successfully', async () => {
      // Create a transaction to delete
      const transactionToDelete = await FinancialTransaction.create({
        condominium_id: testCondominium.id,
        title: 'Transaction to Delete',
        description: 'This will be deleted',
        type: 'expense',
        category: 'utilities',
        amount: 100.00,
        due_date: new Date(),
        status: 'pending',
        payment_method: 'pix',
        created_by: testUser.id
      });

      const response = await request(app)
        .delete(`/api/financial/transactions/${transactionToDelete.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transação deletada com sucesso');

      // Verify transaction was actually deleted
      const deletedTransaction = await FinancialTransaction.findByPk(transactionToDelete.id);
      expect(deletedTransaction).toBeNull();
    });

    test('should fail to delete paid transaction', async () => {
      // Create a paid transaction
      const paidTransaction = await FinancialTransaction.create({
        condominium_id: testCondominium.id,
        title: 'Paid Transaction',
        description: 'This is paid and cannot be deleted',
        type: 'income',
        category: 'condominium_fee',
        amount: 150.00,
        due_date: new Date(),
        status: 'paid',
        payment_method: 'pix',
        created_by: testUser.id
      });

      const response = await request(app)
        .delete(`/api/financial/transactions/${paidTransaction.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Não é possível deletar transações pagas');

      // Clean up
      await FinancialTransaction.destroy({ where: { id: paidTransaction.id } });
    });

    test('should return 404 for non-existent transaction deletion', async () => {
      const response = await request(app)
        .delete('/api/financial/transactions/99999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Transação não encontrada');
    });
  });
});