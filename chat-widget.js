/**
 * Chat Widget
 * A lightweight chat widget that can be embedded on any website
 * Features:
 * - Gemini AI integration
 * - Supabase for data storage
 * - Socket.IO for real-time updates
 * - Email-based user identification
 * - Conversation history
 * - User feedback analytics
 */

function initChatWidget(config) {
  // Default configuration with user overrides
  const widgetConfig = {
    geminiApiKey:
      config.geminiApiKey || "" ,
    supabaseUrl:
      config.supabaseUrl || "",
    supabaseKey:
      config.supabaseKey ||
      "",
    socketIoUrl: config.socketIoUrl || "http://localhost:3000",
    widgetTitle: config.widgetTitle || "Chat Assistant",
    widgetSubtitle: config.widgetSubtitle || "How can I help you today?",
    primaryColor: config.primaryColor || "#7857fe",
    position: config.position || "right", // 'right' or 'left'
  };

  // Load dependencies
  loadDependencies(() => {
    // Initialize Supabase client
    const supabase = supabaseInit(
      widgetConfig.supabaseUrl,
      widgetConfig.supabaseKey
    );

    // Initialize Socket.IO for live updates
    const socket = io(widgetConfig.socketIoUrl);

    // Create and inject the chat widget into the DOM
    createChatWidget(widgetConfig, supabase, socket);
  });
}

function loadDependencies(callback) {
  // Load Supabase JS
  const supabaseScript = document.createElement("script");
  supabaseScript.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  document.head.appendChild(supabaseScript);

  // Load Socket.IO
  const socketScript = document.createElement("script");
  socketScript.src = "https://cdn.socket.io/4.6.0/socket.io.min.js";
  document.head.appendChild(socketScript);

  // CSS Styles
  const styles = document.createElement("style");
  styles.textContent = getWidgetStyles();
  document.head.appendChild(styles);

  // Wait for scripts to load
  let loadedCount = 0;
  const checkLoaded = () => {
    loadedCount++;
    if (loadedCount === 2) callback();
  };

  // Add error handling for script loading
  supabaseScript.onerror = () => {
    console.error("Failed to load Supabase script");
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "ai-chat-widget-container";
    document.body.appendChild(widgetContainer);

    // Create a basic chat panel to show the error
    const chatPanel = document.createElement("div");
    chatPanel.className = "ai-chat-widget-panel active";
    chatPanel.innerHTML = `
      <div class="ai-chat-widget-header" style="background-color: #7857fe">
        <div class="ai-chat-widget-header-title">
          <h3>Chat Assistant</h3>
        </div>
      </div>
      <div class="ai-chat-widget-body">
        <div class="ai-chat-widget-messages">
          <div class="ai-chat-widget-message assistant">
            <div class="ai-chat-widget-message-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div class="ai-chat-widget-message-content">
              There is a connection issue. Please contact our team for assistance.
            </div>
          </div>
        </div>
      </div>
    `;
    widgetContainer.appendChild(chatPanel);
  };

  socketScript.onerror = () => {
    console.error("Failed to load Socket.IO script");
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "ai-chat-widget-container";
    document.body.appendChild(widgetContainer);

    // Create a basic chat panel to show the error
    const chatPanel = document.createElement("div");
    chatPanel.className = "ai-chat-widget-panel active";
    chatPanel.innerHTML = `
      <div class="ai-chat-widget-header" style="background-color: #7857fe">
        <div class="ai-chat-widget-header-title">
          <h3>Chat Assistant</h3>
        </div>
      </div>
      <div class="ai-chat-widget-body">
        <div class="ai-chat-widget-messages">
          <div class="ai-chat-widget-message assistant">
            <div class="ai-chat-widget-message-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div class="ai-chat-widget-message-content">
              There is a connection issue. Please contact our team for assistance.
            </div>
          </div>
        </div>
      </div>
    `;
    widgetContainer.appendChild(chatPanel);
  };

  supabaseScript.onload = checkLoaded;
  socketScript.onload = checkLoaded;
}

function supabaseInit(url, key) {
  return window.supabase.createClient(url, key);
}

function createChatWidget(config, supabase, socket) {
  // User data
  const userData = {
    email: null,
    sessionId: generateSessionId(),
    conversationId: null,
  };

  // Track widget state
  const widgetState = {
    isOpen: false,
    isTyping: false,
    windowWidth: window.innerWidth,
    isMobile: window.innerWidth < 768,
    is4K: window.innerWidth >= 2560,
  };

  // Create widget container
  const widgetContainer = document.createElement("div");
  widgetContainer.className = "ai-chat-widget-container";
  widgetContainer.dataset.position = config.position;
  document.body.appendChild(widgetContainer);

  // Create the widget toggle button
  const toggleButton = document.createElement("div");
  toggleButton.className = "ai-chat-widget-toggle";
  toggleButton.innerHTML = `
        <div class="ai-chat-widget-toggle-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        </div>
    `;
  toggleButton.style.backgroundColor = config.primaryColor;
  widgetContainer.appendChild(toggleButton);

  // Create the chat panel
  const chatPanel = document.createElement("div");
  chatPanel.className = "ai-chat-widget-panel";
  chatPanel.innerHTML = `
        <div class="ai-chat-widget-header" style="background-color: ${config.primaryColor}">
            <div class="ai-chat-widget-header-title">
                <h3>${config.widgetTitle}</h3>
                <p>${config.widgetSubtitle}</p>
            </div>
            <div class="ai-chat-widget-close">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>
        </div>
        <div class="ai-chat-widget-body">
            <div class="ai-chat-widget-messages"></div>
            <div class="ai-chat-widget-email-form">
                <div class="ai-chat-widget-email-header">
                    <h4>Enter your email to start chatting</h4>
                </div>
                <div class="ai-chat-widget-email-input-container">
                    <input type="email" placeholder="your.email@example.com" class="ai-chat-widget-email-input" required>
                    <button class="ai-chat-widget-email-submit" style="background-color: ${config.primaryColor}">Start</button>
                </div>
            </div>
            <div class="ai-chat-widget-input-container" style="display: none;">
                <textarea class="ai-chat-widget-input" placeholder="Type your message..." rows="1"></textarea>
                <button class="ai-chat-widget-send" style="background-color: ${config.primaryColor}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
            <div class="ai-chat-widget-feedback" style="display: none;">
                <p>Was this conversation helpful?</p>
                <div class="ai-chat-widget-feedback-buttons">
                    <button class="ai-chat-widget-feedback-yes" style="border-color: ${config.primaryColor}; color: ${config.primaryColor};">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        Yes
                    </button>
                    <button class="ai-chat-widget-feedback-no" style="border-color: ${config.primaryColor}; color: ${config.primaryColor};">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                        </svg>
                        No
                    </button>
                </div>
            </div>
        </div>
    `;
  widgetContainer.appendChild(chatPanel);

  // DOM elements
  const emailForm = chatPanel.querySelector(".ai-chat-widget-email-form");
  const emailInput = chatPanel.querySelector(".ai-chat-widget-email-input");
  const emailSubmit = chatPanel.querySelector(".ai-chat-widget-email-submit");
  const messageContainer = chatPanel.querySelector(".ai-chat-widget-messages");
  const inputContainer = chatPanel.querySelector(
    ".ai-chat-widget-input-container"
  );
  const messageInput = chatPanel.querySelector(".ai-chat-widget-input");
  const sendButton = chatPanel.querySelector(".ai-chat-widget-send");
  const feedbackContainer = chatPanel.querySelector(".ai-chat-widget-feedback");
  const feedbackYesButton = chatPanel.querySelector(
    ".ai-chat-widget-feedback-yes"
  );
  const feedbackNoButton = chatPanel.querySelector(
    ".ai-chat-widget-feedback-no"
  );

  // Event listeners
  toggleButton.addEventListener("click", toggleChatPanel);
  chatPanel
    .querySelector(".ai-chat-widget-close")
    .addEventListener("click", () => {
      toggleChatPanel();
      toggleButton.style.display = "flex"; // Ensure toggle button is visible when closing
    });

  // Email form submission with improved event handling
  emailSubmit.addEventListener("click", submitEmail);
  emailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitEmail();
    }
  });

  // Improved message input handling
  messageInput.addEventListener("input", autoResizeTextarea);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  messageInput.addEventListener("focus", function () {
    // On mobile, scroll to ensure the input is visible when focused
    if (widgetState.isMobile) {
      setTimeout(() => {
        this.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 300);
    }
  });

  sendButton.addEventListener("click", sendMessage);

  // Feedback buttons
  feedbackYesButton.addEventListener("click", () => {
    submitFeedback(true);
  });
  feedbackNoButton.addEventListener("click", () => {
    submitFeedback(false);
  });

  // Window resize event for responsive adjustments
  window.addEventListener("resize", handleWindowResize);

  // Handle orientation change for mobile devices
  window.addEventListener("orientationchange", handleOrientationChange);

  // Socket.IO event listeners
  socket.on("connect", () => {
    console.log("Socket.IO connected");
  });

  socket.on("message_response", (data) => {
    if (data.conversationId === userData.conversationId) {
      removeTypingIndicator();
      addMessage("assistant", data.message);
      saveChatMessage(data.message, "assistant");
      showFeedback();
    }
  });

  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
    removeTypingIndicator();
    addMessage(
      "assistant",
      "There is a connection issue. Please contact our team for assistance."
    );
  });

  socket.on("connect_timeout", () => {
    console.error("Socket.IO connection timeout");
    removeTypingIndicator();
    addMessage(
      "assistant",
      "There is a connection issue. Please contact our team for assistance."
    );
  });

  socket.on("error", (error) => {
    console.error("Socket.IO error:", error);
    removeTypingIndicator();
    addMessage(
      "assistant",
      "There is a connection issue. Please contact our team for assistance."
    );
  });

  // Functions
  function toggleChatPanel() {
    widgetState.isOpen = !widgetState.isOpen;

    if (widgetState.isOpen) {
      chatPanel.classList.add("active");
      document.body.classList.add("widget-open");
      toggleButton.style.display = "none"; // Hide toggle button when chat is open

      setTimeout(() => {
        if (userData.email) {
          messageInput.focus();
        } else {
          emailInput.focus();
        }

        if (messageContainer.children.length > 0) {
          scrollToBottom();
        }
      }, 300);
    } else {
      chatPanel.classList.remove("active");
      document.body.classList.remove("widget-open");
      toggleButton.style.display = "flex"; // Show toggle button when chat is closed
    }

    // Change toggle button icon when open/closed
    if (widgetState.isOpen) {
      toggleButton.querySelector(".ai-chat-widget-toggle-icon").innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    } else {
      toggleButton.querySelector(".ai-chat-widget-toggle-icon").innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    }
  }

  function submitEmail() {
    const email = emailInput.value.trim();
    if (isValidEmail(email)) {
      userData.email = email;

      emailForm.style.opacity = "0";
      setTimeout(() => {
        emailForm.style.display = "none";
        inputContainer.style.display = "flex";
        inputContainer.style.opacity = "0";

        setTimeout(() => {
          inputContainer.style.opacity = "1";

          checkExistingConversations(email);

          if (messageContainer.children.length === 0) {
            addMessage("assistant", "Hello! How can I help you today?");
          }

          messageInput.focus();
        }, 50);
      }, 300);
    } else {
      // Enhanced error feedback
      emailInput.classList.add("error");
      emailInput.focus();

      // Shake animation
      emailInput.style.animation = "none";
      setTimeout(() => {
        emailInput.style.animation = "shake 0.5s";
      }, 10);

      setTimeout(() => {
        emailInput.classList.remove("error");
      }, 3000);
    }
  }

  async function checkExistingConversations(email) {
    try {
      // Get existing conversations for this email
      const { data, error } = await supabase
        .from("conversations")
        .select("id, created_at")
        .eq("email", email)
        .order("created_at", { ascending: false });
      console.log("CEC 270", data);
      if (error) {
        console.error("Supabase error:", error);
        addMessage(
          "assistant",
          "There is a connection issue. Please contact our team for assistance."
        );
        throw error;
      }

      if (data && data.length > 0) {
        // Set current conversation ID
        userData.conversationId = data[0].id;

        // Load chat history
        loadChatHistory(userData.conversationId);
      } else {
        // Create new conversation
        createNewConversation(email);
      }
    } catch (error) {
      console.error("Error checking existing conversations:", error);
      createNewConversation(email);
    }
  }

  async function createNewConversation(email) {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert([{ email: email, session_id: userData.sessionId }])
        .select();
      console.log("CNC 295");
      if (error) {
        console.error("Supabase error:", error);
        addMessage(
          "assistant",
          "There is a connection issue. Please contact our team for assistance."
        );
        throw error;
      }

      if (data && data.length > 0) {
        userData.conversationId = data[0].id;

        // Save the welcome message
        saveChatMessage("Hello! How can I help you today?", "assistant");
      }
    } catch (error) {
      console.error("Error creating new conversation:", error);
      addMessage(
        "assistant",
        "There is a connection issue. Please contact our team for assistance."
      );
    }
  }

  async function loadChatHistory(conversationId) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      console.log("LCH 316");
      if (error) {
        console.error("Supabase error:", error);
        addMessage(
          "assistant",
          "There is a connection issue. Please contact our team for assistance."
        );
        throw error;
      }

      if (data && data.length > 0) {
        // Clear message container first
        messageContainer.innerHTML = "";

        // Add messages to UI
        data.forEach((msg) => {
          addMessage(msg.role, msg.content);
        });

        // Make sure to scroll to bottom after all history is loaded
        setTimeout(() => {
          messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 100); // Slightly longer timeout to ensure all content is rendered
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      addMessage(
        "assistant",
        "There is a connection issue. Please contact our team for assistance."
      );
    }
  }

  async function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
      messageInput.value = "";
      messageInput.style.height = "auto";
      messageInput.focus();

      addMessage("user", message);

      try {
        await saveChatMessage(message, "user");

        feedbackContainer.style.display = "none";

        socket.emit("message", {
          conversationId: userData.conversationId,
          sessionId: userData.sessionId,
          email: userData.email,
          message: message,
          geminiApiKey: config.geminiApiKey,
        });

        showTypingIndicator();

        // Set a timeout to detect if the response takes too long
        const responseTimeout = setTimeout(() => {
          removeTypingIndicator();
          addMessage(
            "assistant",
            "There is a connection issue. Please contact our team for assistance."
          );
        }, 30000); // 30 seconds timeout

        // Clear the timeout when a response is received
        socket.once("message_response", () => {
          clearTimeout(responseTimeout);
        });

        scrollToBottom();
      } catch (error) {
        console.error("Error sending message:", error);
        addMessage(
          "assistant",
          "There is a connection issue. Please contact our team for assistance."
        );
      }
    }
  }

  function showTypingIndicator() {
    const typingElement = document.createElement("div");
    typingElement.className = "ai-chat-widget-message assistant typing";
    typingElement.innerHTML = `
        <div class="ai-chat-widget-message-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
        </div>
        <div class="ai-chat-widget-message-content">
            <div class="ai-chat-widget-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    messageContainer.appendChild(typingElement);

    // Force scroll to bottom using setTimeout
    setTimeout(() => {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 0);

    // Remove typing indicator when a response is received
    socket.once("message_response", () => {
      const typingElements = document.querySelectorAll(
        ".ai-chat-widget-message.typing"
      );
      typingElements.forEach((el) => el.remove());
    });
  }

  function removeTypingIndicator() {
    const typingElements = document.querySelectorAll(
      ".ai-chat-widget-message.typing"
    );
    typingElements.forEach((el) => el.remove());
  }

  async function saveChatMessage(content, role) {
    try {
      const messageData = {
        conversation_id: userData.conversationId,
        content: content,
        role: role,
        session_id: userData.sessionId,
      };

      const { error } = await supabase.from("messages").insert([messageData]);
      console.log("SCM 407");
      if (error) {
        console.error("Supabase error:", error);
        if (role === "assistant") {
          // Don't show error for assistant messages as it would be redundant
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Error saving chat message:", error);
      return Promise.reject(error);
    }
  }

  function addMessage(role, content) {
    const messageElement = document.createElement("div");
    messageElement.className = `ai-chat-widget-message ${role}`;
    console.log("AM 419", role, content);
    const avatar =
      role === "assistant"
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>`;

    messageElement.innerHTML = `
        <div class="ai-chat-widget-message-avatar">
            ${avatar}
        </div>
        <div class="ai-chat-widget-message-content">
            ${formatMessage(content)}
        </div>
    `;

    messageContainer.appendChild(messageElement);

    // Force scroll to bottom using setTimeout to ensure it happens after rendering
    setTimeout(() => {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 0);
  }

  function formatMessage(content) {
    // Simple markdown-like formatting
    const formatted = content
      // Code blocks
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Line breaks
      .replace(/\n/g, "<br>");

    return formatted;
  }

  function showFeedback() {
    feedbackContainer.style.display = "block";
  }

  async function submitFeedback(isPositive) {
    try {
      const { error } = await supabase.from("feedback").insert([
        {
          conversation_id: userData.conversationId,
          is_positive: isPositive,
          session_id: userData.sessionId,
        },
      ]);
      console.log("SF 471");
      if (error) {
        console.error("Supabase error:", error);
        addMessage(
          "assistant",
          "There is a connection issue. Please contact our team for assistance."
        );
        throw error;
      }

      // Hide feedback after submission
      feedbackContainer.style.display = "none";

      // Show thank you message
      const thankYouMsg = document.createElement("div");
      thankYouMsg.className = "ai-chat-widget-feedback-thanks";
      thankYouMsg.textContent = "Thank you for your feedback!";
      feedbackContainer.parentNode.insertBefore(thankYouMsg, feedbackContainer);

      setTimeout(() => {
        thankYouMsg.remove();
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      addMessage(
        "assistant",
        "There is a connection issue. Please contact our team for assistance."
      );
    }
  }

  function isValidEmail(email) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  function generateSessionId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function autoResizeTextarea() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  }

  function scrollToBottom() {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  function handleWindowResize() {
    const newWidth = window.innerWidth;
    widgetState.windowWidth = newWidth;
    widgetState.isMobile = newWidth < 768;
    widgetState.is4K = newWidth >= 2560;

    // Adjust UI based on screen size
    adjustUIForScreenSize();
  }

  function handleOrientationChange() {
    setTimeout(() => {
      handleWindowResize();
    }, 300); // Delay to ensure orientation change is complete
  }

  function adjustUIForScreenSize() {
    // Adjust for 4K displays
    if (widgetState.is4K) {
      toggleButton.classList.add("large-display");
      chatPanel.classList.add("large-display");
    } else {
      toggleButton.classList.remove("large-display");
      chatPanel.classList.remove("large-display");
    }

    // Adjust for mobile
    if (widgetState.isMobile) {
      // Mobile-specific adjustments
      if (widgetState.isOpen) {
        document.body.classList.add("widget-open");
      }
    } else {
      document.body.classList.remove("widget-open");
    }
  }
}

function getWidgetStyles() {
  return `
        .ai-chat-widget-container {
            position: fixed;
            bottom: 20px;
            z-index: 9999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .ai-chat-widget-container[data-position="right"] {
            right: 20px;
        }
        
        .ai-chat-widget-container[data-position="left"] {
            left: 20px;
        }
        
        .ai-chat-widget-toggle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            position: relative;
            z-index: 10000;
        }
        
        .ai-chat-widget-toggle:hover {
            transform: scale(1.05);
        }
        
        .ai-chat-widget-toggle-icon {
            width: 24px;
            height: 24px;
            color: white;
        }
        
        .ai-chat-widget-panel {
            position: fixed;
            bottom: 10px;
            width: 350px;
            height: 500px;
            border-radius: 12px;
            background-color: #fff;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s ease;
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px);
            max-width: 95vw;
        }
        
        .ai-chat-widget-container[data-position="right"] .ai-chat-widget-panel {
            right: 20px;
        }
        
        .ai-chat-widget-container[data-position="left"] .ai-chat-widget-panel {
            left: 20px;
        }
        
        .ai-chat-widget-panel.active {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        
        .ai-chat-widget-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            flex-shrink: 0; /* Prevent header from shrinking */
        }
        
        .ai-chat-widget-header-title h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        
        .ai-chat-widget-header-title p {
            margin: 5px 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .ai-chat-widget-close {
            width: 20px;
            height: 20px;
            cursor: pointer;
            color: white;
        }
        
        .ai-chat-widget-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            background-color: #f8f9fa;
            height: calc(100% - 70px); /* Subtract header height */
            overflow: hidden; /* Prevent body from overflowing */
        }
        
        .ai-chat-widget-messages {
            flex: 1;
            padding: 15px;
            overflow-y: auto; /* Enable vertical scrolling */
            display: flex;
            flex-direction: column;
            gap: 15px;
            max-height: calc(100% - 50px); /* Account for potential feedback section */
            scroll-behavior: smooth; /* Smooth scrolling for better UX */
        }
        
        .ai-chat-widget-message {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            max-width: 85%;
        }
        
        .ai-chat-widget-message.user {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        
        .ai-chat-widget-message-avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            flex-shrink: 0;
        }
        
        .ai-chat-widget-message.assistant .ai-chat-widget-message-avatar {
            background-color: #e3f2fd;
            color: #1976d2;
        }
        
        .ai-chat-widget-message-content {
            padding: 10px 15px;
            border-radius: 18px;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word; /* Ensure text wraps properly */
        }
        
        .ai-chat-widget-message.user .ai-chat-widget-message-content {
            background-color: #e3f2fd;
        }
        
        .ai-chat-widget-email-form {
            padding: 20px;
            background-color: white;
            border-top: 1px solid #e9ecef;
            flex-shrink: 0; /* Prevent form from shrinking */
        }
        
        .ai-chat-widget-email-header {
            margin-bottom: 10px;
        }
        
        .ai-chat-widget-email-header h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: #343a40;
        }
        
        .ai-chat-widget-email-input-container {
            display: flex;
            gap: 10px;
        }
        
        .ai-chat-widget-email-input {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid #ced4da;
            border-radius: 5px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .ai-chat-widget-email-input:focus {
            border-color: #7857fe;
        }
        
        .ai-chat-widget-email-input.error {
            border-color: #dc3545;
            animation: shake 0.5s;
        }
        
        .ai-chat-widget-email-submit {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .ai-chat-widget-email-submit:hover {
            opacity: 0.9;
        }
        
        .ai-chat-widget-input-container {
            padding: 15px;
            background-color: white;
            border-top: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0; /* Prevent input container from shrinking */
        }
        
        .ai-chat-widget-input {
            flex: 1;
            padding: 10px 15px;
            border: 1px solid #ced4da;
            border-radius: 20px;
            font-size: 14px;
            resize: none;
            outline: none;
            transition: border-color 0.2s;
            max-height: 120px;
            overflow-y: auto;
        }
        
        .ai-chat-widget-input:focus {
            border-color: #7857fe;
        }
        
        .ai-chat-widget-send {
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .ai-chat-widget-send:hover {
            opacity: 0.9;
        }
        
        .ai-chat-widget-send svg {
            width: 18px;
            height: 18px;
        }
        
        .ai-chat-widget-typing-indicator {
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        .ai-chat-widget-typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #ced4da;
            animation: typing 1.4s infinite both;
        }
        
        .ai-chat-widget-typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .ai-chat-widget-typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        .ai-chat-widget-feedback {
            padding: 15px;
            background-color: white;
            border-top: 1px solid #e9ecef;
            text-align: center;
            flex-shrink: 0; /* Prevent feedback from shrinking */
        }
        
        .ai-chat-widget-feedback p {
            margin: 0 0 10px;
            font-size: 14px;
            color: #6c757d;
        }
        
        .ai-chat-widget-feedback-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
        }
        
        .ai-chat-widget-feedback-yes,
        .ai-chat-widget-feedback-no {
            padding: 8px 15px;
            background-color: transparent;
            border: 1px solid;
            border-radius: 20px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .ai-chat-widget-feedback-yes:hover,
        .ai-chat-widget-feedback-no:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        
        .ai-chat-widget-feedback-thanks {
            text-align: center;
            padding: 10px;
            font-size: 14px;
            color: #28a745;
            background-color: white;
            border-top: 1px solid #e9ecef;
        }
        
        /* Code formatting */
        .ai-chat-widget-message-content pre {
            background-color: #f1f3f5;
            padding: 10px;
            border-radius: 5px;
            margin: 5px 0;
            overflow-x: auto;
        }
        
        .ai-chat-widget-message-content code {
            font-family: monospace;
            font-size: 13px;
        }
        
        /* Animations */
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes typing {
            0% { transform: scale(0.5); opacity: 0.5; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.5); opacity: 0.5; }
        }
        
        /* Responsive styles for different screen sizes */
        @media (max-width: 768px) {
            .ai-chat-widget-container {
                bottom: 10px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
            }
            
            .ai-chat-widget-container[data-position="right"],
            .ai-chat-widget-container[data-position="left"] {
                left: 0;
                right: 0;
            }
            
            .ai-chat-widget-toggle {
                position: absolute;
                bottom: 10px;
                right: 10px;
                width: 50px;
                height: 50px;
            }
            
            .ai-chat-widget-panel {
                position: fixed;
                width: 90%; /* Changed from 100% to 90% */
                max-width: 400px; /* Added max-width */
                height: 70vh; /* Changed from 80vh to 70vh */
                max-height: 600px; /* Added max-height */
                bottom: 10px; /* Added margin from bottom */
                left: 50%;
                transform: translateY(100%) translateX(-50%); /* Center horizontally */
                border-radius: 20px;
                margin: 0 auto; /* Center the panel */
            }
            
            .ai-chat-widget-panel.active {
                transform: translateY(0) translateX(-50%); /* Keep horizontal centering when active */
            }
            
            .ai-chat-widget-container[data-position="right"] .ai-chat-widget-panel,
            .ai-chat-widget-container[data-position="left"] .ai-chat-widget-panel {
                left: 50%; /* Center for both positions */
                right: auto;
            }
            
            .ai-chat-widget-send {
                width: 46px;
                height: 46px;
            }
            
            .ai-chat-widget-input {
                font-size: 16px; /* Larger font size for mobile */
                padding: 12px 15px;
            }
            
            .ai-chat-widget-message {
                max-width: 90%;
            }
            
            .ai-chat-widget-header {
                border-radius: 20px 20px 0 0;
            }
        }

        @media (max-width: 480px) {
            .ai-chat-widget-panel {
                width: 95%; /* Slightly wider on very small screens */
                height: 70vh; /* Reduced height */
                max-height: 500px; /* Added max-height */
                bottom: 10px;
            }
            
            .ai-chat-widget-header-title h3 {
                font-size: 16px; 
            }
            
            .ai-chat-widget-header-title p {
                font-size: 13px;
            }
            
            .ai-chat-widget-message-content {
                font-size: 14px;
                padding: 8px 12px;
            }
            
            .ai-chat-widget-email-input-container {
                flex-direction: column;
                gap: 8px;
            }
            
            .ai-chat-widget-email-submit {
                width: 100%;
            }
            
            .ai-chat-widget-feedback-buttons {
                flex-direction: column;
                gap: 8px;
                align-items: center;
            }
        }
        
        /* Support for landscape mode on mobile */
        @media (max-height: 480px) and (orientation: landscape) {
            .ai-chat-widget-panel {
                height: 100vh;
                border-radius: 0;
            }
            
            .ai-chat-widget-header {
                padding: 10px;
                border-radius: 0;
            }
            
            .ai-chat-widget-messages {
                padding: 10px;
                gap: 10px;
            }
            
            .ai-chat-widget-input-container {
                padding: 10px;
            }
            
            .ai-chat-widget-email-form {
                padding: 10px;
            }
        }
        
        /* 4K and large screens */
        @media (min-width: 2560px) {
            .ai-chat-widget-container {
                bottom: 40px;
            }
            
            .ai-chat-widget-container[data-position="right"] {
                right: 40px;
            }
            
            .ai-chat-widget-container[data-position="left"] {
                left: 40px;
            }
            
            .ai-chat-widget-toggle.large-display {
                width: 80px;
                height: 80px;
            }
            
            .ai-chat-widget-toggle-icon {
                width: 32px;
                height: 32px;
            }
            
            .ai-chat-widget-panel.large-display {
                width: 500px;
                height: 700px;
                bottom: 100px;
                border-radius: 16px;
            }
            
            .ai-chat-widget-header {
                padding: 20px;
            }
            
            .ai-chat-widget-header-title h3 {
                font-size: 24px;
            }
            
            .ai-chat-widget-header-title p {
                font-size: 18px;
            }
            
            .ai-chat-widget-close {
                width: 24px;
                height: 24px;
            }
            
            .ai-chat-widget-message-avatar {
                width: 40px;
                height: 40px;
            }
            
            .ai-chat-widget-message-content {
                font-size: 18px;
                padding: 15px 20px;
                border-radius: 24px;
            }
            
            .ai-chat-widget-email-header h4 {
                font-size: 20px;
            }
            
            .ai-chat-widget-email-input {
                padding: 15px 20px;
                font-size: 18px;
            }
            
            .ai-chat-widget-email-submit {
                padding: 15px 25px;
                font-size: 18px;
            }
            
            .ai-chat-widget-input {
                padding: 15px 20px;
                font-size: 18px;
                border-radius: 30px;
            }
            
            .ai-chat-widget-send {
                width: 60px;
                height: 60px;
            }
            
            .ai-chat-widget-send svg {
                width: 24px;
                height: 24px;
            }
            
            .ai-chat-widget-feedback p {
                font-size: 18px;
            }
            
            .ai-chat-widget-feedback-yes,
            .ai-chat-widget-feedback-no {
                padding: 12px 20px;
                font-size: 18px;
            }
        }
        
        /* Fix for body scroll when widget is open on mobile */
        body.widget-open {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
        }
    `;
}

// Export the init function globally
window.initChatWidget = initChatWidget;
