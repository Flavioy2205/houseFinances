import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchPostgresLocalUsers, insertPostgresLocalUser, fetchUserFromDb } from '../services/postgresLocal';

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

  // Sincroniza lista de usuários com o banco PostgreSQL no carregamento
  useEffect(() => {
    const loadPostgresUsers = async () => {
      const dbUsers = await fetchPostgresLocalUsers();
      if (dbUsers !== null && Array.isArray(dbUsers)) {
        setUsersList(dbUsers);
        // Se a lista do banco estiver vazia ou se o usuário logado não estiver no banco, desloga imediatamente
        if (dbUsers.length === 0 || (currentUser && !dbUsers.some(u => u.email.toLowerCase() === currentUser.email?.toLowerCase()))) {
          setCurrentUser(null);
          localStorage.removeItem('housefinances_current_user');
        }
      }
    };
    loadPostgresUsers();
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

  // Função de Login (Valida em tempo real no PostgreSQL)
  const login = async (email, password) => {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedPassword = String(password || '').trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { success: false, message: 'Informe o e-mail e a senha.' };
    }

    // 1. Consulta o usuário diretamente na base de dados em tempo real
    const dbRes = await fetchUserFromDb(normalizedEmail);

    let foundUser = null;

    if (dbRes.success) {
      foundUser = dbRes.user;
    } else {
      // Caso a busca direta por filtro falhe, tenta buscar a lista geral do PostgreSQL
      const dbUsers = await fetchPostgresLocalUsers();
      if (dbUsers && Array.isArray(dbUsers)) {
        foundUser = dbUsers.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
        setUsersList(dbUsers);
      } else {
        // Tenta fallback no cache local apenas se a base estiver inacessível
        foundUser = usersList.find(u => String(u.email || '').toLowerCase().trim() === normalizedEmail);
        if (!foundUser) {
          return { success: false, message: dbRes.error || 'Erro de conexão ao acessar a base de dados PostgreSQL.' };
        }
      }
    }

    if (!foundUser) {
      return { success: false, message: 'Nenhum usuário cadastrado com este e-mail na base de dados. Crie uma conta na aba "Criar Nova Conta".' };
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

  // Função de Cadastro de Novo Usuário (SALVA DIRETO NO POSTGRESQL 15)
  const register = async (name, email, password) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Verifica no banco de dados se o e-mail já existe
    const dbRes = await fetchUserFromDb(normalizedEmail);
    if (dbRes.success && dbRes.user) {
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

    // 2. Salva diretamente na tabela 'users' do banco de dados PostgreSQL 15 (Docker)
    const dbResult = await insertPostgresLocalUser(newUser);
    if (!dbResult) {
      console.warn('Aviso: Não foi possível salvar o usuário no PostgreSQL local (verifique se a API em localhost:3002 está ativa).');
    }

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

