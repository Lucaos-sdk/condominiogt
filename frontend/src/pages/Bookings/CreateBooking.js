import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const CreateBooking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [condominiums, setCondominiums] = useState([]);
  const [commonAreas, setCommonAreas] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedAreaDetails, setSelectedAreaDetails] = useState(null);
  const [conflictCheck, setConflictCheck] = useState({ loading: false, conflicts: [] });
  
  const [formData, setFormData] = useState({
    common_area_id: '',
    unit_id: '',
    event_name: '',
    special_requests: '',
    start_time: '',
    end_time: '',
    condominium_id: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCondominiums();
  }, []);

  useEffect(() => {
    if (formData.condominium_id) {
      fetchCommonAreas(formData.condominium_id);
      fetchUnits(formData.condominium_id);
    }
  }, [formData.condominium_id]);

  useEffect(() => {
    if (formData.common_area_id) {
      fetchAreaDetails(formData.common_area_id);
    }
  }, [formData.common_area_id]);

  useEffect(() => {
    if (formData.common_area_id && formData.start_time && formData.end_time) {
      checkConflicts();
    }
  }, [formData.common_area_id, formData.start_time, formData.end_time]);

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
      const response = await api.get(`/common-areas/condominium/${condominiumId}?status=available`);
      setCommonAreas(response.data.commonAreas || []);
    } catch (error) {
      console.error('Erro ao carregar áreas comuns:', error);
      setCommonAreas([]);
    }
  };

  const fetchUnits = async (condominiumId) => {
    try {
      const response = await api.get(`/units/condominium/${condominiumId}`);
      setUnits(response.data.units || []);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      setUnits([]);
    }
  };

  const fetchAreaDetails = async (areaId) => {
    try {
      const response = await api.get(`/common-areas/${areaId}`);
      setSelectedAreaDetails(response.data);
    } catch (error) {
      console.error('Erro ao carregar detalhes da área:', error);
      setSelectedAreaDetails(null);
    }
  };

  const checkConflicts = async () => {
    setConflictCheck({ loading: true, conflicts: [] });
    
    try {
      const response = await api.get(`/bookings/common-area/${formData.common_area_id}`, {
        params: {
          start_time: formData.start_time,
          end_time: formData.end_time,
          status: 'approved,pending'
        }
      });
      
      const conflicts = response.data.bookings?.filter(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        const newStart = new Date(formData.start_time);
        const newEnd = new Date(formData.end_time);
        
        return (newStart < bookingEnd && newEnd > bookingStart);
      }) || [];
      
      setConflictCheck({ loading: false, conflicts });
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      setConflictCheck({ loading: false, conflicts: [] });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.condominium_id) {
      newErrors.condominium_id = 'Selecione um condomínio';
    }

    if (!formData.common_area_id) {
      newErrors.common_area_id = 'Selecione uma área comum';
    }

    if (!formData.unit_id) {
      newErrors.unit_id = 'Selecione uma unidade';
    }

    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Nome do evento é obrigatório';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Data e hora de início são obrigatórias';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'Data e hora de fim são obrigatórias';
    }

    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      
      if (start >= end) {
        newErrors.end_time = 'Hora de fim deve ser posterior ao início';
      }

      if (start < new Date()) {
        newErrors.start_time = 'Data e hora não podem ser no passado';
      }

      // Verificar duração máxima
      if (selectedAreaDetails?.max_booking_hours) {
        const durationHours = (end - start) / (1000 * 60 * 60);
        if (durationHours > selectedAreaDetails.max_booking_hours) {
          newErrors.end_time = `Duração máxima permitida: ${selectedAreaDetails.max_booking_hours} horas`;
        }
      }

      // Verificar antecedência máxima
      if (selectedAreaDetails?.advance_booking_days) {
        const maxAdvanceDate = new Date();
        maxAdvanceDate.setDate(maxAdvanceDate.getDate() + selectedAreaDetails.advance_booking_days);
        if (start > maxAdvanceDate) {
          newErrors.start_time = `Reserva não pode ser feita com mais de ${selectedAreaDetails.advance_booking_days} dias de antecedência`;
        }
      }
    }

    if (conflictCheck.conflicts.length > 0) {
      newErrors.general = 'Há conflitos de horário com outras reservas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await api.post('/bookings', formData);
      
      alert('Reserva criada com sucesso! Aguarde aprovação.');
      window.location.href = '/reservas';
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      alert(error.response?.data?.message || 'Erro ao criar reserva');
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

  const isOperatingHoursValid = (startTime, endTime) => {
    if (!selectedAreaDetails?.operating_hours || !startTime || !endTime) return true;
    
    try {
      const operatingHours = JSON.parse(selectedAreaDetails.operating_hours);
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][startDate.getDay()];
      
      const dayHours = operatingHours[dayOfWeek];
      if (!dayHours || dayHours.closed) return false;
      
      const startHour = startDate.getHours() * 60 + startDate.getMinutes();
      const endHour = endDate.getHours() * 60 + endDate.getMinutes();
      const openTime = parseInt(dayHours.open.split(':')[0]) * 60 + parseInt(dayHours.open.split(':')[1]);
      const closeTime = parseInt(dayHours.close.split(':')[0]) * 60 + parseInt(dayHours.close.split(':')[1]);
      
      return startHour >= openTime && endHour <= closeTime;
    } catch (error) {
      return true; // Se não conseguir parsing, permite
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova Reserva</h1>
        <p className="mt-1 text-sm text-gray-500">
          Faça uma reserva de área comum
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm">{errors.general}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informações da Reserva
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condomínio *
                </label>
                <select
                  value={formData.condominium_id}
                  onChange={(e) => handleInputChange('condominium_id', e.target.value)}
                  className={`block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.condominium_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Selecione um condomínio</option>
                  {condominiums.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.name}
                    </option>
                  ))}
                </select>
                {errors.condominium_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.condominium_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área Comum *
                </label>
                <select
                  value={formData.common_area_id}
                  onChange={(e) => handleInputChange('common_area_id', e.target.value)}
                  className={`block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.common_area_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                  disabled={!formData.condominium_id}
                >
                  <option value="">Selecione uma área comum</option>
                  {commonAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({getTypeLabel(area.type)})
                    </option>
                  ))}
                </select>
                {errors.common_area_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.common_area_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade *
                </label>
                <select
                  value={formData.unit_id}
                  onChange={(e) => handleInputChange('unit_id', e.target.value)}
                  className={`block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.unit_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                  disabled={!formData.condominium_id}
                >
                  <option value="">Selecione uma unidade</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.type} {unit.number} - {unit.block || 'S/B'}
                    </option>
                  ))}
                </select>
                {errors.unit_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.unit_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Evento *
                </label>
                <input
                  type="text"
                  value={formData.event_name}
                  onChange={(e) => handleInputChange('event_name', e.target.value)}
                  className={`block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.event_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Aniversário, Reunião, etc."
                  required
                />
                {errors.event_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.event_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data e Hora de Início *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className={`block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.start_time ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.start_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data e Hora de Fim *
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className={`block w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.end_time ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.end_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solicitações Especiais
              </label>
              <textarea
                value={formData.special_requests}
                onChange={(e) => handleInputChange('special_requests', e.target.value)}
                rows={3}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva qualquer solicitação especial para sua reserva..."
              />
            </div>
          </div>
        </div>

        {/* Detalhes da Área Selecionada */}
        {selectedAreaDetails && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Detalhes da Área Comum
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Tipo:</span> {getTypeLabel(selectedAreaDetails.type)}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Capacidade:</span> {selectedAreaDetails.capacity || 'N/A'} pessoas
                </div>
                <div>
                  <span className="font-medium text-gray-700">Taxa de Reserva:</span> 
                  {selectedAreaDetails.booking_fee ? ` R$ ${parseFloat(selectedAreaDetails.booking_fee).toFixed(2)}` : ' Gratuita'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duração Máxima:</span> {selectedAreaDetails.max_booking_hours || 'N/A'} horas
                </div>
                <div>
                  <span className="font-medium text-gray-700">Antecedência Máxima:</span> {selectedAreaDetails.advance_booking_days || 'N/A'} dias
                </div>
                <div>
                  <span className="font-medium text-gray-700">Localização:</span> {selectedAreaDetails.location || 'N/A'}
                </div>
              </div>

              {selectedAreaDetails.description && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700">Descrição:</span>
                  <p className="mt-1 text-sm text-gray-600">{selectedAreaDetails.description}</p>
                </div>
              )}

              {selectedAreaDetails.rules && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700">Regras de Uso:</span>
                  <p className="mt-1 text-sm text-gray-600">{selectedAreaDetails.rules}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verificação de Conflitos */}
        {formData.common_area_id && formData.start_time && formData.end_time && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Verificação de Disponibilidade
              </h3>

              {conflictCheck.loading ? (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Verificando conflitos...
                </div>
              ) : conflictCheck.conflicts.length > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    ⚠️ Conflitos de Horário Detectados:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {conflictCheck.conflicts.map((conflict) => (
                      <li key={conflict.id}>
                        • {conflict.event_name || `Reserva #${conflict.id}`} - 
                        {new Date(conflict.start_time).toLocaleString('pt-BR')} até {new Date(conflict.end_time).toLocaleString('pt-BR')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-sm text-green-800">
                    ✅ Horário disponível! Não há conflitos com outras reservas.
                  </p>
                </div>
              )}

              {/* Verificação de Horário de Funcionamento */}
              {formData.start_time && formData.end_time && !isOperatingHoursValid(formData.start_time, formData.end_time) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Atenção: O horário selecionado está fora do horário de funcionamento da área comum.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => window.location.href = '/reservas'}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || conflictCheck.conflicts.length > 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando Reserva...' : 'Criar Reserva'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBooking;