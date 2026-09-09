const HTTPS_TUNNEL_URL = import.meta.env.VITE_POSTGRES_API_URL || 'https://pbyvm-189-69-210-76.run.pinggy-free.link';
const LOCAL_URL = 'http://localhost:3002';

// Retorna a URL base ativa (prioriza localhost em ambiente local)
const getBaseUrl = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return LOCAL_URL;
  }
  return HTTPS_TUNNEL_URL;
};

const getHeaders = (extraHeaders = {}) => ({
  'Bypass-Tunnel-Remainder': 'true',
  'bypass-tunnel-reminder': 'true',
  'x-pinggy-no-warning': 'true',
  'Pinggy-No-Warning': 'true',
  ...extraHeaders
});

// Helper de requisição resiliente com tratamento de erros de rede por URL
export const safeFetch = async (path, options = {}) => {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'http:');
  
  const primaryUrl = isLocal ? LOCAL_URL : HTTPS_TUNNEL_URL;
  const secondaryUrl = isLocal ? HTTPS_TUNNEL_URL : LOCAL_URL;

  const requestHeaders = getHeaders(options.headers || {});

  // 1. Tenta a URL primária
  try {
    const res = await fetch(`${primaryUrl}${path}`, { ...options, headers: requestHeaders });
    if (res.ok) return res;
  } catch (err) {
    console.warn(`Erro de conexão na URL primária (${primaryUrl}${path}):`, err.message || err);
  }

  // 2. Fallback para a URL secundária se a primária falhar
  if (primaryUrl !== secondaryUrl) {
    try {
      const res = await fetch(`${secondaryUrl}${path}`, { ...options, headers: requestHeaders });
      if (res.ok) return res;
    } catch (err) {
      console.warn(`Erro de conexão na URL secundária (${secondaryUrl}${path}):`, err.message || err);
    }
  }

  return null;
};

// Verifica se a API do PostgreSQL está acessível
export const testPostgresLocalConnection = async () => {
  const res = await safeFetch('/transactions?limit=1');
  if (res && res.ok) {
    return { success: true, message: 'Conectado com sucesso ao PostgreSQL 15!' };
  }
  return { success: false, message: 'API do PostgreSQL 15 offline ou inacessível.' };
};

// Busca todas as transações salvas no PostgreSQL
export const fetchPostgresLocalTransactions = async () => {
  try {
    const res = await safeFetch('/transactions?order=date.desc');
    if (!res || !res.ok) return null;

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

    const res = await safeFetch('/transactions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!res || !res.ok) {
      console.error('Erro ao salvar no PostgreSQL');
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
    const res = await safeFetch(`/transactions?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=representation' }
    });
    return res ? res.ok : false;
  } catch (err) {
    console.error('Erro de rede ao deletar no PostgreSQL:', err);
    return false;
  }
};

// --- FUNÇÕES DE USUÁRIOS NO POSTGRESQL ---

// Busca todos os usuários do banco PostgreSQL
export const fetchPostgresLocalUsers = async () => {
  try {
    const res = await safeFetch('/users');
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Erro ao buscar usuários no PostgreSQL:', err);
    return null;
  }
};

// Busca usuário por e-mail diretamente no banco PostgreSQL em tempo real
export const fetchUserFromDb = async (email) => {
  try {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!normalizedEmail) return { success: false, error: 'Informe um e-mail válido.' };

    const res = await safeFetch(`/users?email=eq.${encodeURIComponent(normalizedEmail)}`);
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, user: data[0] };
      }
      return { success: true, user: null };
    }

    // Fallback: Busca a lista completa de usuários caso a query filtrada falhe
    const allUsersRes = await safeFetch('/users');
    if (allUsersRes && allUsersRes.ok) {
      const data = await allUsersRes.json();
      if (Array.isArray(data)) {
        const found = data.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
        return { success: true, user: found || null };
      }
    }

    return { success: false, error: 'Erro de conexão com o banco de dados PostgreSQL. Certifique-se de que o container Docker está rodando (docker compose up -d).' };
  } catch (err) {
    console.error('Erro ao consultar usuário no banco PostgreSQL:', err);
    return { success: false, error: 'Erro ao conectar à base de dados.' };
  }
};

// Insere novo usuário no banco PostgreSQL
export const insertPostgresLocalUser = async (user) => {
  try {
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password
    };

    const res = await safeFetch('/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!res || !res.ok) {
      console.error('Erro ao salvar usuário no PostgreSQL');
      return null;
    }
    const data = await res.json();
    return data ? data[0] : null;
  } catch (err) {
    console.error('Erro ao cadastrar usuário no PostgreSQL:', err);
    return null;
  }
};

