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

// Busca todas as transações do banco Supabase
export const fetchCloudTransactions = async () => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    
    // Mapeia colunas do banco (snake_case) para objetos da app (camelCase)
    return data.map(row => ({
      id: row.id,
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

// Insere transação no banco Supabase
export const insertCloudTransaction = async (tx) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const payload = {
      id: tx.id,
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
export const deleteCloudTransaction = async (id) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { error } = await client.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao excluir transação no Supabase:', err);
    return false;
  }
};
