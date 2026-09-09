import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { TransactionList } from './components/TransactionList';
import { LoginScreen } from './components/LoginScreen';

function MainApp() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showManualModal, setShowManualModal] = useState(false);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Dashboard Financeiro',
          subtitle: 'Acompanhe seus valores gastos no mês, gráfico por categoria e limite.'
        };
      case 'manual':
        return {
          title: 'Cadastro Manual de Gasto',
          subtitle: 'Insira os dados da sua despesa: valor, cartão de crédito/débito e tipo de gasto.'
        };
      case 'extrato':
        return {
          title: 'Histórico & Extrato',
          subtitle: 'Consulte, filtre e exporte todas as suas despesas registradas.'
        };
      default:
        return { title: 'HouseFinances', subtitle: 'Gestão Financeira Residencial' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onOpenManual={() => setActiveTab('manual')}
        />

        {/* Dynamic Tab Content */}
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigateToManual={() => setActiveTab('manual')}
          />
        )}

        {activeTab === 'manual' && (
          <ExpenseForm onSuccess={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'extrato' && (
          <TransactionList />
        )}
      </main>

      {/* Modal overlay for quick manual entry */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ExpenseForm onSuccess={() => setShowManualModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainApp />
      </FinanceProvider>
    </AuthProvider>
  );
}
