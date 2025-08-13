import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const CommonAreasDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [condominiums, setCondominiums] = useState([]);
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    maintenance: 0,
    unavailable: 0,
    mostUsed: []
  });

  // Caregar condomínios disponíveis
  useEffect(() => {
    const fetchCondominiums = async () => {
      try {
        const response = await api.get('/condominiums');
        setCondominiums(response.data.condominiums || []);
        
        // Selecionar primeiro condomínio automaticamente
        if (response.data.condominiums && response.data.condominiums.length > 0) {
          setSelectedCondominium(response.data.condominiums[0].id.toString());
        }
      } catch (error) {
        console.error('Erro ao carregar condomínios:', error);
      }
    };

    fetchCondominiums();
  }, []);

  // Carregar estatísticas quando condomínio for selecionado
  useEffect(() => {
    if (selectedCondominium) {
      fetchStats();
    }
  }, [selectedCondominium]);

  const fetchStats = async () => {
    if (!selectedCondominium) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/common-areas/stats/${selectedCondominium}`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStats({
        total: 0,
        available: 0,
        maintenance: 0,
        unavailable: 0,
        mostUsed: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      pool: 'Piscina',
      gym: 'Academia',
      party_room: 'Salão de Festas',
      playground: 'Playground',
      barbecue: 'Churrasqueira',
      garden: 'Jardim',
      parking: 'Estacionamento',
      laundry: 'Lavanderia',
      meeting_room: 'Sala de Reuniões',
      other: 'Outros'
    };
    return types[type] || type;
  };

  const StatCard = ({ title, value, color, icon }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
              <span className="text-white font-semibold">{icon}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !selectedCondominium) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard - Áreas Comuns</h1>
            <p className="mt-1 text-sm text-gray-500">
              Visão geral das áreas comuns do condomínio
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <label htmlFor="condominium" className="block text-sm font-medium text-gray-700 mb-1">
              Condomínio
            </label>
            <select
              id="condominium"
              value={selectedCondominium}
              onChange={(e) => setSelectedCondominium(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Selecione um condomínio</option>
              {condominiums.map((cond) => (
                <option key={cond.id} value={cond.id}>
                  {cond.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedCondominium ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">
            Selecione um condomínio para visualizar as estatísticas das áreas comuns.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total de Áreas"
              value={stats.total || 0}
              color="bg-blue-500"
              icon="📍"
            />
            <StatCard
              title="Disponíveis"
              value={stats.available || 0}
              color="bg-green-500"
              icon="✅"
            />
            <StatCard
              title="Em Manutenção"
              value={stats.maintenance || 0}
              color="bg-yellow-500"
              icon="🔧"
            />
            <StatCard
              title="Indisponíveis"
              value={stats.unavailable || 0}
              color="bg-red-500"
              icon="❌"
            />
          </div>

          {/* Áreas Mais Utilizadas */}
          {stats.mostUsed && stats.mostUsed.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Áreas Mais Utilizadas
                </h3>
                <div className="space-y-4">
                  {stats.mostUsed.map((area, index) => (
                    <div key={area.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{area.name}</p>
                          <p className="text-xs text-gray-500">
                            {getTypeLabel(area.type)} • Capacidade: {area.capacity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {area.bookings_count || 0} reservas
                        </p>
                        <p className="text-xs text-gray-500">
                          Status: {area.status === 'available' ? 'Disponível' : 
                                  area.status === 'maintenance' ? 'Manutenção' : 'Indisponível'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ações Rápidas */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/areas-comuns/lista'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  📋 Ver Todas as Áreas
                </button>
                {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'syndic') && (
                  <button
                    onClick={() => window.location.href = '/areas-comuns/nova'}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ➕ Nova Área Comum
                  </button>
                )}
                <button
                  onClick={() => window.location.href = '/reservas'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  📅 Ver Reservas
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CommonAreasDashboard;