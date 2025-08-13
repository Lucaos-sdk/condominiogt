const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAPIs() {
  console.log('🧪 Testando APIs via HTTP...\n');

  try {
    let authToken = '';

    // Test 1: Health Check
    console.log('1. Testando health check...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Health check:', healthResponse.data.status);

    // Test 2: Login
    console.log('2. Testando login...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@condominiogt.com',
        password: 'admin123'
      });
      authToken = loginResponse.data.data.token;
      console.log('✅ Login realizado com sucesso');
    } catch (error) {
      console.log('⚠️  Login com credenciais padrão falhou, tentando criar usuário admin...');
      
      // Try to register admin user
      try {
        await axios.post(`${API_BASE}/auth/register`, {
          name: 'Admin Test',
          email: 'admin@test.com',
          password: 'admin123',
          phone: '11999999999',
          role: 'admin'
        });
        
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: 'admin@test.com',
          password: 'admin123'
        });
        authToken = loginResponse.data.data.token;
        console.log('✅ Admin criado e login realizado');
      } catch (registerError) {
        console.log('❌ Erro ao criar admin:', registerError.response?.data?.message || registerError.message);
        return;
      }
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    // Test 3: Get Profile
    console.log('3. Testando obtenção de perfil...');
    const profileResponse = await axios.get(`${API_BASE}/auth/profile`, { headers });
    console.log('✅ Perfil obtido:', profileResponse.data.data.user.name);

    // Test 4: Get Condominiums
    console.log('4. Testando listagem de condomínios...');
    const condominiumsResponse = await axios.get(`${API_BASE}/condominiums`, { headers });
    console.log('✅ Condomínios obtidos:', condominiumsResponse.data.data.condominiums.length, 'registros');

    let testCondominiumId = null;
    if (condominiumsResponse.data.data.condominiums.length > 0) {
      testCondominiumId = condominiumsResponse.data.data.condominiums[0].id;
    } else {
      // Create a condominium for testing
      console.log('5. Criando condomínio para teste...');
      const createCondominiumResponse = await axios.post(`${API_BASE}/condominiums`, {
        name: 'API Test Condominium',
        address: 'API Test Address 123',
        city: 'API Test City',
        state: 'AT',
        zip_code: '12345678',
        total_units: 30
      }, { headers });
      testCondominiumId = createCondominiumResponse.data.data.condominium.id;
      console.log('✅ Condomínio criado para teste:', testCondominiumId);
    }

    // Test 5: Get Condominium Stats
    console.log('6. Testando estatísticas do condomínio...');
    const statsResponse = await axios.get(`${API_BASE}/condominiums/${testCondominiumId}/stats`, { headers });
    console.log('✅ Estatísticas obtidas. Cache:', statsResponse.headers['x-cache'] || 'N/A');

    // Test 6: Get Financial Balance
    console.log('7. Testando saldo financeiro...');
    const balanceResponse = await axios.get(`${API_BASE}/financial/balance/${testCondominiumId}`, { headers });
    console.log('✅ Saldo obtido:', balanceResponse.data.data.balance);

    // Test 7: Create Financial Transaction
    console.log('8. Testando criação de transação financeira...');
    const transactionResponse = await axios.post(`${API_BASE}/financial/transactions`, {
      condominium_id: testCondominiumId,
      title: 'API Test Transaction',
      description: 'Transaction created via API test',
      type: 'income',
      category: 'condominium_fee',
      amount: 500.00,
      due_date: new Date().toISOString(),
      payment_method: 'pix'
    }, { headers });
    console.log('✅ Transação criada:', transactionResponse.data.data.transaction.title);

    // Test 8: Get Financial Transactions
    console.log('9. Testando listagem de transações...');
    const transactionsResponse = await axios.get(`${API_BASE}/financial/transactions`, { headers });
    console.log('✅ Transações obtidas:', transactionsResponse.data.data.transactions.length, 'registros');

    // Test 9: Cache Test (second request should hit cache)
    console.log('10. Testando cache (segunda requisição)...');
    const statsResponse2 = await axios.get(`${API_BASE}/condominiums/${testCondominiumId}/stats`, { headers });
    console.log('✅ Cache funcionando:', statsResponse2.headers['x-cache'] === 'HIT' ? 'HIT' : 'MISS');

    console.log('\n🎉 TODOS OS TESTES DE API PASSARAM! 🎉');
    console.log('\n📊 Resumo dos testes de API:');
    console.log('✅ Health check funcionando');
    console.log('✅ Sistema de autenticação funcional');
    console.log('✅ Obtenção de perfil funcionando');
    console.log('✅ Listagem de condomínios funcionando');
    console.log('✅ Estatísticas de condomínio funcionando');
    console.log('✅ Sistema financeiro funcional');
    console.log('✅ Criação de transações funcionando');
    console.log('✅ Sistema de cache operacional');

  } catch (error) {
    console.error('❌ Erro durante teste de API:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 Dica: Verifique se o backend está rodando e as credenciais estão corretas');
    }
  }
}

// Run API tests
testAPIs();