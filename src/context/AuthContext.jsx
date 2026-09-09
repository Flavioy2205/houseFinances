import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchPostgresLocalUsers, insertPostgresLocalUser, fetchUserFromDb } from '../services/postgresLocal';
import { getSupabaseConfig, fetchCloudUsers, fetchCloudUserFromDb, insertCloudUser } from '../services/supabase';

// Limpa chaves antigas de localStorage no navegador do usuário para garantir que o cadastro anterior seja completamente apagado
if (typeof window !== 'undefined' && !localStorage.getItem('housefinances_reset_v3')) {
  localStorage.removeItem('housefinances_users_list');
  localStorage.removeItem('housefinances_current_user');
  localStorage.removeItem('housefinances_tx');
  localStorage.setItem('housefinances_reset_v3', 'true');
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Lista de usuários cadastrados no sistema (inicia limpa)
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('housefinances_users_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Usuário atualmente logado (inicia deslogado)
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('housefinances_current_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (e) { console.error(e); }
    }
    return null;
  });

  // Sincroniza lista de usuários com o banco (Prioridade: Supabase Cloud > PostgreSQL Local)
  useEffect(() => {
    const loadUsers = async () => {
      let dbUsers = null;

      const config = getSupabaseConfig();
      if (config.isConfigured) {
        dbUsers = await fetchCloudUsers();
      }

      if (!dbUsers || dbUsers.length === 0) {
        const localUsers = await fetchPostgresLocalUsers();
        if (localUsers && Array.isArray(localUsers)) {
          dbUsers = localUsers;
        }
      }

      if (dbUsers !== null && Array.isArray(dbUsers)) {
        setUsersList(dbUsers);
        if (dbUsers.length === 0 || (currentUser && !dbUsers.some(u => u.email.toLowerCase() === currentUser.email?.toLowerCase()))) {
          setCurrentUser(null);
          localStorage.removeItem('housefinances_current_user');
        }
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    localStorage.setItem('housefinances_users_list', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('housefinances_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('housefinances_current_user');
    }
  }, [currentUser]);

  // Função de Login (Valida em tempo real no Supabase Cloud ou PostgreSQL)
  const login = async (email, password) => {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedPassword = String(password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { success: false, message: 'Informe o e-mail e a senha.' };
    }

    let foundUser = null;

    // 1. Se Supabase estiver configurado, consulta no Supabase Cloud em primeiro lugar
    const config = getSupabaseConfig();
    if (config.isConfigured) {
      const cloudRes = await fetchCloudUserFromDb(normalizedEmail);
      if (cloudRes && cloudRes.success && cloudRes.user) {
        foundUser = cloudRes.user;
      }
    }

    // 2. Se não encontrou no Supabase, consulta no PostgreSQL Local
    if (!foundUser) {
      const dbRes = await fetchUserFromDb(normalizedEmail);
      if (dbRes && dbRes.success && dbRes.user) {
        foundUser = dbRes.user;
      }
    }

    // 3. Se ainda não encontrou, busca na lista completa do Supabase Cloud
    if (!foundUser) {
      const sbUsers = await fetchCloudUsers();
      if (sbUsers && Array.isArray(sbUsers)) {
        foundUser = sbUsers.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
        if (foundUser) setUsersList(sbUsers);
      }
    }

    // 4. Se ainda não encontrou, busca na lista completa do PostgreSQL Local
    if (!foundUser) {
      const pgUsers = await fetchPostgresLocalUsers();
      if (pgUsers && Array.isArray(pgUsers)) {
        foundUser = pgUsers.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
        if (foundUser) setUsersList(pgUsers);
      }
    }

    // 5. Último fallback: cache local no navegador
    if (!foundUser) {
      foundUser = usersList.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
    }

    if (!foundUser) {
      return { success: false, message: 'Nenhum usuário cadastrado com este e-mail. Verifique se digitou o e-mail corretamente ou crie uma conta na aba "Criar Nova Conta".' };
    }

    const storedPassword = String(foundUser.password || '').trim();

    // Compara senha em formato de texto e valor numérico (evita falha com zeros à esquerda ex: "0702" vs 702)
    const isPasswordValid = storedPassword === normalizedPassword || 
      (Number(storedPassword) === Number(normalizedPassword) && !isNaN(Number(normalizedPassword)));

    if (!isPasswordValid) {
      return { success: false, message: 'Senha incorreta. Tente novamente.' };
    }

    const userObj = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      avatar: (foundUser.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    };

    setCurrentUser(userObj);
    return { success: true, user: userObj };
  };

  // Função de Cadastro de Novo Usuário (SALVA NO POSTGRESQL E NO SUPABASE CLOUD)
  const register = async (name, email, password) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Verifica no banco de dados se o e-mail já existe
    const dbRes = await fetchUserFromDb(normalizedEmail);
    const cloudRes = await fetchCloudUserFromDb(normalizedEmail);
    if ((dbRes && dbRes.success && dbRes.user) || (cloudRes && cloudRes.success && cloudRes.user)) {
      return { success: false, message: 'Este e-mail já está cadastrado no sistema.' };
    }
    if (usersList.some(u => u.email.toLowerCase().trim() === normalizedEmail)) {
      return { success: false, message: 'Este e-mail já está cadastrado no sistema.' };
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      password: password
    };

    // 1. Salva no estado local da aplicação
    setUsersList(prev => [...prev, newUser]);

    // 2. Tenta salvar no PostgreSQL local e no Supabase Cloud
    await insertPostgresLocalUser(newUser);
    await insertCloudUser(newUser);

    const userObj = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    };

    setCurrentUser(userObj);
    return { success: true, user: userObj };
  };

  // Entrar como Convidado
  const guestLogin = () => {
    const guestUser = {
      id: 'usr-guest',
      name: 'Visitante Convidado',
      email: 'convidado@housefinances.com',
      avatar: 'VC'
    };
    setCurrentUser(guestUser);
    return { success: true, user: guestUser };
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      register,
      guestLogin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

