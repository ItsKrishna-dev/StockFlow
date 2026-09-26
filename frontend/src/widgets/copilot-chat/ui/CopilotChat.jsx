import React, { useState, useRef, useEffect } from 'react';
import { copilotApi } from '../../../entities/copilot';
import styles from './CopilotChat.module.css';

const SUGGESTED_PROMPTS = [
  'Which products are low on stock?',
  'Are there any stockout risks?',
  'What operations are pending?',
  'Overall dashboard health summary',
];

export function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hi! I'm your AI Inventory Copilot. Ask me about stock levels, reorder risks, recent movements, or operations based strictly on live warehouse records.",
      time: 'Now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (questionText) => {
    const query = (questionText || inputValue).trim();
    if (!query || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        sender: 'user',
        text: query,
        time: nowTime,
      },
    ]);

    setInputValue('');
    setIsLoading(true);

    try {
      const response = await copilotApi.ask(query);
      const botMessageId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          sender: 'bot',
          text: response.answer || 'No explanation provided.',
          intent: response.intent,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      const errorMsg =
        err?.message || 'AI copilot is currently unavailable. Please verify your connection or GROQ_API_KEY.';
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          isError: true,
          text: errorMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitForm = (e) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <>
      {/* Floating Trigger Circle Button */}
      <button
        type="button"
        className={styles.floatingBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? 'Close AI Copilot' : 'Open AI Inventory Copilot'}
        aria-label="Toggle AI Inventory Copilot"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
          {isOpen ? 'close' : 'smart_toy'}
        </span>
        {!isOpen && <span className={styles.pulseDot} />}
      </button>

      {/* Floating Chat Popup Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerLeft}>
              <div className={styles.botAvatar}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  smart_toy
                </span>
              </div>
              <div className={styles.headerMeta}>
                <span className={styles.headerTitle}>StockFlow Copilot</span>
                <span className={styles.headerSubtitle}>
                  <span className={styles.liveIndicator} />
                  Grounded AI • Llama 3.3
                </span>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
              title="Close chat"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          </div>

          {/* Suggested Prompts */}
          <div className={styles.quickPrompts}>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className={styles.promptChip}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className={styles.messagesArea}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${msg.sender === 'user' ? styles.userRow : styles.botRow}`}
              >
                <div
                  className={`${msg.sender === 'user' ? styles.userMsg : styles.botMsg} ${
                    msg.isError ? styles.botMsgError : ''
                  }`}
                >
                  {msg.intent && msg.intent !== 'unknown' && (
                    <div className={styles.intentTag}>{msg.intent.replace(/_/g, ' ')}</div>
                  )}
                  <div>{msg.text}</div>
                </div>
                <span className={styles.messageTime}>{msg.time}</span>
              </div>
            ))}

            {/* Thinking / Loading indicator */}
            {isLoading && (
              <div className={styles.thinkingMsg}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#714b67' }}>
                  auto_awesome
                </span>
                <span>Copilot is analyzing...</span>
                <div className={styles.dots}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className={styles.inputFooter}>
            <form className={styles.inputForm} onSubmit={onSubmitForm}>
              <input
                ref={inputRef}
                type="text"
                className={styles.chatInput}
                placeholder="Ask about inventory, stock, risks..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!inputValue.trim() || isLoading}
                title="Send message"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  arrow_upward
                </span>
              </button>
            </form>
            <div className={styles.footerDisclaimer}>
              Grounded in live database records • Read-only
            </div>
          </div>
        </div>
      )}
    </>
  );
}
