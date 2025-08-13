const { Unit, FinancialTransaction, Condominium, User } = require('../models');
const { Op } = require('sequelize');

class AutoBillingService {
  static async processAutoBilling() {
    try {
      console.log('🤖 Iniciando processamento de cobrança automática...');
      
      // Data de hoje
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      // Data limite: 10 dias antes do vencimento
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 10);
      const targetDay = targetDate.getDate();
      
      console.log(`📅 Buscando unidades com vencimento no dia ${targetDay} (10 dias à frente)`);
      
      // Buscar unidades com cobrança automática habilitada e que devem ser processadas
      const unitsToProcess = await Unit.findAll({
        where: {
          auto_billing_enabled: true,
          payment_due_day: targetDay,
          monthly_amount: {
            [Op.gt]: 0
          }
        },
        include: [
          {
            model: Condominium,
            as: 'condominium',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'resident_user',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      console.log(`🏠 Encontradas ${unitsToProcess.length} unidades para processar`);
      
      let processedCount = 0;
      let errorCount = 0;
      
      for (const unit of unitsToProcess) {
        try {
          // Verificar se já existe uma cobrança para este mês
          const existingTransaction = await FinancialTransaction.findOne({
            where: {
              unit_id: unit.id,
              reference_month: currentMonth,
              reference_year: currentYear,
              category: 'condominium_fee',
              type: 'income'
            }
          });
          
          if (existingTransaction) {
            console.log(`⏭️  Unidade ${unit.number} já possui cobrança para ${currentMonth}/${currentYear}`);
            continue;
          }
          
          // Criar nova transação financeira
          const dueDate = new Date(currentYear, currentMonth - 1, unit.payment_due_day);
          
          const transaction = await FinancialTransaction.create({
            condominium_id: unit.condominium_id,
            unit_id: unit.id,
            user_id: unit.resident_user_id,
            type: 'income',
            category: 'condominium_fee',
            description: `Taxa de condomínio - Unidade ${unit.number}${unit.block ? ` Bloco ${unit.block}` : ''}`,
            amount: unit.monthly_amount,
            due_date: dueDate,
            status: 'pending',
            reference_month: currentMonth,
            reference_year: currentYear,
            total_amount: unit.monthly_amount
          });
          
          console.log(`✅ Criada cobrança para unidade ${unit.number} - R$ ${unit.monthly_amount} - vencimento ${dueDate.toLocaleDateString('pt-BR')}`);
          processedCount++;
          
        } catch (error) {
          console.error(`❌ Erro ao processar unidade ${unit.number}:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`🎯 Processamento concluído: ${processedCount} cobranças criadas, ${errorCount} erros`);
      
      return {
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: unitsToProcess.length
      };
      
    } catch (error) {
      console.error('💥 Erro no processamento de cobrança automática:', error);
      throw error;
    }
  }

  static async getUpcomingBillings() {
    try {
      const today = new Date();
      const next30Days = new Date(today);
      next30Days.setDate(next30Days.getDate() + 30);
      
      const upcomingUnits = await Unit.findAll({
        where: {
          auto_billing_enabled: true,
          monthly_amount: {
            [Op.gt]: 0
          }
        },
        include: [
          {
            model: Condominium,
            as: 'condominium',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'resident_user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['payment_due_day', 'ASC']]
      });
      
      const upcomingBillings = upcomingUnits.map(unit => {
        const nextBillingDate = this.calculateNextBillingDate(unit.payment_due_day);
        const daysUntilBilling = Math.ceil((nextBillingDate - today) / (1000 * 60 * 60 * 24));
        
        return {
          unit_id: unit.id,
          unit_number: unit.number,
          unit_block: unit.block,
          condominium_name: unit.condominium?.name,
          resident_name: unit.resident_user?.name,
          monthly_amount: unit.monthly_amount,
          payment_due_day: unit.payment_due_day,
          next_billing_date: nextBillingDate,
          days_until_billing: daysUntilBilling,
          auto_create_date: new Date(nextBillingDate.getTime() - (10 * 24 * 60 * 60 * 1000)) // 10 dias antes
        };
      }).filter(billing => billing.days_until_billing <= 30);
      
      return upcomingBillings;
      
    } catch (error) {
      console.error('❌ Erro ao buscar próximas cobranças:', error);
      throw error;
    }
  }
  
  static calculateNextBillingDate(paymentDueDay) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Tentar criar data para o mês atual
    let nextBillingDate = new Date(currentYear, currentMonth, paymentDueDay);
    
    // Se a data já passou, usar o próximo mês
    if (nextBillingDate <= today) {
      nextBillingDate = new Date(currentYear, currentMonth + 1, paymentDueDay);
    }
    
    return nextBillingDate;
  }
  
  static async enableAutoBillingForUnit(unitId, monthlyAmount, paymentDueDay) {
    try {
      const unit = await Unit.findByPk(unitId);
      if (!unit) {
        throw new Error('Unidade não encontrada');
      }
      
      await unit.update({
        monthly_amount: monthlyAmount,
        payment_due_day: paymentDueDay,
        auto_billing_enabled: true
      });
      
      console.log(`🔄 Cobrança automática habilitada para unidade ${unit.number}`);
      
      return unit;
    } catch (error) {
      console.error('❌ Erro ao habilitar cobrança automática:', error);
      throw error;
    }
  }
  
  static async disableAutoBillingForUnit(unitId) {
    try {
      const unit = await Unit.findByPk(unitId);
      if (!unit) {
        throw new Error('Unidade não encontrada');
      }
      
      await unit.update({
        auto_billing_enabled: false
      });
      
      console.log(`⏹️  Cobrança automática desabilitada para unidade ${unit.number}`);
      
      return unit;
    } catch (error) {
      console.error('❌ Erro ao desabilitar cobrança automática:', error);
      throw error;
    }
  }
}

module.exports = AutoBillingService;