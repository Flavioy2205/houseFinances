import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
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
  const { user } = useAuth();
  const activeUserId = user?.id || user?.email || null;

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

  // Sincroniza dados com o Banco de Dados (Filtrados especificamente para o usuário ativo)
  const syncWithDatabase = async (targetUserIdOverride = null) => {
    setIsLoadingDB(true);
    const targetUserId = targetUserIdOverride || activeUserId;

    if (!targetUserId) {
      setTransactions([]);
      setIsLoadingDB(false);
      return;
    }

    // 1. Tenta Supabase Cloud em primeiro lugar se estiver configurado
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      const cloudData = await fetchCloudTransactions(targetUserId);
      if (cloudData !== null && Array.isArray(cloudData)) {
        setTransactions(cloudData);
        setDbMode('supabase');
        setDbStatusText('Supabase Cloud');
        setIsLoadingDB(false);
        return;
      }
    }

    // 2. Se Supabase não estiver configurado ou falhar, tenta PostgreSQL 15 Docker Local
    const localTest = await testPostgresLocalConnection();
    if (localTest.success) {
      const postgresData = await fetchPostgresLocalTransactions(targetUserId);
      if (postgresData !== null && Array.isArray(postgresData)) {
        setTransactions(postgresData);
        setDbMode('postgres_docker');
        setDbStatusText('PostgreSQL 15 (Docker)');
        setIsLoadingDB(false);
        return;
      }
    }

    // 3. Fallback no LocalStorage filtrando pelo usuário ativo
    const saved = localStorage.getItem('housefinances_tx');
    if (saved) {
      try {
        const allTx = JSON.parse(saved);
        const userTx = targetUserId ? allTx.filter(t => !t.userId || t.userId === targetUserId) : allTx;
        setTransactions(userTx);
      } catch (e) { console.error(e); }
    }
    setDbMode('local_storage');
    setDbStatusText('LocalStorage');
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

    // Sincroniza automaticamente a cada 5 segundos no banco ativo para o usuário logado
    const interval = setInterval(() => {
      const config = getSupabaseConfig();
      if (config.isConfigured) {
        fetchCloudTransactions(activeUserId).then(data => {
          if (data && Array.isArray(data)) {
            setTransactions(data);
            setDbMode('supabase');
            setDbStatusText('Supabase Cloud');
          }
        }).catch(err => {
          console.warn('Erro ao atualizar dados do Supabase em segundo plano:', err);
        });
      } else {
        fetchPostgresLocalTransactions(activeUserId).then(data => {
          if (data && Array.isArray(data)) {
            setTransactions(data);
            setDbMode('postgres_docker');
            setDbStatusText('PostgreSQL 15 (Docker)');
          }
        }).catch(err => {
          console.warn('Erro ao atualizar dados do banco em segundo plano:', err);
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeUserId]);

  // Auto-recurring subscription & fixed expense check for current month
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
      const config = getSupabaseConfig();
      newAutoTransactions.forEach(tx => {
        if (config.isConfigured) {
          insertCloudTransaction(tx, activeUserId);
        } else {
          insertPostgresLocalTransaction(tx, activeUserId);
        }
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
      amount: parseFloat(newTx.amount) || 0
    };

    setTransactions(prev => [tx, ...prev]);

    const config = getSupabaseConfig();
    if (config.isConfigured) {
      await insertCloudTransaction(tx, activeUserId);
    } else {
      await insertPostgresLocalTransaction(tx, activeUserId);
    }

    return tx;
  };

  const deleteTransaction = async (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));

    const config = getSupabaseConfig();
    if (config.isConfigured) {
      await deleteCloudTransaction(id, activeUserId);
    } else {
      await deletePostgresLocalTransaction(id, activeUserId);
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
