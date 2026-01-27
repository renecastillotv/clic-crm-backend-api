/**
 * CLIC Web Chat Widget
 *
 * Embeddable chat widget for websites. Connects to the WebSocket server
 * for real-time messaging with CRM agents.
 *
 * Usage:
 *   <script src="https://your-domain.com/webchat-widget.js"></script>
 *   <script>
 *     ClicChat.init({
 *       apiKey: 'your-api-key',
 *       wsUrl: 'wss://your-ws-server:3002',
 *     });
 *   </script>
 */

// ==================== TYPES ====================

interface WidgetConfig {
  apiKey: string;
  wsUrl: string;
  position?: 'bottom-right' | 'bottom-left';
  color?: string;
  title?: string;
  subtitle?: string;
  greeting?: string;
  offlineMessage?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  from: 'visitor' | 'agent';
  agentName?: string;
  timestamp: string;
}

interface ServerMessage {
  type: string;
  text?: string;
  from?: string;
  agentName?: string;
  greeting?: string;
  agentsAvailable?: boolean;
  offlineMessage?: string;
  timestamp?: string;
}

// ==================== STATE ====================

let config: WidgetConfig | null = null;
let ws: WebSocket | null = null;
let sessionId: string = '';
let visitorName: string = '';
let messages: ChatMessage[] = [];
let isOpen = false;
let isConnected = false;
let agentsAvailable = true;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let typingTimer: ReturnType<typeof setTimeout> | null = null;
let isTyping = false;

// DOM references
let container: HTMLDivElement | null = null;
let bubble: HTMLDivElement | null = null;
let chatWindow: HTMLDivElement | null = null;
let messagesContainer: HTMLDivElement | null = null;
let inputField: HTMLInputElement | null = null;
let unreadBadge: HTMLSpanElement | null = null;
let unreadCount = 0;

// ==================== PUBLIC API ====================

export function init(userConfig: WidgetConfig): void {
  config = {
    position: 'bottom-right',
    color: '#3B82F6',
    title: 'Chat',
    subtitle: 'Te respondemos en minutos',
    ...userConfig,
  };

  if (!config.apiKey || !config.wsUrl) {
    console.error('[ClicChat] apiKey and wsUrl are required');
    return;
  }

  sessionId = getOrCreateSessionId();
  visitorName = getVisitorName();

  injectStyles();
  createWidget();
}

export function open(): void {
  if (!chatWindow) return;
  isOpen = true;
  chatWindow.style.display = 'flex';
  unreadCount = 0;
  updateUnreadBadge();
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    connect();
  }
  inputField?.focus();
}

export function close(): void {
  if (!chatWindow) return;
  isOpen = false;
  chatWindow.style.display = 'none';
}

export function destroy(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    container = null;
  }
  // Remove injected styles
  const style = document.getElementById('clic-chat-styles');
  if (style) style.remove();
}

// ==================== SESSION ====================

function getOrCreateSessionId(): string {
  const key = 'clic_chat_session';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'vs_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

function getVisitorName(): string {
  return localStorage.getItem('clic_chat_name') || 'Visitante';
}

function setVisitorName(name: string): void {
  visitorName = name;
  localStorage.setItem('clic_chat_name', name);
}

// ==================== WEBSOCKET ====================

function connect(): void {
  if (!config) return;

  const url = `${config.wsUrl}?apiKey=${encodeURIComponent(config.apiKey)}&sessionId=${encodeURIComponent(sessionId)}&visitorName=${encodeURIComponent(visitorName)}`;

  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.error('[ClicChat] WebSocket connection error:', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    isConnected = true;
    reconnectAttempts = 0;
    updateConnectionStatus();
  };

  ws.onmessage = (event) => {
    try {
      const msg: ServerMessage = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (err) {
      console.error('[ClicChat] Error parsing message:', err);
    }
  };

  ws.onclose = () => {
    isConnected = false;
    updateConnectionStatus();
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose will fire after this
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isOpen) connect();
  }, delay);
}

function sendMessage(text: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({ type: 'message', text }));

  const msg: ChatMessage = {
    id: 'local_' + Date.now(),
    text,
    from: 'visitor',
    timestamp: new Date().toISOString(),
  };
  messages.push(msg);
  renderMessage(msg);
  scrollToBottom();
}

function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'welcome':
      agentsAvailable = msg.agentsAvailable ?? true;
      if (msg.greeting) {
        config!.greeting = msg.greeting;
      }
      if (msg.offlineMessage) {
        config!.offlineMessage = msg.offlineMessage;
      }
      updateGreeting();
      break;

    case 'message':
      if (msg.from === 'agent' && msg.text) {
        const chatMsg: ChatMessage = {
          id: 'srv_' + Date.now(),
          text: msg.text,
          from: 'agent',
          agentName: msg.agentName,
          timestamp: msg.timestamp || new Date().toISOString(),
        };
        messages.push(chatMsg);
        renderMessage(chatMsg);
        scrollToBottom();

        if (!isOpen) {
          unreadCount++;
          updateUnreadBadge();
        }
      }
      break;

    case 'typing':
      showTypingIndicator();
      break;
  }
}

// ==================== UI CREATION ====================

function createWidget(): void {
  container = document.createElement('div');
  container.id = 'clic-chat-container';
  container.setAttribute('data-position', config!.position || 'bottom-right');

  // Chat bubble button
  bubble = document.createElement('div');
  bubble.id = 'clic-chat-bubble';
  bubble.style.backgroundColor = config!.color || '#3B82F6';
  bubble.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  bubble.addEventListener('click', () => {
    if (isOpen) close();
    else open();
  });

  // Unread badge
  unreadBadge = document.createElement('span');
  unreadBadge.id = 'clic-chat-unread';
  unreadBadge.style.display = 'none';
  bubble.appendChild(unreadBadge);

  // Chat window
  chatWindow = document.createElement('div');
  chatWindow.id = 'clic-chat-window';
  chatWindow.style.display = 'none';

  // Header
  const header = document.createElement('div');
  header.id = 'clic-chat-header';
  header.style.backgroundColor = config!.color || '#3B82F6';
  header.innerHTML = `
    <div id="clic-chat-header-info">
      <div id="clic-chat-title">${escapeHtml(config!.title || 'Chat')}</div>
      <div id="clic-chat-subtitle">${escapeHtml(config!.subtitle || '')}</div>
    </div>
    <button id="clic-chat-close" aria-label="Cerrar chat">&times;</button>
  `;
  header.querySelector('#clic-chat-close')!.addEventListener('click', close);

  // Messages area
  messagesContainer = document.createElement('div');
  messagesContainer.id = 'clic-chat-messages';

  // Greeting
  if (config!.greeting) {
    const greetingEl = document.createElement('div');
    greetingEl.className = 'clic-chat-greeting';
    greetingEl.textContent = config!.greeting;
    messagesContainer.appendChild(greetingEl);
  }

  // Name input (if visitor hasn't set name)
  const nameInputArea = document.createElement('div');
  nameInputArea.id = 'clic-chat-name-area';
  if (visitorName === 'Visitante') {
    nameInputArea.innerHTML = `
      <input type="text" id="clic-chat-name-input" placeholder="Tu nombre (opcional)" maxlength="50" />
    `;
    const nameInput = nameInputArea.querySelector('#clic-chat-name-input') as HTMLInputElement;
    nameInput.addEventListener('change', () => {
      const name = nameInput.value.trim();
      if (name) {
        setVisitorName(name);
        nameInputArea.style.display = 'none';
      }
    });
  } else {
    nameInputArea.style.display = 'none';
  }

  // Input area
  const inputArea = document.createElement('div');
  inputArea.id = 'clic-chat-input-area';
  inputField = document.createElement('input');
  inputField.type = 'text';
  inputField.id = 'clic-chat-input';
  inputField.placeholder = 'Escribe un mensaje...';
  inputField.maxLength = 2000;
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = inputField!.value.trim();
      if (text) {
        sendMessage(text);
        inputField!.value = '';
      }
    }
  });

  const sendBtn = document.createElement('button');
  sendBtn.id = 'clic-chat-send';
  sendBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  `;
  sendBtn.addEventListener('click', () => {
    const text = inputField!.value.trim();
    if (text) {
      sendMessage(text);
      inputField!.value = '';
    }
  });

  inputArea.appendChild(inputField);
  inputArea.appendChild(sendBtn);

  // Connection status
  const statusBar = document.createElement('div');
  statusBar.id = 'clic-chat-status';
  statusBar.style.display = 'none';
  statusBar.textContent = 'Reconectando...';

  // Assemble
  chatWindow.appendChild(header);
  chatWindow.appendChild(nameInputArea);
  chatWindow.appendChild(messagesContainer);
  chatWindow.appendChild(statusBar);
  chatWindow.appendChild(inputArea);

  container.appendChild(chatWindow);
  container.appendChild(bubble);
  document.body.appendChild(container);
}

// ==================== UI UPDATES ====================

function renderMessage(msg: ChatMessage): void {
  if (!messagesContainer) return;

  const el = document.createElement('div');
  el.className = `clic-chat-msg clic-chat-msg-${msg.from}`;

  const textEl = document.createElement('div');
  textEl.className = 'clic-chat-msg-text';
  textEl.textContent = msg.text;

  const metaEl = document.createElement('div');
  metaEl.className = 'clic-chat-msg-meta';
  const time = new Date(msg.timestamp);
  metaEl.textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (msg.agentName) {
    metaEl.textContent = msg.agentName + ' · ' + metaEl.textContent;
  }

  el.appendChild(textEl);
  el.appendChild(metaEl);
  messagesContainer.appendChild(el);
}

function scrollToBottom(): void {
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function updateUnreadBadge(): void {
  if (!unreadBadge) return;
  if (unreadCount > 0) {
    unreadBadge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
    unreadBadge.style.display = 'flex';
  } else {
    unreadBadge.style.display = 'none';
  }
}

function updateConnectionStatus(): void {
  const statusBar = document.getElementById('clic-chat-status');
  if (!statusBar) return;
  statusBar.style.display = isConnected ? 'none' : 'block';
}

function updateGreeting(): void {
  if (!messagesContainer) return;
  const existing = messagesContainer.querySelector('.clic-chat-greeting');
  if (existing && config!.greeting) {
    existing.textContent = config!.greeting;
  }

  // Show offline message if no agents available
  if (!agentsAvailable && config!.offlineMessage) {
    const offlineEl = messagesContainer.querySelector('.clic-chat-offline') || document.createElement('div');
    offlineEl.className = 'clic-chat-offline';
    offlineEl.textContent = config!.offlineMessage;
    if (!offlineEl.parentNode) {
      messagesContainer.appendChild(offlineEl);
    }
  }
}

function showTypingIndicator(): void {
  if (isTyping) return;
  isTyping = true;

  const indicator = document.createElement('div');
  indicator.id = 'clic-chat-typing';
  indicator.className = 'clic-chat-msg clic-chat-msg-agent';
  indicator.innerHTML = `
    <div class="clic-chat-typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesContainer?.appendChild(indicator);
  scrollToBottom();

  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    indicator.remove();
    isTyping = false;
  }, 3000);
}

// ==================== UTILITIES ====================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== STYLES ====================

function injectStyles(): void {
  if (document.getElementById('clic-chat-styles')) return;

  const style = document.createElement('style');
  style.id = 'clic-chat-styles';
  style.textContent = `
    #clic-chat-container {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    #clic-chat-container[data-position="bottom-right"] {
      bottom: 20px;
      right: 20px;
    }
    #clic-chat-container[data-position="bottom-left"] {
      bottom: 20px;
      left: 20px;
    }

    /* Bubble */
    #clic-chat-bubble {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    #clic-chat-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }

    /* Unread badge */
    #clic-chat-unread {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #EF4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
    }

    /* Chat window */
    #clic-chat-window {
      position: absolute;
      bottom: 70px;
      width: 370px;
      height: 520px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #clic-chat-container[data-position="bottom-right"] #clic-chat-window {
      right: 0;
    }
    #clic-chat-container[data-position="bottom-left"] #clic-chat-window {
      left: 0;
    }

    /* Header */
    #clic-chat-header {
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    #clic-chat-title {
      font-size: 16px;
      font-weight: 600;
    }
    #clic-chat-subtitle {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 2px;
    }
    #clic-chat-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0 4px;
      opacity: 0.8;
      line-height: 1;
    }
    #clic-chat-close:hover {
      opacity: 1;
    }

    /* Name input */
    #clic-chat-name-area {
      padding: 8px 16px;
      border-bottom: 1px solid #E5E7EB;
      flex-shrink: 0;
    }
    #clic-chat-name-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
    #clic-chat-name-input:focus {
      border-color: #3B82F6;
    }

    /* Messages */
    #clic-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .clic-chat-greeting {
      text-align: center;
      color: #6B7280;
      font-size: 13px;
      padding: 8px 0 12px;
    }

    .clic-chat-offline {
      text-align: center;
      color: #DC2626;
      font-size: 13px;
      background: #FEF2F2;
      padding: 8px 12px;
      border-radius: 8px;
    }

    .clic-chat-msg {
      max-width: 80%;
      animation: clicChatFadeIn 0.2s ease;
    }
    .clic-chat-msg-visitor {
      align-self: flex-end;
    }
    .clic-chat-msg-agent {
      align-self: flex-start;
    }
    .clic-chat-msg-text {
      padding: 8px 14px;
      border-radius: 16px;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .clic-chat-msg-visitor .clic-chat-msg-text {
      background: #3B82F6;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .clic-chat-msg-agent .clic-chat-msg-text {
      background: #F3F4F6;
      color: #111827;
      border-bottom-left-radius: 4px;
    }
    .clic-chat-msg-meta {
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 3px;
      padding: 0 4px;
    }
    .clic-chat-msg-visitor .clic-chat-msg-meta {
      text-align: right;
    }

    /* Typing indicator */
    .clic-chat-typing-dots {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: #F3F4F6;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .clic-chat-typing-dots span {
      width: 7px;
      height: 7px;
      background: #9CA3AF;
      border-radius: 50%;
      animation: clicChatBounce 1.4s infinite ease-in-out both;
    }
    .clic-chat-typing-dots span:nth-child(1) { animation-delay: 0s; }
    .clic-chat-typing-dots span:nth-child(2) { animation-delay: 0.16s; }
    .clic-chat-typing-dots span:nth-child(3) { animation-delay: 0.32s; }

    /* Status bar */
    #clic-chat-status {
      background: #FEF3C7;
      color: #92400E;
      text-align: center;
      padding: 4px;
      font-size: 12px;
      flex-shrink: 0;
    }

    /* Input area */
    #clic-chat-input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #E5E7EB;
      gap: 8px;
      flex-shrink: 0;
    }
    #clic-chat-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #D1D5DB;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }
    #clic-chat-input:focus {
      border-color: #3B82F6;
    }
    #clic-chat-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3B82F6;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    #clic-chat-send:hover {
      background: #2563EB;
    }

    /* Animations */
    @keyframes clicChatFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes clicChatBounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      #clic-chat-window {
        width: calc(100vw - 24px);
        height: calc(100vh - 100px);
        bottom: 68px;
      }
      #clic-chat-container[data-position="bottom-right"] #clic-chat-window {
        right: -8px;
      }
      #clic-chat-container[data-position="bottom-left"] #clic-chat-window {
        left: -8px;
      }
    }
  `;

  document.head.appendChild(style);
}
