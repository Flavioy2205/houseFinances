import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getSupabaseConfig, 
  fetchCloudTransactions, 
  insertCloudTransaction, 
  deleteCloudTransaction 
} from '../services/supabase';
import { 
  fetchPostgresLocalTransactions, 
  insertPostgresLocalTransaction, 
  deletePostgresLocalTransaction,
  testPostgresLocalConnection 
} from '../services/postgresLocal';

const FinanceContext = createContext();

const getInitialTransactions = () => [];

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('housefinances_tx');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return getInitialTransactions();
  });

  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const saved = localStorage.getItem('housefinances_budget');
    return saved ? Number(saved) : 4000;
  });

  const [dbMode, setDbMode] = useState('local'); // 'postgres_docker' | 'supabase' | 'local_storage'
  const [dbStatusText, setDbStatusText] = useState('Armazenamento Local');
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // Sincroniza dados com o Banco de Dados (Prioridade: Docker PostgreSQL 15 > Supabase > LocalStorage)
  const syncWithDatabase = async () => {
    setIsLoadingDB(true);

    // 1. Tenta conectar com o PostgreSQL 15 Docker Local (porta 3002)
    const localTest = await testPostgresLocalConnection();
    if (localTest.success) {
      const postgresData = await fetchPostgresLocalTransactions();
      if (postgresData !== null) {
        setTransactions(postgresData);
        setDbMode('postgres_docker');
        setDbStatusText('PostgreSQL 15 (Docker)');
        setIsLoadingDB(false);
        return;
      }
    }

    // 2. Se Docker não estiver rodando, tenta Supabase Cloud
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      const cloudData = await fetchCloudTransactions();
      if (cloudData !== null) {
        setTransactions(cloudData);
        setDbMode('supabase');
        setDbStatusText('Supabase Cloud');
        setIsLoadingDB(false);
        return;
      }
    }

    // 3. Fallback no LocalStorage
    setDbMode('local_storage');
    setDbStatusText('LocalStorage');
    setIsLoadingDB(false);
  };

  useEffect(() => {
    syncWithDatabase();
  }, []);

  // Auto-recurring subscription & fixed expense check for current month
  useEffect(() => {
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
        if (dbMode === 'postgres_docker') insertPostgresLocalTransaction(tx);
        else if (dbMode === 'supabase') insertCloudTransaction(tx);
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('housefinances_tx', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('housefinances_budget', String(monthlyBudget));
  }, [monthlyBudget]);

  const addTransaction = (newTx) => {
    const tx = {
      id: 'tx-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      ...newTx,
      category: newTx.category || 'outros',
      isRecurring: Boolean(newTx.isRecurring),
      amount: parseFloat(newTx.amount) || 0
    };

    setTransactions(prev => [tx, ...prev]);

    // Salva diretamente no PostgreSQL 15 (Docker) se ativo ou no Supabase
    if (dbMode === 'postgres_docker') {
      insertPostgresLocalTransaction(tx);
    } else if (dbMode === 'supabase') {
      insertCloudTransaction(tx);
    }

    return tx;
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));

    if (dbMode === 'postgres_docker') {
      deletePostgresLocalTransaction(id);
    } else if (dbMode === 'supabase') {
      deleteCloudTransaction(id);
    }
  };

  const updateTransaction = (id, updatedData) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));
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

  // Totals calculations
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

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

  // Subscriptions Total
  const subscriptionsTotalMonth = currentMonthTransactions
    .filter(t => t.category === 'assinatura' || t.isRecurring)
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <FinanceContext.Provider value={{
      transactions,
      currentMonthTransactions,
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
