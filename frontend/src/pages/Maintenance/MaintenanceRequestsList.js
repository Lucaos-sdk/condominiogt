import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { maintenanceAPI, condominiumAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MaintenanceRequestsList = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [condominiums, setCondominiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [error, setError] = useState('');
  
  // Filtros (inicializa com query parameters)
  const [filters, setFilters] = useState({
    page: 1,
    limit: 15,
    search: '',
    category: '',
    priority: '',
    status: searchParams.get('status') || '',
    condominium_id: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [filters]);

  const loadCondominiums = async () => {
    try {
      const response = await condominiumAPI.getAll();
      if (response.data.success) {
        const condos = response.data.condominiums || response.data.data?.condominiums || [];
        setCondominiums(condos);
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    console.log('🔧 Frontend: Carregando solicitações...');
    console.log('🔧 Frontend: Filtros originais:', filters);
    
    try {
      // Remove filtros vazios
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      console.log('🔧 Frontend: Filtros limpos:', cleanFilters);
      console.log('🔧 Frontend: Fazendo chamada para maintenanceAPI.getRequests...');
      
      const response = await maintenanceAPI.getRequests(cleanFilters);
      console.log('🔧 Frontend: Resposta recebida:', response);
      console.log('🔧 Frontend: response.data:', response.data);
      
      if (response.data.success) {
        console.log('🔧 Frontend: Dados de sucesso:', response.data.data);
        const requests = response.data.data?.requests || response.data.requests || [];
        const pagination = response.data.data?.pagination || response.data.pagination || {};
        
        console.log('🔧 Frontend: Requests extraídas:', requests);
        console.log('🔧 Frontend: Pagination extraída:', pagination);
        
        setRequests(requests);
        setPagination(pagination);
      } else {
        console.log('🔧 Frontend: Resposta sem sucesso:', response.data);
        setError('Falha ao carregar solicitações: ' + (response.data.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('🔧 Frontend: Erro na requisição:', error);
      console.error('🔧 Frontend: Error details:', error.response?.data);
      setError('Erro ao carregar solicitações: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset page when filter changes
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 15,
      search: '',
      category: '',
      priority: '',
      status: '',
      condominium_id: '',
      date_from: '',
      date_to: ''
    });
  };

  const handleApprove = async (requestId) => {
    try {
      const estimated_cost = prompt('Digite o custo estimado (opcional):');
      const approvePayload = {};
      
      // Só adicionar estimated_cost se tiver valor
      if (estimated_cost && estimated_cost.trim() !== '') {
        const cost = parseFloat(estimated_cost);
        if (!isNaN(cost) && cost >= 0) {
          approvePayload.estimated_cost = cost;
        }
      }
      
      const response = await maintenanceAPI.approve(requestId, approvePayload);
      
      if (response.data.success) {
        loadRequests(); // Recarregar lista
        alert('Solicitação aprovada com sucesso!');
      }
    } catch (error) {
      alert('Erro ao aprovar solicitação: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleReject = async (requestId) => {
    try {
      const reason = prompt('Digite o motivo da rejeição (obrigatório):');
      if (!reason) return;
      
      const response = await maintenanceAPI.reject(requestId, { reason });
      
      if (response.data.success) {
        loadRequests(); // Recarregar lista
        alert('Solicitação rejeitada com sucesso!');
      }
    } catch (error) {
      alert('Erro ao rejeitar solicitação: ' + (error.response?.data?.message || error.message));
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

  const canManageRequest = (request) => {
    return ['admin', 'manager', 'syndic'].includes(user.role) || request.user_id === user.id;
  };

  const canApproveReject = (request) => {
    return ['admin', 'manager', 'syndic'].includes(user.role) && request.status === 'pending';
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Solicitações de Manutenção</h1>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => window.location.href = '/manutencao/solicitacoes/nova'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">➕</span>
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Filtros</h2>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Título, descrição, localização..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Condomínio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condomínio
              </label>
              <select
                value={filters.condominium_id}
                onChange={(e) => handleFilterChange('condominium_id', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                {condominiums.map(condo => (
                  <option key={condo.id} value={condo.id}>
                    {condo.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todas</option>
                <option value="plumbing">Hidráulica</option>
                <option value="electrical">Elétrica</option>
                <option value="hvac">Ar Condicionado</option>
                <option value="elevator">Elevador</option>
                <option value="security">Segurança</option>
                <option value="cleaning">Limpeza</option>
                <option value="landscaping">Jardinagem</option>
                <option value="structural">Estrutural</option>
                <option value="appliances">Equipamentos</option>
                <option value="other">Outros</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendente</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
                <option value="rejected">Rejeitada</option>
              </select>
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridade
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todas</option>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            {/* Data de */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Data até */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data até
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Lista de Solicitações */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {requests.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <div key={request.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-3">
                            {request.priority === 'urgent' ? '🚨' : request.priority === 'high' ? '⚠️' : '🔧'}
                          </span>
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.title}
                          </h3>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {request.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-3">
                          <span>{getCategoryLabel(request.category)}</span>
                          <span>•</span>
                          <span>{request.unit ? `Unidade ${request.unit.number}` : 'Área Geral'}</span>
                          <span>•</span>
                          <span>{request.user?.name}</span>
                          <span>•</span>
                          <span>{request.created_at ? new Date(request.created_at).toLocaleDateString('pt-BR') : 'Data não disponível'}</span>
                        </div>
                        
                        {request.location && (
                          <div className="text-sm text-gray-500 mb-2">
                            📍 {request.location}
                          </div>
                        )}
                        
                        {(request.estimated_cost || request.actual_cost) && (
                          <div className="text-sm text-gray-500 mb-2">
                            💰 {request.estimated_cost && `Estimado: R$ ${parseFloat(request.estimated_cost).toFixed(2)}`}
                            {request.actual_cost && ` | Atual: R$ ${parseFloat(request.actual_cost).toFixed(2)}`}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                            {getPriorityLabel(request.priority)}
                          </span>
                          
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {canApproveReject(request) && (
                            <>
                              <button
                                onClick={() => handleApprove(request.id)}
                                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => window.location.href = `/manutencao/solicitacoes/${request.id}`}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <span className="text-4xl mb-4 block">🔧</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma solicitação encontrada
                </h3>
                <p className="text-gray-500">
                  Tente ajustar os filtros ou criar uma nova solicitação.
                </p>
              </div>
            )}

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {((pagination.current_page - 1) * pagination.per_page) + 1} até{' '}
                    {Math.min(pagination.current_page * pagination.per_page, pagination.total)} de{' '}
                    {pagination.total} resultados
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    
                    <span className="px-3 py-1 text-sm">
                      Página {pagination.current_page} de {pagination.pages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.pages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MaintenanceRequestsList;