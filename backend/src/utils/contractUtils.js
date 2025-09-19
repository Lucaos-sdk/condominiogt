/**
 * Utilitários para gestão de contratos
 */

/**
 * Calcula a data de vencimento do contrato baseado na duração
 * @param {Date} startDate - Data de início
 * @param {number} durationMonths - Duração em meses
 * @returns {Date}
 */
function calculateContractEndDate(startDate, durationMonths = 12) {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  return endDate;
}

/**
 * Verifica se um contrato está vencido
 * @param {Date} endDate - Data de fim do contrato
 * @returns {boolean}
 */
function isContractExpired(endDate) {
  if (!endDate) return false;
  return new Date() > new Date(endDate);
}

/**
 * Calcula quantos dias restam até o vencimento
 * @param {Date} endDate - Data de fim do contrato
 * @returns {number}
 */
function getDaysUntilExpiry(endDate) {
  if (!endDate) return null;
  const today = new Date();
  const expiry = new Date(endDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se o contrato está próximo do vencimento (30 dias)
 * @param {Date} endDate - Data de fim do contrato
 * @param {number} warningDays - Dias de antecedência para aviso (default: 30)
 * @returns {boolean}
 */
function isContractNearExpiry(endDate, warningDays = 30) {
  const daysLeft = getDaysUntilExpiry(endDate);
  return daysLeft !== null && daysLeft <= warningDays && daysLeft > 0;
}

/**
 * Calcula o valor total do contrato
 * @param {number} rentAmount - Valor do aluguel
 * @param {number} condominiumFee - Taxa condominial
 * @param {number} durationMonths - Duração em meses
 * @returns {number}
 */
function calculateTotalContractValue(rentAmount = 0, condominiumFee = 0, durationMonths = 12) {
  const monthlyValue = (rentAmount || 0) + (condominiumFee || 0);
  return monthlyValue * durationMonths;
}

/**
 * Gera datas de pagamento mensal baseado no dia de vencimento
 * @param {Date} startDate - Data de início
 * @param {Date} endDate - Data de fim
 * @param {number} dueDay - Dia do vencimento (1-31)
 * @returns {Array<Date>}
 */
function generatePaymentDates(startDate, endDate, dueDay = 10) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  // Ajustar para o primeiro vencimento
  currentDate.setDate(dueDay);
  if (currentDate < startDate) {
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return dates;
}

/**
 * Valida dados de contrato
 * @param {Object} contractData - Dados do contrato
 * @returns {Object} { isValid: boolean, errors: Array<string> }
 */
function validateContract(contractData) {
  const errors = [];
  const { contract_start_date, contract_end_date, rent_amount, deposit_amount } = contractData;
  
  // Validar datas
  if (contract_start_date && contract_end_date) {
    const startDate = new Date(contract_start_date);
    const endDate = new Date(contract_end_date);
    
    if (endDate <= startDate) {
      errors.push('Data final deve ser posterior à data inicial');
    }
  }
  
  // Validar valores
  if (rent_amount && rent_amount < 0) {
    errors.push('Valor do aluguel deve ser positivo');
  }
  
  if (deposit_amount && deposit_amount < 0) {
    errors.push('Valor do depósito deve ser positivo');
  }
  
  // Validar depósito (máximo 3x o aluguel)
  if (rent_amount && deposit_amount && deposit_amount > (rent_amount * 3)) {
    errors.push('Depósito não pode ser superior a 3 vezes o valor do aluguel');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calcula reajuste de aluguel baseado em índice
 * @param {number} currentRent - Valor atual do aluguel
 * @param {number} indexPercentage - Percentual do índice (ex: 5.2 para 5.2%)
 * @returns {number}
 */
function calculateRentAdjustment(currentRent, indexPercentage) {
  if (!currentRent || !indexPercentage) return currentRent;
  return currentRent * (1 + indexPercentage / 100);
}

/**
 * Formata informações do contrato para exibição
 * @param {Object} unit - Dados da unidade com contrato
 * @returns {Object}
 */
function formatContractInfo(unit) {
  const {
    contract_start_date,
    contract_end_date,
    rent_amount,
    deposit_amount,
    guarantor_name,
    contract_type,
    auto_renewal
  } = unit;
  
  return {
    contractPeriod: contract_start_date && contract_end_date 
      ? `${new Date(contract_start_date).toLocaleDateString('pt-BR')} - ${new Date(contract_end_date).toLocaleDateString('pt-BR')}`
      : 'Não definido',
    monthlyRent: rent_amount ? `R$ ${parseFloat(rent_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido',
    deposit: deposit_amount ? `R$ ${parseFloat(deposit_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem depósito',
    guarantor: guarantor_name || 'Sem fiador',
    type: contract_type || 'Não especificado',
    autoRenewal: auto_renewal ? 'Sim' : 'Não',
    status: isContractExpired(contract_end_date) ? 'Vencido' : 
            isContractNearExpiry(contract_end_date) ? 'Próximo ao vencimento' : 'Ativo',
    daysRemaining: getDaysUntilExpiry(contract_end_date)
  };
}

/**
 * Verifica se a unidade precisa de atenção (contratos vencidos/próximos do vencimento)
 * @param {Object} unit - Dados da unidade
 * @returns {Object} { needsAttention: boolean, reason: string, priority: string }
 */
function checkContractAttention(unit) {
  const { contract_end_date } = unit;
  
  if (isContractExpired(contract_end_date)) {
    return {
      needsAttention: true,
      reason: 'Contrato vencido',
      priority: 'high'
    };
  }
  
  if (isContractNearExpiry(contract_end_date, 30)) {
    return {
      needsAttention: true,
      reason: `Vence em ${getDaysUntilExpiry(contract_end_date)} dias`,
      priority: 'medium'
    };
  }
  
  if (isContractNearExpiry(contract_end_date, 60)) {
    return {
      needsAttention: true,
      reason: `Vence em ${getDaysUntilExpiry(contract_end_date)} dias`,
      priority: 'low'
    };
  }
  
  return {
    needsAttention: false,
    reason: null,
    priority: null
  };
}

module.exports = {
  calculateContractEndDate,
  isContractExpired,
  getDaysUntilExpiry,
  isContractNearExpiry,
  calculateTotalContractValue,
  generatePaymentDates,
  validateContract,
  calculateRentAdjustment,
  formatContractInfo,
  checkContractAttention
};