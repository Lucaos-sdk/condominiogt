import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  condominiumAPI, 
  financialAPI, 
  maintenanceAPI, 
  bookingAPI, 
  communicationAPI,
  commonAreaAPI
} from '../services/api';

const DashboardSimple = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState({
    condominiums: [],
    selectedCondominium: '',
    dashboardData: null,
    loading: true,
    dataLoading: false,
    error: null,
    step: 'initializing'
  });

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Função para carregar condomínios
  const loadCondominiums = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      console.log('🔐 Não autenticado, aguardando...');
      updateState({ loading: false, step: 'waiting-auth' });
      return;
    }

    console.log('🏠 Carregando condomínios...');
    updateState({ step: 'loading-condominiums' });

    try {
      const response = await condominiumAPI.getAll();
      const condos = response.data.condominiums || [];
      
      console.log('🏠 Condomínios carregados:', condos.length);
      
      const firstCondoId = condos.length > 0 ? condos[0].id.toString() : '';
      
      updateState({
        condominiums: condos,
        selectedCondominium: firstCondoId,
        loading: false,
        step: 'condominiums-loaded'
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar condomínios:', error);
      updateState({
        error: `Erro ao carregar condomínios: ${error.message}`,
        loading: false,
        step: 'error'
      });
    }
  }, [isAuthenticated, authLoading, updateState]);

  // Função para carregar dados do dashboard
  const loadDashboardData = useCallback(async (condominiumId) => {
    if (!condominiumId || !isAuthenticated) {
      console.log('📊 Sem condomínio selecionado ou não autenticado');
      return;
    }

    console.log('📊 Carregando dados do dashboard para condomínio:', condominiumId);
    updateState({ dataLoading: true, step: 'loading-dashboard-data' });

    try {
      // Fazer chamadas com timeout individual
      const timeoutPromise = (promise, timeout = 5000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
      };

      const results = await Promise.allSettled([
        timeoutPromise(condominiumAPI.getStats(condominiumId)),
        timeoutPromise(financialAPI.getReport(condominiumId)),
        timeoutPromise(financialAPI.getBalance(condominiumId)),
        timeoutPromise(maintenanceAPI.getStats(condominiumId)),
        timeoutPromise(bookingAPI.getStats(condominiumId)),
        timeoutPromise(communicationAPI.getStats(condominiumId)),
        timeoutPromise(commonAreaAPI.getStats(condominiumId))
      ]);

      const [
        condominiumStats,
        financialReport,
        financialBalance,
        maintenanceStats,
        bookingStats,
        communicationStats,
        commonAreaStats
      ] = results;

      console.log('📊 Resultados das APIs:', results.map(r => r.status));

      const dashboardData = {
        condominium: condominiumStats.status === 'fulfilled' ? condominiumStats.value.data : null,
        financial: {
          report: financialReport.status === 'fulfilled' ? financialReport.value.data : null,
          balance: financialBalance.status === 'fulfilled' ? financialBalance.value.data : null
        },
        maintenance: maintenanceStats.status === 'fulfilled' ? maintenanceStats.value.data : null,
        bookings: bookingStats.status === 'fulfilled' ? bookingStats.value.data : null,
        communications: communicationStats.status === 'fulfilled' ? communicationStats.value.data : null,
        commonAreas: commonAreaStats.status === 'fulfilled' ? commonAreaStats.value.data : null
      };

      updateState({
        dashboardData,
        dataLoading: false,
        step: 'dashboard-loaded'
      });

      console.log('📊 Dashboard carregado com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error);
      updateState({
        error: `Erro ao carregar dados: ${error.message}`,
        dataLoading: false,
        step: 'dashboard-error'
      });
    }
  }, [isAuthenticated, updateState]);

  // Effect para carregar condomínios
  useEffect(() => {
    loadCondominiums();
  }, [loadCondominiums]);

  // Effect para carregar dados quando condomínio muda
  useEffect(() => {
    if (state.selectedCondominium && !state.dataLoading) {
      loadDashboardData(state.selectedCondominium);
    }
  }, [state.selectedCondominium, loadDashboardData, state.dataLoading]);

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Renderizar loading de autenticação
  if (authLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Verificando autenticação...</span>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Step: {state.step}
        </div>
      </div>
    );
  }

  // Renderizar se não autenticado
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-yellow-800">Autenticação Necessária</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Você precisa fazer login para acessar o dashboard.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  // Renderizar loading inicial
  if (state.loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando condomínios...</span>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Step: {state.step}
        </div>
      </div>
    );
  }

  // Renderizar erro
  if (state.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Erro</h3>
          <p className="mt-2 text-sm text-red-700">{state.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
          >
            Tentar novamente
          </button>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Step: {state.step}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Simplificado</h1>
            <p className="text-gray-600">Versão de teste - Step: {state.step}</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <select
              value={state.selectedCondominium}
              onChange={(e) => updateState({ selectedCondominium: e.target.value })}
              className="block w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um condomínio</option>
              {state.condominiums.map((condo) => (
                <option key={condo.id} value={condo.id}>
                  {condo.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!state.selectedCondominium ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Selecione um condomínio para visualizar o dashboard</p>
        </div>
      ) : state.dataLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando dados do dashboard...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Métricas básicas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unidades</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {state.dashboardData?.condominium?.stats?.total_units || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Saldo</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(state.dashboardData?.financial?.balance?.current_balance)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Manutenções</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {state.dashboardData?.maintenance?.total_statistics?.pending_count || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reservas</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {state.dashboardData?.bookings?.overview?.total_bookings || 0}
            </p>
          </div>

          {/* Debug info */}
          <div className="bg-gray-50 rounded-lg p-4 col-span-full">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <pre className="text-xs">{JSON.stringify({
              step: state.step,
              hasData: !!state.dashboardData,
              apis: state.dashboardData ? Object.keys(state.dashboardData).reduce((acc, key) => {
                acc[key] = state.dashboardData[key] ? 'loaded' : 'failed';
                return acc;
              }, {}) : {}
            }, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSimple;