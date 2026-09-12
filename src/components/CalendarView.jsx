import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Check, 
  X,
  Repeat
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { BillFormModal } from './BillFormModal';
import { PayBillModal } from './PayBillModal';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const CATEGORY_LABELS = {
  gasto_fixo: 'Gasto Fixo',
  lazer: 'Lazer',
  compras: 'Compras',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  assinatura: 'Assinatura',
  outros: 'Outros'
};

export const CalendarView = () => {
  const { 
    bills, 
    selectedYearMonth, 
    setSelectedYearMonth, 
    availableMonths, 
    unpayBill, 
    deleteBill 
  } = useFinance();

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const todayStr = getTodayStr();

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [billToEdit, setBillToEdit] = useState(null);
  const [billToPay, setBillToPay] = useState(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // Mês de visualização no calendário
  const currentYM = useMemo(() => {
    if (selectedYearMonth && selectedYearMonth !== 'all') {
      return selectedYearMonth;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedYearMonth]);

  const [year, month] = useMemo(() => {
    const [y, m] = currentYM.split('-').map(Number);
    return [y, m];
  }, [currentYM]);

  const handlePrevMonth = () => {
    const prevDate = new Date(year, month - 2, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedYearMonth(`${y}-${m}`);
  };

  const handleNextMonth = () => {
    const nextDate = new Date(year, month, 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedYearMonth(`${y}-${m}`);
  };

  const monthLabel = useMemo(() => {
    const date = new Date(year, month - 1, 1);
    const name = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [year, month]);

  // Mapa de Contas por Data (`YYYY-MM-DD` -> Array de Contas)
  const billsByDateMap = useMemo(() => {
    const map = new Map();
    if (bills && Array.isArray(bills)) {
      bills.forEach(b => {
        if (b.dueDate) {
          if (!map.has(b.dueDate)) {
            map.set(b.dueDate, []);
          }
          map.get(b.dueDate).push(b);
        }
      });
    }
    return map;
  }, [bills]);

  // Construção das semanas do mês no formato de Matriz (array de semanas)
  const calendarWeeks = useMemo(() => {
    const firstDate = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0);
    const daysInMonth = lastDate.getDate();
    const startDayOfWeek = firstDate.getDay(); // 0 = Domingo

    const daysList = [];

    // Preenchimento de dias vazios do mês anterior
    for (let i = 0; i < startDayOfWeek; i++) {
      daysList.push(null);
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateIso = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
      const dayBills = billsByDateMap.get(dateIso) || [];

      let dayTotal = 0;
      let dayPaidTotal = 0;
      let dayPendingTotal = 0;
      let hasOverdue = false;

      dayBills.forEach(b => {
        const amount = b.status === 'pago' ? (b.paidAmount || b.amount) : b.amount;
        dayTotal += amount;
        if (b.status === 'pago') {
          dayPaidTotal += amount;
        } else {
          dayPendingTotal += amount;
          if (b.dueDate < todayStr) {
            hasOverdue = true;
          }
        }
      });

      daysList.push({
        dayNum: d,
        dateIso,
        isToday: dateIso === todayStr,
        bills: dayBills,
        totalAmount: dayTotal,
        paidTotal: dayPaidTotal,
        pendingTotal: dayPendingTotal,
        hasOverdue
      });
    }

    // Preenchimento dos dias vazios do final do mês
    while (daysList.length % 7 !== 0) {
      daysList.push(null);
    }

    // Divisão em semanas
    const weeks = [];
    for (let i = 0; i < daysList.length; i += 7) {
      weeks.push(daysList.slice(i, i + 7));
    }

    return weeks;
  }, [year, month, billsByDateMap, todayStr]);

  // Previsão Semanal de Gastos (Metrics & Chart Data)
  const weeklyForecastData = useMemo(() => {
    return calendarWeeks.map((week, idx) => {
      const validDays = week.filter(d => d !== null);
      if (validDays.length === 0) {
        return { weekName: `Semana ${idx + 1}`, total: 0, pago: 0, pendente: 0, dateRange: '' };
      }

      const firstDay = validDays[0];
      const lastDay = validDays[validDays.length - 1];
      const dateRangeStr = `${firstDay.dayNum} a ${lastDay.dayNum} de ${new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })}`;

      let weekTotal = 0;
      let weekPaid = 0;
      let weekPending = 0;
      let weekBillsCount = 0;

      validDays.forEach(d => {
        weekTotal += d.totalAmount;
        weekPaid += d.paidTotal;
        weekPending += d.pendingTotal;
        weekBillsCount += d.bills.length;
      });

      return {
        weekName: `Semana ${idx + 1}`,
        total: weekTotal,
        pago: weekPaid,
        pendente: weekPending,
        billsCount: weekBillsCount,
        dateRange: dateRangeStr,
        isCurrentWeek: validDays.some(d => d.isToday)
      };
    });
  }, [calendarWeeks, year, month]);

  // Métricas Globais da Previsão Semanal
  const weeklySummaryMetrics = useMemo(() => {
    let monthForecastTotal = 0;
    let monthPaidTotal = 0;
    let currentWeekForecast = 0;
    let peakWeek = { weekName: 'N/A', total: 0 };

    weeklyForecastData.forEach(w => {
      monthForecastTotal += w.total;
      monthPaidTotal += w.pago;
      if (w.isCurrentWeek) {
        currentWeekForecast = w.total;
      }
      if (w.total > peakWeek.total) {
        peakWeek = w;
      }
    });

    return {
      monthForecastTotal,
      monthPaidTotal,
      currentWeekForecast,
      peakWeek
    };
  }, [weeklyForecastData]);

  const handleOpenAdd = () => {
    setBillToEdit(null);
    setShowFormModal(true);
  };

  const getWeekdayName = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return WEEKDAYS_FULL[date.getDay()];
  };

  return (
    <div className="calendar-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar: Navegação de Mês & Ação */}
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
            <CalendarDays size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>
              Calendário Mensal & Previsão Semanal
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f9fafb' }}>
              {monthLabel}
            </div>
          </div>
        </div>

        {/* Controles de Mês */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(30, 41, 59, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={handlePrevMonth}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Mês Anterior"
            >
              <ChevronLeft size={16} /> Mês Anterior
            </button>

            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '160px', fontWeight: 600, padding: '5px 10px', fontSize: '0.85rem' }}
              value={currentYM}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
            >
              {availableMonths.filter(ym => ym !== 'all').map(ym => {
                const [y, m] = ym.split('-');
                const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return (
                  <option key={ym} value={ym}>
                    📅 {label.charAt(0).toUpperCase() + label.slice(1)}
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleNextMonth}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Próximo Mês"
            >
              Próximo <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn btn-primary"
            style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#0f172a', fontWeight: 700, padding: '0.65rem 1.2rem' }}
          >
            <PlusCircle size={18} />
            + Nova Conta
          </button>
        </div>
      </div>

      {/* Previsão Semanal de Gastos (KPIs + Gráfico) */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)'
      }}>
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem', color: '#38bdf8' }}>
            <TrendingUp size={20} color="#38bdf8" />
            Dashboard de Previsão de Gastos por Semana ({monthLabel})
          </h3>
        </div>

        {/* Cards KPI Semanal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Card 1: Previsão da Semana Atual */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} /> Previsto na Semana Atual
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
              R$ {weeklySummaryMetrics.currentWeekForecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              Vencimentos previstos para esta semana
            </div>
          </div>

          {/* Card 2: Pico de Gastos no Mês */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={15} /> Maior Concentração ({weeklySummaryMetrics.peakWeek.weekName})
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24' }}>
              R$ {weeklySummaryMetrics.peakWeek.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              Semana com maior volume de contas a pagar
            </div>
          </div>

          {/* Card 3: Total Previsto no Mês */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={15} /> Total Acumulado no Mês
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>
              R$ {weeklySummaryMetrics.monthForecastTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              Soma de todos os vencimentos no mês
            </div>
          </div>
        </div>

        {/* Gráfico Recharts de Gastos Previstos por Semana */}
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyForecastData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis dataKey="weekName" stroke="#f8fafc" fontSize={12} tick={{ fill: '#f8fafc', fontWeight: 600 }} />
              <YAxis stroke="#f8fafc" fontSize={12} tickFormatter={(v) => `R$${v}`} tick={{ fill: '#f8fafc' }} />
              <Tooltip 
                formatter={(val, name) => [
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
                  name === 'pago' ? 'Já Pago' : 'A Pagar / Pendente'
                ]}
                labelFormatter={(label) => {
                  const item = weeklyForecastData.find(w => w.weekName === label);
                  return `${label} (${item?.dateRange || ''})`;
                }}
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '10px', color: '#ffffff' }}
              />
              <Legend wrapperStyle={{ color: '#f8fafc', fontSize: '0.8rem' }} />
              <Bar dataKey="pago" name="Já Pago" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pendente" name="A Pagar (Pendente)" fill="#f59e0b" stackId="a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid do Calendário Mensal por Semanas */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="#f59e0b" />
            Grade de Vencimentos - {monthLabel}
          </h3>

          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Paga
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }} /> A Pagar
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f43f5e' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} /> Vencida
            </span>
          </div>
        </div>

        {/* Tabela/Grid do Calendário */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '750px' }}>
            {/* Cabeçalho dos Dias da Semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>
              {WEEKDAYS.map((dayName, idx) => (
                <div key={dayName} style={{
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: (idx === 0 || idx === 6) ? '#fbbf24' : '#9ca3af',
                  textTransform: 'uppercase',
                  padding: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '6px'
                }}>
                  {dayName}
                </div>
              ))}
            </div>

            {/* Linhas de Semanas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {calendarWeeks.map((week, wIdx) => {
                const weekForecast = weeklyForecastData[wIdx];
                return (
                  <div key={`week-${wIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {/* Indicador de Cabeçalho da Semana */}
                    <div style={{
                      fontSize: '0.72rem',
                      color: weekForecast?.isCurrentWeek ? '#38bdf8' : '#9ca3af',
                      fontWeight: 700,
                      padding: '2px 6px',
                      display: 'flex',
                      justify: 'space-between',
                      background: weekForecast?.isCurrentWeek ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      borderRadius: '4px'
                    }}>
                      <span>SEMANA {wIdx + 1} ({weekForecast?.dateRange})</span>
                      <span>Previsto: <strong style={{ color: '#f8fafc' }}>R$ {weekForecast?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                    </div>

                    {/* Grade de 7 dias da Semana */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                      {week.map((dayObj, dIdx) => {
                        if (!dayObj) {
                          return (
                            <div key={`empty-${wIdx}-${dIdx}`} style={{
                              minHeight: '100px',
                              background: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: '8px',
                              border: '1px dashed rgba(255, 255, 255, 0.04)'
                            }} />
                          );
                        }

                        return (
                          <div
                            key={dayObj.dateIso}
                            onClick={() => dayObj.bills.length > 0 && setSelectedDayDetails(dayObj)}
                            style={{
                              minHeight: '105px',
                              background: dayObj.isToday 
                                ? 'rgba(56, 189, 248, 0.12)' 
                                : (dayObj.bills.length > 0 ? 'rgba(30, 41, 59, 0.75)' : 'rgba(15, 23, 42, 0.5)'),
                              border: dayObj.isToday 
                                ? '2px solid #38bdf8' 
                                : (dayObj.hasOverdue ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.07)'),
                              borderRadius: '8px',
                              padding: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              cursor: dayObj.bills.length > 0 ? 'pointer' : 'default',
                              transition: 'all 0.15s ease',
                              position: 'relative'
                            }}
                          >
                            {/* Número do Dia & Badge Total */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                color: dayObj.isToday ? '#38bdf8' : '#f8fafc',
                                background: dayObj.isToday ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                                padding: '1px 5px',
                                borderRadius: '4px'
                              }}>
                                {dayObj.dayNum} {dayObj.isToday && '📌'}
                              </span>

                              {dayObj.totalAmount > 0 && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24' }}>
                                  R${Math.round(dayObj.totalAmount)}
                                </span>
                              )}
                            </div>

                            {/* Lista de Cards de Contas do Dia */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '75px' }}>
                              {dayObj.bills.map(b => {
                                const isPaid = b.status === 'pago';
                                const isOverdue = !isPaid && b.dueDate < todayStr;

                                return (
                                  <div
                                    key={b.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isPaid) {
                                        setBillToPay(b);
                                      } else {
                                        setSelectedDayDetails(dayObj);
                                      }
                                    }}
                                    title={`${b.description} - R$ ${b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${isPaid ? 'Pago' : (isOverdue ? 'Vencida' : 'A Pagar')})`}
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      background: isPaid 
                                        ? 'rgba(16, 185, 129, 0.2)' 
                                        : (isOverdue ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.2)'),
                                      color: isPaid ? '#34d399' : (isOverdue ? '#f43f5e' : '#fbbf24'),
                                      border: isPaid 
                                        ? '1px solid rgba(16, 185, 129, 0.4)' 
                                        : (isOverdue ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)'),
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justify: 'space-between'
                                    }}
                                  >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {isPaid ? '✓' : (isOverdue ? '⚠️' : '⏳')} {b.description}
                                    </span>
                                    <span style={{ fontWeight: 800, marginLeft: '3px' }}>
                                      R${Math.round(b.amount)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes das Contas do Dia Selecionado */}
      {selectedDayDetails && (
        <div className="modal-overlay" onClick={() => setSelectedDayDetails(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="section-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={20} color="#f59e0b" />
                Contas do Dia {new Date(selectedDayDetails.dateIso + 'T00:00:00').toLocaleDateString('pt-BR')} ({getWeekdayName(selectedDayDetails.dateIso)})
              </h3>
              <button className="modal-close" onClick={() => setSelectedDayDetails(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {selectedDayDetails.bills.map(b => {
                const isPaid = b.status === 'pago';
                const isOverdue = !isPaid && b.dueDate < todayStr;

                return (
                  <div key={b.id} style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : (isOverdue ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'),
                    borderRadius: '10px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                          {b.description}
                        </div>
                        <span className={`badge badge-${b.category}`} style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                          {CATEGORY_LABELS[b.category] || b.category}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isPaid ? '#10b981' : '#f59e0b' }}>
                          R$ {(isPaid ? (b.paidAmount || b.amount) : b.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: isPaid ? '#34d399' : (isOverdue ? '#f43f5e' : '#fbbf24')
                        }}>
                          {isPaid ? '✓ Paga' : (isOverdue ? '⚠️ Vencida' : '⏳ A Pagar')}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.3rem' }}>
                      {isPaid ? (
                        <button
                          onClick={() => {
                            if (window.confirm(`Desfazer a quitação de "${b.description}"?`)) {
                              unpayBill(b.id);
                              setSelectedDayDetails(null);
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                        >
                          Desfazer Pago
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDayDetails(null);
                            setBillToPay(b);
                          }}
                          className="btn btn-primary"
                          style={{ background: '#10b981', borderColor: '#10b981', fontSize: '0.78rem', padding: '4px 12px' }}
                        >
                          <Check size={14} /> Quite Agora
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedDayDetails(null);
                          setBillToEdit(b);
                          setShowFormModal(true);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals de Criação e Quitação */}
      {showFormModal && (
        <BillFormModal
          billToEdit={billToEdit}
          onClose={() => {
            setShowFormModal(false);
            setBillToEdit(null);
          }}
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
