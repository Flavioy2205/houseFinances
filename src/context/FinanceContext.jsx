import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  getSupabaseConfig, 
  fetchCloudTransactions, 
  insertCloudTransaction, 
  deleteCloudTransaction,
  updateCloudTransaction
} from '../services/supabase';

const FinanceContext = createContext();

const getInitialTransactions = () => [];

export const FinanceProvider = ({ children }) => {
  const { user } = useAuth();
  const activeUserId = user?.email ? String(user.email).toLowerCase().trim() : (user?.id || null);

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('housefinances_tx');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return getInitialTransactions();
  });

  const [bills, setBills] = useState(() => {
    const saved = localStorage.getItem('housefinances_bills');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('housefinances_bills', JSON.stringify(bills));
  }, [bills]);

  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const saved = localStorage.getItem('housefinances_budget');
    return saved ? Number(saved) : 4000;
  });

  const [dbMode, setDbMode] = useState('supabase'); // 'supabase' | 'local_storage'
  const [dbStatusText, setDbStatusText] = useState('Supabase Cloud');
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // Sincroniza dados EXCLUSIVAMENTE com o Supabase Cloud (Filtrados especificamente para o usuário ativo)
  const syncWithDatabase = async (targetUserIdOverride = null) => {
    setIsLoadingDB(true);
    const targetUserId = targetUserIdOverride || activeUserId;

    if (!targetUserId) {
      setTransactions([]);
      setIsLoadingDB(false);
      return;
    }

    const cloudData = await fetchCloudTransactions(targetUserId);
    if (cloudData !== null && Array.isArray(cloudData)) {
      setTransactions(cloudData);
      setDbMode('supabase');
      setDbStatusText('Supabase Cloud');
      setIsLoadingDB(false);
      return;
    }

    // Fallback no LocalStorage em caso de desconexão offline
    const saved = localStorage.getItem('housefinances_tx');
    if (saved) {
      try {
        const allTx = JSON.parse(saved);
        const userTx = targetUserId ? allTx.filter(t => !t.userId || t.userId === targetUserId) : allTx;
        setTransactions(userTx);
      } catch (e) { console.error(e); }
    }
    setDbMode('local_storage');
    setDbStatusText('LocalStorage (Offline)');
    setIsLoadingDB(false);
  };

  // Re-sincroniza imediatamente quando o usuário logado mudar (ex: login/logout/troca de aparelho)
  useEffect(() => {
    if (activeUserId) {
      syncWithDatabase(activeUserId);
    } else {
      setTransactions([]);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) return;

    // Sincroniza automaticamente a cada 5 segundos no Supabase Cloud para o usuário logado
    const interval = setInterval(() => {
      fetchCloudTransactions(activeUserId).then(data => {
        if (data && Array.isArray(data)) {
          setTransactions(data);
          setDbMode('supabase');
          setDbStatusText('Supabase Cloud');
        }
      }).catch(err => {
        console.warn('Erro ao atualizar dados do Supabase em segundo plano:', err);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeUserId]);

  // Lançamentos automáticos para assinaturas e gastos fixos recorrentes
  useEffect(() => {
    if (!activeUserId) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${currentYear}-${currentMonthStr}`;

    const recurringMap = new Map();
    transactions.forEach(t => {
      if (t.isRecurring) {
        const key = t.description.toLowerCase().trim();
        if (!recurringMap.has(key)) {
          recurringMap.set(key, t);
        }
      }
    });

    const newAutoTransactions = [];

    recurringMap.forEach((rec, key) => {
      const hasCurrentMonthEntry = transactions.some(t => {
        const tYearMonth = t.date ? t.date.substring(0, 7) : '';
        return tYearMonth === currentYearMonth && t.description.toLowerCase().trim() === key;
      });

      if (!hasCurrentMonthEntry) {
        const day = rec.date ? rec.date.split('-')[2] || '01' : '01';
        const autoTx = {
          id: 'tx-auto-rec-' + Date.now() + Math.random().toString(36).substr(2, 5),
          userId: activeUserId,
          description: rec.description,
          amount: rec.amount,
          paymentType: rec.paymentType,
          category: rec.category || 'gasto_fixo',
          isRecurring: true,
          date: `${currentYearMonth}-${day}`,
          notes: `🔄 Lançamento automático mensal (${rec.category === 'assinatura' ? 'Assinatura' : 'Gasto Fixo'})`,
          createdAt: new Date().toISOString()
        };
        newAutoTransactions.push(autoTx);
      }
    });

    if (newAutoTransactions.length > 0) {
      setTransactions(prev => [...newAutoTransactions, ...prev]);
      newAutoTransactions.forEach(tx => {
        insertCloudTransaction(tx, activeUserId);
      });
    }
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem('housefinances_tx', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('housefinances_budget', String(monthlyBudget));
  }, [monthlyBudget]);

  const addTransaction = async (newTx) => {
    const tx = {
      id: 'tx-' + Date.now(),
      userId: activeUserId,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      ...newTx,
      category: newTx.category || 'outros',
      isRecurring: Boolean(newTx.isRecurring),
      isInstallment: Boolean(newTx.isInstallment),
      installmentsCount: newTx.installmentsCount ? Number(newTx.installmentsCount) : null,
      totalAmount: newTx.totalAmount ? Number(newTx.totalAmount) : null,
      amount: parseFloat(newTx.amount) || 0
    };

    setTransactions(prev => [tx, ...prev]);

    // Insere EXCLUSIVAMENTE no Supabase Cloud
    await insertCloudTransaction(tx, activeUserId);

    return tx;
  };

  const deleteTransaction = async (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));

    // Deleta EXCLUSIVAMENTE no Supabase Cloud
    await deleteCloudTransaction(id, activeUserId);
  };

  const updateTransaction = async (id, updatedData) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));

    // Atualiza EXCLUSIVAMENTE no Supabase Cloud
    await updateCloudTransaction(id, updatedData, activeUserId);
  };

  const clearAllData = () => {
    setTransactions([]);
    localStorage.removeItem('housefinances_tx');
  };

  const resetData = () => {
    clearAllData();
  };

  // Smart Parser for WhatsApp messages
  const parseWhatsappText = (text) => {
    if (!text || typeof text !== 'string') return null;

    const lower = text.toLowerCase();
    
    // 1. Extract Amount
    let amount = 0;
    const amountMatch = lower.match(/(?:r\$\s*)?(\d+[\.,]?\d*)(?:\s*reais)?/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    }

    // 2. Extract Payment Type
    let paymentType = 'debito';
    if (lower.includes('credito') || lower.includes('crédito') || lower.includes('cartao de credito')) {
      paymentType = 'credito';
    } else if (lower.includes('debito') || lower.includes('débito') || lower.includes('cartao de debito')) {
      paymentType = 'debito';
    } else if (lower.includes('pix')) {
      paymentType = 'pix';
    } else if (lower.includes('dinheiro') || lower.includes('especie')) {
      paymentType = 'dinheiro';
    }

    // 3. Extract Category & Recurrence
    let category = 'outros';
    let isRecurring = false;

    if (
      lower.includes('assinatura') || 
      lower.includes('recorrente') || 
      lower.includes('mensalidade') || 
      lower.includes('netflix') || 
      lower.includes('spotify') || 
      lower.includes('prime') || 
      lower.includes('hbo') || 
      lower.includes('disney') || 
      lower.includes('youtube') || 
      lower.includes('academia')
    ) {
      category = 'assinatura';
      isRecurring = true;
    } else if (lower.includes('fixo') || lower.includes('aluguel') || lower.includes('luz') || lower.includes('agua') || lower.includes('água') || lower.includes('internet') || lower.includes('condominio')) {
      category = 'gasto_fixo';
      if (lower.includes('recorrente') || lower.includes('todo mes') || lower.includes('todo mês') || lower.includes('mensal')) {
        isRecurring = true;
      }
    } else if (lower.includes('lazer') || lower.includes('cinema') || lower.includes('bar') || lower.includes('festa') || lower.includes('viagem')) {
      category = 'lazer';
    } else if (lower.includes('compras') || lower.includes('roupa') || lower.includes('loja') || lower.includes('shopping')) {
      category = 'compras';
    } else if (lower.includes('mercado') || lower.includes('almoço') || lower.includes('almoco') || lower.includes('jantar') || lower.includes('comida') || lower.includes('lanche') || lower.includes('padaria')) {
      category = 'alimentacao';
    } else if (lower.includes('uber') || lower.includes('gasolina') || lower.includes('combustivel') || lower.includes('posto') || lower.includes('passagem') || lower.includes('transporte')) {
      category = 'transporte';
    }

    // 4. Extract Description
    let description = text
      .replace(/(?:r\$\s*)?\d+[\.,]?\d*(?:\s*reais)?/gi, '')
      .replace(/cartao|cartão|credito|crédito|debito|débito|pix|dinheiro/gi, '')
      .replace(/lazer|compras|gasto fixo|fixo|alimentacao|alimentação|transporte|outros|assinatura|assinaturas|recorrente|mensalidade/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!description) {
      description = category === 'assinatura' ? 'Serviço de Assinatura' :
                    category === 'alimentacao' ? 'Alimentação' :
                    category === 'lazer' ? 'Lazer / Entretenimento' :
                    category === 'compras' ? 'Compras diversas' :
                    category === 'gasto_fixo' ? 'Gasto Fixo' : 'Gasto WhatsApp';
    }

    return {
      description: description.charAt(0).toUpperCase() + description.slice(1),
      amount,
      paymentType,
      category,
      isRecurring,
      date: new Date().toISOString().split('T')[0],
      notes: `Inserido via WhatsApp (${isRecurring ? 'Recorrente Mensal' : 'Gasto Avulso'}): "${text}"`
    };
  };

  // Totals & Month Selection
  const getCurrentYearMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedYearMonth, setSelectedYearMonth] = useState(getCurrentYearMonth());

  // Lista dinâmica de meses disponíveis (mês atual + meses com gastos cadastrados + contas a pagar)
  const availableMonths = React.useMemo(() => {
    const monthSet = new Set();
    monthSet.add(getCurrentYearMonth());
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.substring(0, 7));
      }
    });
    if (bills && Array.isArray(bills)) {
      bills.forEach(b => {
        if (b.dueDate && b.dueDate.length >= 7) {
          monthSet.add(b.dueDate.substring(0, 7));
        }
      });
    }
    return Array.from(monthSet).sort().reverse();
  }, [transactions, bills]);

  const currentMonthTransactions = React.useMemo(() => {
    if (selectedYearMonth === 'all') return transactions;
    return transactions.filter(t => t.date && t.date.substring(0, 7) === selectedYearMonth);
  }, [transactions, selectedYearMonth]);

  const totalSpentMonth = currentMonthTransactions.reduce((acc, t) => acc + t.amount, 0);
  const creditTotalMonth = currentMonthTransactions
    .filter(t => t.paymentType === 'credito')
    .reduce((acc, t) => acc + t.amount, 0);
  const debitTotalMonth = currentMonthTransactions
    .filter(t => t.paymentType === 'debito')
    .reduce((acc, t) => acc + t.amount, 0);
  const pixTotalMonth = currentMonthTransactions
    .filter(t => t.paymentType === 'pix' || t.paymentType === 'dinheiro')
    .reduce((acc, t) => acc + t.amount, 0);

  // Totals by Category
  const categoryTotalsMonth = currentMonthTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const addBill = (newBill) => {
    const bill = {
      id: 'bill-' + Date.now() + Math.random().toString(36).substr(2, 5),
      userId: activeUserId,
      createdAt: new Date().toISOString(),
      status: 'nao_pago',
      paidAt: null,
      paidAmount: null,
      transactionId: null,
      ...newBill,
      amount: parseFloat(newBill.amount) || 0
    };
    setBills(prev => [bill, ...prev]);
    return bill;
  };

  const addMultiMonthBills = (billsList) => {
    const createdBills = billsList.map((newBill, idx) => ({
      id: 'bill-' + Date.now() + idx + '-' + Math.random().toString(36).substr(2, 5),
      userId: activeUserId,
      createdAt: new Date().toISOString(),
      status: 'nao_pago',
      paidAt: null,
      paidAmount: null,
      transactionId: null,
      ...newBill,
      amount: parseFloat(newBill.amount) || 0
    }));
    setBills(prev => [...createdBills, ...prev]);
    return createdBills;
  };

  const updateBill = (id, updatedData) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, ...updatedData } : b));
  };

  const deleteBill = (id) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const payBill = async (id, paymentData = {}) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    const paidAt = paymentData.paidAt || new Date().toISOString().split('T')[0];
    const paymentType = paymentData.paymentType || bill.paymentType || 'debito';
    const paidAmount = parseFloat(paymentData.paidAmount || bill.amount);
    const autoCreateTx = paymentData.autoCreateTransaction !== false;

    let createdTxId = null;

    if (autoCreateTx) {
      const createdTx = await addTransaction({
        description: `💳 ${bill.description}`,
        amount: paidAmount,
        category: bill.category || 'gasto_fixo',
        paymentType: paymentType,
        date: paidAt,
        notes: `Pagamento associado da Conta a Pagar (Vencimento: ${bill.dueDate}). ${bill.notes || ''}`.trim()
      });
      createdTxId = createdTx?.id || null;
    }

    setBills(prev => prev.map(b => b.id === id ? {
      ...b,
      status: 'pago',
      paidAt,
      paymentType,
      paidAmount,
      transactionId: createdTxId
    } : b));
  };

  const unpayBill = async (id, shouldDeleteTx = false) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    if (shouldDeleteTx && bill.transactionId) {
      await deleteTransaction(bill.transactionId);
    }

    setBills(prev => prev.map(b => b.id === id ? {
      ...b,
      status: 'nao_pago',
      paidAt: null,
      paidAmount: null,
      transactionId: null
    } : b));
  };

  // Subscriptions Total
  const subscriptionsTotalMonth = currentMonthTransactions
    .filter(t => t.category === 'assinatura' || t.isRecurring)
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <FinanceContext.Provider value={{
      transactions,
      currentMonthTransactions,
      selectedYearMonth,
      setSelectedYearMonth,
      availableMonths,
      totalSpentMonth,
      creditTotalMonth,
      debitTotalMonth,
      pixTotalMonth,
      categoryTotalsMonth,
      subscriptionsTotalMonth,
      monthlyBudget,
      setMonthlyBudget,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      bills,
      addBill,
      addMultiMonthBills,
      updateBill,
      deleteBill,
      payBill,
      unpayBill,
      clearAllData,
      resetData,
      parseWhatsappText,
      dbMode,
      dbStatusText,
      isLoadingDB,
      syncWithDatabase
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);


