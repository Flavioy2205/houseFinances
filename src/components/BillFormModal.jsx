import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, FileText, Check } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const CATEGORIES = [
  { id: 'gasto_fixo', label: 'Gasto Fixo (Luz, Água, Aluguel, etc)' },
  { id: 'assinatura', label: 'Assinatura Recorrente (Streaming, etc)' },
  { id: 'compras', label: 'Compras & Utilidades' },
  { id: 'alimentacao', label: 'Alimentação & Mercado' },
  { id: 'transporte', label: 'Transporte & Combustível' },
  { id: 'lazer', label: 'Lazer & Entretenimento' },
  { id: 'outros', label: 'Outros' }
];

export const BillFormModal = ({ billToEdit = null, onClose }) => {
  const { addBill, updateBill } = useFinance();

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

  useEffect(() => {
    if (billToEdit) {
      setDescription(billToEdit.description || '');
      setAmount(billToEdit.amount ? String(billToEdit.amount) : '');
      setDueDate(billToEdit.dueDate || getTomorrowDate());
      setCategory(billToEdit.category || 'gasto_fixo');
      setPaymentType(billToEdit.paymentType || 'debito');
      setNotes(billToEdit.notes || '');
    }
  }, [billToEdit]);

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

    const payload = {
      description: description.trim(),
      amount: numericAmount,
      dueDate,
      category,
      paymentType,
      notes: notes.trim()
    };

    if (billToEdit) {
      updateBill(billToEdit.id, payload);
    } else {
      addBill(payload);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
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
              placeholder="Ex: Conta de Luz - Enel, Internet, Condomínio"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Grid de Valor & Data de Vencimento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Valor da Conta (R$) *</label>
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
              <label className="form-label" style={{ fontWeight: 600 }}>Data de Vencimento *</label>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

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
              placeholder="Código de barras, observações ou detalhes da cobrança..."
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
              {billToEdit ? 'Salvar Alterações' : 'Cadastrar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
