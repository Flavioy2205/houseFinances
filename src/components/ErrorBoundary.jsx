import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('housefinances_current_user');
      localStorage.removeItem('houseFinances_dashboard_layout_v1');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#f9fafb',
          padding: '2rem',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(17, 24, 39, 0.9)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#f43f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Oops! Algo inesperado aconteceu.
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Detectamos uma inconsistência no cache do seu navegador. Clicar no botão abaixo restaurará o estado inicial e a tela de login.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={this.handleReset}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <RefreshCw size={18} />
                Restaurar e Acessar Tela de Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
