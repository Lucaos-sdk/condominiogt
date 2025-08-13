import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { financialAPI, condominiumAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getTagBadge } from '../../utils/transactionTags';

const FinancialDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedCondominium, setSelectedCondominium] = useState(null);
  const [condominiums, setCondominiums] = useState([]);
  const [balanceData, setBalanceData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCondominiums();
  }, []);

  useEffect(() => {
    if (selectedCondominium) {
      loadBalanceData();
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

  const loadBalanceData = async () => {
    if (!selectedCondominium) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await financialAPI.getBalance(selectedCondominium);
      if (response.data.success) {
        setBalanceData(response.data.data || response.data);
      } else {
        setError('Erro ao carregar dados financeiros');
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      setError('Erro ao carregar dados financeiros. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const StatusCard = ({ title, value, subtitle, color, icon }) => (
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

  if (loading && !balanceData) {
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>
        
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

      {balanceData && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatusCard
              title="Saldo Atual"
              value={formatCurrency(balanceData.current_balance)}
              color={getBalanceColor(balanceData.current_balance)}
              icon="💰"
            />
            
            <StatusCard
              title="Receitas Total"
              value={formatCurrency(balanceData.statistics.total_income)}
              color="text-green-600"
              icon="📈"
            />
            
            <StatusCard
              title="Despesas Total"
              value={formatCurrency(balanceData.statistics.total_expenses)}
              color="text-red-600"
              icon="📉"
            />
            
            <StatusCard
              title="Pendências"
              value={formatCurrency(balanceData.statistics.pending_amount)}
              subtitle={`${balanceData.statistics.pending_count} transações`}
              color="text-yellow-600"
              icon="⏰"
            />

            <StatusCard
              title="Em Atraso"
              value={formatCurrency(balanceData.statistics.overdue_amount)}
              subtitle={`${balanceData.statistics.overdue_count} pagamentos`}
              color="text-red-600"
              icon="🚨"
            />
          </div>

          {/* Alertas */}
          {balanceData.statistics.overdue_count > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <span className="text-red-400 mr-3">⚠️</span>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Atenção: Pagamentos em Atraso
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Existem {balanceData.statistics.overdue_count} transações em atraso 
                    totalizando {formatCurrency(balanceData.statistics.overdue_amount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transações Recentes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Transações Recentes</h2>
                <p className="text-sm text-gray-500">Clique em qualquer transação para ver detalhes</p>
              </div>
              <button
                onClick={() => navigate('/financeiro/transacoes')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver todas →
              </button>
            </div>
            
            <div className="overflow-hidden">
              {balanceData.recent_transactions && balanceData.recent_transactions.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {balanceData.recent_transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="px-6 py-4 hover:bg-blue-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-500"
                      onClick={() => navigate(`/financeiro/transacoes/${transaction.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">
                              {transaction.type === 'income' ? '💰' : '💸'}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {transaction.unit ? `Unidade ${transaction.unit.number}` : 'Geral'} • 
                                {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {(() => {
                            const badge = getTagBadge(transaction, { size: 'small' });
                            return (
                              <span className={badge.className} data-tag={badge.tag}>
                                {badge.label}
                              </span>
                            );
                          })()}
                          
                          <span className={`text-sm font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                          
                          <span className="text-gray-400 text-sm">
                            👁️
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <span className="text-4xl mb-4 block">📊</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma transação encontrada
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Comece adicionando receitas e despesas para ver o resumo financeiro aqui.
                  </p>
                  <button
                    onClick={() => navigate('/financeiro/transacoes/nova')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <span className="mr-2">➕</span>
                    Adicionar Primeira Transação
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/financeiro/transacoes/nova')}
              className="flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mr-2">➕</span>
              Nova Transação
            </button>
            
            <button
              onClick={() => navigate('/financeiro/transacoes')}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mr-2">📋</span>
              Ver Todas as Transações
            </button>
            
            <button
              onClick={() => window.location.href = '/relatorios/financeiro'}
              className="flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <span className="mr-2">📊</span>
              Relatório Financeiro
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialDashboard;