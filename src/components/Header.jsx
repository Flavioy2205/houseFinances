import React from 'react';
import { Plus, MessageSquareShare, LogOut, User } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export const Header = ({ title, subtitle, onOpenManual, onOpenWhatsapp }) => {
  const { totalSpentMonth } = useFinance();
  const { user, logout } = useAuth();
  
  const handleShareWhatsapp = () => {
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpentMonth);
    const message = `📊 *Resumo de Gastos - HouseFinances*\n🗓️ Mês: ${monthName}\n💰 *Total Gasto até o momento:* ${formattedTotal}\n\nEnviado via HouseFinances App.`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <header className="top-header">
      <div className="header-title-area">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        <button className="btn btn-whatsapp" onClick={handleShareWhatsapp}>
          <MessageSquareShare size={18} />
          <span className="btn-text-desktop">Enviar Resumo no Zap</span>
        </button>

        <button className="btn btn-primary" onClick={onOpenManual}>
          <Plus size={18} />
          <span className="btn-text-desktop">Inserir Gasto</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={logout}
          title="Sair da Conta"
          style={{ 
            color: '#f43f5e', 
            borderColor: 'rgba(244, 63, 94, 0.3)',
            background: 'rgba(244, 63, 94, 0.1)'
          }}
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};

