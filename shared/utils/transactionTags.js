/**
 * Sistema de tags robusto para categorização de transações
 * Centraliza a lógica de tags para ser usado tanto no frontend quanto backend
 */

/**
 * Calcula a tag principal da transação baseada em seu status e data de vencimento
 * @param {Object} transaction - Objeto da transação
 * @returns {Object} - { tag, label, color, priority }
 */
const getTransactionTag = (transaction) => {
  const { status, due_date, cancelled_at, deleted_at, paid_date, approved_at } = transaction;
  
  // Tags com prioridade (ordem importa - primeira condição válida define a tag)
  const tags = {
    // Estados finalizados (maior prioridade)
    deleted: {
      condition: status === 'deleted' || deleted_at,
      label: 'Excluído',
      color: 'bg-gray-100 text-gray-800',
      priority: 1,
      category: 'inactive'
    },
    
    cancelled: {
      condition: status === 'cancelled' || cancelled_at,
      label: 'Cancelado', 
      color: 'bg-gray-100 text-gray-800',
      priority: 2,
      category: 'inactive'
    },
    
    paid: {
      condition: status === 'paid' || paid_date,
      label: 'Pago',
      color: 'bg-green-100 text-green-800',
      priority: 3,
      category: 'completed'
    },
    
    // Estados ativos com problemas
    overdue: {
      condition: (status === 'overdue') || 
                 (['pending', 'approved'].includes(status) && 
                  due_date && 
                  new Date(due_date) < new Date().setHours(0,0,0,0) &&
                  !cancelled_at && 
                  !deleted_at && 
                  !paid_date),
      label: 'Em Atraso',
      color: 'bg-red-100 text-red-800',
      priority: 4,
      category: 'urgent'
    },
    
    // Estados ativos normais
    approved: {
      condition: status === 'approved' && 
                 approved_at && 
                 !cancelled_at && 
                 !deleted_at && 
                 !paid_date &&
                 (!due_date || new Date(due_date) >= new Date().setHours(0,0,0,0)),
      label: 'Aprovado',
      color: 'bg-blue-100 text-blue-800',
      priority: 5,
      category: 'active'
    },
    
    pending: {
      condition: status === 'pending' && 
                 !cancelled_at && 
                 !deleted_at && 
                 !paid_date &&
                 (!due_date || new Date(due_date) >= new Date().setHours(0,0,0,0)),
      label: 'Pendente',
      color: 'bg-yellow-100 text-yellow-800',
      priority: 6,
      category: 'active'
    },
    
    // Estado padrão/desconhecido
    unknown: {
      condition: true,
      label: status || 'Desconhecido',
      color: 'bg-gray-100 text-gray-800',
      priority: 99,
      category: 'other'
    }
  };
  
  // Encontrar a primeira tag que se aplica
  for (const [tagKey, tagData] of Object.entries(tags)) {
    if (tagData.condition) {
      return {
        tag: tagKey,
        ...tagData
      };
    }
  }
  
  // Fallback (nunca deve acontecer devido ao 'unknown')
  return tags.unknown;
};

/**
 * Categoriza transações por grupos funcionais
 * @param {Array} transactions - Array de transações
 * @returns {Object} - Objeto com transações agrupadas por categoria
 */
const categorizeTransactions = (transactions) => {
  const categorized = {
    active: [],      // Pendente, Aprovado
    urgent: [],      // Em Atraso
    completed: [],   // Pago
    inactive: [],    // Cancelado, Excluído
    other: []        // Outros estados
  };
  
  transactions.forEach(transaction => {
    const { category } = getTransactionTag(transaction);
    categorized[category].push(transaction);
  });
  
  return categorized;
};

/**
 * Calcula estatísticas baseadas nas tags
 * @param {Array} transactions - Array de transações
 * @returns {Object} - Estatísticas calculadas
 */
const calculateTagStatistics = (transactions) => {
  const stats = {
    // Contadores por tag
    pending_count: 0,
    approved_count: 0,
    overdue_count: 0,
    paid_count: 0,
    cancelled_count: 0,
    deleted_count: 0,
    
    // Valores por tag
    pending_amount: 0,
    approved_amount: 0,
    overdue_amount: 0,
    paid_amount: 0,
    cancelled_amount: 0,
    deleted_amount: 0,
    
    // Totais por categoria
    active_count: 0,
    active_amount: 0,
    urgent_count: 0,
    urgent_amount: 0,
    completed_count: 0,
    completed_amount: 0,
    inactive_count: 0,
    inactive_amount: 0
  };
  
  transactions.forEach(transaction => {
    const { tag, category } = getTransactionTag(transaction);
    const amount = parseFloat(transaction.amount || 0) + 
                  parseFloat(transaction.late_fee || 0) - 
                  parseFloat(transaction.discount || 0);
    
    // Contadores específicos por tag
    stats[`${tag}_count`] = (stats[`${tag}_count`] || 0) + 1;
    stats[`${tag}_amount`] = (stats[`${tag}_amount`] || 0) + amount;
    
    // Contadores por categoria
    stats[`${category}_count`] += 1;
    stats[`${category}_amount`] += amount;
  });
  
  return stats;
};

/**
 * Filtra transações por tag
 * @param {Array} transactions - Array de transações
 * @param {string|Array} tags - Tag(s) a filtrar
 * @returns {Array} - Transações filtradas
 */
const filterByTag = (transactions, tags) => {
  const tagList = Array.isArray(tags) ? tags : [tags];
  
  return transactions.filter(transaction => {
    const { tag } = getTransactionTag(transaction);
    return tagList.includes(tag);
  });
};

/**
 * Verifica se uma transação deve ser considerada "ativa" para cálculos
 * @param {Object} transaction - Transação a verificar
 * @returns {boolean} - True se a transação está ativa
 */
const isActiveTransaction = (transaction) => {
  const { category } = getTransactionTag(transaction);
  return ['active', 'urgent'].includes(category);
};

/**
 * Verifica se uma transação está em atraso
 * @param {Object} transaction - Transação a verificar
 * @returns {boolean} - True se a transação está em atraso
 */
const isOverdueTransaction = (transaction) => {
  const { tag } = getTransactionTag(transaction);
  return tag === 'overdue';
};

/**
 * Gera um badge React/HTML para uma transação
 * @param {Object} transaction - Transação
 * @param {Object} options - Opções de renderização
 * @returns {Object} - Propriedades do badge
 */
const getTagBadge = (transaction, options = {}) => {
  const { tag, label, color } = getTransactionTag(transaction);
  const { size = 'normal' } = options;
  
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    normal: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };
  
  return {
    tag,
    label,
    className: `inline-flex items-center rounded-full font-medium ${color} ${sizeClasses[size]}`,
    'data-tag': tag
  };
};

module.exports = {
  getTransactionTag,
  categorizeTransactions,
  calculateTagStatistics,
  filterByTag,
  isActiveTransaction,
  isOverdueTransaction,
  getTagBadge
};