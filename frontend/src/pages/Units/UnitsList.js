import React, { useState, useEffect } from 'react';
import { unitAPI, condominiumAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DebugDeleteUnit from './DebugDeleteUnit';

const UnitsList = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [condominiums, setCondominiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    type: '',
    status: '',
    condominium_id: ''
  });

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    loadUnits();
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

  const loadUnits = async () => {
    setLoading(true);
    try {
      // Remove filtros vazios
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await unitAPI.getAll(cleanFilters);
      
      if (response.data.success) {
        const data = response.data.data || response.data;
        const unitsList = data.units || [];
        
        setUnits(unitsList);
        setPagination(data.pagination || {});
        setError('');
      } else {
        setError('Erro ao carregar unidades');
      }
    } catch (error) {
      setError('Erro ao carregar unidades. Verifique sua conexão.');
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
      limit: 20,
      search: '',
      type: '',
      status: '',
      condominium_id: ''
    });
  };

  const handleStatusChange = async (unitId, newStatus) => {
    try {
      const response = await unitAPI.update(unitId, { status: newStatus });
      if (response.data.success) {
        setSuccess(`Status da unidade atualizado para ${getStatusLabel(newStatus)}`);
        loadUnits(); // Recarregar lista
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao atualizar status da unidade');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (unitId) => {
    // Prevent double deletion
    if (deletingUnit === unitId) {
      return;
    }

    if (!unitId || isNaN(unitId)) {
      setError('ID da unidade inválido');
      return;
    }

    const unitToDelete = units.find(unit => unit.id === unitId);
    if (!window.confirm(`Tem certeza que deseja deletar a unidade ${unitToDelete?.number}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    setDeletingUnit(unitId);
    setError('');
    setSuccess('');
    
    try {
      const response = await unitAPI.delete(unitId);
      
      if (response.status === 200 && response.data?.success) {
        // Immediate UI update - remove from current list
        setUnits(prevUnits => {
          const newUnits = prevUnits.filter(unit => unit.id !== unitId);
          
          // Update pagination count
          setPagination(prev => ({
            ...prev,
            total: Math.max(0, prev.total - 1)
          }));
          
          return newUnits;
        });
        
        setSuccess(`Unidade ${unitToDelete?.number} deletada com sucesso.`);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error(response.data?.message || 'Erro ao deletar unidade');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido ao deletar unidade';
      setError(`Erro ao deletar unidade: ${errorMessage}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeletingUnit(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.inactive;
  };

  const getStatusLabel = (status) => {
    const labels = {
      available: 'Disponível',
      occupied: 'Ocupada',
      maintenance: 'Manutenção',
      inactive: 'Inativa'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type) => {
    const labels = {
      apartment: 'Apartamento',
      house: 'Casa',
      commercial: 'Comercial',
      parking: 'Garagem',
      storage: 'Depósito'
    };
    return labels[type] || type;
  };

  const canEditUnit = (unit) => {
    if (user.role === 'admin') return true;
    if (user.role === 'manager') return true;
    if (user.role === 'syndic' && user.condominiums?.some(c => c.id === unit.condominium_id)) return true;
    return false;
  };

  const canDeleteUnit = (unit) => {
    if (user.role === 'admin') return true;
    if (user.role === 'manager') return true;
    return false;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Unidades</h1>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              showDebug 
                ? 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500' 
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
            }`}
          >
            <span className="mr-2">🔍</span>
            {showDebug ? 'Ocultar Debug' : 'Modo Debug'}
          </button>
          <button
            onClick={() => window.location.href = '/unidades/nova'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">➕</span>
            Nova Unidade
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Filtros</h2>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Número da unidade..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="apartment">Apartamento</option>
                <option value="house">Casa</option>
                <option value="commercial">Comercial</option>
                <option value="parking">Garagem</option>
                <option value="storage">Depósito</option>
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
                <option value="available">Disponível</option>
                <option value="occupied">Ocupada</option>
                <option value="maintenance">Manutenção</option>
                <option value="inactive">Inativa</option>
              </select>
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

            {/* Botão Limpar */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Lista de Unidades */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {units.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Condomínio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detalhes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-800">
                                  {unit.number}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                Unidade {unit.number}
                              </div>
                              <div className="text-sm text-gray-500">
                                {unit.floor ? `${unit.floor}º andar` : 'Andar não informado'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {unit.condominium?.name || 'Sem condomínio'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {unit.condominium?.address || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            {getTypeLabel(unit.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(unit.status)}`}>
                            {getStatusLabel(unit.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div>{unit.bedrooms ? `${unit.bedrooms} quartos` : 'N/A'}</div>
                            <div className="text-gray-500">{unit.area ? `${unit.area}m²` : 'Área não informada'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => window.location.href = `/unidades/${unit.id}/detalhes`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Detalhes
                            </button>
                            
                            {canEditUnit(unit) && (
                              <button
                                onClick={() => window.location.href = `/unidades/${unit.id}/editar`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Editar
                              </button>
                            )}
                            
                            {unit.status === 'available' && canEditUnit(unit) && (
                              <button
                                onClick={() => handleStatusChange(unit.id, 'occupied')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Ocupar
                              </button>
                            )}
                            
                            {unit.status === 'occupied' && canEditUnit(unit) && (
                              <button
                                onClick={() => handleStatusChange(unit.id, 'available')}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Liberar
                              </button>
                            )}

                            {unit.status !== 'maintenance' && canEditUnit(unit) && (
                              <button
                                onClick={() => handleStatusChange(unit.id, 'maintenance')}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Manutenção
                              </button>
                            )}
                            
                            {canDeleteUnit(unit) && !showDebug && (
                              <button
                                onClick={() => handleDelete(unit.id)}
                                disabled={deletingUnit === unit.id}
                                className={`text-red-600 hover:text-red-900 ${
                                  deletingUnit === unit.id ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {deletingUnit === unit.id ? 'Deletando...' : 'Deletar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <span className="text-4xl mb-4 block">🏢</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma unidade encontrada
                </h3>
                <p className="text-gray-500">
                  Tente ajustar os filtros ou criar uma nova unidade.
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

      {/* Debug Components */}
      {showDebug && canDeleteUnit({ role: 'admin' }) && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-red-800 mb-4">🔍 Modo Debug - Deleção de Unidades</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ <strong>ATENÇÃO:</strong> Este modo é para debug do problema de deleção. 
              Use apenas para investigar por que deletar uma unidade está criando outra.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.slice(0, 6).map(unit => (
              <DebugDeleteUnit 
                key={unit.id}
                unitId={unit.id}
                unitNumber={unit.number}
                onComplete={() => loadUnits()}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsList;