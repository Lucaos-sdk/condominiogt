import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const BookingsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [condominiums, setCondominiums] = useState([]);
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    mostBooked: []
  });

  // Cargar condomínios disponíveis
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

  // Cargar estatísticas quando condomínio for selecionado
  useEffect(() => {
    if (selectedCondominium) {
      fetchStats();
    }
  }, [selectedCondominium]);

  const fetchStats = async () => {
    if (!selectedCondominium) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/bookings/stats/${selectedCondominium}`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        mostBooked: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statuses = {
      pending: 'Pendente',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
      completed: 'Concluída',
      cancelled: 'Cancelada'
    };
    return statuses[status] || status;
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

  const StatCard = ({ title, value, color, icon, subtitle }) => (
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
              {subtitle && (
                <dd className="text-xs text-gray-500">{subtitle}</dd>
              )}
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard - Reservas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Visão geral das reservas de áreas comuns
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
            Selecione um condomínio para visualizar as estatísticas das reservas.
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
          {/* Cards de Estatísticas - Primeira Linha */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total de Reservas"
              value={stats.total || 0}
              color="bg-blue-500"
              icon="📅"
            />
            <StatCard
              title="Pendentes"
              value={stats.pending || 0}
              color="bg-yellow-500"
              icon="⏳"
            />
            <StatCard
              title="Aprovadas"
              value={stats.approved || 0}
              color="bg-green-500"
              icon="✅"
            />
            <StatCard
              title="Concluídas"
              value={stats.completed || 0}
              color="bg-purple-500"
              icon="🏁"
            />
          </div>

          {/* Cards de Estatísticas - Segunda Linha */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Receita Total"
              value={`R$ ${(stats.totalRevenue || 0).toFixed(2)}`}
              color="bg-green-600"
              icon="💰"
            />
            <StatCard
              title="Pagamentos Pendentes"
              value={`R$ ${(stats.pendingPayments || 0).toFixed(2)}`}
              color="bg-red-500"
              icon="💳"
            />
            <StatCard
              title="Canceladas"
              value={stats.cancelled || 0}
              color="bg-gray-500"
              icon="❌"
            />
          </div>

          {/* Áreas Mais Reservadas */}
          {stats.mostBooked && stats.mostBooked.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Áreas Mais Reservadas
                </h3>
                <div className="space-y-4">
                  {stats.mostBooked.map((area, index) => (
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
                            {getTypeLabel(area.type)} • Capacidade: {area.capacity || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {area.bookings_count || 0} reservas
                        </p>
                        <p className="text-xs text-gray-500">
                          Receita: R$ {(area.total_revenue || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reservas Recentes */}
          {stats.recentBookings && stats.recentBookings.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Reservas Recentes
                </h3>
                <div className="space-y-3">
                  {stats.recentBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {booking.event_name || `Reserva de ${booking.CommonArea?.name}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.User?.name} • {new Date(booking.start_time).toLocaleDateString('pt-BR')} às {new Date(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                          booking.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                          booking.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getStatusLabel(booking.status)}
                        </span>
                        {booking.fee && (
                          <span className="text-xs text-gray-500">
                            R$ {parseFloat(booking.fee).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ações Rápidas */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = '/reservas/lista'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  📋 Ver Todas as Reservas
                </button>
                <button
                  onClick={() => window.location.href = '/reservas/nova'}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ➕ Nova Reserva
                </button>
                <button
                  onClick={() => window.location.href = '/reservas/calendario'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  📅 Calendário
                </button>
                <button
                  onClick={() => window.location.href = '/areas-comuns'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  🏢 Ver Áreas Comuns
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BookingsDashboard;