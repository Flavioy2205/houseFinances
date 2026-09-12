import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, FileText, Check, Repeat, Layers } from 'lucide-react';
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

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getTomorrowDate());
  const [category, setCategory] = useState('gasto_fixo');
  const [paymentType, setPaymentType] = useState('debito');
  const [notes, setNotes] = useState('');

  // Repetição por Meses / Acordo
  const [isAgreement, setIsAgreement] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [valueMode, setValueMode] = useState('mensal'); // 'mensal' | 'total'

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
    }
  }, [billToEdit]);

  // Função auxiliar para calcular data de vencimento dos meses futuros
  const calcDueDateForOffset = (startDueDateStr, monthOffset) => {
    if (!startDueDateStr) return '';
    const [year, month, day] = startDueDateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1 + monthOffset, 1);
    const maxDaysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(day, maxDaysInMonth);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDay).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Cálculo da prévia de parcelas/meses
  const previewInstallments = useMemo(() => {
    if (!isAgreement || !dueDate || !amount || parseFloat(amount) <= 0) return [];
    const numInstallments = parseInt(installmentsCount) || 1;
    const numericAmount = parseFloat(amount) || 0;
    const monthlyVal = valueMode === 'total' ? numericAmount / numInstallments : numericAmount;

    const preview = [];
    const maxPreview = Math.min(numInstallments, 12); // Exibe até 12 na prévia

    for (let i = 0; i < maxPreview; i++) {
      const calcDate = calcDueDateForOffset(dueDate, i);
      const formattedDate = new Date(calcDate + 'T00:00:00').toLocaleDateString('pt-BR');
      preview.push({
        num: i + 1,
        totalNum: numInstallments,
        dateStr: formattedDate,
        amountVal: monthlyVal
      });
    }

    return preview;
  }, [isAgreement, dueDate, amount, installmentsCount, valueMode]);

  const handleSubmit = (e) => {
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
        notes: notes.trim()
      };
      updateBill(billToEdit.id, payload);
    } else if (isAgreement && parseInt(installmentsCount) > 1) {
      // Criação em lote para todos os meses do acordo
      const numInstallments = parseInt(installmentsCount);
      const monthlyAmount = valueMode === 'total' ? numericAmount / numInstallments : numericAmount;
      const agreementId = 'agreement-' + Date.now();

      const multiBills = [];
      for (let i = 0; i < numInstallments; i++) {
        const calculatedDueDate = calcDueDateForOffset(dueDate, i);
        const installmentLabel = `(${i + 1}/${numInstallments})`;
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
          totalAmount: valueMode === 'total' ? numericAmount : numericAmount * numInstallments,
          notes: notes.trim()
        });
      }

      addMultiMonthBills(multiBills);
    } else {
      const payload = {
        description: description.trim(),
        amount: numericAmount,
        dueDate,
        category,
        paymentType,
        notes: notes.trim()
      };
      addBill(payload);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
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
                  <Repeat size={16} /> Repetir por vários meses (Acordo / Parcelamento)
                </label>
              </div>

              {isAgreement && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(245, 158, 11, 0.15)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 600 }}>Número de Meses / Parcelas</label>
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
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#f8fafc', fontWeight: 600 }}>Tipo de Valor Digitado</label>
                      <select
                        className="form-select"
                        value={valueMode}
                        onChange={(e) => setValueMode(e.target.value)}
                      >
                        <option value="mensal">Valor por mês (ex: 10x de R$ 1.000)</option>
                        <option value="total">Valor total (dividir por X)</option>
                      </select>
                    </div>
                  </div>

                  {/* Prévia das parcelas nos meses */}
                  {previewInstallments.length > 0 && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={13} /> Prévia dos Lançamentos nos Próximos Meses:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto' }}>
                        {previewInstallments.map((p) => (
                          <div key={p.num} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '4px 8px', borderRadius: '5px', fontSize: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ color: '#9ca3af' }}>Parcela {p.num}/{p.totalNum}</div>
                            <div style={{ color: '#10b981', fontWeight: 700 }}>R$ {p.amountVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div style={{ color: '#f8fafc', fontSize: '0.7rem' }}>📅 {p.dateStr}</div>
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
              {billToEdit ? 'Salvar Alterações' : (isAgreement ? `Gerar Acordo em ${installmentsCount} Meses` : 'Cadastrar Conta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
