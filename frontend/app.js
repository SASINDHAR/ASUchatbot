document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    // CONFIG
    const API_URL = 'https://asuchatbot-git-89934218088.europe-west1.run.app/chat';

    // STATE
    let sessionId = sessionStorage.getItem('asu_chat_session_id') || '';
    let isWaitingForResponse = false;

    // Enable/disable button
    messageInput.addEventListener('input', () => {
        sendButton.disabled = messageInput.value.trim() === '' || isWaitingForResponse;
    });

    // ✅ ADD MESSAGE FUNCTION (UPDATED)
    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (!isUser) {
            // ✅ CLEAN + SAFE MARKDOWN RENDER
            if (typeof marked !== 'undefined') {
                const cleanText = text
                    .replace(/\*\*/g, '')   // remove bold **
                    .replace(/\*/g, '')    // remove *
                    .replace(/###/g, '')   // remove headings
                    .replace(/---/g, '');  // remove lines

                contentDiv.innerHTML = marked.parse(cleanText);
            } else {
                contentDiv.textContent = text;
            }
        } else {
            contentDiv.textContent = text;
        }

        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);

        scrollToBottomSmooth();
    }

    // ✅ SMOOTH SCROLL
    function scrollToBottomSmooth() {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    function showTypingIndicator() {
        typingIndicator.classList.remove('hidden');
        scrollToBottomSmooth();
    }

    function hideTypingIndicator() {
        typingIndicator.classList.add('hidden');
    }

    // ✅ FORM SUBMIT
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = messageInput.value.trim();
        if (!message || isWaitingForResponse) return;

        // Show user message
        addMessage(message, true);

        // Reset input
        messageInput.value = '';
        sendButton.disabled = true;
        isWaitingForResponse = true;

        // Show typing
        showTypingIndicator();

        try {
            const payload = { message };
            if (sessionId) payload.session_id = sessionId;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();

            // Save session
            if (data.session_id) {
                sessionId = data.session_id;
                sessionStorage.setItem('asu_chat_session_id', sessionId);
            }

            // ✅ HANDLE EMPTY RESPONSE
            const replyText = data.reply || "⚠️ No response received.";
            addMessage(replyText, false);

        } catch (error) {
            console.error('Error:', error);
            addMessage("⚠️ Server error. Please try again later.", false);
        } finally {
            hideTypingIndicator();
            isWaitingForResponse = false;
            sendButton.disabled = messageInput.value.trim() === '';
            messageInput.focus();
        }
    });

    // Auto focus
    messageInput.focus();
});
