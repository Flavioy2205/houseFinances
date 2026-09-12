import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, FileText, Check, Repeat, Layers, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const CATEGORIES = [
  { id: 'gasto_fixo', label: 'Gasto Fixo (Luz, Água, Aluguel, Acordos, etc)' },
  { id: 'assinatura', label: 'Assinatura Recorrente (Streaming, etc)' },
  { id: 'compras', label: 'Compras & Utilidades' },
  { id: 'alimentacao', label: 'Alimentação & Mercado' },
  { id: 'transporte', label: 'Transporte & Combustível' },
  { id: 'lazer', label: 'Lazer & Entretenimento' },
  { id: 'outros', label: 'Outros' }
];

export const BillFormModal = ({ billToEdit = null, onClose }) => {
  const { addBill, addMultiMonthBills, updateBill } = useFinance();

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const todayStr = getTodayStr();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getTomorrowDate());
  const [category, setCategory] = useState('gasto_fixo');
  const [paymentType, setPaymentType] = useState('debito');
  const [notes, setNotes] = useState('');

  // Repetição por Meses / Acordo
  const [isAgreement, setIsAgreement] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [frequency, setFrequency] = useState('mensal'); // 'mensal' | 'semanal'
  const [valueMode, setValueMode] = useState('mensal'); // 'mensal' | 'total'

  // Opções para Cadastro Retroativo (data no passado)
  const isRetroactive = useMemo(() => {
    return Boolean(dueDate && dueDate < todayStr);
  }, [dueDate, todayStr]);

  const [initialStatus, setInitialStatus] = useState('nao_pago'); // 'nao_pago' (Vencida/Atrasada) | 'pago' (Já Paga)
  const [paidAtDate, setPaidAtDate] = useState('');
  const [autoCreateTx, setAutoCreateTx] = useState(true);
  const [paidRetroInstallmentsCount, setPaidRetroInstallmentsCount] = useState(0);

  useEffect(() => {
    if (billToEdit) {
      setDescription(billToEdit.description || '');
      setAmount(billToEdit.amount ? String(billToEdit.amount) : '');
      setDueDate(billToEdit.dueDate || getTomorrowDate());
      setCategory(billToEdit.category || 'gasto_fixo');
      setPaymentType(billToEdit.paymentType || 'debito');
      setNotes(billToEdit.notes || '');
      setIsAgreement(Boolean(billToEdit.isAgreement));
      setInstallmentsCount(billToEdit.installmentsCount || 10);
      setFrequency(billToEdit.frequency || 'mensal');
      setInitialStatus(billToEdit.status || 'nao_pago');
      setPaidAtDate(billToEdit.paidAt || billToEdit.dueDate || '');
    }
  }, [billToEdit]);

  useEffect(() => {
    if (isRetroactive && !paidAtDate) {
      setPaidAtDate(dueDate);
    }
  }, [isRetroactive, dueDate]);

  // Auxiliar para calcular data de vencimento (Mensal ou Semanal)
  const calcDueDateForOffset = (startDueDateStr, offsetIndex, freq = 'mensal') => {
    if (!startDueDateStr) return '';
    const [year, month, day] = startDueDateStr.split('-').map(Number);

    if (freq === 'semanal') {
      const baseDate = new Date(year, month - 1, day);
      baseDate.setDate(baseDate.getDate() + offsetIndex * 7);
      const y = baseDate.getFullYear();
      const m = String(baseDate.getMonth() + 1).padStart(2, '0');
      const d = String(baseDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Mensal
    const targetDate = new Date(year, month - 1 + offsetIndex, 1);
    const maxDaysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(day, maxDaysInMonth);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDay).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Cálculo da prévia de parcelas (Mensais ou Semanais)
  const previewInstallments = useMemo(() => {
    if (!isAgreement || !dueDate || !amount || parseFloat(amount) <= 0) return [];
    const numInstallments = parseInt(installmentsCount) || 1;
    const numericAmount = parseFloat(amount) || 0;
    const monthlyVal = valueMode === 'total' ? numericAmount / numInstallments : numericAmount;

    const preview = [];
    const maxPreview = Math.min(numInstallments, 12); // Exibe até 12 na prévia

    for (let i = 0; i < maxPreview; i++) {
      const calcDate = calcDueDateForOffset(dueDate, i, frequency);
      const formattedDate = new Date(calcDate + 'T00:00:00').toLocaleDateString('pt-BR');
      const isPast = calcDate < todayStr;
      const isPaid = (i < paidRetroInstallmentsCount) || (isPast && initialStatus === 'pago');

      preview.push({
        num: i + 1,
        totalNum: numInstallments,
        dateStr: formattedDate,
        amountVal: monthlyVal,
        isPast,
        isPaid,
        freq: frequency
      });
    }

    return preview;
  }, [isAgreement, dueDate, amount, installmentsCount, frequency, valueMode, todayStr, paidRetroInstallmentsCount, initialStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!description.trim()) {
      alert('Por favor, informe a descrição da conta.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      alert('Por favor, informe um valor válido maior que zero.');
      return;
    }
    if (!dueDate) {
      alert('Por favor, informe a data de vencimento.');
      return;
    }

    if (billToEdit) {
      const payload = {
        description: description.trim(),
        amount: numericAmount,
        dueDate,
        category,
        paymentType,
        notes: notes.trim(),
        ...(isRetroactive ? {
          status: initialStatus,
          paidAt: initialStatus === 'pago' ? (paidAtDate || dueDate) : null,
          paidAmount: initialStatus === 'pago' ? numericAmount : null
        } : {})
      };
      updateBill(billToEdit.id, payload);
    } else if (isAgreement && parseInt(installmentsCount) > 1) {
      // Criação em lote para todas as parcelas (Semanais ou Mensais)
      const numInstallments = parseInt(installmentsCount);
      const monthlyAmount = valueMode === 'total' ? numericAmount / numInstallments : numericAmount;
      const agreementId = 'agreement-' + Date.now();

      const multiBills = [];
      for (let i = 0; i < numInstallments; i++) {
        const calculatedDueDate = calcDueDateForOffset(dueDate, i, frequency);
        const installmentLabel = `(${i + 1}/${numInstallments})`;
        const isPastInstallment = calculatedDueDate < todayStr;
        const isPaid = (i < paidRetroInstallmentsCount) || (isPastInstallment && initialStatus === 'pago');

        multiBills.push({
          description: `${description.trim()} ${installmentLabel}`,
          amount: parseFloat(monthlyAmount.toFixed(2)),
          dueDate: calculatedDueDate,
          category,
          paymentType,
          isAgreement: true,
          agreementId,
          installmentIndex: i + 1,
          installmentsCount: numInstallments,
          frequency,
          totalAmount: valueMode === 'total' ? numericAmount : numericAmount * numInstallments,
          status: isPaid ? 'pago' : 'nao_pago',
          paidAt: isPaid ? calculatedDueDate : null,
          paidAmount: isPaid ? parseFloat(monthlyAmount.toFixed(2)) : null,
          autoCreateTransaction: isPaid ? autoCreateTx : false,
          notes: notes.trim()
        });
      }

      await addMultiMonthBills(multiBills);
    } else {
      const isPaid = isRetroactive && initialStatus === 'pago';
      const payload = {
        description: description.trim(),
        amount: numericAmount,
        dueDate,
        category,
        paymentType,
        notes: notes.trim(),
        status: isPaid ? 'pago' : 'nao_pago',
        paidAt: isPaid ? (paidAtDate || dueDate) : null,
        paidAmount: isPaid ? numericAmount : null,
        autoCreateTransaction: isPaid ? autoCreateTx : false
      };
      await addBill(payload);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="section-title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={22} color="#f59e0b" />
            {billToEdit ? 'Editar Conta a Pagar' : 'Cadastrar Nova Conta a Pagar'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Descrição */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Descrição da Conta *</label>
            <input
              type="text"
              placeholder="Ex: Acordo Conta de Luz, Aluguel, Financiamento"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Grid de Valor & Data de Vencimento Inicial */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                {isAgreement && valueMode === 'total' ? 'Valor Total do Acordo (R$) *' : 'Valor da Parcela / Conta (R$) *'}
              </label>
              <div className="input-money-prefix">
                <span>R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                {isAgreement ? 'Vencimento 1ª Parcela *' : 'Data de Vencimento *'}
              </label>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Painel de Configuração de Data Retroativa */}
          {isRetroactive && (
            <div style={{
              background: initialStatus === 'pago' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              border: initialStatus === 'pago' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: initialStatus === 'pago' ? '#34d399' : '#f43f5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={17} /> Data Retroativa Detectada ({new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR')})
              </div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Como a data informada é no passado, escolha o status inicial desta conta:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: initialStatus === 'nao_pago' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: initialStatus === 'nao_pago' ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: initialStatus === 'nao_pago' ? '#f43f5e' : '#f8fafc'
                }}>
                  <input
                    type="radio"
                    name="retroStatus"
                    value="nao_pago"
                    checked={initialStatus === 'nao_pago'}
                    onChange={() => setInitialStatus('nao_pago')}
                  />
                  ⚠️ Vencida / Em Atraso
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: initialStatus === 'pago' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: initialStatus === 'pago' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: initialStatus === 'pago' ? '#34d399' : '#f8fafc'
                }}>
                  <input
                    type="radio"
                    name="retroStatus"
                    value="pago"
                    checked={initialStatus === 'pago'}
                    onChange={() => setInitialStatus('pago')}
                  />
                  ✅ Já Paga no Passado
                </label>
              </div>

              {/* Opção para Extrato se for Já Paga */}
              {initialStatus === 'pago' && !isAgreement && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', alignItems: 'center' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Data do Pagamento Retroativo</label>
                      <input
                        type="date"
                        className="form-input"
                        value={paidAtDate || dueDate}
                        onChange={(e) => setPaidAtDate(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1.2rem' }}>
                      <input
                        type="checkbox"
                        id="autoCreateTx"
                        checked={autoCreateTx}
                        onChange={(e) => setAutoCreateTx(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="autoCreateTx" style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#f8fafc' }}>
                        Lançar no Extrato do mês retroativo
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opção de Repetir por Meses / Acordo (Apenas em Novos Cadastros) */}
          {!billToEdit && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '12px',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="isAgreement"
                  checked={isAgreement}
                  onChange={(e) => setIsAgreement(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isAgreement" style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Repeat size={16} /> Repetir por várias parcelas (Acordo / Parcelamento)
                </label>
              </div>

              {isAgreement && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(245, 158, 11, 0.15)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 600 }}>Nº de Parcelas</label>
                      <input
                        type="number"
                        min="2"
                        max="60"
                        className="form-input"
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(e.target.value)}
                        required={isAgreement}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 600 }}>Periodicidade</label>
                      <select
                        className="form-select"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                      >
                        <option value="mensal">📅 Mensal (1x Mês)</option>
                        <option value="semanal">📆 Semanal (7 dias)</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 600 }}>Tipo de Valor</label>
                      <select
                        className="form-select"
                        value={valueMode}
                        onChange={(e) => setValueMode(e.target.value)}
                      >
                        <option value="mensal">Por parcela</option>
                        <option value="total">Valor total</option>
                      </select>
                    </div>
                  </div>

                  {/* Para acordos retroativos: Escolher quantia de parcelas retroativas já pagas */}
                  {isRetroactive && (
                    <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, marginBottom: '4px' }}>
                        Parcelas Retroativas Já Quitadas (Amortizadas):
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          type="number"
                          min="0"
                          max={installmentsCount}
                          className="form-input"
                          value={paidRetroInstallmentsCount}
                          onChange={(e) => setPaidRetroInstallmentsCount(Math.min(parseInt(installmentsCount) || 0, Math.max(0, parseInt(e.target.value) || 0)))}
                          style={{ width: '90px', fontSize: '0.85rem' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          de {installmentsCount} parcelas (amortiza R$ {(paidRetroInstallmentsCount * (valueMode === 'total' ? (parseFloat(amount) || 0) / (parseInt(installmentsCount) || 1) : (parseFloat(amount) || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} do saldo devedor)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Prévia das parcelas (Semanais ou Mensais) */}
                  {previewInstallments.length > 0 && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={13} /> Prévia das Parcelas ({frequency === 'semanal' ? 'Semanais - a cada 7 dias' : 'Mensais'}):
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto' }}>
                        {previewInstallments.map((p) => (
                          <div key={p.num} style={{
                            background: p.isPaid ? 'rgba(16, 185, 129, 0.12)' : (p.isPast ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)'),
                            padding: '4px 8px',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            border: p.isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : (p.isPast ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)')
                          }}>
                            <div style={{ color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                              <span>P{p.num}/{p.totalNum}</span>
                              {p.isPaid && <span style={{ color: '#34d399', fontWeight: 700 }}>✓ Paga</span>}
                              {!p.isPaid && p.isPast && <span style={{ color: '#f43f5e', fontWeight: 700 }}>Vencida</span>}
                            </div>
                            <div style={{ color: p.isPaid ? '#10b981' : '#f8fafc', fontWeight: 700 }}>R$ {p.amountVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>📅 {p.dateStr}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categoria & Forma de Pagamento Prevista */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Categoria</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Pagamento Previsto</label>
              <select
                className="form-select"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="debito">Débito / PIX / Boleto</option>
                <option value="credito">Cartão de Crédito</option>
                <option value="dinheiro">Dinheiro em Espécie</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Observações / Código de Barras (Opcional)</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Código de barras, detalhes do acordo ou observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
              <Check size={18} />
              {billToEdit ? 'Salvar Alterações' : (isAgreement ? `Gerar Acordo em ${installmentsCount} Parcelas` : 'Cadastrar Conta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
