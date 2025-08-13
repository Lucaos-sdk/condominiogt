import React, { useState, useEffect } from 'react';
import { unitAPI, condominiumAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const UnitsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentUnits, setRecentUnits] = useState([]);
  const [selectedCondominium, setSelectedCondominium] = useState('all');
  const [condominiums, setCondominiums] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCondominiums();
    loadStats();
  }, []);

  useEffect(() => {
    if (selectedCondominium) {
      loadStats();
    }
  }, [selectedCondominium]);

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

  const loadStats = async () => {
    setLoading(true);
    try {
      const params = selectedCondominium && selectedCondominium !== 'all' 
        ? { condominium_id: selectedCondominium } 
        : {};

      const response = await unitAPI.getAll(params);
      if (response.data.success) {
        const data = response.data.data || response.data;
        const units = data.units || [];
        
        // Calcular estatísticas
        const totalUnits = units.length;
        const occupiedUnits = units.filter(u => u.status === 'occupied').length;
        const availableUnits = units.filter(u => u.status === 'available').length;
        const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;
        
        // Estatísticas por tipo
        const byType = units.reduce((acc, unit) => {
          acc[unit.type] = (acc[unit.type] || 0) + 1;
          return acc;
        }, {});

        // Estatísticas por condomínio
        const byCondominium = units.reduce((acc, unit) => {
          const condoName = unit.condominium?.name || 'Sem condomínio';
          acc[condoName] = (acc[condoName] || 0) + 1;
          return acc;
        }, {});

        setStats({
          total_units: totalUnits,
          occupied_units: occupiedUnits,
          available_units: availableUnits,
          maintenance_units: maintenanceUnits,
          by_type: Object.entries(byType).map(([type, count]) => ({ type, count })),
          by_condominium: Object.entries(byCondominium).map(([condominium, count]) => ({ condominium, count }))
        });

        // Unidades recentes (últimas 5)
        const recent = units
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentUnits(recent);
        
        setError('');
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas de unidades:', error);
      setError('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Unidades</h1>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {/* Filtro por Condomínio */}
          {user.role === 'admin' && condominiums.length > 0 && (
            <select
              value={selectedCondominium}
              onChange={(e) => setSelectedCondominium(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os Condomínios</option>
              {condominiums.map(condo => (
                <option key={condo.id} value={condo.id}>
                  {condo.name}
                </option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => window.location.href = '/unidades/nova'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">➕</span>
            Nova Unidade
          </button>
        </div>
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
              title="Total de Unidades"
              value={stats.total_units || 0}
              color="text-blue-600"
              icon="🏢"
            />
            
            <StatCard
              title="Unidades Ocupadas"
              value={stats.occupied_units || 0}
              subtitle={`${((stats.occupied_units / stats.total_units) * 100 || 0).toFixed(1)}% ocupação`}
              color="text-blue-600"
              icon="👥"
            />
            
            <StatCard
              title="Unidades Disponíveis"
              value={stats.available_units || 0}
              color="text-green-600"
              icon="🟢"
            />
            
            <StatCard
              title="Em Manutenção"
              value={stats.maintenance_units || 0}
              color="text-yellow-600"
              icon="🔧"
            />
          </div>

          {/* Estatísticas por Tipo e Condomínio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {stats.by_type && stats.by_type.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Unidades por Tipo</h2>
                <div className="space-y-3">
                  {stats.by_type.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.count} unidades
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.by_condominium && stats.by_condominium.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Unidades por Condomínio</h2>
                <div className="space-y-3">
                  {stats.by_condominium.map((item) => (
                    <div key={item.condominium} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {item.condominium}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.count} unidades
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/unidades/nova'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <span className="mr-2">➕</span>
                  Adicionar Unidade
                </button>
                
                <button
                  onClick={() => window.location.href = '/unidades/lista?status=available'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <span className="mr-2">🟢</span>
                  Ver Disponíveis
                </button>
                
                <button
                  onClick={() => window.location.href = '/unidades/lista?status=maintenance'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <span className="mr-2">🔧</span>
                  Ver em Manutenção
                </button>
                
                <button
                  onClick={() => window.location.href = '/unidades/lista'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <span className="mr-2">📋</span>
                  Gerenciar Todas
                </button>
              </div>
            </div>

            {/* Alertas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Status do Sistema</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      stats.available_units > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">Unidades Disponíveis</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    stats.available_units > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {stats.available_units > 0 ? `${stats.available_units} disponíveis` : 'Nenhuma disponível'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      stats.maintenance_units === 0 ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">Manutenções</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    stats.maintenance_units === 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {stats.maintenance_units === 0 ? 'Em dia' : `${stats.maintenance_units} em manutenção`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Taxa de Ocupação</span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {((stats.occupied_units / stats.total_units) * 100 || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Unidades Recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Unidades Recentes</h2>
          <button
            onClick={() => window.location.href = '/unidades/lista'}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver todas →
          </button>
        </div>
        
        <div className="overflow-hidden">
          {recentUnits && recentUnits.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentUnits.map((unit) => (
                <div 
                  key={unit.id} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.location.href = `/unidades/${unit.id}/detalhes`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {unit.number}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                            Unidade {unit.number} - {getTypeLabel(unit.type)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {unit.condominium?.name || 'Sem condomínio'} • 
                            Criada em {new Date(unit.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(unit.status)}`}>
                        {getStatusLabel(unit.status)}
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
              <span className="text-4xl mb-4 block">🏢</span>
              <p className="text-gray-500">Nenhuma unidade encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitsDashboard;