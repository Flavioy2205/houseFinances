import React, { useState } from 'react';
import { 
  DollarSign, 
  FileText, 
  CreditCard, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  Sparkles,
  Plus,
  Tv,
  Repeat,
  Info
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const ExpenseForm = ({ onSuccess }) => {
  const { addTransaction } = useFinance();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentType, setPaymentType] = useState('credito');
  const [category, setCategory] = useState('lazer');
  const [isRecurring, setIsRecurring] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    // Sugere a marcação de recorrência para Assinaturas e Gastos Fixos, mas o usuário pode desativar livremente
    if (newCat === 'assinatura' || newCat === 'gasto_fixo') {
      setIsRecurring(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert('Por favor, informe um valor válido para o gasto.');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, informe com o que foi gasto.');
      return;
    }

    addTransaction({
      amount: parseFloat(amount),
      description: description.trim(),
      paymentType,
      category,
      isRecurring, // Respeita exatamente a escolha do checkbox (Checked ou Unchecked)
      date,
      notes: notes.trim()
    });

    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      if (onSuccess) onSuccess();
    }, 1200);

    // Reset form for next entry
    setAmount('');
    setDescription('');
    setNotes('');
    setIsRecurring(false);
  };

  return (
    <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="section-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.35rem' }}>
            <Plus size={22} color="#10b981" />
            Cadastro Manual de Gasto
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.2rem' }}>
            Preencha os dados abaixo para registrar sua nova despesa no sistema.
          </p>
        </div>
      </div>

      {showSuccessToast && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '12px',
          padding: '1rem',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={22} />
          Gasto cadastrado com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        {/* Field 1: Valor Gasto */}
        <div className="form-group">
          <label className="form-label">
            <DollarSign size={16} color="#10b981" />
            Valor Gasto (R$) *
          </label>
          <div className="input-money-prefix">
            <span>R$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-input"
              required
            />
          </div>
        </div>

        {/* Field 2: Com o que foi gasto (Descrição) */}
        <div className="form-group">
          <label className="form-label">
            <FileText size={16} color="#3b82f6" />
            Com o que foi gasto? *
          </label>
          <input
            type="text"
            placeholder="Ex: Netflix, Aluguel, Jantar restaurante, Tênis novo"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            required
          />
        </div>

        {/* Field 3: Tipo de Pagamento (Cartão de Crédito ou Débito) */}
        <div className="form-group">
          <label className="form-label">
            <CreditCard size={16} color="#8b5cf6" />
            Tipo de Pagamento *
          </label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            className="form-select"
          >
            <option value="credito">💳 Cartão de Crédito</option>
            <option value="debito">💳 Cartão de Débito</option>
            <option value="pix">⚡ PIX / Transferência</option>
            <option value="dinheiro">💵 Dinheiro em Espécie</option>
          </select>
        </div>

        {/* Field 4: Tipo de Gasto / Categoria */}
        <div className="form-group">
          <label className="form-label">
            <Tag size={16} color="#f59e0b" />
            Tipo de Gasto (Categoria) *
          </label>
          <select
            value={category}
            onChange={handleCategoryChange}
            className="form-select"
          >
            <option value="assinatura">📺 Assinatura (Netflix, Spotify, Academia)</option>
            <option value="gasto_fixo">🏠 Gasto Fixo (Aluguel, contas da casa, luz, água, internet)</option>
            <option value="lazer">🎉 Lazer (Cinemas, bares, saídas, passeios)</option>
            <option value="compras">🛍️ Compras (Roupas, eletrônicos, presentes)</option>
            <option value="alimentacao">🛒 Alimentação (Mercado, restaurante, lanches)</option>
            <option value="transporte">🚗 Transporte (Uber, combustível, transporte)</option>
            <option value="outros">📦 Outros Gastos</option>
          </select>
        </div>

        {/* Field 5: Data do Gasto */}
        <div className="form-group">
          <label className="form-label">
            <Calendar size={16} color="#06b6d4" />
            Data do Gasto *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        {/* Recurrence Option Toggle (Opcional e independente para qualquer categoria) */}
        <div className="form-group full-width" style={{
          background: isRecurring ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255, 255, 255, 0.02)',
          border: isRecurring ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1rem',
          transition: 'all 0.2s ease'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600, color: '#f9fafb' }}>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#ec4899', cursor: 'pointer' }}
            />
            <Repeat size={18} color="#ec4899" />
            <span>Repetir mensalmente (Adicionar este valor automaticamente todo mês)</span>
          </label>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem', paddingLeft: '2.1rem' }}>
            Opcional para <strong>Gastos Fixos</strong> (Aluguel, Luz) e <strong>Assinaturas</strong>. Se desmarcado, o gasto será lançado como uma despesa única apenas para este mês.
          </p>
        </div>

        {/* Field 6: Observações (Opcional) */}
        <div className="form-group full-width">
          <label className="form-label">
            Observações / Detalhes Adicionais (opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: Plano Família 4K, Cobrança dia 10"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group full-width" style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
            <Sparkles size={18} />
            Cadastrar Gasto
          </button>
        </div>
      </form>
    </div>
  );
};
