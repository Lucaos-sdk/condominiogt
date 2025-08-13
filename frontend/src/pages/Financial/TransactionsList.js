import React, { useState, useEffect } from 'react';
import { financialAPI, condominiumAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const TransactionsList = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [condominiums, setCondominiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [error, setError] = useState('');
  
  // Filtros
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    type: '',
    category: '',
    status: '',
    payment_method: '',
    condominium_id: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    loadTransactions();
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
      setError('Erro ao carregar condomínios');
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Remove filtros vazios
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const response = await financialAPI.getTransactions(cleanFilters);
      if (response.data.success) {
        const data = response.data.data || response.data;
        setTransactions(data.transactions || []);
        setPagination(data.pagination || {});
        setError('');
      } else {
        setError('Erro ao carregar transações');
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setError('Erro ao carregar transações. Verifique sua conexão.');
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
      category: '',
      status: '',
      payment_method: '',
      condominium_id: '',
      date_from: '',
      date_to: ''
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      paid: 'Pago',
      pending: 'Pendente',
      overdue: 'Em Atraso',
      cancelled: 'Cancelado'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        type === 'income' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
      }`}>
        {type === 'income' ? 'Receita' : 'Despesa'}
      </span>
    );
  };

  const getCategoryLabel = (category) => {
    const labels = {
      condominium_fee: 'Taxa Condominial',
      water: 'Água',
      electricity: 'Energia',
      gas: 'Gás',
      maintenance: 'Manutenção',
      security: 'Segurança',
      cleaning: 'Limpeza',
      insurance: 'Seguro',
      reserve_fund: 'Fundo de Reserva',
      other: 'Outros'
    };
    return labels[category] || category;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Dinheiro',
      bank_transfer: 'Transferência',
      pix: 'PIX',
      pix_a: 'PIX A',
      pix_b: 'PIX B',
      pix_c: 'PIX C',
      credit_card: 'Cartão Crédito',
      debit_card: 'Cartão Débito',
      bank_slip: 'Boleto',
      mixed: 'Pagamento Misto'
    };
    return labels[method] || method;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Transações Financeiras</h1>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => window.location.href = '/financeiro/transacoes/nova'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">➕</span>
            Nova Transação
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
                placeholder="Descrição, número da fatura..."
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
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
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
                <option value="paid">Pago</option>
                <option value="overdue">Em Atraso</option>
                <option value="cancelled">Cancelado</option>
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

      {/* Lista de Transações */}
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
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vencimento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getCategoryLabel(transaction.category)}
                              {transaction.unit && ` • Unidade ${transaction.unit.number}`}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(transaction.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(transaction.total_amount)}
                          </span>
                          {transaction.payment_method && (
                            <div className="text-xs text-gray-500">
                              {getPaymentMethodLabel(transaction.payment_method)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(transaction.status)}
                          {transaction.mixed_payment && (
                            <div className="text-xs text-purple-600 mt-1">
                              Pagamento Misto
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => window.location.href = `/financeiro/transacoes/${transaction.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Ver
                          </button>
                          {(user.role === 'admin' || transaction.created_by === user.id) && (
                            <button
                              onClick={() => window.location.href = `/financeiro/transacoes/${transaction.id}/editar`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <span className="text-4xl mb-4 block">📊</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma transação encontrada
                </h3>
                <p className="text-gray-500">
                  Tente ajustar os filtros ou criar uma nova transação.
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

export default TransactionsList;