import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export const exportService = {
  // Exporta relatório financeiro para PDF
  exportFinancialReportToPDF: (reportData, condominiumName, filters) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Relatório Financeiro', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    doc.text(`Condomínio: ${condominiumName}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 20;

    // Resumo Executivo
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Resumo Executivo', 20, currentY);
    currentY += 15;

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };

    const summaryData = [
      ['Total de Receitas:', formatCurrency(reportData.report.total_income)],
      ['Total de Despesas:', formatCurrency(reportData.report.total_expenses)],
      ['Saldo Atual:', formatCurrency(reportData.balance.current_balance)],
      ['Total de Transações:', (reportData.report.total_transactions || 0).toString()]
    ];

    summaryData.forEach(([label, value]) => {
      doc.text(label, 20, currentY);
      doc.text(value, 120, currentY);
      currentY += 8;
    });

    currentY += 10;

    // Receitas por Categoria
    if (reportData.report.income_by_category && Object.keys(reportData.report.income_by_category).length > 0) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Receitas por Categoria', 20, currentY);
      currentY += 15;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      Object.entries(reportData.report.income_by_category).forEach(([category, data]) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        const categoryName = category === 'condominium_fee' ? 'Taxa de Condomínio' :
                           category === 'reserves' ? 'Reservas' :
                           category === 'other' ? 'Outros' : category;
        
        doc.text(`${categoryName}:`, 25, currentY);
        doc.text(formatCurrency(data.total), 120, currentY);
        doc.text(`(${data.count} transações)`, 160, currentY);
        currentY += 6;
      });

      currentY += 10;
    }

    // Despesas por Categoria
    if (reportData.report.expense_by_category && Object.keys(reportData.report.expense_by_category).length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Despesas por Categoria', 20, currentY);
      currentY += 15;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      Object.entries(reportData.report.expense_by_category).forEach(([category, data]) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        const categoryName = category === 'maintenance' ? 'Manutenção' :
                           category === 'utilities' ? 'Utilidades' :
                           category === 'security' ? 'Segurança' :
                           category === 'cleaning' ? 'Limpeza' :
                           category === 'administration' ? 'Administração' :
                           category === 'other' ? 'Outros' : category;
        
        doc.text(`${categoryName}:`, 25, currentY);
        doc.text(formatCurrency(data.total), 120, currentY);
        doc.text(`(${data.count} transações)`, 160, currentY);
        currentY += 6;
      });
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    // Save PDF
    const fileName = `relatorio-financeiro-${condominiumName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  },

  // Exporta relatório financeiro para Excel
  exportFinancialReportToExcel: (reportData, condominiumName, recentTransactions) => {
    const workbook = XLSX.utils.book_new();

    // Aba Resumo
    const summaryData = [
      ['RELATÓRIO FINANCEIRO'],
      [`Condomínio: ${condominiumName}`],
      [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
      [''],
      ['RESUMO EXECUTIVO'],
      ['Total de Receitas', reportData.report.total_income || 0],
      ['Total de Despesas', reportData.report.total_expenses || 0], 
      ['Saldo Atual', reportData.balance.current_balance || 0],
      ['Total de Transações', reportData.report.total_transactions || 0],
      [''],
      ['RECEITAS POR CATEGORIA']
    ];

    // Adiciona receitas por categoria
    if (reportData.report.income_by_category) {
      Object.entries(reportData.report.income_by_category).forEach(([category, data]) => {
        const categoryName = category === 'condominium_fee' ? 'Taxa de Condomínio' :
                           category === 'reserves' ? 'Reservas' :
                           category === 'other' ? 'Outros' : category;
        summaryData.push([categoryName, data.total, `${data.count} transações`]);
      });
    }

    summaryData.push([''], ['DESPESAS POR CATEGORIA']);

    // Adiciona despesas por categoria
    if (reportData.report.expense_by_category) {
      Object.entries(reportData.report.expense_by_category).forEach(([category, data]) => {
        const categoryName = category === 'maintenance' ? 'Manutenção' :
                           category === 'utilities' ? 'Utilidades' :
                           category === 'security' ? 'Segurança' :
                           category === 'cleaning' ? 'Limpeza' :
                           category === 'administration' ? 'Administração' :
                           category === 'other' ? 'Outros' : category;
        summaryData.push([categoryName, data.total, `${data.count} transações`]);
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Aba Transações Recentes
    if (recentTransactions && recentTransactions.length > 0) {
      const transactionsData = [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status']
      ];

      recentTransactions.forEach(transaction => {
        transactionsData.push([
          new Date(transaction.due_date).toLocaleDateString('pt-BR'),
          transaction.description,
          transaction.category,
          transaction.type === 'income' ? 'Receita' : 'Despesa',
          transaction.amount,
          transaction.status === 'paid' ? 'Pago' :
          transaction.status === 'pending' ? 'Pendente' :
          transaction.status === 'overdue' ? 'Vencido' : transaction.status
        ]);
      });

      const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transações');
    }

    // Save Excel
    const fileName = `relatorio-financeiro-${condominiumName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  // Exporta lista de transações para Excel
  exportTransactionsToExcel: (transactions, condominiumName) => {
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['ID', 'Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Método de Pagamento', 'Criado em']
    ];

    transactions.forEach(transaction => {
      data.push([
        transaction.id,
        new Date(transaction.due_date).toLocaleDateString('pt-BR'),
        transaction.description,
        transaction.category,
        transaction.type === 'income' ? 'Receita' : 'Despesa',
        transaction.amount,
        transaction.status === 'paid' ? 'Pago' :
        transaction.status === 'pending' ? 'Pendente' :
        transaction.status === 'overdue' ? 'Vencido' : transaction.status,
        transaction.payment_method,
        new Date(transaction.createdAt).toLocaleDateString('pt-BR')
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Transações');

    const fileName = `transacoes-${condominiumName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  // Exporta dados genéricos para Excel
  exportToExcel: (data, fileName, sheetName = 'Dados') => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  // Exporta dados genéricos para CSV
  exportToCSV: (data, fileName) => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Dados');
    XLSX.writeFile(workbook, `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
  }
};