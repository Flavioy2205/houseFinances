import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Download, 
  Filter, 
  CreditCard, 
  Tag, 
  Calendar,
  DollarSign,
  Repeat
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

const CATEGORY_NAMES = {
  assinatura: '📺 Assinatura',
  gasto_fixo: '🏠 Gasto Fixo',
  lazer: '🎉 Lazer',
  compras: '🛍️ Compras',
  alimentacao: '🛒 Alimentação',
  transporte: '🚗 Transporte',
  outros: '📦 Outros'
};

export const TransactionList = () => {
  const { transactions, deleteTransaction, resetData } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesPayment = filterPayment === 'all' || t.paymentType === filterPayment;

    return matchesSearch && matchesCategory && matchesPayment;
  });

  const exportCSV = () => {
    const headers = ['ID,Descricao,Valor,TipoPagamento,Categoria,Recorrente,Data,Observacoes\n'];
    const rows = filteredTransactions.map(t => 
      `"${t.id}","${t.description}",${t.amount},"${t.paymentType}","${t.category}","${t.isRecurring ? 'Sim' : 'Nao'}","${t.date}","${t.notes || ''}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + headers.concat(rows).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `housefinances_gastos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search & Filter Header */}
      <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Buscar por descrição ou detalhe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Category */}
          <select 
            className="form-select" 
            style={{ width: 'auto' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas Categoria</option>
            <option value="assinatura">Assinaturas (Recorrentes)</option>
            <option value="lazer">Lazer</option>
            <option value="compras">Compras</option>
            <option value="gasto_fixo">Gasto Fixo</option>
            <option value="alimentacao">Alimentação</option>
            <option value="transporte">Transporte</option>
            <option value="outros">Outros</option>
          </select>

          {/* Filter Payment */}
          <select 
            className="form-select" 
            style={{ width: 'auto' }}
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
          >
            <option value="all">Todos Pagamentos</option>
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} />
            Exportar CSV
          </button>
          <button className="btn btn-ghost" onClick={resetData} title="Restaurar dados demonstrativos">
            Restaurar Dados
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição / O que foi gasto</th>
                <th>Tipo de Gasto</th>
                <th>Pagamento</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontSize: '0.85rem', color: '#9ca3af', fontFamily: 'var(--font-mono)' }}>
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {t.description}
                        {(t.category === 'assinatura' || t.isRecurring) && (
                          <span title="Repete todo mês automaticamente" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', color: '#f472b6', background: 'rgba(236, 72, 153, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                            <Repeat size={11} /> Mensal
                          </span>
                        )}
                        {(t.isInstallment || t.installmentsCount) && (
                          <span title={`Parcelado em ${t.installmentsCount || ''} vezes`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            <CreditCard size={11} /> {t.installmentsCount ? `${t.installmentsCount}x` : 'Parcelado'}
                          </span>
                        )}
                      </div>
                      {t.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.notes}</div>}
                    </td>
                    <td>
                      <span className={`badge badge-${t.category}`}>
                        {CATEGORY_NAMES[t.category] || t.category}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-${t.paymentType}`}>
                        {t.paymentType === 'credito' ? '💳 Crédito' :
                         t.paymentType === 'debito' ? '💳 Débito' :
                         t.paymentType === 'pix' ? '⚡ PIX' : '💵 Dinheiro'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="amount-negative">
                        - R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {t.isInstallment && t.totalAmount && (
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                          Parcela do Mês (Total R$ {t.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          if (confirm(`Deseja excluir a despesa "${t.description}"?`)) {
                            deleteTransaction(t.id);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    Nenhum gasto encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
