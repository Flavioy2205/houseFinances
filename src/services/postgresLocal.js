const HTTPS_TUNNEL_URL = 'https://housefinances-postgrest-api.loca.lt';
const LOCAL_URL = 'http://localhost:3002';

// Retorna a URL base ativa (prioriza o Túnel HTTPS para funcionar perfeitamente na Vercel)
const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return HTTPS_TUNNEL_URL;
  }
  return HTTPS_TUNNEL_URL;
};

const getHeaders = (extraHeaders = {}) => ({
  'Bypass-Tunnel-Remainder': 'true',
  'bypass-tunnel-reminder': 'true',
  ...extraHeaders
});

// Verifica se a API do PostgreSQL está acessível
export const testPostgresLocalConnection = async () => {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/transactions?limit=1`, { 
      method: 'GET',
      headers: getHeaders()
    });
    if (res.ok) {
      return { success: true, message: 'Conectado com sucesso ao PostgreSQL 15 local via Túnel HTTPS!' };
    }
    // Fallback para localhost em ambiente local
    const fallbackRes = await fetch(`${LOCAL_URL}/transactions?limit=1`, { method: 'GET' });
    if (fallbackRes.ok) {
      return { success: true, message: 'Conectado com sucesso ao PostgreSQL 15 local!' };
    }
    return { success: false, message: `Erro ao conectar na API do PostgreSQL (Status ${res.status})` };
  } catch (err) {
    return { success: false, message: 'API do PostgreSQL 15 offline.' };
  }
};

// Busca todas as transações salvas no PostgreSQL
export const fetchPostgresLocalTransactions = async () => {
  try {
    const baseUrl = getBaseUrl();
    let res = await fetch(`${baseUrl}/transactions?order=date.desc`, { 
      method: 'GET',
      headers: getHeaders()
    });

    if (!res.ok) {
      // Tenta fallback para localhost:3002 se estiver rodando local
      res = await fetch(`${LOCAL_URL}/transactions?order=date.desc`, { method: 'GET' });
      if (!res.ok) return null;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return null;

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
    console.warn('PostgreSQL offline, utilizando fallback:', err);
    return null;
  }
};

// Insere transação no PostgreSQL
export const insertPostgresLocalTransaction = async (tx) => {
  try {
    const baseUrl = getBaseUrl();
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

    const res = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: getHeaders({ 
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error('Erro ao salvar no PostgreSQL:', await res.text());
      return null;
    }
    const data = await res.json();
    return data ? data[0] : null;
  } catch (err) {
    console.error('Erro de rede ao salvar no PostgreSQL:', err);
    return null;
  }
};

// Deleta transação no PostgreSQL
export const deletePostgresLocalTransaction = async (id) => {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/transactions?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders({ 'Prefer': 'return=representation' })
    });
    return res.ok;
  } catch (err) {
    console.error('Erro de rede ao deletar no PostgreSQL:', err);
    return false;
  }
};

// --- FUNÇÕES DE USUÁRIOS NO POSTGRESQL ---

// Busca todos os usuários do banco PostgreSQL
export const fetchPostgresLocalUsers = async () => {
  try {
    const baseUrl = getBaseUrl();
    let res = await fetch(`${baseUrl}/users`, { 
      method: 'GET',
      headers: getHeaders()
    });

    if (!res.ok) {
      res = await fetch(`${LOCAL_URL}/users`, { method: 'GET' });
      if (!res.ok) return null;
    }

    return await res.json();
  } catch (err) {
    console.warn('Erro ao buscar usuários no PostgreSQL:', err);
    return null;
  }
};

// Insere novo usuário no banco PostgreSQL
export const insertPostgresLocalUser = async (user) => {
  try {
    const baseUrl = getBaseUrl();
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password
    };

    let res = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: getHeaders({
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      // Fallback para localhost caso tunnel apresente erro
      res = await fetch(`${LOCAL_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.error('Erro ao salvar usuário no PostgreSQL:', await res.text());
        return null;
      }
    }
    const data = await res.json();
    return data ? data[0] : null;
  } catch (err) {
    console.error('Erro ao cadastrar usuário no PostgreSQL:', err);
    return null;
  }
};
