import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  PlusCircle, 
  Search, 
  Filter, 
  Pencil, 
  Trash2, 
  Check, 
  RotateCcw,
  PieChart as PieIcon,
  BarChart3,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { BillFormModal } from './BillFormModal';
import { PayBillModal } from './PayBillModal';

const CATEGORY_LABELS = {
  gasto_fixo: 'Gasto Fixo',
  lazer: 'Lazer',
  compras: 'Compras',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  assinatura: 'Assinatura',
  outros: 'Outros'
};

export const BillsManagement = () => {
  const { 
    bills, 
    deleteBill, 
    unpayBill, 
    selectedYearMonth, 
    setSelectedYearMonth, 
    availableMonths 
  } = useFinance();

  const [filterTab, setFilterTab] = useState('todas'); // 'todas' | 'pendentes' | 'vencidas' | 'pagas'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [billToEdit, setBillToEdit] = useState(null);
  const [billToPay, setBillToPay] = useState(null);

  const getTodayString = () => new Date().toISOString().split('T')[0];
  const todayStr = getTodayString();

  const formatMonthLabel = (ymStr) => {
    if (ymStr === 'all') return '🌐 Todo o Histórico Completo';
    const [y, m] = ymStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  // Filter bills by selected month
  const monthFilteredBills = useMemo(() => {
    if (selectedYearMonth === 'all') return bills;
    return bills.filter(b => b.dueDate && b.dueDate.substring(0, 7) === selectedYearMonth);
  }, [bills, selectedYearMonth]);

  // Metrics for the selected month
  const metrics = useMemo(() => {
    let pendingTotal = 0;
    let pendingCount = 0;
    let paidTotal = 0;
    let paidCount = 0;
    let overdueTotal = 0;
    let overdueCount = 0;

    monthFilteredBills.forEach(b => {
      const isPaid = b.status === 'pago';
      const isOverdue = !isPaid && b.dueDate < todayStr;

      if (isPaid) {
        paidTotal += (b.paidAmount || b.amount);
        paidCount++;
      } else {
        pendingTotal += b.amount;
        pendingCount++;
        if (isOverdue) {
          overdueTotal += b.amount;
          overdueCount++;
        }
      }
    });

    const totalBills = monthFilteredBills.length;
    const paidPercentage = totalBills > 0 ? Math.round((paidCount / totalBills) * 100) : 0;

    return {
      pendingTotal,
      pendingCount,
      paidTotal,
      paidCount,
      overdueTotal,
      overdueCount,
      totalBills,
      paidPercentage
    };
  }, [monthFilteredBills, todayStr]);

  // Filtered bills by tab and search term
  const displayedBills = useMemo(() => {
    return monthFilteredBills.filter(b => {
      const isPaid = b.status === 'pago';
      const isOverdue = !isPaid && b.dueDate < todayStr;

      if (filterTab === 'pendentes' && isPaid) return false;
      if (filterTab === 'pagas' && !isPaid) return false;
      if (filterTab === 'vencidas' && (!isOverdue || isPaid)) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const descMatch = b.description.toLowerCase().includes(query);
        const catMatch = (CATEGORY_LABELS[b.category] || b.category).toLowerCase().includes(query);
        const notesMatch = b.notes && b.notes.toLowerCase().includes(query);
        return descMatch || catMatch || notesMatch;
      }

      return true;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [monthFilteredBills, filterTab, searchTerm, todayStr]);

  // Chart data
  const chartData = [
    { name: 'Pagas', valor: metrics.paidTotal, fill: '#10b981' },
    { name: 'A Pagar (Em Dia)', valor: Math.max(0, metrics.pendingTotal - metrics.overdueTotal), fill: '#f59e0b' },
    { name: 'Vencidas (Em Atraso)', valor: metrics.overdueTotal, fill: '#f43f5e' }
  ];

  const handleOpenAdd = () => {
    setBillToEdit(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (bill) => {
    setBillToEdit(bill);
    setShowFormModal(true);
  };

  const handleDelete = (id, description) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${description}"?`)) {
      deleteBill(id);
    }
  };

  const handleUnpay = (bill) => {
    if (window.confirm(`Deseja desfazer a quitação da conta "${bill.description}"?`)) {
      const deleteTx = window.confirm('Deseja também excluir o lançamento correspondente no Extrato de Gastos?');
      unpayBill(bill.id, deleteTx);
    }
  };

  const getDueDateStatus = (bill) => {
    if (bill.status === 'pago') {
      return {
        label: `Pago em ${bill.paidAt ? new Date(bill.paidAt + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data n/i'}`,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
        icon: CheckCircle2
      };
    }

    if (bill.dueDate < todayStr) {
      return {
        label: 'Vencida (Em Atraso)',
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.15)',
        border: 'rgba(244, 63, 94, 0.3)',
        icon: AlertCircle
      };
    }

    if (bill.dueDate === todayStr) {
      return {
        label: 'Vence Hoje!',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.2)',
        border: 'rgba(245, 158, 11, 0.4)',
        icon: Clock
      };
    }

    return {
      label: 'No Prazo',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.3)',
      icon: Clock
    };
  };

  return (
    <div className="bills-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar: Period Selector & New Bill Action */}
      <div className="card" style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem 1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>
              Gestão de Contas a Pagar
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb' }}>
              Referência: {formatMonthLabel(selectedYearMonth)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>Mês:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px', fontWeight: 600, background: 'rgba(30, 41, 59, 0.9)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
            >
              {availableMonths.map(ym => (
                <option key={ym} value={ym}>
                  📅 {formatMonthLabel(ym)}
                </option>
              ))}
              <option value="all">🌐 Todo o Histórico Completo</option>
            </select>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn btn-primary"
            style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#0f172a', fontWeight: 700, padding: '0.65rem 1.2rem' }}
          >
            <PlusCircle size={18} />
            + Nova Conta a Pagar
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* KPI 1: Contas a Pagar (Pendentes) */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#f59e0b', '--kpi-icon-bg': 'rgba(245, 158, 11, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">A Pagar no Mês (Pendente)</span>
              <div className="kpi-icon">
                <Clock size={20} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: '#fbbf24' }}>
              R$ {metrics.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="kpi-subtext">
            <span>{metrics.pendingCount} conta(s) pendente(s)</span>
          </div>
        </div>

        {/* KPI 2: Contas Pagas */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#10b981', '--kpi-icon-bg': 'rgba(16, 185, 129, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">Contas Pagas no Mês</span>
              <div className="kpi-icon">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: '#10b981' }}>
              R$ {metrics.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="kpi-subtext">
            <span>{metrics.paidCount} conta(s) quitada(s)</span>
          </div>
        </div>

        {/* KPI 3: Contas Vencidas */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#f43f5e', '--kpi-icon-bg': 'rgba(244, 63, 94, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">Contas Vencidas (Em Atraso)</span>
              <div className="kpi-icon">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: '#f43f5e' }}>
              R$ {metrics.overdueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="kpi-subtext">
            <span style={{ color: metrics.overdueCount > 0 ? '#f43f5e' : '#9ca3af', fontWeight: 600 }}>
              {metrics.overdueCount > 0 ? `⚠️ ${metrics.overdueCount} conta(s) em atraso` : 'Nenhuma conta em atraso'}
            </span>
          </div>
        </div>

        {/* KPI 4: Progresso de Quitação */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#38bdf8', '--kpi-icon-bg': 'rgba(56, 189, 248, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">Progresso de Quitação</span>
              <div className="kpi-icon">
                <BarChart3 size={20} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: '#38bdf8' }}>
              {metrics.paidPercentage}% <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 500 }}>quitadas</span>
            </div>
          </div>
          <div className="kpi-subtext" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem', width: '100%' }}>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${metrics.paidPercentage}%`, height: '100%', background: '#38bdf8', borderRadius: '10px' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {metrics.paidCount} de {metrics.totalBills} contas pagas neste período
            </div>
          </div>
        </div>
      </div>

      {/* Mini Dashboard de Comparativo Recharts */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">
            <BarChart3 size={20} color="#f59e0b" />
            Dashboard Visual de Contas (Pagas vs. A Pagar vs. Vencidas)
          </h3>
        </div>

        <div className="chart-container" style={{ marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis dataKey="name" stroke="#f8fafc" fontSize={12} tick={{ fill: '#f8fafc', fontWeight: 600 }} />
              <YAxis stroke="#f8fafc" fontSize={12} tickFormatter={(v) => `R$${v}`} tick={{ fill: '#f8fafc' }} />
              <Tooltip 
                formatter={(val) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val), 'Valor Total']}
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '10px', color: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                labelStyle={{ color: '#ffffff', fontWeight: 700 }}
              />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`bill-bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section with Filter Tabs & Search */}
      <div className="card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Abas de Filtros */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'todas', label: `Todas (${monthFilteredBills.length})` },
              { id: 'pendentes', label: `A Pagar (${metrics.pendingCount})` },
              { id: 'vencidas', label: `Vencidas (${metrics.overdueCount})`, badgeColor: '#f43f5e' },
              { id: 'pagas', label: `Pagas (${metrics.paidCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterTab === tab.id ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: filterTab === tab.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: filterTab === tab.id ? '#fbbf24' : '#9ca3af',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Busca por Nome */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar conta..."
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '0.85rem', padding: '6px 12px 6px 2.2rem' }}
            />
          </div>
        </div>

        {/* Tabela de Contas a Pagar */}
        <div style={{ overflowX: 'auto' }}>
          {displayedBills.length > 0 ? (
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.4rem' }}>
              <thead>
                <tr style={{ color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Vencimento</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Descrição da Conta</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Categoria</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Valor (R$)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {displayedBills.map(b => {
                  const statusInfo = getDueDateStatus(b);
                  const StatusIcon = statusInfo.icon;
                  const isPaid = b.status === 'pago';

                  return (
                    <tr key={b.id} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '10px'
                    }}>
                      {/* Vencimento */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: '0.92rem' }}>
                          {new Date(b.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: statusInfo.color,
                          background: statusInfo.bg,
                          border: `1px solid ${statusInfo.border}`,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginTop: '2px'
                        }}>
                          <StatusIcon size={12} />
                          <span>{statusInfo.label}</span>
                        </div>
                      </td>

                      {/* Descrição */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#f9fafb', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span>{b.description}</span>
                          {b.isAgreement && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1px 6px', borderRadius: '4px' }}>
                              🔄 Acordo ({b.installmentIndex}/{b.installmentsCount})
                            </span>
                          )}
                        </div>
                        {b.notes && (
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.notes}
                          </div>
                        )}
                      </td>

                      {/* Categoria */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span className={`badge badge-${b.category}`}>
                          {CATEGORY_LABELS[b.category] || b.category}
                        </span>
                      </td>

                      {/* Valor */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: isPaid ? '#10b981' : '#f59e0b' }}>
                        R$ {(isPaid ? (b.paidAmount || b.amount) : b.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        {isPaid ? (
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={14} /> Pago
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#fbbf24',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Clock size={14} /> A Pagar
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {!isPaid ? (
                            <button
                              onClick={() => setBillToPay(b)}
                              style={{
                                background: '#10b981',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Marcar como Pago"
                            >
                              <Check size={14} /> Pagar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpay(b)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-color)',
                                color: '#9ca3af',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Desfazer Quitação"
                            >
                              <RotateCcw size={12} /> Desfazer
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(b)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Editar Conta"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() => handleDelete(b.id, b.description)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              color: '#f43f5e',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Excluir Conta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2.5rem 1rem' }}>
              Nenhuma conta a pagar encontrada para este período ou filtro.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showFormModal && (
        <BillFormModal
          billToEdit={billToEdit}
          onClose={() => setShowFormModal(false)}
        />
      )}

      {billToPay && (
        <PayBillModal
          bill={billToPay}
          onClose={() => setBillToPay(null)}
        />
      )}
    </div>
  );
};
