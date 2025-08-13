import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  condominiumAPI, 
  financialAPI 
} from '../../services/api';
import { exportService } from '../../services/exportService';

const FinancialReport = () => {
  const { user } = useAuth();
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [condominiums, setCondominiums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    period: 'current_month',
    startDate: '',
    endDate: '',
    category: '',
    type: '',
    paymentMethod: ''
  });

  // Carrega lista de condomínios
  useEffect(() => {
    const loadCondominiums = async () => {
      try {
        const response = await condominiumAPI.getAll();
        const condos = response.data.condominiums || [];
        setCondominiums(condos);
        
        if (condos.length > 0 && !selectedCondominium) {
          setSelectedCondominium(condos[0].id.toString());
        }
      } catch (error) {
        console.error('Erro ao carregar condomínios:', error);
      }
    };

    loadCondominiums();
  }, [selectedCondominium]);

  // Carrega dados do relatório
  const loadReportData = async () => {
    if (!selectedCondominium) return;
    
    setLoading(true);
    try {
      const params = {
        period: filters.period,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.category && { category: filters.category }),
        ...(filters.type && { type: filters.type }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod })
      };

      const [reportResponse, balanceResponse, transactionsResponse] = await Promise.all([
        financialAPI.getReport(selectedCondominium, params),
        financialAPI.getBalance(selectedCondominium),
        financialAPI.getAll({ condominiumId: selectedCondominium, ...params, limit: 20 })
      ]);

      setReportData({
        report: reportResponse.data,
        balance: balanceResponse.data,
        recentTransactions: transactionsResponse.data.transactions || []
      });
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedCondominium, filters]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToPDF = () => {
    if (!reportData || !selectedCondominium) {
      alert('Carregue um relatório primeiro');
      return;
    }

    const condominium = condominiums.find(c => c.id == selectedCondominium);
    const condominiumName = condominium ? condominium.name : 'Condomínio';

    try {
      exportService.exportFinancialReportToPDF(reportData, condominiumName, filters);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Tente novamente.');
    }
  };

  const exportToExcel = () => {
    if (!reportData || !selectedCondominium) {
      alert('Carregue um relatório primeiro');
      return;
    }

    const condominium = condominiums.find(c => c.id == selectedCondominium);
    const condominiumName = condominium ? condominium.name : 'Condomínio';

    try {
      exportService.exportFinancialReportToExcel(reportData, condominiumName, reportData.recentTransactions);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao exportar Excel. Tente novamente.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando relatório...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header com filtros */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatórios Financeiros</h1>
            <p className="text-gray-600">Análise detalhada das finanças do condomínio</p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            <button
              onClick={exportToPDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              📄 Exportar PDF
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              📊 Exportar Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condomínio
              </label>
              <select
                value={selectedCondominium}
                onChange={(e) => setSelectedCondominium(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um condomínio</option>
                {condominiums.map((condo) => (
                  <option key={condo.id} value={condo.id}>
                    {condo.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="current_month">Mês Atual</option>
                <option value="last_month">Mês Anterior</option>
                <option value="current_quarter">Trimestre Atual</option>
                <option value="current_year">Ano Atual</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                <option value="condominium_fee">Taxa de Condomínio</option>
                <option value="maintenance">Manutenção</option>
                <option value="utilities">Utilidades</option>
                <option value="security">Segurança</option>
                <option value="cleaning">Limpeza</option>
                <option value="administration">Administração</option>
                <option value="reserves">Reservas</option>
                <option value="other">Outros</option>
              </select>
            </div>
          </div>

          {filters.period === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {!selectedCondominium ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Selecione um condomínio para visualizar o relatório</p>
        </div>
      ) : reportData ? (
        <>
          {/* Resumo Executivo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Receitas</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {formatCurrency(reportData.report.total_income)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {reportData.report.income_transactions || 0} transações
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">💸</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Despesas</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {formatCurrency(reportData.report.total_expenses)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {reportData.report.expense_transactions || 0} transações
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    (reportData.balance.current_balance || 0) >= 0 
                      ? 'bg-blue-500' 
                      : 'bg-red-500'
                  }`}>
                    <span className="text-white text-sm">🏦</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Saldo Atual</p>
                  <p className={`text-2xl font-semibold ${
                    (reportData.balance.current_balance || 0) >= 0 
                      ? 'text-blue-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(reportData.balance.current_balance)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Saldo em {formatDate(new Date())}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalhamento por Categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Receitas por Categoria</h3>
              </div>
              <div className="p-6">
                {reportData.report.income_by_category && Object.keys(reportData.report.income_by_category).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(reportData.report.income_by_category).map(([category, data]) => (
                      <div key={category} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {category === 'condominium_fee' ? 'Taxa de Condomínio' :
                             category === 'reserves' ? 'Reservas' :
                             category === 'other' ? 'Outros' : category}
                          </p>
                          <p className="text-xs text-gray-500">{data.count} transações</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            {formatCurrency(data.total)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((data.total / reportData.report.total_income) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhuma receita encontrada</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Despesas por Categoria</h3>
              </div>
              <div className="p-6">
                {reportData.report.expense_by_category && Object.keys(reportData.report.expense_by_category).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(reportData.report.expense_by_category).map(([category, data]) => (
                      <div key={category} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {category === 'maintenance' ? 'Manutenção' :
                             category === 'utilities' ? 'Utilidades' :
                             category === 'security' ? 'Segurança' :
                             category === 'cleaning' ? 'Limpeza' :
                             category === 'administration' ? 'Administração' :
                             category === 'other' ? 'Outros' : category}
                          </p>
                          <p className="text-xs text-gray-500">{data.count} transações</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            {formatCurrency(data.total)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((data.total / reportData.report.total_expenses) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhuma despesa encontrada</p>
                )}
              </div>
            </div>
          </div>

          {/* Transações Recentes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Transações Recentes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.recentTransactions.length > 0 ? (
                    reportData.recentTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getTypeColor(transaction.type)}`}>
                            {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTypeColor(transaction.type)}`}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status === 'paid' ? 'Pago' :
                             transaction.status === 'pending' ? 'Pendente' :
                             transaction.status === 'overdue' ? 'Vencido' : transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        Nenhuma transação encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregue um relatório para visualizar os dados</p>
        </div>
      )}
    </div>
  );
};

export default FinancialReport;