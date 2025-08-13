import React, { useState, useEffect } from 'react';
import { maintenanceAPI, condominiumAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MaintenanceDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedCondominium, setSelectedCondominium] = useState(null);
  const [condominiums, setCondominiums] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    if (selectedCondominium) {
      loadStatsAndRequests();
    }
  }, [selectedCondominium]);

  const loadCondominiums = async () => {
    try {
      const response = await condominiumAPI.getAll();
      if (response.data.success) {
        const condos = response.data.condominiums || response.data.data?.condominiums || [];
        setCondominiums(condos);
        if (condos.length > 0) {
          setSelectedCondominium(condos[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
      setError('Erro ao carregar condomínios');
    }
  };

  const loadStatsAndRequests = async () => {
    if (!selectedCondominium) return;
    
    setLoading(true);
    try {
      let statsData = null;
      
      // Carregar estatísticas
      const statsResponse = await maintenanceAPI.getStats(selectedCondominium);
      
      if (statsResponse.data.success) {
        statsData = statsResponse.data.data || statsResponse.data;
        setStats(statsData);
      }

      // Carregar solicitações recentes do stats ou fazer uma busca separada
      if (statsData && statsData.recent_requests) {
        setRecentRequests(statsData.recent_requests);
      } else {
        try {
          const requestsResponse = await maintenanceAPI.getRequests({ 
            condominium_id: selectedCondominium,
            limit: 5,
            page: 1
          });
          if (requestsResponse.data.success) {
            const requestsData = requestsResponse.data.data || requestsResponse.data;
            setRecentRequests(requestsData.requests || []);
          }
        } catch (requestError) {
          console.warn('Erro ao carregar solicitações recentes:', requestError);
        }
      }
      
      setError('');
    } catch (error) {
      console.error('Erro ao carregar dados de manutenção:', error);
      setError('Erro ao carregar dados de manutenção. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      rejected: 'Rejeitada'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      plumbing: 'Hidráulica',
      electrical: 'Elétrica',
      hvac: 'Ar Condicionado',
      elevator: 'Elevador',
      security: 'Segurança',
      cleaning: 'Limpeza',
      landscaping: 'Jardinagem',
      structural: 'Estrutural',
      appliances: 'Equipamentos',
      other: 'Outros'
    };
    return labels[category] || category;
  };

  const StatCard = ({ title, value, subtitle, color, icon }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </h3>
          <p className={`text-2xl font-bold ${color}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Manutenção</h1>
        
        {condominiums.length > 1 && (
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedCondominium || ''}
              onChange={(e) => setSelectedCondominium(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {condominiums.map(condo => (
                <option key={condo.id} value={condo.id}>
                  {condo.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {stats && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total de Solicitações"
              value={stats.total_statistics?.total_requests || stats.total_requests || 0}
              color="text-blue-600"
              icon="📋"
            />
            
            <StatCard
              title="Pendentes"
              value={stats.total_statistics?.pending_count || stats.pending_requests || 0}
              color="text-yellow-600"
              icon="⏳"
            />
            
            <StatCard
              title="Em Andamento"
              value={stats.total_statistics?.in_progress_count || stats.in_progress_requests || 0}
              color="text-blue-600"
              icon="🔧"
            />
            
            <StatCard
              title="Concluídas"
              value={stats.total_statistics?.completed_count || stats.completed_requests || 0}
              color="text-green-600"
              icon="✅"
            />
          </div>

          {/* Estatísticas por Categoria */}
          {(stats.category_breakdown || stats.by_category) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Por Categoria</h2>
                <div className="space-y-3">
                  {(stats.category_breakdown || stats.by_category || []).map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.count} solicitações
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Por Prioridade</h2>
                <div className="space-y-3">
                  {(stats.priority_breakdown || stats.by_priority || []).map((item) => (
                    <div key={item.priority} className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                        {getPriorityLabel(item.priority)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.count} solicitações
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alertas de Alta Prioridade */}
          {stats.urgent_requests > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <span className="text-red-400 mr-3">🚨</span>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Atenção: Solicitações Urgentes
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Existem {stats.urgent_requests} solicitações de manutenção marcadas como urgentes que precisam de atenção imediata.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Solicitações Recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Solicitações Recentes</h2>
          <p className="text-sm text-gray-500 mt-1">Clique em qualquer solicitação para ver detalhes</p>
        </div>
        
        <div className="overflow-hidden">
          {recentRequests && recentRequests.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/manutencao/solicitacoes/${request.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">
                          {request.priority === 'urgent' ? '🚨' : request.priority === 'high' ? '⚠️' : '🔧'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                            {request.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getCategoryLabel(request.category)} • 
                            {request.unit ? ` Unidade ${request.unit.number}` : ' Área Geral'} • 
                            {request.created_at ? new Date(request.created_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                        {getPriorityLabel(request.priority)}
                      </span>
                      
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                      
                      <div className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <span className="text-4xl mb-4 block">🔧</span>
              <p className="text-gray-500">Nenhuma solicitação encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => window.location.href = '/manutencao/solicitacoes/nova'}
          className="flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span className="mr-2">➕</span>
          Nova Solicitação
        </button>
        
        <button
          onClick={() => window.location.href = '/manutencao/solicitacoes'}
          className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span className="mr-2">📋</span>
          Ver Todas as Solicitações
        </button>
        
        {(user.role === 'admin' || user.role === 'manager' || user.role === 'syndic') && (
          <button
            onClick={() => window.location.href = '/manutencao/solicitacoes?status=pending'}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">✅</span>
            Aprovações Pendentes
          </button>
        )}
      </div>
    </div>
  );
};

export default MaintenanceDashboard;