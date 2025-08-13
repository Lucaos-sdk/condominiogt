const cron = require('node-cron');
const IntegrationService = require('../services/integrationService');
const { logger } = require('../middleware/errorHandler');

class IntegrationJobs {
  
  /**
   * Inicializa todos os jobs automáticos de integração
   */
  static initializeJobs() {
    logger.info('Inicializando jobs automáticos de integração...');
    
    // Job diário às 9h - Verificar atrasos e aplicar multas
    this.scheduleOverdueCheck();
    
    // Job diário às 8h - Notificar vencimentos próximos
    this.scheduleUpcomingDuesNotification();
    
    // Job a cada 6 horas - Sincronizar status de pagamentos
    this.schedulePaymentStatusSync();
    
    // Job semanal - Limpeza de dados antigos (opcional)
    this.scheduleWeeklyCleanup();
    
    logger.info('Jobs automáticos de integração inicializados com sucesso');
  }

  /**
   * Job para verificar atrasos e aplicar multas
   * Executa diariamente às 9:00
   */
  static scheduleOverdueCheck() {
    // '0 9 * * *' = Todo dia às 9:00
    cron.schedule('0 9 * * *', async () => {
      logger.info('Iniciando job de verificação de atrasos...');
      
      try {
        const appliedFees = await IntegrationService.checkAndApplyLateFees();
        
        logger.info(`Job de atrasos concluído: ${appliedFees.length} multas aplicadas`);
        
        // Log detalhado para auditoria
        if (appliedFees.length > 0) {
          const totalLateFees = appliedFees.reduce((sum, fee) => sum + fee.late_fee, 0);
          logger.info(`Total em multas aplicadas: R$ ${totalLateFees.toFixed(2)}`);
        }
        
      } catch (error) {
        logger.error('Erro no job de verificação de atrasos:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });
    
    logger.info('Job de verificação de atrasos agendado para 9:00 diário');
  }

  /**
   * Job para notificar vencimentos próximos
   * Executa diariamente às 8:00
   */
  static scheduleUpcomingDuesNotification() {
    // '0 8 * * *' = Todo dia às 8:00
    cron.schedule('0 8 * * *', async () => {
      logger.info('Iniciando job de notificação de vencimentos próximos...');
      
      try {
        // Notificar vencimentos dos próximos 3 dias
        const notifications = await IntegrationService.checkUpcomingDueDates(null, 3);
        
        logger.info(`Job de vencimentos concluído: ${notifications.length} notificações enviadas`);
        
      } catch (error) {
        logger.error('Erro no job de vencimentos próximos:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });
    
    logger.info('Job de vencimentos próximos agendado para 8:00 diário');
  }

  /**
   * Job para sincronizar status de pagamentos
   * Executa a cada 6 horas
   */
  static schedulePaymentStatusSync() {
    // '0 */6 * * *' = A cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      logger.info('Iniciando job de sincronização de status de pagamentos...');
      
      try {
        // Buscar transações que podem precisar de sincronização
        const { FinancialTransaction } = require('../models');
        const { Op } = require('sequelize');
        
        const transactionsToSync = await FinancialTransaction.findAll({
          where: {
            maintenance_request_id: { [Op.not]: null },
            status: 'paid',
            updatedAt: {
              [Op.gte]: new Date(Date.now() - 6 * 60 * 60 * 1000) // Últimas 6 horas
            }
          },
          limit: 50 // Limitar para não sobrecarregar
        });
        
        let syncedCount = 0;
        
        for (const transaction of transactionsToSync) {
          try {
            await IntegrationService.syncMaintenancePaymentStatus(transaction.id);
            syncedCount++;
          } catch (error) {
            logger.warn(`Erro ao sincronizar transação ${transaction.id}:`, error);
          }
        }
        
        logger.info(`Job de sincronização concluído: ${syncedCount}/${transactionsToSync.length} transações sincronizadas`);
        
      } catch (error) {
        logger.error('Erro no job de sincronização de status:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });
    
    logger.info('Job de sincronização de pagamentos agendado para a cada 6 horas');
  }

  /**
   * Job semanal para limpeza e manutenção
   * Executa aos domingos às 2:00
   */
  static scheduleWeeklyCleanup() {
    // '0 2 * * 0' = Domingos às 2:00
    cron.schedule('0 2 * * 0', async () => {
      logger.info('Iniciando job semanal de limpeza...');
      
      try {
        const { AuditLog } = require('../models');
        const { Op } = require('sequelize');
        
        // Remover logs de auditoria muito antigos (mais de 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const deletedLogs = await AuditLog.destroy({
          where: {
            createdAt: {
              [Op.lt]: sixMonthsAgo
            },
            action: 'integration_auto' // Apenas logs automáticos
          }
        });
        
        logger.info(`Job de limpeza concluído: ${deletedLogs} logs antigos removidos`);
        
        // Outras tarefas de manutenção podem ser adicionadas aqui
        
      } catch (error) {
        logger.error('Erro no job de limpeza semanal:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });
    
    logger.info('Job de limpeza semanal agendado para domingos 2:00');
  }

  /**
   * Job manual para processar atrasos imediatamente
   * Usado para testes ou processamento manual
   */
  static async runOverdueCheckNow() {
    logger.info('Executando verificação de atrasos manualmente...');
    
    try {
      const appliedFees = await IntegrationService.checkAndApplyLateFees();
      logger.info(`Verificação manual concluída: ${appliedFees.length} multas aplicadas`);
      return appliedFees;
    } catch (error) {
      logger.error('Erro na verificação manual de atrasos:', error);
      throw error;
    }
  }

  /**
   * Job manual para notificar vencimentos próximos imediatamente
   */
  static async runUpcomingDuesNow(daysAhead = 3) {
    logger.info(`Executando notificação de vencimentos manualmente (${daysAhead} dias)...`);
    
    try {
      const notifications = await IntegrationService.checkUpcomingDueDates(null, daysAhead);
      logger.info(`Notificação manual concluída: ${notifications.length} notificações enviadas`);
      return notifications;
    } catch (error) {
      logger.error('Erro na notificação manual de vencimentos:', error);
      throw error;
    }
  }

  /**
   * Parar todos os jobs (usado para testes ou shutdown)
   */
  static stopAllJobs() {
    cron.getTasks().forEach((task, name) => {
      task.stop();
      logger.info(`Job ${name} parado`);
    });
    
    logger.info('Todos os jobs automáticos foram parados');
  }

  /**
   * Listar status de todos os jobs
   */
  static getJobsStatus() {
    const tasks = cron.getTasks();
    const jobsStatus = [];
    
    tasks.forEach((task, name) => {
      jobsStatus.push({
        name,
        running: task.running,
        destroyed: task.destroyed
      });
    });
    
    return {
      total_jobs: jobsStatus.length,
      jobs: jobsStatus
    };
  }

  /**
   * Job de emergência para quando há muitas transações em atraso
   * Executa processamento em lotes para evitar sobrecarga
   */
  static async runEmergencyOverdueProcessing() {
    logger.info('Iniciando processamento de emergência para atrasos...');
    
    try {
      const { FinancialTransaction } = require('../models');
      const { Op } = require('sequelize');
      
      // Contar total de transações em atraso
      const overdueCount = await FinancialTransaction.count({
        where: {
          status: 'pending',
          due_date: {
            [Op.lt]: new Date()
          }
        }
      });
      
      if (overdueCount === 0) {
        logger.info('Nenhuma transação em atraso encontrada');
        return { processed: 0, total: 0 };
      }
      
      logger.info(`Encontradas ${overdueCount} transações em atraso. Processando em lotes...`);
      
      const batchSize = 100;
      let processed = 0;
      
      // Processar por condomínio para melhor organização
      const { Condominium } = require('../models');
      const condominiums = await Condominium.findAll({
        attributes: ['id', 'name']
      });
      
      for (const condominium of condominiums) {
        try {
          const appliedFees = await IntegrationService.checkAndApplyLateFees(condominium.id);
          processed += appliedFees.length;
          
          if (appliedFees.length > 0) {
            logger.info(`Condomínio ${condominium.name}: ${appliedFees.length} multas aplicadas`);
          }
          
          // Pequena pausa entre condomínios para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          logger.error(`Erro ao processar condomínio ${condominium.name}:`, error);
        }
      }
      
      logger.info(`Processamento de emergência concluído: ${processed}/${overdueCount} transações processadas`);
      
      return { processed, total: overdueCount };
      
    } catch (error) {
      logger.error('Erro no processamento de emergência:', error);
      throw error;
    }
  }
}

module.exports = IntegrationJobs;