(function() {
  // Prevent duplicate initialization
  if (window.AIChatbotWidgetLoaded) return;
  window.AIChatbotWidgetLoaded = true;

  const config = window.AIChatbotConfig || {};
  const businessId = config.businessId;
  const serverUrl = config.serverUrl || 'http://localhost:5000';

  if (!businessId) {
    console.error('AI Chatbot Widget: Missing businessId.');
    return;
  }

  // Fetch color theme first to set button color
  fetch(`${serverUrl}/api/widget/config?businessId=${businessId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.active) {
        console.warn('AI Chatbot Widget: Chatbot is disabled.');
        return;
      }
      initWidget(data);
    })
    .catch(err => {
      console.error('AI Chatbot Widget: Failed to load configuration.', err);
    });

  function initWidget(businessData) {
    const themeColor = businessData.color_theme || '#3b82f6';
    
    // Inject styles
    const styles = document.createElement('style');
    styles.innerHTML = `
      #ai-chat-widget-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .ai-chat-bubble-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${themeColor};
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border: none;
        outline: none;
      }
      .ai-chat-bubble-btn:hover {
        transform: scale(1.08) translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      }
      .ai-chat-bubble-btn svg {
        width: 28px;
        height: 28px;
        fill: none;
        stroke: white;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        transition: transform 0.3s ease;
      }
      .ai-chat-bubble-btn.open svg {
        transform: rotate(90deg);
      }
      .ai-chat-iframe-container {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 380px;
        height: 580px;
        max-height: calc(100vh - 120px);
        max-width: calc(100vw - 48px);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: white;
      }
      .ai-chat-iframe-container.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      @media (max-width: 480px) {
        #ai-chat-widget-container {
          bottom: 12px;
          right: 12px;
        }
        .ai-chat-iframe-container {
          width: calc(100vw - 24px);
          height: calc(100vh - 100px);
          max-height: 100%;
          max-width: 100%;
          bottom: 70px;
        }
      }
    `;
    document.head.appendChild(styles);

    // Create container elements
    const container = document.createElement('div');
    container.id = 'ai-chat-widget-container';

    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'ai-chat-iframe-container';

    const iframe = document.createElement('iframe');
    // Send background color and theme to iframe
    iframe.src = `${serverUrl}/widget-chat.html?businessId=${businessId}&serverUrl=${encodeURIComponent(serverUrl)}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('scrolling', 'no');

    iframeContainer.appendChild(iframe);

    const button = document.createElement('button');
    button.className = 'ai-chat-bubble-btn';
    button.innerHTML = `
      <svg class="chat-icon" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    container.appendChild(iframeContainer);
    container.appendChild(button);
    document.body.appendChild(container);

    let isOpen = false;

    // Toggle logic
    button.addEventListener('click', () => {
      isOpen = !isOpen;
      if (isOpen) {
        button.classList.add('open');
        iframeContainer.classList.add('open');
        button.innerHTML = `
          <svg class="close-icon" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        // Focus or ping iframe to let it know it is open
        iframe.contentWindow.postMessage({ type: 'widget-open' }, '*');
      } else {
        button.classList.remove('open');
        iframeContainer.classList.remove('open');
        button.innerHTML = `
          <svg class="chat-icon" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;
      }
    });

    // Listen for close commands inside iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'close-widget') {
        button.click();
      }
    });
  }
})();
