import React, { useState } from 'react';
import { 
  Send, 
  Bot, 
  MessageSquareShare, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  Code, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const WhatsappIntegration = () => {
  const { parseWhatsappText, addTransaction, totalSpentMonth, creditTotalMonth, debitTotalMonth, categoryTotalsMonth } = useFinance();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '👋 Olá! Eu sou o assistente do HouseFinances. Você pode digitar seus gastos por aqui em linguagem natural e eu vou cadastrar para você!',
      time: '12:00'
    },
    {
      id: 2,
      sender: 'bot',
      text: 'Exemplo: "Gastei 45 no mercado no débito compras" ou "Cinema 30 no cartão crédito lazer"',
      time: '12:00'
    }
  ]);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const samplePrompts = [
    'Netflix 55.90 credito assinatura',
    'Spotify Familia 34.90 credito assinatura',
    'Jantar 85.00 cartao credito lazer',
    'Mercado semanal 320 debito alimentacao',
    'Gasto fixo conta luz 150 pix'
  ];

  const handleSendMessage = (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: Date.now(), sender: 'user', text: query, time: currentTime };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Parse message
    const parsed = parseWhatsappText(query);

    setTimeout(() => {
      if (parsed && parsed.amount > 0) {
        // Add transaction
        const created = addTransaction(parsed);

        const categoryNames = {
          assinatura: '📺 Assinatura (Recorrente)',
          lazer: '🎉 Lazer',
          compras: '🛍️ Compras',
          gasto_fixo: '🏠 Gasto Fixo',
          alimentacao: '🛒 Alimentação',
          transporte: '🚗 Transporte',
          outros: '📦 Outros'
        };

        const paymentNames = {
          credito: '💳 Cartão de Crédito',
          debito: '💳 Cartão de Débito',
          pix: '⚡ PIX',
          dinheiro: '💵 Dinheiro'
        };

        const botReply = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `✅ *Gasto Cadastrado com Sucesso!*\n\n• *Item:* ${created.description}\n• *Valor:* R$ ${created.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• *Pagamento:* ${paymentNames[created.paymentType] || created.paymentType}\n• *Categoria:* ${categoryNames[created.category] || created.category}\n\nO Dashboard já foi atualizado com essa nova despesa!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, botReply]);
      } else {
        const botReply = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ Não consegui identificar o valor do gasto. Tente incluir um valor numérico (ex: "Gastei 50 no mercado crédito lazer").`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botReply]);
      }
    }, 400);
  };

  const handleShareSummary = () => {
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpentMonth);
    const formattedCred = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditTotalMonth);
    const formattedDeb = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(debitTotalMonth);

    const lazerVal = (categoryTotalsMonth.lazer || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const comprasVal = (categoryTotalsMonth.compras || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const fixoVal = (categoryTotalsMonth.gasto_fixo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const messageText = 
`📊 *RESUMO FINANCEIRO HOUSEFINANCES*
🗓️ Mês: ${monthName}

💰 *Gasto Total:* ${formattedTotal}
💳 *Crédito:* ${formattedCred}
💳 *Débito:* ${formattedDeb}

📌 *Por Categoria:*
• 🎉 Lazer: R$ ${lazerVal}
• 🛍️ Compras: R$ ${comprasVal}
• 🏠 Gasto Fixo: R$ ${fixoVal}

_Relatório enviado via HouseFinances_`;

    const url = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const copyWebhookCode = () => {
    const code = `// Exemplo de Endpoint Webhook Node.js / Express para WhatsApp Cloud API
app.post('/webhook/whatsapp', (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (message && message.text) {
    const userText = message.text.body;
    // Chame a API HouseFinances para registrar o gasto
    console.log('Novo gasto via WhatsApp:', userText);
  }
  res.sendStatus(200);
});`;
    navigator.clipboard.writeText(code);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.15) 0%, rgba(18, 140, 126, 0.08) 100%)',
        borderColor: 'rgba(37, 211, 102, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <span className="badge" style={{ background: '#25D366', color: '#fff', marginBottom: '0.5rem' }}>
              Integração WhatsApp Inteligente
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Passe todos os seus gastos direto pelo Zap</h2>
            <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              Utilize o assistente abaixo para testar o parser em linguagem natural ou compartilhe resumos financeiros.
            </p>
          </div>

          <button className="btn btn-whatsapp" onClick={handleShareSummary} style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}>
            <MessageSquareShare size={20} />
            Compartlhar Resumo Atual no Zap
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Left Column: WhatsApp Chat Simulator */}
        <div>
          <div className="section-header">
            <h3 className="section-title">
              <Bot size={20} color="#25D366" />
              Simulador de Conversa com Bot do WhatsApp
            </h3>
          </div>

          <div className="whatsapp-chat-container">
            <div className="whatsapp-header">
              <div className="whatsapp-avatar">
                <Bot size={22} />
              </div>
              <div className="whatsapp-status-info">
                <span className="whatsapp-bot-name">HouseFinances Bot</span>
                <span className="whatsapp-online-status">
                  <span className="online-dot" />
                  online • Parser ativo
                </span>
              </div>
            </div>

            <div className="whatsapp-body">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                  <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                  <div className="chat-time">{msg.time}</div>
                </div>
              ))}
            </div>

            {/* Suggestions Chips */}
            <div style={{ background: '#111b21', padding: '0.5rem 1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ fontSize: '0.72rem', color: '#8696a0', marginBottom: '0.3rem' }}>Exemplos para clicar e testar:</div>
              <div className="chat-suggestions">
                {samplePrompts.map((prompt, idx) => (
                  <button key={idx} className="chat-chip" onClick={() => handleSendMessage(prompt)}>
                    + {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="whatsapp-input-bar">
              <input
                type="text"
                className="whatsapp-input"
                placeholder="Digite seu gasto (ex: Gastei 50 no mercado no débito compras)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="whatsapp-send-btn" onClick={() => handleSendMessage()}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Webhook & Cloud API Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              <Code size={18} color="#8b5cf6" />
              Integração Real via Webhook
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '1rem' }}>
              Para receber mensagens direto da sua conta no WhatsApp Business API ou Twilio, configure a URL Webhook de seu servidor.
            </p>

            <button className="btn btn-secondary" onClick={copyWebhookCode} style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}>
              {copiedWebhook ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              {copiedWebhook ? 'Código Copiado!' : 'Copiar Webhook Node.js'}
            </button>
          </div>

          <div className="card" style={{ background: 'rgba(17, 24, 39, 0.6)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f9fafb', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={16} color="#3b82f6" />
              Como Funciona a Identificação?
            </h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Valor:</strong> Detecta números e valores em reais (ex: 45, R$ 45,00).</li>
              <li><strong>Tipo Pagamento:</strong> Identifica palavras como crédito, débito, pix ou dinheiro.</li>
              <li><strong>Categoria:</strong> Reconhece palavras-chave como lazer, compras, gasto fixo, mercado ou restaurante.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
