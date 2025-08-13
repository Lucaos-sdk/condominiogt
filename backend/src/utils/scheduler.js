const cron = require('node-cron');
const AutoBillingService = require('../services/autoBillingService');

class Scheduler {
  static init() {
    // Executar cobrança automática todos os dias às 06:00
    cron.schedule('0 6 * * *', async () => {
      console.log('⏰ Executando processo de cobrança automática...');
      try {
        const result = await AutoBillingService.processAutoBilling();
        console.log('✅ Processo de cobrança automática concluído:', result);
      } catch (error) {
        console.error('❌ Erro no processo de cobrança automática:', error);
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    // Executar limpeza de logs antigos semanalmente (domingos às 02:00)
    cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Executando limpeza de dados antigos...');
      // Aqui você pode adicionar lógica para limpar logs antigos, etc.
    }, {
      timezone: 'America/Sao_Paulo'
    });

    console.log('⚡ Scheduler iniciado com sucesso');
  }

  static async runAutoBillingNow() {
    console.log('🚀 Executando cobrança automática manualmente...');
    try {
      const result = await AutoBillingService.processAutoBilling();
      console.log('✅ Cobrança manual concluída:', result);
      return result;
    } catch (error) {
      console.error('❌ Erro na cobrança manual:', error);
      throw error;
    }
  }
}

module.exports = Scheduler;