import React, { useState } from 'react';
import { Wallet, Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen = () => {
  const { login, register, guestLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Form states for Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form states for Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Status & Alerts
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Preencha o e-mail e a senha.');
      return;
    }

    const res = login(loginEmail, loginPassword);
    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }

    if (!regEmail.trim()) {
      setErrorMessage('Informe seu e-mail.');
      return;
    }

    if (regPassword.length < 3) {
      setErrorMessage('A senha deve conter no mínimo 3 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    const res = await register(regName, regEmail, regPassword);
    if (!res.success) {
      setErrorMessage(res.message);
    } else {
      setSuccessMessage('Conta criada com sucesso! Acessando...');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      zIndex: 10
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            marginBottom: '0.85rem'
          }}>
            <Wallet size={30} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f9fafb', letterSpacing: '-0.02em' }}>
            HouseFinances
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#9ca3af', marginTop: '0.2rem' }}>
            Gestão Financeira Residencial & WhatsApp Bot
          </p>
        </div>

        {/* Tab Switcher (Entrar vs. Cadastrar) */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '1.75rem',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'login' ? 'var(--color-brand-emerald)' : 'transparent',
              color: activeTab === 'login' ? '#fff' : '#9ca3af',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => { setActiveTab('login'); setErrorMessage(''); }}
          >
            Entrar na Conta
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'register' ? 'var(--color-brand-emerald)' : 'transparent',
              color: activeTab === 'register' ? '#fff' : '#9ca3af',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => { setActiveTab('register'); setErrorMessage(''); }}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            color: '#f43f5e',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={18} />
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            color: '#10b981',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        )}

        {/* Form 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={15} color="#10b981" />
                E-mail de Acesso
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="seu.email@exemplo.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} color="#8b5cf6" />
                Sua Senha
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              Acessar o Sistema
              <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>— ou —</span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.88rem' }}
              onClick={guestLogin}
            >
              <ShieldCheck size={16} color="#10b981" />
              Entrar como Convidado (Modo Demo)
            </button>
          </form>
        )}

        {/* Form 2: CADASTRO DE USUÁRIO */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <User size={15} color="#3b82f6" />
                Nome Completo *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Maria Silva"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail size={15} color="#10b981" />
                E-mail *
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="seu.email@exemplo.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} color="#8b5cf6" />
                Crie uma Senha *
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Mínimo 3 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} color="#f59e0b" />
                Confirme sua Senha *
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Repita a mesma senha"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              <Sparkles size={18} />
              Criar Conta e Acessar
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
