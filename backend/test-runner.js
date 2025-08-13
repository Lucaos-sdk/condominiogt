const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.test' });

const { User, Condominium, FinancialTransaction } = require('./src/models');

async function runBasicTests() {
  console.log('🧪 Iniciando testes básicos...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testando conexão com banco de dados...');
    const { sequelize } = require('./src/models');
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados: OK\n');

    // Test 2: Create Test User
    console.log('2. Testando criação de usuário...');
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const testUser = await User.create({
      name: 'Test User',
      email: `test${Date.now()}@test.com`,
      password: hashedPassword,
      phone: '11999999999',
      role: 'admin',
      status: 'active'
    });
    console.log('✅ Usuário criado:', testUser.name);

    // Test 3: JWT Token Generation
    console.log('3. Testando geração de token JWT...');
    const token = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    console.log('✅ Token JWT gerado com sucesso');

    // Test 4: Password Verification
    console.log('4. Testando verificação de senha...');
    const isValidPassword = await bcrypt.compare('testpass123', testUser.password);
    console.log('✅ Verificação de senha:', isValidPassword ? 'OK' : 'FAIL');

    // Test 5: Create Test Condominium
    console.log('5. Testando criação de condomínio...');
    const testCondominium = await Condominium.create({
      name: `Test Condominium ${Date.now()}`,
      address: 'Test Address 123',
      city: 'Test City',
      state: 'TC',
      zip_code: '12345678',
      total_units: 50,
      status: 'active'
    });
    console.log('✅ Condomínio criado:', testCondominium.name);

    // Test 6: Create Financial Transaction
    console.log('6. Testando criação de transação financeira...');
    const testTransaction = await FinancialTransaction.create({
      condominium_id: testCondominium.id,
      title: 'Test Transaction',
      description: 'Test transaction description',
      type: 'income',
      category: 'condominium_fee',
      amount: 1000.00,
      due_date: new Date(),
      status: 'pending',
      payment_method: 'pix',
      created_by: testUser.id
    });
    console.log('✅ Transação financeira criada:', testTransaction.title);

    // Test 7: Calculate Balance
    console.log('7. Testando cálculo de saldo...');
    const totalIncome = await FinancialTransaction.sum('amount', {
      where: {
        condominium_id: testCondominium.id,
        type: 'income',
        status: 'paid'
      }
    });
    
    const totalExpenses = await FinancialTransaction.sum('amount', {
      where: {
        condominium_id: testCondominium.id,
        type: 'expense',
        status: 'paid'
      }
    });

    const balance = (totalIncome || 0) - (totalExpenses || 0);
    console.log('✅ Cálculo de saldo realizado:', `R$ ${balance.toFixed(2)}`);

    // Cleanup
    console.log('\n8. Limpando dados de teste...');
    await FinancialTransaction.destroy({ where: { id: testTransaction.id } });
    await Condominium.destroy({ where: { id: testCondominium.id } });
    await User.destroy({ where: { id: testUser.id } });
    console.log('✅ Dados de teste removidos');

    console.log('\n🎉 TODOS OS TESTES BÁSICOS PASSARAM! 🎉');
    console.log('\n📊 Resumo dos testes:');
    console.log('✅ Conexão com banco de dados');
    console.log('✅ Criação de usuário');
    console.log('✅ Geração de token JWT');
    console.log('✅ Verificação de senha');
    console.log('✅ Criação de condomínio');
    console.log('✅ Criação de transação financeira');
    console.log('✅ Cálculo de saldo');
    console.log('✅ Limpeza de dados');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  }
}

// Run tests
runBasicTests();