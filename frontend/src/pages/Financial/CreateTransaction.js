import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { financialAPI, condominiumAPI, unitAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const CreateTransaction = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [condominiums, setCondominiums] = useState([]);
  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    condominium_id: '',
    unit_id: '',
    user_id: '',
    type: 'income',
    category: 'condominium_fee',
    description: '',
    amount: '',
    due_date: '',
    payment_method: '',
    reference_month: new Date().getMonth() + 1,
    reference_year: new Date().getFullYear(),
    invoice_number: '',
    receipt_url: '',
    notes: '',
    late_fee: 0,
    discount: 0,
    // Campos PIX
    pix_type: '',
    pix_key: '',
    pix_recipient_name: '',
    // Pagamentos mistos
    mixed_payment: false,
    pix_amount: 0,
    cash_amount: 0,
    // Privacy
    private_expense: false
  });

  useEffect(() => {
    loadCondominiums();
    if (id) {
      setEditMode(true);
      loadTransactionData();
    }
  }, [id]);

  useEffect(() => {
    if (formData.condominium_id) {
      loadUnits();
      loadUsers();
    }
  }, [formData.condominium_id]);

  const loadCondominiums = async () => {
    try {
      const response = await condominiumAPI.getAll();
      if (response.data.success) {
        const condos = response.data.condominiums || response.data.data?.condominiums || [];
        setCondominiums(condos);
        if (condos.length === 1) {
          setFormData(prev => ({ ...prev, condominium_id: condos[0].id }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
      setError('Erro ao carregar condomínios');
    }
  };

  const loadUnits = async () => {
    try {
      const response = await unitAPI.getByCondominium(formData.condominium_id);
      if (response.data.success) {
        const data = response.data.data || response.data;
        setUnits(data.units || []);
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userAPI.getByCondominium(formData.condominium_id);
      if (response.data.success) {
        const data = response.data.data || response.data;
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-configurar PIX type baseado no payment_method
    if (name === 'payment_method') {
      let pixType = '';
      if (value === 'pix_a') pixType = 'A';
      if (value === 'pix_b') pixType = 'B';
      if (value === 'pix_c') pixType = 'C';
      
      setFormData(prev => ({
        ...prev,
        pix_type: pixType,
        mixed_payment: value === 'mixed'
      }));
    }
  };

  const loadTransactionData = async () => {
    try {
      setLoading(true);
      const response = await financialAPI.getTransactionById(id);
      if (response.data.success) {
        const transaction = response.data.data.transaction;
        
        // Extrair apenas as observações originais (sem histórico)
        const cleanNotes = (() => {
          const notes = transaction.notes || '';
          const historyIndex = notes.indexOf('--- HISTÓRICO ---');
          let originalNotes = historyIndex !== -1 ? notes.substring(0, historyIndex).trim() : notes;
          
          // Remover marcadores de criação/modificação
          originalNotes = originalNotes
            .replace(/--- Criado por:.*?---/g, '')
            .replace(/--- Modificado por:.*?---/g, '')
            .trim();
          
          return originalNotes;
        })();
        
        // Formatar os dados para o formulário
        const transactionData = {
          condominium_id: transaction.condominium_id,
          unit_id: transaction.unit_id || '',
          user_id: transaction.user_id || '',
          type: transaction.type,
          category: transaction.category,
          description: transaction.description,
          amount: transaction.amount,
          due_date: transaction.due_date ? transaction.due_date.split('T')[0] : '',
          payment_method: transaction.payment_method,
          reference_month: transaction.reference_month || new Date().getMonth() + 1,
          reference_year: transaction.reference_year || new Date().getFullYear(),
          invoice_number: transaction.invoice_number || '',
          receipt_url: transaction.receipt_url || '',
          notes: cleanNotes,
          late_fee: transaction.late_fee || 0,
          discount: transaction.discount || 0,
          pix_type: transaction.pix_type || '',
          pix_key: transaction.pix_key || '',
          pix_recipient_name: transaction.pix_recipient_name || '',
          mixed_payment: transaction.mixed_payment || false,
          pix_amount: transaction.pix_amount || 0,
          cash_amount: transaction.cash_amount || 0,
          private_expense: transaction.private_expense || false
        };
        
        setFormData(transactionData);
      } else {
        setError('Erro ao carregar dados da transação');
      }
    } catch (error) {
      console.error('Erro ao carregar transação:', error);
      setError('Erro ao carregar dados da transação');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.condominium_id) errors.push('Condomínio é obrigatório');
    if (!formData.description) errors.push('Descrição é obrigatória');
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push('Valor deve ser maior que zero');
    if (!formData.due_date) errors.push('Data de vencimento é obrigatória');

    // Validações PIX
    if (['pix', 'pix_a', 'pix_b', 'pix_c'].includes(formData.payment_method)) {
      if (!formData.pix_key) errors.push('Chave PIX é obrigatória');
    }

    // Validações pagamento misto
    if (formData.mixed_payment) {
      if (!formData.pix_amount || !formData.cash_amount) {
        errors.push('Para pagamentos mistos, valores PIX e dinheiro são obrigatórios');
      } else {
        const total = parseFloat(formData.amount) + parseFloat(formData.late_fee) - parseFloat(formData.discount);
        const mixedTotal = parseFloat(formData.pix_amount) + parseFloat(formData.cash_amount);
        
        if (Math.abs(total - mixedTotal) > 0.01) {
          errors.push('A soma dos valores PIX e dinheiro deve ser igual ao valor total');
        }
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== FRONTEND SUBMIT ===');
    console.log('Edit Mode:', editMode);
    console.log('Transaction ID:', id);
    console.log('Form Data:', formData);
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors);
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Preparar dados para envio - converter strings vazias para null
      const dataToSend = {
        ...formData,
        unit_id: formData.unit_id || null,
        user_id: formData.user_id || null,
        invoice_number: formData.invoice_number || null,
        receipt_url: formData.receipt_url || null,
        notes: formData.notes || null,
        pix_type: formData.pix_type || null,
        pix_key: formData.pix_key || null,
        pix_recipient_name: formData.pix_recipient_name || null
      };

      console.log('=== ENVIANDO REQUISIÇÃO ===');
      console.log('Data to send:', dataToSend);
      
      let response;
      if (editMode) {
        console.log('Calling updateTransaction with ID:', id);
        response = await financialAPI.updateTransaction(id, dataToSend);
        console.log('Update response:', response.data);
      } else {
        console.log('Calling createTransaction');
        response = await financialAPI.createTransaction(dataToSend);
        console.log('Create response:', response.data);
      }
      
      if (response.data.success) {
        console.log('SUCCESS: Transaction saved successfully');
        setSuccess(editMode ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!');
        setTimeout(() => {
          navigate(editMode ? `/financeiro/transacoes/${id}` : '/financeiro/transacoes');
        }, 2000);
      } else {
        console.log('ERROR: Response indicates failure:', response.data);
        setError(response.data.message || 'Erro na operação');
      }
    } catch (error) {
      setError(error.response?.data?.message || `Erro ao ${editMode ? 'atualizar' : 'criar'} transação`);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const amount = parseFloat(formData.amount) || 0;
    const lateFee = parseFloat(formData.late_fee) || 0;
    const discount = parseFloat(formData.discount) || 0;
    return amount + lateFee - discount;
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/financeiro/transacoes')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {editMode ? 'Editar Transação Financeira' : 'Nova Transação Financeira'}
          </h1>
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações Básicas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condomínio *
                </label>
                <select
                  name="condominium_id"
                  value={formData.condominium_id}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um condomínio</option>
                  {condominiums.map(condo => (
                    <option key={condo.id} value={condo.id}>
                      {condo.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="condominium_fee">Taxa Condominial</option>
                  <option value="water">Água</option>
                  <option value="electricity">Energia</option>
                  <option value="gas">Gás</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="security">Segurança</option>
                  <option value="cleaning">Limpeza</option>
                  <option value="insurance">Seguro</option>
                  <option value="reserve_fund">Fundo de Reserva</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade
                </label>
                <select
                  name="unit_id"
                  value={formData.unit_id}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Geral (sem unidade específica)</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      Unidade {unit.number} - {unit.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Descrição da transação"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Valores</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Principal *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Multa/Juros
                </label>
                <input
                  type="number"
                  name="late_fee"
                  value={formData.late_fee}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desconto
                </label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total
                </label>
                <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-lg font-medium">
                  R$ {calculateTotal().toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>
          </div>

          {/* Datas e Referência */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Datas e Referência</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mês de Referência
                </label>
                <select
                  name="reference_month"
                  value={formData.reference_month}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano de Referência
                </label>
                <input
                  type="number"
                  name="reference_year"
                  value={formData.reference_year}
                  onChange={handleInputChange}
                  min="2020"
                  max="2050"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Forma de Pagamento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pagamento
                </label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Não informado</option>
                  <option value="cash">Dinheiro</option>
                  <option value="bank_transfer">Transferência Bancária</option>
                  <option value="pix">PIX</option>
                  <option value="pix_a">PIX A</option>
                  <option value="pix_b">PIX B</option>
                  <option value="pix_c">PIX C</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="bank_slip">Boleto Bancário</option>
                  <option value="mixed">Pagamento Misto</option>
                </select>
              </div>
            </div>

            {/* Campos PIX */}
            {['pix', 'pix_a', 'pix_b', 'pix_c'].includes(formData.payment_method) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-blue-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chave PIX *
                  </label>
                  <input
                    type="text"
                    name="pix_key"
                    value={formData.pix_key}
                    onChange={handleInputChange}
                    placeholder="Chave PIX"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Destinatário
                  </label>
                  <input
                    type="text"
                    name="pix_recipient_name"
                    value={formData.pix_recipient_name}
                    onChange={handleInputChange}
                    placeholder="Nome do destinatário"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Pagamento Misto */}
            {formData.payment_method === 'mixed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-purple-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor PIX *
                  </label>
                  <input
                    type="number"
                    name="pix_amount"
                    value={formData.pix_amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Dinheiro *
                  </label>
                  <input
                    type="number"
                    name="cash_amount"
                    value={formData.cash_amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chave PIX para pagamento misto
                  </label>
                  <input
                    type="text"
                    name="pix_key"
                    value={formData.pix_key}
                    onChange={handleInputChange}
                    placeholder="Chave PIX"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Informações Adicionais */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Adicionais</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número da Fatura
                </label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  placeholder="Número da fatura"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Comprovante
                </label>
                <input
                  type="url"
                  name="receipt_url"
                  value={formData.receipt_url}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Observações sobre a transação"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Opções de Privacy */}
            {user.role === 'admin' && formData.type === 'expense' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="private_expense"
                  checked={formData.private_expense}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Despesa privada (oculta para síndicos)
                </label>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/financeiro/transacoes')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : (editMode ? 'Atualizar Transação' : 'Criar Transação')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTransaction;