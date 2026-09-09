import React from 'react';
import { LayoutDashboard, PlusCircle, MessageSquare, ReceiptText, Wallet, LogOut, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'manual', label: 'Inserir Gasto', icon: PlusCircle },
    { id: 'whatsapp', label: 'WhatsApp Bot', icon: MessageSquare, badge: 'IA' },
    { id: 'extrato', label: 'Histórico & Extrato', icon: ReceiptText },
    { id: 'database', label: 'Banco de Dados', icon: Database, badge: 'Cloud / Local' },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={24} />
          </div>
          <div>
            <div className="brand-name">HouseFinances</div>
          </div>
          <span className="brand-badge">Zap</span>
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
                        background: 'rgba(37, 211, 102, 0.2)',
                        color: '#25D366',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(37, 211, 102, 0.4)'
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
              <span className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Minhas Finanças'}
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
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
