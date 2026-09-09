import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabaseConfig, fetchCloudUsers, fetchCloudUserFromDb, insertCloudUser } from '../services/supabase';

// Admins permitidos a acessar a página de configurações de banco de dados
export const ADMIN_EMAILS = [
  'flavio.yamane@hotmail.com',
  'admin@housefinances.com'
];

export const checkIsAdmin = (userOrEmail) => {
  if (!userOrEmail) return false;
  const email = typeof userOrEmail === 'string' ? userOrEmail : userOrEmail.email;
  if (!email) return false;
  return ADMIN_EMAILS.includes(String(email).toLowerCase().trim());
};

// Limpa chaves antigas de localStorage no navegador do usuário para garantir sincronização limpa
if (typeof window !== 'undefined' && !localStorage.getItem('housefinances_reset_v4')) {
  localStorage.removeItem('housefinances_users_list');
  localStorage.removeItem('housefinances_current_user');
  localStorage.removeItem('housefinances_tx');
  localStorage.setItem('housefinances_reset_v4', 'true');
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Lista de usuários cadastrados no sistema
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('housefinances_users_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Usuário atualmente logado
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('housefinances_current_user');
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (e) { console.error(e); }
    }
    return null;
  });

  // Sincroniza lista de usuários EXCLUSIVAMENTE com o Supabase Cloud
  useEffect(() => {
    const loadUsers = async () => {
      const config = getSupabaseConfig();
      if (!config.isConfigured) return;

      const dbUsers = await fetchCloudUsers();

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

  // Função de Login (Valida EXCLUSIVAMENTE no Supabase Cloud)
  const login = async (email, password) => {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedPassword = String(password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { success: false, message: 'Informe o e-mail e a senha.' };
    }

    let foundUser = null;

    // 1. Consulta no Supabase Cloud pelo e-mail exato
    const cloudRes = await fetchCloudUserFromDb(normalizedEmail);
    if (cloudRes && cloudRes.success && cloudRes.user) {
      foundUser = cloudRes.user;
    }

    // 2. Se não encontrou no filtro por e-mail, busca na lista geral do Supabase
    if (!foundUser) {
      const sbUsers = await fetchCloudUsers();
      if (sbUsers && Array.isArray(sbUsers)) {
        foundUser = sbUsers.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
        if (foundUser) setUsersList(sbUsers);
      }
    }

    // 3. Fallback: cache local no navegador
    if (!foundUser) {
      foundUser = usersList.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
    }

    if (!foundUser) {
      return { success: false, message: 'Nenhum usuário cadastrado com este e-mail no Supabase Cloud. Crie uma conta na aba "Criar Nova Conta".' };
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

  // Função de Cadastro de Novo Usuário (SALVA EXCLUSIVAMENTE NO SUPABASE CLOUD)
  const register = async (name, email, password) => {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPassword = String(password).trim();

    // Verifica no Supabase se o e-mail já existe
    const cloudRes = await fetchCloudUserFromDb(normalizedEmail);
    if (cloudRes && cloudRes.success && cloudRes.user) {
      return { success: false, message: 'Este e-mail já está cadastrado no sistema (Supabase).' };
    }

    if (usersList.some(u => u.email.toLowerCase().trim() === normalizedEmail)) {
      return { success: false, message: 'Este e-mail já está cadastrado no sistema.' };
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      password: normalizedPassword
    };

    // 1. Salva no Supabase Cloud
    const cloudInsert = await insertCloudUser(newUser);

    if (cloudInsert && !cloudInsert.success) {
      console.warn('Erro ao salvar no Supabase:', cloudInsert.error);
      return { 
        success: false, 
        message: `Erro ao cadastrar usuário no Supabase Cloud: ${cloudInsert.error}. Verifique a tabela 'users' no Supabase.` 
      };
    }

    // 2. Atualiza estado local
    setUsersList(prev => [...prev, newUser]);

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

  const isAdmin = checkIsAdmin(currentUser);

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      isAuthenticated: Boolean(currentUser),
      isAdmin,
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


