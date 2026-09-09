import React, { useState } from 'react';
import { 
  Database, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Key, 
  Globe,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../services/supabase';

export const DatabaseSettings = () => {
  const { clearAllData, dbMode, dbStatusText, syncWithDatabase, transactions } = useFinance();
  
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.key);

  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [clearedToast, setClearedToast] = useState(false);

  const sqlCode = `-- 1. Tabela de Transações (Gastos por Usuário)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT NOT NULL,
  category TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona a coluna user_id caso a tabela já exista sem ela
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS e permitir leitura/escrita pública no Supabase
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso público às transações" ON transactions;
CREATE POLICY "Permitir acesso público às transações" ON transactions FOR ALL USING (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso público aos usuários" ON users;
CREATE POLICY "Permitir acesso público aos usuários" ON users FOR ALL USING (true);`;

  const handleTestConnection = async (e) => {
    e.preventDefault();
    if (!supabaseUrl || !supabaseKey) {
      setTestResult({ success: false, message: 'Informe a URL e a Anon Key do Supabase.' });
      return;
    }
    setIsTesting(true);
    const result = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    saveSupabaseConfig(supabaseUrl, supabaseKey);
    await syncWithDatabase();
    alert('Configurações salvas! A aplicação foi sincronizada com o Supabase.');
  };

  const handleClearCredentials = async () => {
    if (confirm('Deseja remover as chaves do Supabase?')) {
      saveSupabaseConfig('', '');
      setSupabaseUrl('');
      setSupabaseKey('');
      setTestResult(null);
      await syncWithDatabase();
    }
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ ATENÇÃO: Tem certeza que deseja LIMPAR TODOS OS DADOS da base? Essa ação não pode ser desfeita.')) {
      clearAllData();
      setClearedToast(true);
      setTimeout(() => setClearedToast(false), 2500);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Toast de Confirmação de Limpeza */}
      {clearedToast && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: '12px',
          padding: '1rem',
          color: '#f43f5e',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={22} />
          Todos os valores da base de dados foram limpos!
        </div>
      )}

      {/* Banner 1: Status Atual do Banco de Dados & Botão Limpar */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {dbStatusText}
              </h3>
              <span className="badge badge-alimentacao">
                ⚡ Supabase Cloud Only
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              Total de registros salvos no banco: <strong>{transactions.length} gastos</strong>
            </p>
          </div>
        </div>

        {/* Botão de Limpar Base de Dados */}
        <button className="btn btn-danger" onClick={handleClearAllData} style={{ padding: '0.75rem 1.25rem' }}>
          <Trash2 size={18} />
          Limpar Todos os Valores da Base
        </button>
      </div>

      {/* Form 2: Configuração da Conexão Supabase */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div>
            <h3 className="section-title">
              <Globe size={20} color="#10b981" />
              Conectar ao Banco de Dados (Supabase API)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              Insira a URL e a chave anônima do seu projeto em <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'underline' }}>supabase.com <ExternalLink size={12} /></a>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">
              <Globe size={16} color="#3b82f6" />
              Project URL do Supabase *
            </label>
            <input
              type="url"
              className="form-input"
              placeholder="https://xyzprojectid.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>

          <div className="form-group full-width">
            <label className="form-label">
              <Key size={16} color="#f59e0b" />
              Anon Public API Key *
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="eyJhYmdj..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
          </div>

          {testResult && (
            <div className="form-group full-width" style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: testResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
              color: testResult.success ? '#10b981' : '#f43f5e',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {testResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              {testResult.message}
            </div>
          )}

          <div className="form-group full-width" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            {currentConfig.isConfigured && (
              <button type="button" className="btn btn-ghost" onClick={handleClearCredentials}>
                Desconectar
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={handleTestConnection} disabled={isTesting}>
              <RefreshCw size={16} className={isTesting ? 'spin' : ''} />
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button type="submit" className="btn btn-primary">
              <Sparkles size={16} />
              Salvar e Conectar
            </button>
          </div>
        </form>
      </div>

      {/* Box 3: Script SQL para criar a tabela */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: '0.85rem' }}>
          <h3 className="section-title" style={{ fontSize: '1.05rem' }}>
            <Database size={18} color="#8b5cf6" />
            Script SQL para Inicialização das Tabelas no Supabase
          </h3>
          <button className="btn btn-secondary" onClick={copySql} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
            {copiedSql ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copiedSql ? 'Copiado!' : 'Copiar SQL'}
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
          Cole o código abaixo no SQL Editor do Supabase se precisar reinicializar as tabelas:
        </p>

        <pre style={{
          background: '#0b1120',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.82rem',
          color: '#34d399',
          fontFamily: 'var(--font-mono)',
          overflowX: 'auto',
          lineHeight: 1.5
        }}>
          {sqlCode}
        </pre>
      </div>

    </div>
  );
};

