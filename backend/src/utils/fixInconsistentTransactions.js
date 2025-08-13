const { FinancialTransaction } = require('../models');
const { logger } = require('../middleware/errorHandler');

/**
 * Corrige transações com status inconsistente
 * Transações aprovadas (approved_by não nulo) devem ter status 'paid'
 */
async function fixInconsistentTransactions() {
  try {
    logger.info('🔧 Iniciando correção de transações inconsistentes...');
    
    // Buscar transações aprovadas mas ainda pendentes
    const inconsistentTransactions = await FinancialTransaction.findAll({
      where: {
        approved_by: { $ne: null },
        status: 'pending'
      }
    });

    if (inconsistentTransactions.length === 0) {
      logger.info('✅ Nenhuma transação inconsistente encontrada');
      return { fixed: 0, message: 'Nenhuma transação inconsistente encontrada' };
    }

    logger.info(`📋 Encontradas ${inconsistentTransactions.length} transações inconsistentes`);
    
    // Corrigir cada transação
    let fixedCount = 0;
    for (const transaction of inconsistentTransactions) {
      try {
        await transaction.update({
          status: 'paid',
          paid_date: transaction.approved_at || new Date()
        });
        
        logger.info(`✅ Transação ${transaction.id} corrigida: ${transaction.description}`);
        fixedCount++;
      } catch (error) {
        logger.error(`❌ Erro ao corrigir transação ${transaction.id}:`, error);
      }
    }

    logger.info(`🎉 Correção concluída: ${fixedCount}/${inconsistentTransactions.length} transações corrigidas`);
    
    return {
      fixed: fixedCount,
      total: inconsistentTransactions.length,
      message: `${fixedCount} transações corrigidas de ${inconsistentTransactions.length} encontradas`
    };

  } catch (error) {
    logger.error('❌ Erro durante correção de transações inconsistentes:', error);
    throw error;
  }
}

module.exports = { fixInconsistentTransactions };