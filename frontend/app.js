document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const resetSessionBtn = document.getElementById('reset-session');

    // State
    const API_URL = 'https://asuchatbot-git-89934218088.europe-west1.run.app/chat';
    let sessionId = sessionStorage.getItem('asu_chat_session_id') || '';
    let isWaitingForResponse = false;

    // Enable/disable send button based on input
    messageInput.addEventListener('input', () => {
        sendButton.disabled = messageInput.value.trim() === '' || isWaitingForResponse;
    });

    // Reset session
    resetSessionBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the conversation and start a new session?')) {
            sessionStorage.removeItem('asu_chat_session_id');
            sessionId = '';
            
            // Clear all messages except the welcome message
            const welcomeMsg = document.querySelector('.welcome-message').cloneNode(true);
            chatMessages.innerHTML = '';
            chatMessages.appendChild(welcomeMsg);
            
            // Add slight animation resetting
            welcomeMsg.style.animation = 'none';
            void welcomeMsg.offsetWidth; // trigger reflow
            welcomeMsg.style.animation = 'message-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        }
    });

    function formatTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Use marked to parse markdown if it's the assistant, otherwise escape HTML
        if (!isUser) {
            contentDiv.innerHTML = marked.parse(text);
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            contentDiv.appendChild(p);
        }

        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        timeSpan.textContent = formatTime();

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeSpan);
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        typingIndicator.classList.remove('hidden');
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.classList.add('hidden');
    }

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = messageInput.value.trim();
        if (!message || isWaitingForResponse) return;

        // 1. Display user message
        addMessage(message, true);
        
        // 2. Clear input and update state
        messageInput.value = '';
        sendButton.disabled = true;
        isWaitingForResponse = true;
        
        // 3. Show typing indicator
        showTypingIndicator();

        try {
            // 4. Send request to backend
            const payload = {
                message: message,
            };
            if (sessionId) {
                payload.session_id = sessionId;
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();

            // 5. Update session ID and display response
            if (data.session_id) {
                sessionId = data.session_id;
                sessionStorage.setItem('asu_chat_session_id', sessionId);
            }
            
            addMessage(data.reply, false);

        } catch (error) {
            console.error('Error communicating with backend:', error);
            addMessage('⚠️ Sorry, I encountered an error communicating with the server. Please ensure the backend is running.', false);
        } finally {
            // 6. Cleanup state
            hideTypingIndicator();
            isWaitingForResponse = false;
            // Re-evaluate button state in case user typed while waiting (though shouldn't happen due to overlay/disabled state)
            sendButton.disabled = messageInput.value.trim() === '';
            messageInput.focus();
        }
    });

    // Initial focus
    messageInput.focus();
});
