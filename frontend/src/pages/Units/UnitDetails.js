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
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Estados para modais
  const [showAddResident, setShowAddResident] = useState(false);
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [residentData, setResidentData] = useState({
    relationship: 'owner', // owner, tenant, family, dependent, guest
    move_in_date: new Date().toISOString().split('T')[0],
    lease_end_date: '',
    emergency_contact: '',
    notes: ''
  });
  const [historyEntry, setHistoryEntry] = useState({
    action_type: 'general_update', // resident_added, resident_removed, resident_updated, status_changed, owner_changed, tenant_changed, fee_changed, general_update
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadUnitDetails();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUnitDetails = async () => {
    setLoading(true);
    try {
      // Carregar detalhes da unidade usando endpoint existente
      const unitResponse = await unitAPI.getById(id);
      console.log('🔍 UnitDetails - Response completa:', unitResponse.data);
      if (unitResponse.data.success) {
        const unitData = unitResponse.data.data?.unit || unitResponse.data.unit;
        console.log('🔍 UnitDetails - Unit data extraída:', unitData);
        console.log('🔍 UnitDetails - Floor:', unitData?.floor, 'Bedrooms:', unitData?.bedrooms, 'Bathrooms:', unitData?.bathrooms, 'Parking:', unitData?.parking_spots);
        setUnit(unitData);
      }

      // Carregar residentes da unidade usando endpoint específico
      try {
        const residentsResponse = await unitAPI.getResidents(id);
        console.log('🏠 [DEBUG] Residents response:', residentsResponse.data);
        // O endpoint de residentes retorna diretamente um array
        if (Array.isArray(residentsResponse.data)) {
          setResidents(residentsResponse.data);
        } else if (residentsResponse.data.success) {
          const residentsData = residentsResponse.data.data || residentsResponse.data;
          setResidents(residentsData);
        }
      } catch (error) {
        console.log('Aviso: Não foi possível carregar residentes da unidade', error);
        // Fallback: usar residentes do unitData se disponível
        const unitData = unitResponse.data.data?.unit || unitResponse.data.unit;
        setResidents(unitData?.residents || []);
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

      // Carregar histórico da unidade
      try {
        const historyResponse = await unitAPI.getHistory(id);
        console.log('📋 [DEBUG] History response:', historyResponse.data);
        if (historyResponse.data) {
          // O endpoint de histórico retorna {history: [...], pagination: {...}}
          const historyData = historyResponse.data.history || historyResponse.data.data || [];
          console.log('📋 [DEBUG] History data:', historyData);
          setHistory(historyData);
        }
      } catch (error) {
        console.log('Aviso: Não foi possível carregar histórico da unidade');
        setHistory([]);
      }

      // Carregar manutenções da unidade
      try {
        const maintenanceResponse = await maintenanceAPI.getRequests({ unit_id: id });

        if (maintenanceResponse.data.success) {
          // O endpoint retorna {success: true, data: {requests: [...], pagination: {...}}}
          const maintenanceData = maintenanceResponse.data.data?.requests || maintenanceResponse.data.requests || [];
          setMaintenanceRequests(maintenanceData);
        }
      } catch (error) {
        console.log('Aviso: Não foi possível carregar manutenções da unidade');
        setMaintenanceRequests([]);
      }

      // Carregar pagamentos da unidade
      try {
        const [paymentsResponse, summaryResponse] = await Promise.all([
          unitAPI.getPayments(id, { limit: 12 }),
          unitAPI.getPaymentSummary(id)
        ]);

        if (paymentsResponse.data.success) {
          const paymentsData = paymentsResponse.data.data?.payments || paymentsResponse.data.payments || [];
          setPayments(paymentsData);
        }

        if (summaryResponse.data.success) {
          const summaryData = summaryResponse.data.data?.summary || summaryResponse.data.summary || null;
          setPaymentSummary(summaryData);
        }
      } catch (error) {
        console.log('Aviso: Não foi possível carregar pagamentos da unidade');
        setPayments([]);
        setPaymentSummary(null);
      }

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
      // Encontrar dados do usuário selecionado
      const selectedUserData = availableUsers.find(u => u.id === parseInt(selectedUser));
      if (!selectedUserData) {
        setError('Usuário selecionado não encontrado');
        return;
      }

      // Preparar dados do residente
      const residentPayload = {
        user_id: selectedUserData.id, // IMPORTANTE: Vincular ao usuário
        name: selectedUserData.name,
        cpf: selectedUserData.cpf || String(Math.floor(Math.random() * 99999999999)).padStart(11, '0'), // CPF único se não informado
        email: selectedUserData.email || '',
        phone: selectedUserData.phone ? selectedUserData.phone.replace(/\D/g, '') : '', // Remover formatação do telefone
        relationship: residentData.relationship,
        // Remover birth_date se for null para evitar erro de validação
        is_main_resident: residentData.relationship === 'owner',
        move_in_date: residentData.move_in_date,
        notes: residentData.notes
      };

      console.log('🔍 Enviando dados do residente:', residentPayload);
      const response = await unitAPI.addResident(id, residentPayload);
      
      if (response.data.success || response.data.id) {
        setSuccess('Morador adicionado com sucesso!');
        setShowAddResident(false);

        // Limpar formulário
        setSelectedUser('');
        setResidentData({
          relationship: 'owner',
          move_in_date: new Date().toISOString().split('T')[0],
          lease_end_date: '',
          emergency_contact: '',
          notes: ''
        });

        // Recarregar apenas os residentes
        try {
          const residentsResponse = await unitAPI.getResidents(id);
          console.log('🏠 [DEBUG] Residents reloaded:', residentsResponse.data);
          if (Array.isArray(residentsResponse.data)) {
            setResidents(residentsResponse.data);
          }
        } catch (error) {
          console.log('Erro ao recarregar residentes:', error);
          // Fallback: recarregar tudo
          await loadUnitDetails();
        }

        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao adicionar morador:', error);
      setError(error.response?.data?.message || 'Erro ao adicionar morador');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveResident = async (residentId) => {
    if (!window.confirm('Tem certeza que deseja remover este morador?')) return;

    try {
      const response = await unitAPI.removeResident(residentId);
      console.log('🗑️ [DEBUG] Remove resident response:', response.data);

      if (response.data.success || response.status === 200) {
        setSuccess('Morador removido com sucesso!');

        // Recarregar apenas os residentes
        try {
          const residentsResponse = await unitAPI.getResidents(id);
          console.log('🏠 [DEBUG] Residents reloaded after removal:', residentsResponse.data);
          if (Array.isArray(residentsResponse.data)) {
            setResidents(residentsResponse.data);
          }
        } catch (error) {
          console.log('Erro ao recarregar residentes:', error);
          // Fallback: recarregar tudo
          await loadUnitDetails();
        }

        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao remover morador:', error);
      setError(error.response?.data?.message || 'Erro ao remover morador');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddHistoryEntry = async (e) => {
    e.preventDefault();
    
    try {
      // Preparar dados no formato correto para o backend
      const historyData = {
        action_type: historyEntry.action_type,
        description: historyEntry.description,
        old_values: null,
        new_values: null,
        metadata: { manual_entry: true }
      };

      const response = await unitAPI.addHistoryEntry(id, historyData);
      
      if (response.data.success !== false) { // Backend não retorna success:true para este endpoint
        setSuccess('Entrada de histórico adicionada com sucesso!');
        setShowAddHistory(false);
        
        // Limpar formulário
        setHistoryEntry({
          action_type: 'general_update',
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        
        // Recarregar dados
        await loadUnitDetails();
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao adicionar entrada de histórico:', error);
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
      family: 'Familiar',
      dependent: 'Dependente',
      guest: 'Convidado'
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
                onClick={() => setShowAddResident(true)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                👥 Adicionar Morador
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
              { id: 'payments', label: 'Pagamentos', icon: '💰' },
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
                    <label className="block text-sm font-medium text-gray-500">Bloco</label>
                    <p className="text-lg">{unit.block || 'N/A'}</p>
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
                    <p className="text-lg">{unit.floor !== null && unit.floor !== undefined ? unit.floor : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Área</label>
                    <p className="text-lg">{unit.area ? `${unit.area}m²` : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Quartos</label>
                    <p className="text-lg">{unit.bedrooms !== null && unit.bedrooms !== undefined ? unit.bedrooms : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Banheiros</label>
                    <p className="text-lg">{unit.bathrooms !== null && unit.bathrooms !== undefined ? unit.bathrooms : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Vagas</label>
                    <p className="text-lg">{unit.parking_spots !== null && unit.parking_spots !== undefined ? unit.parking_spots : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mobiliado</label>
                    <p className="text-lg">{unit.furnished ? '✅ Sim' : '❌ Não'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Pets Permitidos</label>
                    <p className="text-lg">{unit.pet_allowed ? '✅ Sim' : '❌ Não'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Varanda</label>
                    <p className="text-lg">{unit.balcony ? '✅ Sim' : '❌ Não'}</p>
                  </div>
                </div>
                
                {unit.description && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Descrição</label>
                    <p className="text-gray-700">{unit.description}</p>
                  </div>
                )}
              </div>

              {/* Informações Financeiras e de Contrato */}
              {(unit.rent_amount || unit.condominium_fee || unit.contract_start_date || unit.owner_name || unit.tenant_name) && (
                <div className="bg-white rounded-lg shadow p-6 mt-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Financeiras e Contrato</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {unit.condominium_fee && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Taxa Condominial</label>
                        <p className="text-lg font-semibold text-green-600">R$ {parseFloat(unit.condominium_fee).toFixed(2)}</p>
                      </div>
                    )}
                    {unit.rent_amount && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Valor do Aluguel</label>
                        <p className="text-lg font-semibold text-blue-600">R$ {parseFloat(unit.rent_amount).toFixed(2)}</p>
                      </div>
                    )}
                    {unit.deposit_amount && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Depósito</label>
                        <p className="text-lg">R$ {parseFloat(unit.deposit_amount).toFixed(2)}</p>
                      </div>
                    )}
                    {unit.contract_type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Tipo de Contrato</label>
                        <p className="text-lg">{unit.contract_type}</p>
                      </div>
                    )}
                    {unit.contract_start_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Início do Contrato</label>
                        <p className="text-lg">{new Date(unit.contract_start_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                    {unit.contract_end_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Fim do Contrato</label>
                        <p className="text-lg">{new Date(unit.contract_end_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                    {unit.owner_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Proprietário</label>
                        <p className="text-lg">{unit.owner_name}</p>
                        {unit.owner_email && <p className="text-sm text-gray-600">{unit.owner_email}</p>}
                        {unit.owner_phone && <p className="text-sm text-gray-600">{unit.owner_phone}</p>}
                      </div>
                    )}
                    {unit.tenant_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Inquilino</label>
                        <p className="text-lg">{unit.tenant_name}</p>
                        {unit.tenant_email && <p className="text-sm text-gray-600">{unit.tenant_email}</p>}
                        {unit.tenant_phone && <p className="text-sm text-gray-600">{unit.tenant_phone}</p>}
                      </div>
                    )}
                    {unit.guarantor_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Fiador</label>
                        <p className="text-lg">{unit.guarantor_name}</p>
                        {unit.guarantor_phone && <p className="text-sm text-gray-600">{unit.guarantor_phone}</p>}
                      </div>
                    )}
                    {unit.last_renovation_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Última Renovação</label>
                        <p className="text-lg">{new Date(unit.last_renovation_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                          onClick={() => handleRemoveResident(resident.id)}
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

        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Resumo de Pagamentos */}
            {paymentSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pagamentos em Dia</p>
                      <p className="text-2xl font-semibold text-gray-900">{paymentSummary.paid_count}</p>
                      <p className="text-sm text-green-600">R$ {parseFloat(paymentSummary.total_paid || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-sm">!</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Em Atraso</p>
                      <p className="text-2xl font-semibold text-gray-900">{paymentSummary.overdue_count}</p>
                      <p className="text-sm text-red-600">R$ {parseFloat(paymentSummary.total_overdue || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 text-sm">⏳</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pendentes</p>
                      <p className="text-2xl font-semibold text-gray-900">{paymentSummary.pending_count}</p>
                      <p className="text-sm text-yellow-600">R$ {parseFloat(paymentSummary.total_pending || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">📊</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-semibold text-gray-900">{paymentSummary.total_payments}</p>
                      <p className="text-sm text-blue-600">
                        R$ {(parseFloat(paymentSummary.total_paid || 0) + parseFloat(paymentSummary.total_overdue || 0) + parseFloat(paymentSummary.total_pending || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Próximo Vencimento e Último Pagamento */}
            {paymentSummary && (paymentSummary.next_due || paymentSummary.last_payment) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentSummary.next_due && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Próximo Vencimento</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Referência:</span>
                        <span className="font-medium">
                          {paymentSummary.next_due.reference_month}/{paymentSummary.next_due.reference_year}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Vencimento:</span>
                        <span className="font-medium">
                          {paymentSummary.next_due.due_date ? new Date(paymentSummary.next_due.due_date).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Valor:</span>
                        <span className="font-medium">R$ {parseFloat(paymentSummary.next_due.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          paymentSummary.next_due.detailed_status?.color === 'success' ? 'bg-green-100 text-green-800' :
                          paymentSummary.next_due.detailed_status?.color === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          paymentSummary.next_due.detailed_status?.color === 'danger' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {paymentSummary.next_due.detailed_status?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {paymentSummary.last_payment && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Último Pagamento</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Referência:</span>
                        <span className="font-medium">
                          {paymentSummary.last_payment.reference_month}/{paymentSummary.last_payment.reference_year}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Data:</span>
                        <span className="font-medium">
                          {paymentSummary.last_payment.payment_date ? new Date(paymentSummary.last_payment.payment_date).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Valor:</span>
                        <span className="font-medium">R$ {parseFloat(paymentSummary.last_payment.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Método:</span>
                        <span className="font-medium">
                          {paymentSummary.last_payment.financial_transaction?.payment_method || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lista de Pagamentos */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Histórico de Pagamentos</h2>
                {canManageUnit() && (
                  <button
                    onClick={() => {
                      // TODO: Implementar modal de novo pagamento
                      console.log('Criar novo pagamento');
                    }}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Gerar Cobrança
                  </button>
                )}
              </div>

              <div className="divide-y divide-gray-200">
                {payments.length > 0 ? payments.map((payment) => (
                  <div key={payment.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">
                            Condomínio {payment.reference_month}/{payment.reference_year}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            payment.detailed_status?.color === 'success' ? 'bg-green-100 text-green-800' :
                            payment.detailed_status?.color === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            payment.detailed_status?.color === 'danger' ? 'bg-red-100 text-red-800' :
                            payment.detailed_status?.color === 'info' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.detailed_status?.label || payment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {payment.detailed_status?.description || 'Sem descrição adicional'}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <span>Vencimento: {payment.due_date ? new Date(payment.due_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                          <span className="mx-2">•</span>
                          <span>Valor: R$ {parseFloat(payment.total_amount || 0).toFixed(2)}</span>
                          {payment.payment_date && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Pago em: {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                            </>
                          )}
                          {payment.days_overdue && payment.days_overdue > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-red-600">{payment.days_overdue} dias em atraso</span>
                            </>
                          )}
                        </div>
                      </div>

                      {canManageUnit() && payment.status !== 'paid' && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              // TODO: Implementar modal de confirmar pagamento
                              console.log('Confirmar pagamento:', payment.id);
                            }}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Confirmar Pagamento
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-12 text-center">
                    <span className="text-4xl mb-4 block">💰</span>
                    <p className="text-gray-500 mb-4">Nenhum pagamento registrado</p>
                    {canManageUnit() && (
                      <button
                        onClick={() => {
                          // TODO: Implementar modal de novo pagamento
                          console.log('Criar primeiro pagamento');
                        }}
                        className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        Gerar Primeira Cobrança
                      </button>
                    )}
                  </div>
                )}
              </div>
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
                    <span className="text-2xl mr-3">{getHistoryIcon(entry.action_type || entry.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">{entry.title || entry.description || 'Ação de histórico'}</h3>
                        <span className="text-xs text-gray-500">
                          {entry.date ? new Date(entry.date).toLocaleDateString('pt-BR') :
                           entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('pt-BR') :
                           entry.created_at ? new Date(entry.created_at).toLocaleDateString('pt-BR') :
                           'Data não disponível'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{entry.notes || entry.description || 'Sem detalhes adicionais'}</p>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 mt-2">
                        {getHistoryTypeLabel(entry.action_type || entry.type)}
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
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Manutenções da Unidade</h2>
              {canManageUnit() && (
                <button
                  onClick={() => navigate(`/manutencao/solicitacoes/nova?unit=${id}`)}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  Nova Solicitação
                </button>
              )}
            </div>
            
            <div className="divide-y divide-gray-200">
              {maintenanceRequests.length > 0 ? maintenanceRequests.map((request) => (
                <div key={request.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">{request.title}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'open' ? 'bg-red-100 text-red-800' :
                          request.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status === 'open' ? 'Aberta' :
                           request.status === 'in_progress' ? 'Em Andamento' :
                           request.status === 'completed' ? 'Concluída' :
                           request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <span>Prioridade: {request.priority === 'low' ? 'Baixa' : request.priority === 'medium' ? 'Média' : 'Alta'}</span>
                        <span className="mx-2">•</span>
                        <span>Criada em {new Date(request.createdAt).toLocaleDateString('pt-BR')}</span>
                        {request.estimated_cost && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Custo estimado: R$ {parseFloat(request.estimated_cost).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => navigate(`/manutencao/solicitacoes/${request.id}`)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-12 text-center">
                  <span className="text-4xl mb-4 block">🔧</span>
                  <p className="text-gray-500 mb-4">Nenhuma solicitação de manutenção</p>
                  {canManageUnit() && (
                    <button
                      onClick={() => navigate(`/manutencao/solicitacoes/nova?unit=${id}`)}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                    >
                      Criar Primeira Solicitação
                    </button>
                  )}
                </div>
              )}
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
                    <option value="family">Familiar</option>
                    <option value="dependent">Dependente</option>
                    <option value="guest">Convidado</option>
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
                    value={historyEntry.action_type}
                    onChange={(e) => setHistoryEntry({...historyEntry, action_type: e.target.value})}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general_update">Atualização Geral</option>
                    <option value="status_changed">Mudança de Status</option>
                    <option value="owner_changed">Mudança de Proprietário</option>
                    <option value="tenant_changed">Mudança de Inquilino</option>
                    <option value="fee_changed">Mudança de Taxa</option>
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