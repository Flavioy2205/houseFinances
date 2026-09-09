import { createClient } from '@supabase/supabase-js';

// Retorna as credenciais salvas no LocalStorage ou variáveis de ambiente .env
export const getSupabaseConfig = () => {
  const url = localStorage.getItem('housefinances_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem('housefinances_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key, isConfigured: Boolean(url && key) };
};

// Cria a instância do cliente Supabase dinamicamente
export const getSupabaseClient = () => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
};

export const saveSupabaseConfig = (url, key) => {
  if (url && key) {
    localStorage.setItem('housefinances_supabase_url', url.trim());
    localStorage.setItem('housefinances_supabase_anon_key', key.trim());
  } else {
    localStorage.removeItem('housefinances_supabase_url');
    localStorage.removeItem('housefinances_supabase_anon_key');
  }
};

// Testa a conexão efetuando um SELECT rápido na tabela transactions
export const testSupabaseConnection = async (url, key) => {
  try {
    const client = createClient(url.trim(), key.trim());
    const { data, error } = await client.from('transactions').select('id').limit(1);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Conexão estabelecida com sucesso com o Supabase!' };
  } catch (err) {
    return { success: false, message: err.message || 'Falha ao conectar no Supabase.' };
  }
};

// Busca todas as transações do banco Supabase (filtrando por user_id se fornecido)
export const fetchCloudTransactions = async (userId = null) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Mapeia colunas do banco (snake_case) para objetos da app (camelCase)
    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      description: row.description,
      amount: Number(row.amount),
      paymentType: row.payment_type,
      category: row.category,
      isRecurring: Boolean(row.is_recurring),
      date: row.date,
      notes: row.notes || '',
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Erro ao buscar transações do Supabase:', err);
    return null;
  }
};

// Insere transação no banco Supabase (associando ao user_id)
export const insertCloudTransaction = async (tx, userId = null) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const payload = {
      id: tx.id,
      user_id: userId || tx.userId || null,
      description: tx.description,
      amount: tx.amount,
      payment_type: tx.paymentType,
      category: tx.category,
      is_recurring: Boolean(tx.isRecurring),
      date: tx.date,
      notes: tx.notes || ''
    };

    const { data, error } = await client.from('transactions').insert([payload]).select();
    if (error) throw error;
    return data ? data[0] : null;
  } catch (err) {
    console.error('Erro ao inserir transação no Supabase:', err);
    return null;
  }
};

// Exclui transação no banco Supabase
export const deleteCloudTransaction = async (id, userId = null) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('transactions').delete().eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao excluir transação no Supabase:', err);
    return false;
  }
};

// --- FUNÇÕES DE USUÁRIOS NO SUPABASE ---

// Busca usuário por e-mail no Supabase
export const fetchCloudUserFromDb = async (email) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const { data, error } = await client
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail);

    if (!error && data && data.length > 0) {
      return { success: true, user: data[0] };
    }

    // Fallback: busca a lista completa de usuários do Supabase e compara com toLowerCase()
    const allRes = await client.from('users').select('*');
    if (allRes.data && Array.isArray(allRes.data)) {
      const found = allRes.data.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
      if (found) return { success: true, user: found };
    }

    return { success: true, user: null };
  } catch (err) {
    console.warn('Erro ao consultar usuário no Supabase:', err.message || err);
    return null;
  }
};

// Busca todos os usuários no Supabase
export const fetchCloudUsers = async () => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('users').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Erro ao buscar lista de usuários no Supabase:', err);
    return null;
  }
};

// Insere novo usuário no Supabase com diagnóstico completo
export const insertCloudUser = async (user) => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase não está configurado neste dispositivo/navegador.' };
  }

  try {
    const payload = {
      id: user.id,
      name: user.name.trim(),
      email: String(user.email).toLowerCase().trim(),
      password: String(user.password).trim()
    };

    const { data, error } = await client.from('users').insert([payload]).select();
    if (error) {
      console.error('Erro de inserção no Supabase:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, user: data ? data[0] : null };
  } catch (err) {
    console.error('Exceção ao cadastrar usuário no Supabase:', err);
    return { success: false, error: err.message || 'Erro de conexão com o Supabase.' };
  }
};


