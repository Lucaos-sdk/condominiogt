import React from 'react';
import { Link } from 'react-router-dom';

const Reports = () => {
  const reportTypes = [
    {
      title: 'Relatório Financeiro',
      description: 'Análise detalhada das receitas, despesas e saldo do condomínio',
      icon: '💰',
      path: '/reports/financial',
      color: 'bg-green-500',
      features: [
        'Receitas e despesas por período',
        'Análise por categoria',
        'Saldo atual e histórico',
        'Transações recentes',
        'Exportação PDF/Excel'
      ]
    },
    {
      title: 'Relatório de Manutenção',
      description: 'Estatísticas e análise das solicitações de manutenção',
      icon: '🔧',
      path: '/reports/maintenance',
      color: 'bg-yellow-500',
      features: [
        'Solicitações por status',
        'Tempo médio de resolução',
        'Custos de manutenção',
        'Categorias mais solicitadas',
        'Avaliações dos serviços'
      ]
    },
    {
      title: 'Relatório de Ocupação',
      description: 'Análise de ocupação e uso das áreas comuns',
      icon: '🏠',
      path: '/reports/occupancy',
      color: 'bg-blue-500',
      features: [
        'Taxa de ocupação',
        'Reservas de áreas comuns',
        'Uso por período',
        'Áreas mais utilizadas',
        'Receita de reservas'
      ]
    },
    {
      title: 'Relatório de Comunicações',
      description: 'Estatísticas de comunicações e engajamento',
      icon: '📢',
      path: '/reports/communications',
      color: 'bg-purple-500',
      features: [
        'Comunicações publicadas',
        'Taxa de visualização',
        'Engajamento (curtidas)',
        'Tipos mais utilizados',
        'Comunicações por período'
      ]
    },
    {
      title: 'Relatório Executivo',
      description: 'Visão consolidada de todos os sistemas do condomínio',
      icon: '📊',
      path: '/reports/executive',
      color: 'bg-indigo-500',
      features: [
        'Visão geral consolidada',
        'KPIs principais',
        'Tendências e análises',
        'Comparativos mensais',
        'Dashboard interativo'
      ]
    },
    {
      title: 'Relatório de Usuários',
      description: 'Análise de usuários e perfis de acesso',
      icon: '👥',
      path: '/reports/users',
      color: 'bg-pink-500',
      features: [
        'Usuários por condomínio',
        'Perfis de acesso',
        'Atividade no sistema',
        'Usuários ativos/inativos',
        'Associações e permissões'
      ]
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Centro de Relatórios</h1>
        <p className="text-gray-600">
          Acesse relatórios detalhados e análises do sistema de gestão
        </p>
      </div>

      {/* Grid de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${report.color} rounded-lg flex items-center justify-center mr-4`}>
                  <span className="text-white text-xl">{report.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                {report.description}
              </p>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recursos inclusos:</h4>
                <ul className="space-y-1">
                  {report.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-xs text-gray-600">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center">
                <Link
                  to={report.path}
                  className={`inline-flex items-center px-4 py-2 ${report.color} text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-200`}
                >
                  Visualizar
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Seguro
                </div>
              </div>
            </div>

            {/* Barra de status/disponibilidade */}
            <div className="border-t border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    report.path === '/reports/financial' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">
                    {report.path === '/reports/financial' ? 'Disponível' : 'Em desenvolvimento'}
                  </span>
                </div>
                
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  PDF/Excel
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Seção de Informações Adicionais */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Dados em Tempo Real</h3>
            <p className="text-xs text-gray-600">
              Todos os relatórios são gerados com dados atualizados em tempo real
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Segurança Total</h3>
            <p className="text-xs text-gray-600">
              Acesso controlado por permissões e auditoria completa
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Exportação Fácil</h3>
            <p className="text-xs text-gray-600">
              Exporte relatórios em PDF, Excel ou outros formatos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;