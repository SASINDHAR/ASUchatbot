document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    // State
    const API_URL = 'https://asuchatbot-git-89934218088.europe-west1.run.app/chat';
    let sessionId = sessionStorage.getItem('asu_chat_session_id') || '';
    let isWaitingForResponse = false;

    // Enable/disable send button based on input
    messageInput.addEventListener('input', () => {
        sendButton.disabled = messageInput.value.trim() === '' || isWaitingForResponse;
    });

    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Use marked to parse markdown if it's the assistant, otherwise escape HTML
        if (!isUser && typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(text);
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            contentDiv.appendChild(p);
        }

        messageDiv.appendChild(contentDiv);
        
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
            sendButton.disabled = messageInput.value.trim() === '';
            messageInput.focus();
        }
    });

    // Initial focus
    messageInput.focus();
});
