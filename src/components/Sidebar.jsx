import React from 'react';
import { LayoutDashboard, PlusCircle, MessageSquare, ReceiptText, Wallet, LogOut, Database, ShieldAlert, CalendarClock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { HouseFinancesLogo } from './HouseFinancesLogo';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout, isAdmin } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contas', label: 'Contas a Pagar', icon: CalendarClock },
    { id: 'manual', label: 'Inserir Gasto', icon: PlusCircle },
    { id: 'extrato', label: 'Histórico & Extrato', icon: ReceiptText }
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="brand" style={{ gap: '0.5rem', padding: '0.5rem 0.25rem' }}>
          <HouseFinancesLogo size={32} color="#10b981" arrowColor="#38bdf8" />
          <div>
            <div className="brand-name" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800 }}>house</span>
              <span style={{ fontWeight: 400 }}>Finances</span>
            </div>
          </div>
        </div>

        <nav>
          <ul className="nav-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="nav-item">
                  <button
                    className={isActive ? 'active' : ''}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: item.id === 'database' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 211, 102, 0.2)',
                        color: item.id === 'database' ? '#60a5fa' : '#25D366',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: item.id === 'database' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(37, 211, 102, 0.4)'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-card" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div className="user-avatar">{user?.avatar || 'HF'}</div>
            <div className="user-info" style={{ overflow: 'hidden' }}>
              <span className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user?.name || 'Minhas Finanças'}
                {isAdmin && <ShieldAlert size={14} color="#60a5fa" title="Administrador" />}
              </span>
              <span className="user-subtitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || 'houseFinances v1.0'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sair da Conta"
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

