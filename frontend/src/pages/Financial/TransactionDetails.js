import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { financialAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { getTagBadge } from '../../utils/transactionTags';

const TransactionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [id]);

  const loadTransaction = async () => {
    setLoading(true);
    try {
      const response = await financialAPI.getTransactionById(id);
      if (response.data.success) {
        setTransaction(response.data.data.transaction);
        setError('');
      } else {
        setError('Transação não encontrada');
      }
    } catch (error) {
      console.error('Erro ao carregar transação:', error);
      setError('Erro ao carregar transação. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    setActionType(action);
    setActionNotes('');
    setShowActionModal(true);
  };

  const confirmAction = async () => {
    if (!actionNotes.trim()) {
      toast.error('Por favor, adicione uma observação para esta ação.');
      return;
    }

    setProcessingAction(true);
    try {
      let response;
      const payload = { notes: actionNotes };

      switch (actionType) {
        case 'approve':
          response = await financialAPI.approve(id, payload);
          break;
        case 'cancel':
          response = await financialAPI.cancelTransaction(id, payload);
          break;
        default:
          throw new Error('Ação não reconhecida');
      }

      if (response.data.success) {
        toast.success(getActionSuccessMessage(actionType));
        setShowActionModal(false);
        loadTransaction();
      } else {
        toast.error(response.data.message || `Erro ao ${getActionLabel(actionType).toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Erro ao ${actionType}:`, error);
      toast.error(`Erro ao ${getActionLabel(actionType).toLowerCase()}. Verifique sua conexão.`);
    } finally {
      setProcessingAction(false);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      approve: 'Autorizar',
      cancel: 'Cancelar'
    };
    return labels[action] || action;
  };

  const getActionSuccessMessage = (action) => {
    const messages = {
      approve: 'Pagamento autorizado com sucesso!',
      cancel: 'Pagamento cancelado com sucesso!'
    };
    return messages[action] || 'Ação executada com sucesso!';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(amount) || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSimpleDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (transaction) => {
    const badge = getTagBadge(transaction);
    return (
      <span className={badge.className} data-tag={badge.tag}>
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      income: { label: 'Receita', class: 'bg-green-100 text-green-800' },
      expense: { label: 'Despesa', class: 'bg-red-100 text-red-800' }
    };
    
    const config = typeConfig[type] || { label: type, class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const translatePaymentMethod = (method) => {
    const translations = {
      cash: 'Dinheiro',
      pix: 'PIX',
      pix_a: 'PIX A',
      pix_b: 'PIX B', 
      pix_c: 'PIX C',
      bank_transfer: 'Transferência Bancária',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      check: 'Cheque',
      boleto: 'Boleto'
    };
    return translations[method] || method;
  };

  const translateCategory = (category) => {
    const translations = {
      condominium_fee: 'Taxa de Condomínio',
      maintenance: 'Manutenção',
      utilities: 'Utilidades',
      insurance: 'Seguro',
      cleaning: 'Limpeza',
      security: 'Segurança',
      administration: 'Administração',
      reserve_fund: 'Fundo de Reserva',
      other: 'Outros'
    };
    return translations[category] || category;
  };

  const canPerformAction = (action) => {
    if (!user || !['admin', 'manager'].includes(user.role)) return false;
    if (!transaction) return false;

    switch (action) {
      case 'approve':
        return transaction.status === 'pending' && (!transaction.approved_by || transaction.approved_by === null);
      case 'cancel':
        return ['pending', 'paid'].includes(transaction.status);
      case 'edit':
        return transaction.status === 'pending' && (!transaction.approved_by || transaction.approved_by === null);
      default:
        return false;
    }
  };

  // Criar histórico de ações baseado nos dados da transação
  const getTransactionHistory = () => {
    const history = [];

    // Criação
    if (transaction.creator) {
      history.push({
        action: 'Criado',
        user: transaction.creator.name,
        role: transaction.creator.role,
        date: transaction.createdAt,
        notes: 'Transação criada no sistema',
        type: 'creation'
      });
    }

    // Extrair apenas a seção de histórico das notes
    const notes = transaction.notes || '';
    const historyIndex = notes.indexOf('--- HISTÓRICO ---');
    const historySection = historyIndex !== -1 ? notes.substring(historyIndex) : notes;
    
    // Modificações (extrair da seção de histórico)
    if (historySection) {
      // Novo padrão para modificações detalhadas
      const detailedModificationRegex = /\[MODIFICAÇÃO - ([^\]]+)\] Alterado por ([^(]+) \(([^)]+)\): (.+?)(?=\n|$)/g;
      let match;
      while ((match = detailedModificationRegex.exec(historySection)) !== null) {
        const [, dateStr, userName, userRole, changeDetails] = match;
        history.push({
          action: 'Modificado',
          user: userName.trim(),
          role: userRole,
          date: new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6')),
          notes: changeDetails,
          type: 'modification'
        });
      }
      
      // Padrão antigo para compatibilidade (caso ainda existam)
      const oldModificationRegex = /\[MODIFICAÇÃO - ([^\]]+)\] Transação modificada por ([^(]+) \(([^)]+)\)/g;
      let oldMatch;
      while ((oldMatch = oldModificationRegex.exec(historySection)) !== null) {
        const [, dateStr, userName, userRole] = oldMatch;
        // Só adicionar se não foi capturado pelo padrão novo
        const dateToCheck = new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6'));
        const alreadyExists = history.some(h => 
          h.type === 'modification' && 
          Math.abs(new Date(h.date) - dateToCheck) < 1000 // diferença menor que 1 segundo
        );
        
        if (!alreadyExists) {
          history.push({
            action: 'Modificado',
            user: userName.trim(),
            role: userRole,
            date: dateToCheck,
            notes: 'Dados da transação foram alterados',
            type: 'modification'
          });
        }
      }

      // Aprovações (novo padrão detalhado)
      const detailedApprovalRegex = /\[APROVAÇÃO - ([^\]]+)\] Autorizado por ([^(]+) \(([^)]+)\): (.+?)(?=\n|$)/g;
      let approvalMatch;
      while ((approvalMatch = detailedApprovalRegex.exec(historySection)) !== null) {
        const [, dateStr, userName, userRole, approvalDetails] = approvalMatch;
        history.push({
          action: 'Autorizado',
          user: userName.trim(),
          role: userRole,
          date: new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6')),
          notes: approvalDetails,
          type: 'approval'
        });
      }
      
      // Aprovações (padrão antigo para compatibilidade)
      const oldApprovalRegex = /\[APROVAÇÃO\] (.+)/g;
      let oldApprovalMatch;
      while ((oldApprovalMatch = oldApprovalRegex.exec(historySection)) !== null) {
        if (transaction.approved_at) {
          // Verificar se já foi capturado pelo padrão novo
          const approvalDate = new Date(transaction.approved_at);
          const alreadyExists = history.some(h => 
            h.type === 'approval' && 
            Math.abs(new Date(h.date) - approvalDate) < 60000 // diferença menor que 1 minuto
          );
          
          if (!alreadyExists) {
            history.push({
              action: 'Autorizado',
              user: transaction.approver?.name || 'Sistema',
              role: transaction.approver?.role || 'auto',
              date: transaction.approved_at,
              notes: oldApprovalMatch[1],
              type: 'approval'
            });
          }
        }
      }

      // Cancelamentos (novo padrão detalhado)
      const detailedCancelRegex = /\[CANCELAMENTO - ([^\]]+)\] Cancelado por ([^(]+) \(([^)]+)\): (.+?)(?=\n|$)/g;
      let cancelMatch;
      while ((cancelMatch = detailedCancelRegex.exec(historySection)) !== null) {
        const [, dateStr, userName, userRole, cancelDetails] = cancelMatch;
        history.push({
          action: 'Cancelado',
          user: userName.trim(),
          role: userRole,
          date: new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6')),
          notes: cancelDetails,
          type: 'cancellation'
        });
      }
      
      // Cancelamentos (padrão antigo para compatibilidade)
      const oldCancelRegex = /\[CANCELAMENTO\] (.+)/g;
      let oldCancelMatch;
      while ((oldCancelMatch = oldCancelRegex.exec(historySection)) !== null) {
        if (transaction.cancelled_at) {
          const cancelDate = new Date(transaction.cancelled_at);
          const alreadyExists = history.some(h => 
            h.type === 'cancellation' && 
            Math.abs(new Date(h.date) - cancelDate) < 60000
          );
          
          if (!alreadyExists) {
            history.push({
              action: 'Cancelado',
              user: 'Sistema',
              role: 'auto',
              date: transaction.cancelled_at,
              notes: oldCancelMatch[1],
              type: 'cancellation'
            });
          }
        }
      }

      // Confirmações de dinheiro (novo padrão detalhado)
      const detailedConfirmationRegex = /\[CONFIRMAÇÃO - ([^\]]+)\] Confirmado por ([^(]+) \(([^)]+)\): (.+?)(?=\n|$)/g;
      let confirmationMatch;
      while ((confirmationMatch = detailedConfirmationRegex.exec(historySection)) !== null) {
        const [, dateStr, userName, userRole, confirmationDetails] = confirmationMatch;
        history.push({
          action: 'Dinheiro Confirmado',
          user: userName.trim(),
          role: userRole,
          date: new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6')),
          notes: confirmationDetails,
          type: 'cash_confirmation'
        });
      }
      
      // Confirmações (padrão antigo para compatibilidade)
      const oldConfirmationRegex = /\[CONFIRMAÇÃO\] (.+)/g;
      let oldConfirmationMatch;
      while ((oldConfirmationMatch = oldConfirmationRegex.exec(historySection)) !== null) {
        if (transaction.cash_confirmed_at) {
          const confirmDate = new Date(transaction.cash_confirmed_at);
          const alreadyExists = history.some(h => 
            h.type === 'cash_confirmation' && 
            Math.abs(new Date(h.date) - confirmDate) < 60000
          );
          
          if (!alreadyExists) {
            history.push({
              action: 'Dinheiro Confirmado',
              user: transaction.cash_confirmer?.name || 'Sistema',
              role: transaction.cash_confirmer?.role || 'auto',
              date: transaction.cash_confirmed_at,
              notes: oldConfirmationMatch[1],
              type: 'cash_confirmation'
            });
          }
        }
      }
    }

    // Aprovação (se não extraída das notes)
    if (transaction.approved_by && transaction.approver && !history.some(h => h.type === 'approval')) {
      history.push({
        action: 'Autorizado',
        user: transaction.approver.name,
        role: transaction.approver.role,
        date: transaction.approved_at,
        notes: 'Pagamento autorizado',
        type: 'approval'
      });
    }

    // Confirmação de dinheiro
    if (transaction.cash_confirmed_by && transaction.cash_confirmer) {
      history.push({
        action: 'Dinheiro Confirmado',
        user: transaction.cash_confirmer.name,
        role: transaction.cash_confirmer.role,
        date: transaction.cash_confirmed_at,
        notes: 'Recebimento em dinheiro confirmado',
        type: 'cash_confirmation'
      });
    }

    // Pagamento
    if (transaction.paid_date && transaction.status === 'paid') {
      history.push({
        action: 'Pago',
        user: transaction.approver?.name || 'Sistema',
        role: transaction.approver?.role || 'auto',
        date: transaction.paid_date,
        notes: 'Pagamento processado',
        type: 'payment'
      });
    }

    // Cancelamento
    if (transaction.status === 'cancelled') {
      history.push({
        action: 'Cancelado',
        user: 'Sistema',
        role: 'auto',
        date: transaction.updatedAt,
        notes: 'Transação cancelada',
        type: 'cancellation'
      });
    }

    // Ordenar por data mais recente primeiro
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getHistoryItemColor = (type) => {
    const colors = {
      creation: 'border-blue-400',
      modification: 'border-yellow-400',
      approval: 'border-green-400',
      payment: 'border-green-600',
      cash_confirmation: 'border-purple-400',
      cancellation: 'border-red-400'
    };
    return colors[type] || 'border-gray-400';
  };

  const getHistoryIcon = (type) => {
    const icons = {
      creation: '➕',
      modification: '✏️',
      approval: '✅',
      payment: '💰',
      cash_confirmation: '💵',
      cancellation: '❌'
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => navigate('/financeiro/transacoes')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Voltar para Lista
          </button>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">Transação não encontrada</div>
          <button
            onClick={() => navigate('/financeiro/transacoes')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Voltar para Lista
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(transaction.amount || 0) + parseFloat(transaction.late_fee || 0) - parseFloat(transaction.discount || 0);
  const history = getTransactionHistory();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transação #{transaction.id}</h1>
            <div className="flex items-center gap-4 mb-4">
              {getTypeBadge(transaction.type)}
              {getStatusBadge(transaction)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            <p className="text-gray-600">{transaction.description}</p>
          </div>
          
          {/* Botões de Ação */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <button
              onClick={() => navigate('/financeiro/transacoes')}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              ← Voltar
            </button>
            
            {canPerformAction('edit') && (
              <button
                onClick={() => navigate(`/financeiro/transacoes/${transaction.id}/editar`)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                ✏️ Modificar
              </button>
            )}
            
            {canPerformAction('approve') && (
              <button
                onClick={() => handleAction('approve')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ✓ Autorizar Pagamento
              </button>
            )}
            
            {canPerformAction('cancel') && (
              <button
                onClick={() => handleAction('cancel')}
                className="w-full bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                ⊗ Cancelar
              </button>
            )}
            
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Informações Principais */}
        <div className="space-y-6">
          {/* Detalhes Básicos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes Básicos</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Categoria:</span>
                <span className="font-medium">{translateCategory(transaction.category)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Condomínio:</span>
                <span className="font-medium">{transaction.condominium?.name || '-'}</span>
              </div>
              {transaction.unit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Unidade:</span>
                  <span className="font-medium">Unidade {transaction.unit.number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Vencimento:</span>
                <span className="font-medium">{formatSimpleDate(transaction.due_date)}</span>
              </div>
              {transaction.reference_month && transaction.reference_year && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Referência:</span>
                  <span className="font-medium">
                    {String(transaction.reference_month).padStart(2, '0')}/{transaction.reference_year}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Valores */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Valores</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Valor Principal:</span>
                <span className="font-bold text-lg">{formatCurrency(transaction.amount)}</span>
              </div>
              {parseFloat(transaction.late_fee || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-600">Multa:</span>
                  <span className="text-red-600 font-medium">{formatCurrency(transaction.late_fee)}</span>
                </div>
              )}
              {parseFloat(transaction.discount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Desconto:</span>
                  <span className="text-green-600 font-medium">-{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-gray-900 font-semibold">Total:</span>
                <span className="text-gray-900 font-bold text-xl">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: Pagamento e Datas */}
        <div className="space-y-6">
          {/* Método de Pagamento */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pagamento</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Método:</span>
                <span className="font-medium">{translatePaymentMethod(transaction.payment_method)}</span>
              </div>
              
              {transaction.pix_key && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chave PIX:</span>
                    <span className="font-medium font-mono text-sm">{transaction.pix_key}</span>
                  </div>
                  {transaction.pix_recipient_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Destinatário:</span>
                      <span className="font-medium">{transaction.pix_recipient_name}</span>
                    </div>
                  )}
                </>
              )}

              {transaction.mixed_payment && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Pagamento Misto:</p>
                  <div className="pl-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>PIX:</span>
                      <span>{formatCurrency(transaction.pix_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Dinheiro:</span>
                      <span>{formatCurrency(transaction.cash_amount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Datas Importantes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datas</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Criado em:</span>
                <span className="font-medium">{formatDate(transaction.createdAt)}</span>
              </div>
              {transaction.approved_at && (
                <div className="flex justify-between">
                  <span className="text-green-600">Autorizado em:</span>
                  <span className="text-green-600 font-medium">{formatDate(transaction.approved_at)}</span>
                </div>
              )}
              {transaction.paid_date && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Pago em:</span>
                  <span className="text-blue-600 font-medium">{formatDate(transaction.paid_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {(() => {
            // Separar observações originais do histórico
            const notes = transaction.notes || '';
            const historyIndex = notes.indexOf('--- HISTÓRICO ---');
            let originalNotes = historyIndex !== -1 ? notes.substring(0, historyIndex).trim() : notes;
            
            // Remover marcadores de sistema das observações para exibição limpa
            const cleanNotes = originalNotes
              .replace(/--- Criado por:.*?---/g, '')
              .replace(/--- Modificado por:.*?---/g, '')
              .trim();
            
            // Extrair informação de quem criou/modificou para mostrar separadamente
            const createdByMatch = originalNotes.match(/--- Criado por: ([^(]+) \(([^)]+)\) ---/);
            const modifiedByMatch = originalNotes.match(/--- Modificado por: ([^(]+) \(([^)]+)\) ---/);
            
            if (!cleanNotes && !createdByMatch && !modifiedByMatch) return null;
            
            return (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
                
                {cleanNotes && (
                  <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border-l-4 border-blue-400 mb-3">
                    {cleanNotes}
                  </div>
                )}
                
                <div className="text-sm text-gray-500 space-y-1">
                  {createdByMatch && (
                    <div>
                      <span className="font-medium">Criado por:</span> {createdByMatch[1].trim()} ({createdByMatch[2]})
                    </div>
                  )}
                  {modifiedByMatch && (
                    <div>
                      <span className="font-medium">Última modificação por:</span> {modifiedByMatch[1].trim()} ({modifiedByMatch[2]})
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Coluna 3: Histórico */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Histórico de Ações</h2>
              {history.length > 4 && (
                <button
                  onClick={() => setHistoryExpanded(!historyExpanded)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {historyExpanded ? 'Ver menos' : `Ver todos (${history.length})`}
                </button>
              )}
            </div>
            
            {history.length > 0 ? (
              <div className="space-y-4">
                {(historyExpanded ? history : history.slice(0, 4)).map((item, index) => (
                  <div 
                    key={index} 
                    className={`border-l-4 pl-4 pb-4 ${getHistoryItemColor(item.type)}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="mr-2">{getHistoryIcon(item.type)}</span>
                        <span className="font-medium text-gray-900">{item.action}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      por {item.user} {item.role !== 'auto' && `(${item.role})`}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-700 italic bg-gray-50 p-2 rounded">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                ))}
                
                {!historyExpanded && history.length > 4 && (
                  <div className="text-center pt-2 border-t border-gray-200">
                    <button
                      onClick={() => setHistoryExpanded(true)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ... e mais {history.length - 4} ações
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum histórico disponível</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ação */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {getActionLabel(actionType)} Transação
            </h3>
            <p className="text-gray-600 mb-4">
              Adicione uma observação para {getActionLabel(actionType).toLowerCase()} esta transação:
            </p>
            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Digite suas observações..."
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={processingAction}
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                disabled={processingAction || !actionNotes.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processingAction ? 'Processando...' : `${getActionLabel(actionType)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetails;