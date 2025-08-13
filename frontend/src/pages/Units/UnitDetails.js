import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { unitAPI, userAPI, maintenanceAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const UnitDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState(null);
  const [residents, setResidents] = useState([]);
  const [history, setHistory] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Estados para modais
  const [showAddResident, setShowAddResident] = useState(false);
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [residentData, setResidentData] = useState({
    relationship: 'owner', // owner, tenant, relative, other
    move_in_date: new Date().toISOString().split('T')[0],
    lease_end_date: '',
    emergency_contact: '',
    notes: ''
  });
  const [historyEntry, setHistoryEntry] = useState({
    type: 'resident_change', // resident_change, maintenance, status_change, payment, other
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadUnitDetails();
  }, [id]);

  const loadUnitDetails = async () => {
    setLoading(true);
    try {
      // Carregar detalhes da unidade usando endpoint existente
      const unitResponse = await unitAPI.getById(id);
      if (unitResponse.data.success) {
        const unitData = unitResponse.data.data || unitResponse.data.unit;
        setUnit(unitData);
        
        // Extrair moradores dos relacionamentos existentes
        const residents = unitData.residents || [];
        setResidents(residents);
      }

      // Carregar usuários disponíveis para adicionar como moradores
      try {
        const usersResponse = await userAPI.getAll({ role: 'resident', status: 'active' });
        if (usersResponse.data.success) {
          const users = usersResponse.data.data?.users || usersResponse.data.users || [];
          // Filtrar usuários que já são moradores desta unidade
          const currentResidentIds = residents.map(r => r.user_id);
          setAvailableUsers(users.filter(u => !currentResidentIds.includes(u.id)));
        }
      } catch (error) {
        console.log('Aviso: Não foi possível carregar usuários disponíveis');
      }

      // Definir histórico vazio por enquanto (funcionalidade será implementada)
      setHistory([]);

      setError('');
    } catch (error) {
      console.error('Erro ao carregar detalhes da unidade:', error);
      setError('Erro ao carregar dados da unidade');
    } finally {
      setLoading(false);
    }
  };

  const handleAddResident = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      // Funcionalidade temporariamente desabilitada
      setError('Funcionalidade de adicionar morador será implementada em breve');
      setShowAddResident(false);
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao adicionar morador');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveResident = async (userId) => {
    if (!window.confirm('Tem certeza que deseja remover este morador?')) return;

    try {
      // Funcionalidade temporariamente desabilitada
      setError('Funcionalidade de remover morador será implementada em breve');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao remover morador');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddHistoryEntry = async (e) => {
    e.preventDefault();
    
    try {
      // Funcionalidade temporariamente desabilitada
      setError('Funcionalidade de histórico será implementada em breve');
      setShowAddHistory(false);
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao adicionar entrada de histórico');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      vacant: 'bg-green-100 text-green-800',
      occupied: 'bg-blue-100 text-blue-800',
      rented: 'bg-purple-100 text-purple-800',
      maintenance: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || colors.vacant;
  };

  const getStatusLabel = (status) => {
    const labels = {
      vacant: 'Vaga',
      occupied: 'Ocupada',
      rented: 'Alugada',
      maintenance: 'Manutenção'
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

  const getRelationshipLabel = (relationship) => {
    const labels = {
      owner: 'Proprietário',
      tenant: 'Inquilino',
      relative: 'Familiar',
      other: 'Outro'
    };
    return labels[relationship] || relationship;
  };

  const getHistoryTypeLabel = (type) => {
    const labels = {
      resident_change: 'Mudança de Morador',
      maintenance: 'Manutenção',
      status_change: 'Mudança de Status',
      payment: 'Pagamento',
      other: 'Outros'
    };
    return labels[type] || type;
  };

  const getHistoryIcon = (type) => {
    const icons = {
      resident_change: '👥',
      maintenance: '🔧',
      status_change: '📝',
      payment: '💰',
      other: '📋'
    };
    return icons[type] || '📋';
  };

  const canManageUnit = () => {
    return user.role === 'admin' || user.role === 'manager' || 
           (user.role === 'syndic' && user.condominiums?.some(c => c.id === unit?.condominium_id));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Unidade não encontrada</h2>
          <button
            onClick={() => navigate('/unidades/lista')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Voltar à lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/unidades/lista')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900"
            >
              ←
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Unidade {unit.number}
              </h1>
              <p className="text-gray-600">{unit.condominium?.name}</p>
            </div>
          </div>
          
          {canManageUnit() && (
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/unidades/${id}/editar`)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => setError('Funcionalidade será implementada em breve')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-gray-100 cursor-not-allowed"
                disabled
              >
                👥 Adicionar Morador (Em Breve)
              </button>
            </div>
          )}
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

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral', icon: '🏠' },
              { id: 'residents', label: 'Moradores', icon: '👥' },
              { id: 'history', label: 'Histórico', icon: '📋' },
              { id: 'maintenance', label: 'Manutenções', icon: '🔧' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informações Básicas */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Informações da Unidade</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número</label>
                    <p className="text-lg font-semibold">{unit.number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tipo</label>
                    <p className="text-lg">{getTypeLabel(unit.type)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(unit.status)}`}>
                      {getStatusLabel(unit.status)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Andar</label>
                    <p className="text-lg">{unit.floor || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Área</label>
                    <p className="text-lg">{unit.area ? `${unit.area}m²` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Quartos</label>
                    <p className="text-lg">{unit.bedrooms || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Banheiros</label>
                    <p className="text-lg">{unit.bathrooms || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Vagas</label>
                    <p className="text-lg">{unit.parking_spots || 'N/A'}</p>
                  </div>
                </div>
                
                {unit.description && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Descrição</label>
                    <p className="text-gray-700">{unit.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Moradores Atuais:</span>
                    <span className="font-medium">{residents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Taxa Mensal:</span>
                    <span className="font-medium">
                      {unit.condominium_fee ? `R$ ${parseFloat(unit.condominium_fee).toFixed(2)}` : 
                       unit.monthly_amount ? `R$ ${parseFloat(unit.monthly_amount).toFixed(2)}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Criada em:</span>
                    <span className="font-medium">
                      {new Date(unit.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas */}
              {canManageUnit() && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAddResident(true)}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      👥 Adicionar Morador
                    </button>
                    <button
                      onClick={() => setShowAddHistory(true)}
                      className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded"
                    >
                      📝 Adicionar ao Histórico
                    </button>
                    <button
                      onClick={() => navigate(`/manutencao/solicitacoes/nova?unit=${id}`)}
                      className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded"
                    >
                      🔧 Nova Manutenção
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'residents' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Moradores da Unidade</h2>
              {canManageUnit() && (
                <button
                  onClick={() => setShowAddResident(true)}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Adicionar Morador
                </button>
              )}
            </div>
            
            <div className="divide-y divide-gray-200">
              {residents.length > 0 ? residents.map((resident) => (
                <div key={resident.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {resident.user?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {resident.user?.name || 'Nome não disponível'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getRelationshipLabel(resident.relationship)} • 
                          Desde {new Date(resident.move_in_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    {canManageUnit() && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRemoveResident(resident.user_id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {resident.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Observações:</strong> {resident.notes}
                    </div>
                  )}
                </div>
              )) : (
                <div className="px-6 py-12 text-center">
                  <span className="text-4xl mb-4 block">👥</span>
                  <p className="text-gray-500">Nenhum morador cadastrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Histórico da Unidade</h2>
              {canManageUnit() && (
                <button
                  onClick={() => setShowAddHistory(true)}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Adicionar Entrada
                </button>
              )}
            </div>
            
            <div className="divide-y divide-gray-200">
              {history.length > 0 ? history.map((entry) => (
                <div key={entry.id} className="px-6 py-4">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">{getHistoryIcon(entry.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">{entry.title}</h3>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 mt-2">
                        {getHistoryTypeLabel(entry.type)}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-12 text-center">
                  <span className="text-4xl mb-4 block">📋</span>
                  <p className="text-gray-500">Nenhuma entrada de histórico</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Manutenções da Unidade</h2>
            </div>
            
            <div className="p-6 text-center">
              <span className="text-4xl mb-4 block">🔧</span>
              <p className="text-gray-500 mb-4">
                Histórico de manutenções será integrado em breve
              </p>
              <button
                onClick={() => navigate(`/manutencao/solicitacoes?unit=${id}`)}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
              >
                Ver Manutenções da Unidade
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Adicionar Morador */}
      {showAddResident && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative z-10">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adicionar Morador</h3>
              
              <form onSubmit={handleAddResident} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuário *
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um usuário</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relação com a Unidade
                  </label>
                  <select
                    value={residentData.relationship}
                    onChange={(e) => setResidentData({...residentData, relationship: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="owner">Proprietário</option>
                    <option value="tenant">Inquilino</option>
                    <option value="relative">Familiar</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    value={residentData.move_in_date}
                    onChange={(e) => setResidentData({...residentData, move_in_date: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={residentData.notes}
                    onChange={(e) => setResidentData({...residentData, notes: e.target.value})}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddResident(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar ao Histórico */}
      {showAddHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative z-10">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adicionar ao Histórico</h3>
              
              <form onSubmit={handleAddHistoryEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={historyEntry.type}
                    onChange={(e) => setHistoryEntry({...historyEntry, type: e.target.value})}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="resident_change">Mudança de Morador</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="status_change">Mudança de Status</option>
                    <option value="payment">Pagamento</option>
                    <option value="other">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={historyEntry.title}
                    onChange={(e) => setHistoryEntry({...historyEntry, title: e.target.value})}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição *
                  </label>
                  <textarea
                    value={historyEntry.description}
                    onChange={(e) => setHistoryEntry({...historyEntry, description: e.target.value})}
                    required
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={historyEntry.date}
                    onChange={(e) => setHistoryEntry({...historyEntry, date: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddHistory(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitDetails;