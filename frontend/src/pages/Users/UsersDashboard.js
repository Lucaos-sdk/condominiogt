import React, { useState, useEffect } from 'react';
import { userAPI, condominiumAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const UsersDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
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

      const response = await userAPI.getAll(params);
      if (response.data.success) {
        const data = response.data.data || response.data;
        const users = data.users || [];
        
        // Calcular estatísticas
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === 'active').length;
        const pendingUsers = users.filter(u => u.status === 'pending').length;
        const inactiveUsers = users.filter(u => u.status === 'inactive').length;
        
        // Estatísticas por role
        const byRole = users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        setStats({
          total_users: totalUsers,
          active_users: activeUsers,
          pending_users: pendingUsers,
          inactive_users: inactiveUsers,
          by_role: Object.entries(byRole).map(([role, count]) => ({ role, count }))
        });

        // Usuários recentes (últimos 5)
        const recent = users
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentUsers(recent);
        
        setError('');
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas de usuários:', error);
      setError('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.inactive;
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Ativo',
      pending: 'Pendente',
      inactive: 'Inativo'
    };
    return labels[status] || status;
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      manager: 'Gestor',
      syndic: 'Síndico',
      resident: 'Morador'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      syndic: 'bg-indigo-100 text-indigo-800',
      resident: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors.resident;
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Usuários</h1>
        
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
            onClick={() => window.location.href = '/usuarios/novo'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">➕</span>
            Novo Usuário
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
              title="Total de Usuários"
              value={stats.total_users || 0}
              color="text-blue-600"
              icon="👥"
            />
            
            <StatCard
              title="Usuários Ativos"
              value={stats.active_users || 0}
              color="text-green-600"
              icon="✅"
            />
            
            <StatCard
              title="Aguardando Aprovação"
              value={stats.pending_users || 0}
              color="text-yellow-600"
              icon="⏳"
            />
            
            <StatCard
              title="Inativos"
              value={stats.inactive_users || 0}
              color="text-gray-600"
              icon="❌"
            />
          </div>

          {/* Estatísticas por Role */}
          {stats.by_role && stats.by_role.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Usuários por Função</h2>
                <div className="space-y-3">
                  {stats.by_role.map((item) => (
                    <div key={item.role} className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(item.role)}`}>
                        {getRoleLabel(item.role)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.count} usuários
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = '/usuarios/novo'}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <span className="mr-2">➕</span>
                    Adicionar Usuário
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/usuarios?status=pending'}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <span className="mr-2">⏳</span>
                    Aprovar Pendentes
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/usuarios'}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <span className="mr-2">📋</span>
                    Gerenciar Usuários
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alertas */}
          {stats.pending_users > 0 && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <span className="text-yellow-400 mr-3">⚠️</span>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Usuários Aguardando Aprovação
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Existem {stats.pending_users} usuários aguardando aprovação para acesso ao sistema.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Usuários Recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Usuários Recentes</h2>
          <button
            onClick={() => window.location.href = '/usuarios'}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver todos →
          </button>
        </div>
        
        <div className="overflow-hidden">
          {recentUsers && recentUsers.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentUsers.map((user) => (
                <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.email} • {user.phone || 'Sem telefone'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                      
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                        {getStatusLabel(user.status)}
                      </span>
                      
                      <span className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <span className="text-4xl mb-4 block">👥</span>
              <p className="text-gray-500">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersDashboard;