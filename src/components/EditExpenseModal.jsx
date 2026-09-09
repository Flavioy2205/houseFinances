import React, { useState } from 'react';
import { 
  Pencil, 
  X, 
  DollarSign, 
  FileText, 
  CreditCard, 
  Tag, 
  Calendar, 
  Repeat, 
  CheckCircle2, 
  Save 
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const EditExpenseModal = ({ transaction, onClose }) => {
  const { updateTransaction } = useFinance();

  // Se a transação for parcelada, exibe o valor total original para o usuário poder editar o total
  const initialAmount = transaction.totalAmount 
    ? String(transaction.totalAmount) 
    : String(transaction.amount || '');

  // Limpa tags automáticas antigas da observação para evitar duplicação no campo de notas
  const cleanNotes = (transaction.notes || '')
    .replace(/\|\s*💳\s*Parcelado.*$/i, '')
    .replace(/^💳\s*Parcelado.*$/i, '')
    .trim();

  const [amount, setAmount] = useState(initialAmount);
  const [description, setDescription] = useState(transaction.description || '');
  const [paymentType, setPaymentType] = useState(transaction.paymentType || 'credito');
  const [category, setCategory] = useState(transaction.category || 'lazer');
  const [isRecurring, setIsRecurring] = useState(Boolean(transaction.isRecurring));
  const [isInstallment, setIsInstallment] = useState(Boolean(transaction.isInstallment || transaction.installmentsCount));
  const [installmentsCount, setInstallmentsCount] = useState(transaction.installmentsCount || 2);
  const [date, setDate] = useState(transaction.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(cleanNotes);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert('Por favor, informe um valor válido para o gasto.');
      return;
    }

    if (!description.trim()) {
      alert('Por favor, informe a descrição do gasto.');
      return;
    }

    const totalVal = parseFloat(amount);
    const instCount = isInstallment ? Math.max(2, parseInt(installmentsCount) || 2) : 1;
    const monthlyInstallmentVal = isInstallment ? Number((totalVal / instCount).toFixed(2)) : totalVal;

    let finalNotes = notes.trim();
    if (isInstallment) {
      const formattedTotal = totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedMonthly = monthlyInstallmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const tag = `💳 Parcelado ${instCount}x de R$ ${formattedMonthly} (Total: R$ ${formattedTotal})`;
      finalNotes = finalNotes ? `${finalNotes} | ${tag}` : tag;
    }

    updateTransaction(transaction.id, {
      amount: monthlyInstallmentVal,
      totalAmount: totalVal,
      isInstallment,
      installmentsCount: isInstallment ? instCount : null,
      description: description.trim(),
      paymentType,
      category,
      isRecurring,
      date,
      notes: finalNotes
    });

    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      if (onClose) onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Pencil size={20} />
            </div>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.25rem' }}>
                Editar Gasto Registrado
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
                Modifique os dados abaixo para corrigir o lançamento.
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {showSuccessToast && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            padding: '0.85rem',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={20} />
            Gasto atualizado com sucesso!
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

          {/* Field 2: Com o que foi gasto */}
          <div className="form-group">
            <label className="form-label">
              <FileText size={16} color="#3b82f6" />
              Com o que foi gasto? *
            </label>
            <input
              type="text"
              placeholder="Ex: Netflix, Mercado, Tênis novo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Field 3: Tipo de Pagamento */}
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

          {/* Field 4: Categoria */}
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
              <option value="gasto_fixo">🏠 Gasto Fixo (Aluguel, luz, água, internet)</option>
              <option value="lazer">🎉 Lazer (Cinemas, bares, saídas)</option>
              <option value="compras">🛍️ Compras (Roupas, eletrônicos)</option>
              <option value="alimentacao">🛒 Alimentação (Mercado, restaurantes)</option>
              <option value="transporte">🚗 Transporte (Uber, combustível)</option>
              <option value="outros">📦 Outros Gastos</option>
            </select>
          </div>

          {/* Field 5: Data */}
          <div className="form-group full-width">
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

          {/* Recorrência */}
          <div className="form-group full-width" style={{
            background: isRecurring ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            border: isRecurring ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
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
          </div>

          {/* Compra Parcelada */}
          <div className="form-group full-width" style={{
            background: isInstallment ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            border: isInstallment ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            transition: 'all 0.2s ease'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600, color: '#f9fafb' }}>
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <CreditCard size={18} color="#3b82f6" />
              <span>Gasto Parcelado (Dividir valor total em parcelas mensais)</span>
            </label>

            {isInstallment && (
              <div style={{ marginTop: '0.85rem', paddingLeft: '2.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>
                    Número de Parcelas:
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="72"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(Math.max(2, parseInt(e.target.value) || 2))}
                    className="form-input"
                    style={{ width: '110px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>vezes</span>
                </div>

                {parseFloat(amount) > 0 && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem'
                  }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                      Recálculo: {installmentsCount}x de R$ {(parseFloat(amount) / Math.max(2, parseInt(installmentsCount) || 2)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="form-group full-width">
            <label className="form-label">Observações / Detalhes</label>
            <input
              type="text"
              placeholder="Ex: Plano Família, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group full-width" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
              <Save size={18} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
