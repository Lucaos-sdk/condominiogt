import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const BookingsList = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [condominiums, setCondominiums] = useState([]);
  const [commonAreas, setCommonAreas] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Filtros
  const [filters, setFilters] = useState({
    condominium_id: '',
    common_area_id: '',
    status: '',
    payment_status: '',
    search: '',
    date_from: '',
    date_to: ''
  });

  const statuses = {
    pending: 'Pendente',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
    completed: 'Concluída',
    cancelled: 'Cancelada'
  };

  const paymentStatuses = {
    pending: 'Pendente',
    paid: 'Pago',
    refunded: 'Reembolsado'
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  const paymentColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-blue-100 text-blue-800'
  };

  // Carregar dados iniciais
  useEffect(() => {
    fetchCondominiums();
  }, []);

  useEffect(() => {
    if (filters.condominium_id) {
      fetchCommonAreas(filters.condominium_id);
    }
  }, [filters.condominium_id]);

  useEffect(() => {
    fetchBookings();
  }, [pagination.page, filters]);

  const fetchCondominiums = async () => {
    try {
      const response = await api.get('/condominiums');
      setCondominiums(response.data.condominiums || []);
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    }
  };

  const fetchCommonAreas = async (condominiumId) => {
    try {
      const response = await api.get(`/common-areas/condominium/${condominiumId}`);
      setCommonAreas(response.data.commonAreas || []);
    } catch (error) {
      console.error('Erro ao carregar áreas comuns:', error);
      setCommonAreas([]);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await api.get(`/bookings?${params}`);
      
      setBookings(response.data.bookings || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Tem certeza que deseja aprovar esta reserva?')) {
      return;
    }

    try {
      await api.post(`/bookings/${id}/approve`, {
        admin_notes: 'Reserva aprovada via interface web'
      });
      fetchBookings(); // Recarregar lista
      alert('Reserva aprovada com sucesso!');
    } catch (error) {
      console.error('Erro ao aprovar reserva:', error);
      alert('Erro ao aprovar reserva.');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Motivo da rejeição (obrigatório):');
    if (!reason || reason.trim().length < 10) {
      alert('Motivo da rejeição deve ter pelo menos 10 caracteres.');
      return;
    }

    try {
      await api.post(`/bookings/${id}/reject`, {
        rejection_reason: reason.trim()
      });
      fetchBookings(); // Recarregar lista
      alert('Reserva rejeitada com sucesso!');
    } catch (error) {
      console.error('Erro ao rejeitar reserva:', error);
      alert('Erro ao rejeitar reserva.');
    }
  };

  const handleMarkAsPaid = async (id) => {
    if (!window.confirm('Marcar esta reserva como paga?')) {
      return;
    }

    try {
      await api.post(`/bookings/${id}/pay`);
      fetchBookings(); // Recarregar lista
      alert('Reserva marcada como paga!');
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      alert('Erro ao marcar reserva como paga.');
    }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Motivo do cancelamento (opcional):');
    
    try {
      await api.post(`/bookings/${id}/cancel`, {
        cancellation_reason: reason?.trim() || 'Cancelamento via interface web'
      });
      fetchBookings(); // Recarregar lista
      alert('Reserva cancelada com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error);
      alert('Erro ao cancelar reserva.');
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'syndic';

  if (loading && pagination.page === 1) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie as reservas de áreas comuns
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => window.location.href = '/reservas/nova'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ➕ Nova Reserva
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condomínio
              </label>
              <select
                value={filters.condominium_id}
                onChange={(e) => handleFilterChange('condominium_id', e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os condomínios</option>
                {condominiums.map((cond) => (
                  <option key={cond.id} value={cond.id}>
                    {cond.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área Comum
              </label>
              <select
                value={filters.common_area_id}
                onChange={(e) => handleFilterChange('common_area_id', e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!filters.condominium_id}
              >
                <option value="">Todas as áreas</option>
                {commonAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os status</option>
                {Object.entries(statuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pagamento
              </label>
              <select
                value={filters.payment_status}
                onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                {Object.entries(paymentStatuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Nome do evento, usuário, área..."
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Reservas */}
      <div className="bg-white shadow rounded-lg">
        {bookings.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">
              {loading ? 'Carregando...' : 'Nenhuma reserva encontrada.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserva
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área Comum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxa
                  </th>
                  {canManage && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.event_name || `Reserva #${booking.id}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {booking.id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.CommonArea?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.CommonArea?.Condominium?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.start_time).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.User?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.Unit?.number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status]}`}>
                        {statuses[booking.status] || booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paymentColors[booking.payment_status]}`}>
                        {paymentStatuses[booking.payment_status] || booking.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.fee ? `R$ ${parseFloat(booking.fee).toFixed(2)}` : 'Gratuita'}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(booking.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Aprovar"
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => handleReject(booking.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Rejeitar"
                              >
                                ❌
                              </button>
                            </>
                          )}
                          {booking.status === 'approved' && booking.payment_status === 'pending' && booking.fee > 0 && (
                            <button
                              onClick={() => handleMarkAsPaid(booking.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Marcar como Pago"
                            >
                              💳
                            </button>
                          )}
                          {(booking.status === 'pending' || booking.status === 'approved') && (
                            <button
                              onClick={() => handleCancel(booking.id)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Cancelar"
                            >
                              🚫
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  até{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium">{pagination.total}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                    let page;
                    if (pagination.totalPages <= 5) {
                      page = index + 1;
                    } else if (pagination.page <= 3) {
                      page = index + 1;
                    } else if (pagination.page > pagination.totalPages - 3) {
                      page = pagination.totalPages - 4 + index;
                    } else {
                      page = pagination.page - 2 + index;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsList;