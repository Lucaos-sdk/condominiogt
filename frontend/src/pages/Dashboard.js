import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  condominiumAPI, 
  financialAPI, 
  maintenanceAPI, 
  bookingAPI, 
  communicationAPI,
  commonAreaAPI,
  userAPI
} from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [condominiums, setCondominiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    condominium: null,
    financial: null,
    maintenance: null,
    bookings: null,
    communications: null,
    commonAreas: null,
    users: null
  });

  // Debug log do estado de autenticação
  console.log('🔍 Dashboard - Estado atual:', {
    user: user ? 'Usuário existe' : 'Sem usuário',
    isAuthenticated,
    authLoading,
    loading,
    isInitialized,
    token: localStorage.getItem('token') ? 'Token existe' : 'Sem token'
  });

  // Carrega lista de condomínios apenas quando autenticado
  useEffect(() => {
    const loadCondominiums = async () => {
      // Só carrega se estiver autenticado e não estiver mais carregando a autenticação
      if (!isAuthenticated || authLoading) {
        console.log('🔐 Aguardando autenticação... isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
        setLoading(false);
        return;
      }

      console.log('🏠 Iniciando carregamento de condomínios...');
      try {
        setError(null);
        const response = await condominiumAPI.getAll();
        console.log('🏠 Resposta da API de condomínios:', response);
        console.log('🏠 response.data:', response.data);
        console.log('🏠 response.data.data.condominiums:', response.data.data.condominiums);
        const condos = response.data.data.condominiums || [];
        setCondominiums(condos);
        console.log('🏠 Condomínios carregados:', condos.length);
        
        // Seleciona primeiro condomínio por padrão apenas se não houver seleção
        if (condos.length > 0 && !selectedCondominium) {
          console.log('🏠 Selecionando primeiro condomínio:', condos[0].id);
          setSelectedCondominium(condos[0].id.toString());
        }
      } catch (error) {
        console.error('❌ Erro ao carregar condomínios:', error);
        setError('Erro ao carregar condomínios: ' + error.message);
      } finally {
        console.log('🏠 Finalizando carregamento de condomínios');
        setLoading(false);
        setIsInitialized(true);
      }
    };

    loadCondominiums();
  }, [isAuthenticated, authLoading]); // Depende da autenticação

  // Carrega dados do dashboard quando seleciona condomínio
  useEffect(() => {
    const loadDashboardData = async () => {
      console.log('📊 useEffect dashboard - selectedCondominium:', selectedCondominium, 'isInitialized:', isInitialized, 'isAuthenticated:', isAuthenticated);
      
      if (!selectedCondominium || !isInitialized || !isAuthenticated) {
        console.log('📊 Condições não atendidas para carregar dados, saindo...');
        setDataLoading(false);
        return;
      }
      
      console.log('📊 Iniciando carregamento dos dados do dashboard...');
      console.log('🎯 selectedCondominium:', selectedCondominium);
      setDataLoading(true);
      setError(null);
      
      try {
        console.log('📊 Fazendo chamadas para as APIs...');
        
        // Função para adicionar timeout às promessas
        const withTimeout = (promise, timeoutMs = 10000) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout da API')), timeoutMs)
            )
          ]);
        };

        const promises = [
          withTimeout(condominiumAPI.getStats(selectedCondominium)).catch(err => {
            console.warn('Erro em condominiumAPI.getStats:', err);
            return { data: null };
          }),
          withTimeout(financialAPI.getReport(selectedCondominium)).catch(err => {
            console.warn('Erro em financialAPI.getReport:', err);
            return { data: null };
          }),
          withTimeout(financialAPI.getBalance(selectedCondominium)).catch(err => {
            console.error('❌ ERRO CRÍTICO em financialAPI.getBalance:', err);
            console.error('❌ Erro detalhes:', err.response?.data || err.message);
            return { data: null };
          }),
          withTimeout(maintenanceAPI.getStats(selectedCondominium)).catch(err => {
            console.warn('Erro em maintenanceAPI.getStats:', err);
            return { data: null };
          }),
          withTimeout(bookingAPI.getStats(selectedCondominium)).catch(err => {
            console.warn('Erro em bookingAPI.getStats:', err);
            return { data: null };
          }),
          withTimeout(communicationAPI.getStats(selectedCondominium)).catch(err => {
            console.warn('Erro em communicationAPI.getStats:', err);
            return { data: null };
          }),
          withTimeout(commonAreaAPI.getStats(selectedCondominium)).catch(err => {
            console.warn('Erro em commonAreaAPI.getStats:', err);
            return { data: null };
          })
        ];
        
        const [
          condominiumStats,
          financialReport,
          financialBalance,
          maintenanceStats,
          bookingStats,
          communicationStats,
          commonAreaStats
        ] = await Promise.all(promises);

        console.log('📊 Todas as APIs retornaram, processando dados...');
        console.log('📊 Dados recebidos:', {
          condominium: condominiumStats?.data,
          financial: { report: financialReport?.data, balance: financialBalance?.data },
          maintenance: maintenanceStats?.data?.data,
          bookings: bookingStats?.data,
          communications: communicationStats?.data,
          commonAreas: commonAreaStats?.data
        });

        // Debug específico para dados financeiros
        console.log('🔍 DEBUG FINANCIAL BALANCE:');
        console.log('financialBalance:', financialBalance);
        console.log('financialBalance?.data?.data:', financialBalance?.data?.data);
        console.log('financialReport:', financialReport);
        console.log('financialReport?.data:', financialReport?.data);

        const finalDashboardData = {
          condominium: condominiumStats?.data?.stats || null,
          financial: {
            report: financialReport?.data?.data || null,  // Fix: Same structure as balance
            balance: financialBalance?.data?.data || null
          },
          maintenance: maintenanceStats?.data?.data || null,
          bookings: bookingStats?.data || null,
          communications: communicationStats?.data || null,
          commonAreas: commonAreaStats?.data || null
        };

        setDashboardData(finalDashboardData);
        
        console.log('📊 Dados do dashboard atualizados com sucesso!');
        console.log('🔍 FINAL DASHBOARD DATA:', finalDashboardData);
        console.log('🔍 FINAL financialBalance data:', financialBalance?.data);
        console.log('🔍 FINAL current_balance path:', finalDashboardData.financial?.balance?.current_balance);
        console.log('🔍 FINAL balance statistics:', finalDashboardData.financial?.balance?.statistics);
        console.log('🔍 FINAL recent_transactions:', finalDashboardData.financial?.balance?.recent_transactions);
      } catch (error) {
        console.error('❌ Erro ao carregar dados do dashboard:', error);
        setError('Erro ao carregar dados do dashboard: ' + error.message);
      } finally {
        console.log('📊 Finalizando carregamento dos dados do dashboard');
        setDataLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedCondominium, isInitialized, isAuthenticated]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getMaintenancePendingCount = () => {
    if (!dashboardData.maintenance?.total_statistics) return 0;
    return dashboardData.maintenance.total_statistics.pending_count || 0;
  };

  const getBookingsPendingCount = () => {
    if (!dashboardData.bookings?.overview) return 0;
    return dashboardData.bookings.overview.total_bookings - dashboardData.bookings.overview.approved_bookings || 0;
  };

  // Aguarda autenticação antes de mostrar qualquer conteúdo
  if (authLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Verificando autenticação... (authLoading=true)</span>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Debug: user={user ? 'sim' : 'não'}, isAuth={isAuthenticated ? 'sim' : 'não'}, token={localStorage.getItem('token') ? 'sim' : 'não'}
          </p>
        </div>
      </div>
    );
  }

  // Redireciona para login se não estiver autenticado
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Autenticação Necessária</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Você precisa fazer login para acessar o dashboard.</p>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm"
                >
                  Ir para Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando condomínios... (loading=true)</span>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Debug: isAuth={isAuthenticated ? 'sim' : 'não'}, initialized={isInitialized ? 'sim' : 'não'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostra erros se houver
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro no Dashboard</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                >
                  Recarregar Página
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header com seleção de condomínio */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Executivo</h1>
            <p className="text-gray-600">Visão consolidada do sistema de gestão</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedCondominium}
              onChange={(e) => setSelectedCondominium(e.target.value)}
              className="block w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um condomínio</option>
              {condominiums.map((condo) => (
                <option key={condo.id} value={condo.id}>
                  {condo.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedCondominium ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Selecione um condomínio para visualizar o dashboard</p>
        </div>
      ) : dataLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando dados do dashboard...</span>
        </div>
      ) : (
        <>
          {/* Métricas principais consolidadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total de Unidades */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🏠</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unidades</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {dashboardData.condominium?.total_units || 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    {((dashboardData.condominium?.occupied_units / dashboardData.condominium?.total_units) * 100 || 0).toFixed(1)}% ocupação
                  </p>
                </div>
              </div>
            </div>

            {/* Saldo Financeiro */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    (dashboardData.financial?.balance?.current_balance || 0) >= 0 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  }`}>
                    <span className="text-white text-sm">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Saldo Atual</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(dashboardData.financial?.balance?.current_balance)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dashboardData.financial?.balance?.recent_transactions?.length || 0} transações
                  </p>
                </div>
              </div>
            </div>

            {/* Manutenções Pendentes */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    getMaintenancePendingCount() > 0 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    <span className="text-white text-sm">🔧</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Manutenções</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {getMaintenancePendingCount()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dashboardData.maintenance?.total_statistics?.total_requests || 0} total
                  </p>
                </div>
              </div>
            </div>

            {/* Reservas Pendentes */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    getBookingsPendingCount() > 0 ? 'bg-purple-500' : 'bg-green-500'
                  }`}>
                    <span className="text-white text-sm">📅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Reservas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {getBookingsPendingCount()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dashboardData.bookings?.overview?.total_bookings || 0} total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas Financeiras */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo Financeiro</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Receitas:</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(dashboardData.financial?.balance?.statistics?.total_income)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Despesas:</span>
                  <span className="text-sm font-medium text-red-600">
                    {formatCurrency(dashboardData.financial?.balance?.statistics?.total_expenses)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium text-gray-900">Saldo:</span>
                  <span className={`text-sm font-medium ${
                    (dashboardData.financial?.balance?.current_balance || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(dashboardData.financial?.balance?.current_balance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Sistema de Manutenção</h3>
                <button
                  onClick={() => navigate('/manutencao')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Ver Dashboard →
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pendentes:</span>
                  <button
                    onClick={() => {
                      console.log('Navegando para solicitações pendentes...');
                      navigate({
                        pathname: '/manutencao/solicitacoes',
                        search: '?status=pending'
                      });
                    }}
                    className="text-sm font-medium text-yellow-600 hover:text-yellow-800"
                  >
                    {dashboardData.maintenance?.total_statistics?.pending_count || 0}
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Em Andamento:</span>
                  <button
                    onClick={() => {
                      console.log('Navegando para solicitações em andamento...');
                      navigate({
                        pathname: '/manutencao/solicitacoes',
                        search: '?status=in_progress'
                      });
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {dashboardData.maintenance?.total_statistics?.in_progress_count || 0}
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Concluídas:</span>
                  <button
                    onClick={() => {
                      console.log('Navegando para solicitações concluídas...');
                      navigate({
                        pathname: '/manutencao/solicitacoes',
                        search: '?status=completed'
                      });
                    }}
                    className="text-sm font-medium text-green-600 hover:text-green-800"
                  >
                    {dashboardData.maintenance?.total_statistics?.completed_count || 0}
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => navigate('/manutencao/solicitacoes/nova')}
                  className="w-full text-sm text-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Nova Solicitação
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Áreas Comuns</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {dashboardData.commonAreas?.overview?.total_areas || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Disponíveis:</span>
                  <span className="text-sm font-medium text-green-600">
                    {dashboardData.commonAreas?.overview?.available_areas || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reservas Pendentes:</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {getBookingsPendingCount()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comunicações e Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Comunicações</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Publicadas:</span>
                    <span className="text-sm font-medium">
                      {dashboardData.communications?.published || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rascunhos:</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {dashboardData.communications?.draft || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {dashboardData.communications?.total || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Status do Sistema</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Sistema Financeiro</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Operacional
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        getMaintenancePendingCount() === 0 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">Manutenções</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      getMaintenancePendingCount() === 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getMaintenancePendingCount() === 0 ? 'Em dia' : `${getMaintenancePendingCount()} pendentes`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        getBookingsPendingCount() === 0 ? 'bg-green-500' : 'bg-purple-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">Reservas</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      getBookingsPendingCount() === 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {getBookingsPendingCount() === 0 ? 'Em dia' : `${getBookingsPendingCount()} pendentes`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;