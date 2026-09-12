import React, { useState } from 'react';
import { X, CheckCircle, Calendar, DollarSign, CreditCard, Sparkles, Check } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const PayBillModal = ({ bill, onClose }) => {
  const { payBill } = useFinance();

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [paidAt, setPaidAt] = useState(getTodayDate());
  const [paymentType, setPaymentType] = useState(bill?.paymentType || 'debito');
  const [paidAmount, setPaidAmount] = useState(bill?.amount ? String(bill.amount) : '');
  const [autoCreateTransaction, setAutoCreateTransaction] = useState(true);

  if (!bill) return null;

  const getWeekdayName = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[date.getDay()];
  };

  const handleConfirmPay = (e) => {
    e.preventDefault();
    const numericPaid = parseFloat(paidAmount);
    if (!numericPaid || numericPaid <= 0) {
      alert('Por favor, informe um valor pago válido.');
      return;
    }
    if (!paidAt) {
      alert('Por favor, informe a data do pagamento.');
      return;
    }

    payBill(bill.id, {
      paidAt,
      paymentType,
      paidAmount: numericPaid,
      autoCreateTransaction
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="section-title" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={22} color="#10b981" />
            Marcar Conta como Paga
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f9fafb' }}>
            {bill.description}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem', fontSize: '0.82rem', color: '#9ca3af' }}>
            <span>Vencimento: <strong style={{ color: '#f8fafc' }}>{new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
            <span>Valor original: <strong style={{ color: '#10b981' }}>R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
          </div>
        </div>

        <form onSubmit={handleConfirmPay} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Data do Pagamento */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Data do Pagamento Efetivado *</span>
              {paidAt && (
                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                  📅 {getWeekdayName(paidAt)}
                </span>
              )}
            </label>
            <input
              type="date"
              className="form-input"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
          </div>

          {/* Valor Pago & Forma de Pagamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Valor Pago (R$) *</label>
              <div className="input-money-prefix">
                <span>R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Forma Utilizada</label>
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

          {/* Integration Checkbox */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <input
              type="checkbox"
              id="autoCreateTx"
              checked={autoCreateTransaction}
              onChange={(e) => setAutoCreateTransaction(e.target.checked)}
              style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="autoCreateTx" style={{ cursor: 'pointer', fontSize: '0.82rem', color: '#f8fafc', lineHeight: 1.4 }}>
              <strong>Lançar automaticamente no Extrato de Gastos do mês</strong>
              <span style={{ display: 'block', color: '#9ca3af', fontSize: '0.75rem', marginTop: '2px' }}>
                O pagamento contabilizará no seu gráfico mensal e relatório de despesas.
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
              <Check size={18} />
              Confirmar Quitação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
