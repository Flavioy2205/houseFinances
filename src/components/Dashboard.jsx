import React, { useState } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  ShoppingBag, 
  Smile, 
  Home, 
  Utensils, 
  Truck, 
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Tv,
  Repeat,
  Pencil,
  Check,
  X
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

const CATEGORY_COLORS = {
  gasto_fixo: '#3b82f6',
  lazer: '#8b5cf6',
  compras: '#f59e0b',
  alimentacao: '#10b981',
  transporte: '#06b6d4',
  assinatura: '#ec4899',
  outros: '#9ca3af'
};

const CATEGORY_LABELS = {
  gasto_fixo: 'Gasto Fixo',
  lazer: 'Lazer',
  compras: 'Compras',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  assinatura: 'Assinatura',
  outros: 'Outros'
};

export const Dashboard = ({ onNavigateToManual }) => {
  const { 
    transactions,
    currentMonthTransactions, 
    selectedYearMonth,
    setSelectedYearMonth,
    availableMonths,
    totalSpentMonth, 
    creditTotalMonth, 
    debitTotalMonth, 
    pixTotalMonth,
    categoryTotalsMonth,
    subscriptionsTotalMonth,
    monthlyBudget,
    setMonthlyBudget
  } = useFinance();

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget);

  const formatMonthLabel = (ymStr) => {
    if (ymStr === 'all') return '🌐 Todo o Histórico Completo';
    const [y, m] = ymStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  const currentMonthName = formatMonthLabel(selectedYearMonth);
  const formattedTotalMonth = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpentMonth);
  const formattedCredit = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditTotalMonth);
  const formattedDebit = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debitTotalMonth);
  const formattedPix = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pixTotalMonth);

  // Budget Percentage
  const budgetPercent = Math.min(Math.round((totalSpentMonth / monthlyBudget) * 100), 100);

  const handleSaveBudget = (e) => {
    e.preventDefault();
    const val = parseFloat(budgetInput);
    if (val && val > 0 && val <= 1000000) {
      setMonthlyBudget(val);
      setIsEditingBudget(false);
    } else if (val > 1000000) {
      alert('O valor máximo permitido para o orçamento é R$ 1.000.000,00 (1 milhão).');
    } else {
      alert('Por favor, informe um valor de orçamento válido maior que zero.');
    }
  };

  // Pie chart data by Category
  const pieData = Object.entries(categoryTotalsMonth).map(([cat, total]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: total,
    color: CATEGORY_COLORS[cat] || '#9ca3af'
  })).filter(d => d.value > 0);

  // Bar chart data for Payment Methods
  const paymentBarData = [
    { name: 'Crédito', valor: creditTotalMonth, fill: '#8b5cf6' },
    { name: 'Débito', valor: debitTotalMonth, fill: '#10b981' },
    { name: 'PIX / Dinheiro', valor: pixTotalMonth, fill: '#06b6d4' }
  ];

  // Dados comparativos mensais (Evolução Mês a Mês)
  const monthlyHistoryData = React.useMemo(() => {
    const monthsSorted = availableMonths.filter(m => m !== 'all').sort();
    
    return monthsSorted.map(ym => {
      const [y, m] = ym.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, 1);
      const monthShort = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      const formattedMonthName = monthShort.charAt(0).toUpperCase() + monthShort.slice(1);
      
      const monthTotal = transactions
        .filter(t => t.date && t.date.substring(0, 7) === ym)
        .reduce((acc, t) => acc + t.amount, 0);

      const isCurrentSelected = ym === selectedYearMonth;

      return {
        yearMonth: ym,
        name: formattedMonthName,
        total: monthTotal,
        fill: isCurrentSelected ? '#10b981' : '#3b82f6',
        isSelected: isCurrentSelected
      };
    });
  }, [transactions, availableMonths, selectedYearMonth]);

  // Média de gasto mensal
  const avgMonthlySpent = React.useMemo(() => {
    if (monthlyHistoryData.length === 0) return 0;
    const sum = monthlyHistoryData.reduce((acc, m) => acc + m.total, 0);
    return sum / monthlyHistoryData.length;
  }, [monthlyHistoryData]);

  // Variação em relação ao mês anterior
  const momVariation = React.useMemo(() => {
    if (monthlyHistoryData.length < 2) return null;
    const currentIndex = monthlyHistoryData.findIndex(m => m.yearMonth === selectedYearMonth);
    if (currentIndex <= 0) return null;
    
    const prevTotal = monthlyHistoryData[currentIndex - 1].total;
    const currentTotal = monthlyHistoryData[currentIndex].total;
    
    if (prevTotal === 0) return null;
    
    const diff = currentTotal - prevTotal;
    const percent = ((diff / prevTotal) * 100).toFixed(1);
    return {
      diff,
      percent,
      isIncrease: diff > 0,
      prevMonthName: monthlyHistoryData[currentIndex - 1].name
    };
  }, [monthlyHistoryData, selectedYearMonth]);

  return (
    <div className="dashboard-wrapper">
      {/* Seletor de Histórico Mensal */}
      <div className="card" style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.9rem 1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>
              Período de Referência dos Gastos:
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>{currentMonthName}</span>
              {selectedYearMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` ? (
                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                  🟢 Mês Atual (Vigente)
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>
                  📁 Histórico Salvo
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>Mês / Período:</label>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '190px', paddingRight: '2rem', fontWeight: 600, background: 'rgba(30, 41, 59, 0.9)', borderColor: 'rgba(59, 130, 246, 0.4)' }}
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
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* KPI 1: Gasto Total no Mês */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#10b981', '--kpi-icon-bg': 'rgba(16, 185, 129, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">Gasto Total no Mês</span>
              <div className="kpi-icon">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="kpi-value">{formattedTotalMonth}</div>
          </div>
          <div className="kpi-subtext">
            <Calendar size={14} />
            <span style={{ textTransform: 'capitalize' }}>Ref. {currentMonthName}</span>
          </div>
        </div>

        {/* KPI 2: Cartão de Crédito */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#8b5cf6', '--kpi-icon-bg': 'rgba(139, 92, 246, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">Cartão de Crédito</span>
              <div className="kpi-icon">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: '#a78bfa' }}>{formattedCredit}</div>
          </div>
          <div className="kpi-subtext">
            <span>{totalSpentMonth > 0 ? `${Math.round((creditTotalMonth / totalSpentMonth) * 100)}% do total no mês` : 'Nenhum gasto em crédito'}</span>
          </div>
        </div>

        {/* KPI 3: Assinaturas Recorrentes */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#ec4899', '--kpi-icon-bg': 'rgba(236, 72, 153, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">Assinaturas do Mês</span>
              <div className="kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                <Tv size={20} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: '#f472b6' }}>
              R$ {subscriptionsTotalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="kpi-subtext">
            <Repeat size={13} color="#f472b6" />
            <span style={{ color: '#f472b6', fontWeight: 600 }}>Adicionado todo mês automaticamente</span>
          </div>
        </div>

        {/* KPI 4: Limite / Meta Mensal (EDITÁVEL) */}
        <div className="card kpi-card" style={{ '--kpi-accent': '#f59e0b', '--kpi-icon-bg': 'rgba(245, 158, 11, 0.15)' }}>
          <div>
            <div className="kpi-header">
              <span className="kpi-title">Orçamento / Limite</span>
              <button 
                onClick={() => { setBudgetInput(monthlyBudget); setIsEditingBudget(true); }}
                title="Editar Limite Mensal"
                style={{ background: 'rgba(245, 158, 11, 0.15)', border: 'none', color: '#fbbf24', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Pencil size={15} />
              </button>
            </div>
            <div className="kpi-value" style={{ color: '#fbbf24' }}>
              {budgetPercent}% <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#9ca3af' }}>usados</span>
            </div>
          </div>
          <div className="kpi-subtext" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem', width: '100%' }}>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${budgetPercent}%`, height: '100%', background: budgetPercent > 90 ? '#f43f5e' : '#f59e0b', borderRadius: '10px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Limite: <strong>R$ {monthlyBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </span>
              <button 
                onClick={() => { setBudgetInput(monthlyBudget); setIsEditingBudget(true); }}
                style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Editar Limite / Orçamento */}
      {isEditingBudget && (
        <div className="modal-overlay" onClick={() => setIsEditingBudget(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="section-title" style={{ fontSize: '1.2rem' }}>
                <Pencil size={20} color="#f59e0b" />
                Editar Limite Mensal
              </h3>
              <button className="modal-close" onClick={() => setIsEditingBudget(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Novo Limite de Gastos (R$)</label>
                <div className="input-money-prefix">
                  <span>R$</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="1000000"
                    placeholder="Ex: 50000 ou 1000000"
                    className="form-input"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem', display: 'block' }}>
                  Ajustável para valores de até <strong>R$ 1.000.000,00 (1 milhão)</strong>. Usado para métricas e alertas de orçamento.
                </span>

                {/* Botões Rápidos de Atalho */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {[5000, 10000, 50000, 100000, 500000, 1000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBudgetInput(amt)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: Number(budgetInput) === amt ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: Number(budgetInput) === amt ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                        color: Number(budgetInput) === amt ? '#fbbf24' : '#9ca3af',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {amt >= 1000000 ? '1 Milhão' : `R$ ${(amt / 1000).toLocaleString()}k`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingBudget(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
                  <Check size={18} />
                  Salvar Limite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CARD DEDICADO: COMPARATIVO DE GASTOS MÊS A MÊS */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="section-title" style={{ fontSize: '1.15rem' }}>
              <TrendingUp size={22} color="#38bdf8" />
              Comparativo de Gastos Mês a Mês (Evolução Temporal)
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              Acompanhe o total acumulado em cada mês e clique em uma barra para alternar a visualização.
            </p>
          </div>

          {momVariation && (
            <div style={{
              background: momVariation.isIncrease ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: momVariation.isIncrease ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: momVariation.isIncrease ? '#f43f5e' : '#10b981'
            }}>
              {momVariation.isIncrease ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span>
                {momVariation.isIncrease ? `+${momVariation.percent}%` : `${momVariation.percent}%`} vs. {momVariation.prevMonthName}
              </span>
            </div>
          )}
        </div>

        {/* Gráfico de Barras Comparativo */}
        <div className="chart-container" style={{ marginTop: '1rem' }}>
          {monthlyHistoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyHistoryData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="name" stroke="#f8fafc" fontSize={12} tick={{ fill: '#f8fafc', fontWeight: 600 }} />
                <YAxis stroke="#f8fafc" fontSize={12} tickFormatter={(v) => `R$${v}`} tick={{ fill: '#f8fafc' }} />
                <Tooltip 
                  formatter={(val) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val), 'Total Gasto']}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '10px', color: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                  labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]} cursor="pointer">
                  {monthlyHistoryData.map((entry, index) => (
                    <Cell 
                      key={`month-bar-${index}`} 
                      fill={entry.isSelected ? '#10b981' : '#3b82f6'} 
                      onClick={() => setSelectedYearMonth(entry.yearMonth)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
              Nenhum histórico disponível para comparativo.
            </div>
          )}
        </div>

        {/* Minipainel de Indicadores Comparativos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Média de Gastos Mensal</span>
            <strong style={{ fontSize: '1.05rem', color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
              R$ {avgMonthlySpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Mês Selecionado ({currentMonthName})</span>
            <strong style={{ fontSize: '1.05rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              R$ {totalSpentMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          {momVariation && (
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Diferença vs. Mês Anterior</span>
              <strong style={{ fontSize: '1.05rem', color: momVariation.isIncrease ? '#f43f5e' : '#10b981', fontFamily: 'var(--font-mono)' }}>
                {momVariation.isIncrease ? '+' : ''} R$ {momVariation.diff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Charts & Breakdown */}
      <div className="dashboard-grid">
        {/* Left Column: Recharts (Distribuição por Categoria & Tipo de Pagamento) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Chart 1: Distribuição por Categoria */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <PieIcon size={18} color="#10b981" />
                Gastos por Categoria (Assinaturas, Lazer, Compras, Fixos)
              </h3>
            </div>
            <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '10px', color: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ width: '100%', textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                  Nenhum gasto cadastrado no mês atual.
                </div>
              )}
            </div>

            {/* Categorias Legend Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'center' }}>
              {Object.entries(categoryTotalsMonth).map(([cat, amount]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#f8fafc' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CATEGORY_COLORS[cat] || '#9ca3af' }} />
                  <span>{CATEGORY_LABELS[cat]}: <strong style={{ color: '#ffffff' }}>R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Crédito vs. Débito vs. PIX */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <BarChart3 size={18} color="#8b5cf6" />
                Comparativo: Crédito vs. Débito vs. PIX
              </h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={paymentBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="name" stroke="#f8fafc" fontSize={12} tick={{ fill: '#f8fafc' }} />
                  <YAxis stroke="#f8fafc" fontSize={12} tickFormatter={(v) => `R$${v}`} tick={{ fill: '#f8fafc' }} />
                  <Tooltip 
                    formatter={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '10px', color: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                    labelStyle={{ color: '#ffffff', fontWeight: 600 }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {paymentBarData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Resumo Rápido e Últimas Transações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card: Categorias em Destaque */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title" style={{ fontSize: '1rem' }}>Resumo por Categorias</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Assinaturas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tv size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Assinatura (Recorrente)</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Netflix, Spotify, mensalidades</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f472b6' }}>
                  R$ {(categoryTotalsMonth.assinatura || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Lazer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smile size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Lazer</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Cinemas, saídas, passeios</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a78bfa' }}>
                  R$ {(categoryTotalsMonth.lazer || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Compras */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Compras</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Vestuário, bens, utilidades</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24' }}>
                  R$ {(categoryTotalsMonth.compras || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Gasto Fixo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Home size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Gasto Fixo</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Aluguel, contas da casa, luz</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#60a5fa' }}>
                  R$ {(categoryTotalsMonth.gasto_fixo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Últimas Transações */}
          <div className="card">
            <div className="section-header">
              <h3 className="section-title" style={{ fontSize: '1rem' }}>Últimos Gastos Lançados</h3>
              <button className="btn btn-ghost" onClick={onNavigateToManual} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                + Adicionar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {currentMonthTransactions.slice(0, 4).map((t) => (
                <div key={t.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {t.description}
                      {(t.category === 'assinatura' || t.isRecurring) && (
                        <span title="Gasto Recorrente Mensal" style={{ fontSize: '0.7rem', color: '#f472b6', background: 'rgba(236, 72, 153, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                          🔄 Recorrente
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span className={`payment-${t.paymentType}`}>
                        {t.paymentType === 'credito' ? 'Crédito' : t.paymentType === 'debito' ? 'Débito' : 'PIX'}
                      </span>
                      <span className={`badge badge-${t.category}`}>
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                    </div>
                  </div>
                  <div className="amount-negative">
                    - R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
