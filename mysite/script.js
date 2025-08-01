// ChatGPT Clone JavaScript
class ChatGPTClone {
    constructor() {
        this.apiKey = '';
        this.selectedModel = 'openai/gpt-3.5-turbo';
        this.maxTokens = 4000;
        this.currentSessionId = null;
        this.sessions = {};
        this.uploadedFiles = [];
        this.isLoading = false;
        this.availableModels = [];
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadSessions();
        this.bindEvents();
        this.createNewSession();
        this.updateUI();
        this.loadAvailableModels();
        this.loadCredits();
    }

    // Event binding
    bindEvents() {
        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('close-settings').addEventListener('click', () => this.hideSettings());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());

        // Credits
        document.getElementById('refresh-credits').addEventListener('click', () => this.loadCredits());

        // Sidebar
        document.getElementById('toggle-sidebar').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('new-chat-btn').addEventListener('click', () => this.createNewSession());

        // Message input
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('input', () => this.handleInputChange());
        messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());

        // File upload
        document.getElementById('file-upload-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e));

        // Modal events
        document.getElementById('close-error').addEventListener('click', () => this.hideError());
        document.getElementById('confirm-yes').addEventListener('click', () => this.confirmAction());
        document.getElementById('confirm-no').addEventListener('click', () => this.hideConfirm());

        // Click outside to close modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideError();
                this.hideConfirm();
            }
            if (e.target.classList.contains('settings-panel')) {
                this.hideSettings();
            }
        });

        // Responsive sidebar
        window.addEventListener('resize', () => this.handleResize());
    }

    // Settings management
    loadSettings() {
        const settings = localStorage.getItem('chatgpt-clone-settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            this.apiKey = parsed.apiKey || '';
            this.selectedModel = parsed.selectedModel || 'openai/gpt-3.5-turbo';
            this.maxTokens = parsed.maxTokens || 4000;
            
            document.getElementById('api-key').value = this.apiKey;
            document.getElementById('model-select').value = this.selectedModel;
            document.getElementById('max-tokens').value = this.maxTokens;
        }
    }

    saveSettings() {
        this.apiKey = document.getElementById('api-key').value.trim();
        this.selectedModel = document.getElementById('model-select').value;
        this.maxTokens = parseInt(document.getElementById('max-tokens').value) || 4000;

        const settings = {
            apiKey: this.apiKey,
            selectedModel: this.selectedModel,
            maxTokens: this.maxTokens
        };

        localStorage.setItem('chatgpt-clone-settings', JSON.stringify(settings));
        this.hideSettings();
        this.updateUI();
        this.loadCredits(); // Reload credits when settings are saved
        this.showMessage('Settings saved successfully!', 'success');
    }

    showSettings() {
        document.getElementById('settings-panel').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settings-panel').classList.add('hidden');
    }

    async loadAvailableModels() {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'ChatGPT Clone'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.availableModels = data.data || [];
            this.populateModelDropdown();

        } catch (error) {
            console.error('Failed to load models:', error);
            // Fallback to default models if API fails
            this.availableModels = [
                { id: 'openai/gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo' },
                { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
                { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
                { id: 'anthropic/claude-3-haiku', name: 'Anthropic Claude 3 Haiku' },
                { id: 'anthropic/claude-3-sonnet', name: 'Anthropic Claude 3 Sonnet' },
                { id: 'anthropic/claude-3-opus', name: 'Anthropic Claude 3 Opus' }
            ];
            this.populateModelDropdown();
            this.showMessage('Using fallback models. Check your internet connection.', 'warning');
        }
    }

    populateModelDropdown() {
        const modelSelect = document.getElementById('model-select');
        modelSelect.innerHTML = '';

        // Sort models alphabetically by name
        const sortedModels = this.availableModels.sort((a, b) => {
            const nameA = a.name || a.id;
            const nameB = b.name || b.id;
            return nameA.localeCompare(nameB);
        });

        sortedModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name || model.id;
            modelSelect.appendChild(option);
        });

        // Set the selected model if it exists in the list
        if (this.selectedModel) {
            modelSelect.value = this.selectedModel;
        }
    }

    async loadCredits() {
        if (!this.apiKey) {
            this.hideCreditsDisplay();
            return;
        }

        const refreshBtn = document.getElementById('refresh-credits');
        const creditsAmount = document.getElementById('credits-amount');
        
        try {
            refreshBtn.disabled = true;
            creditsAmount.textContent = 'Loading...';

            const response = await fetch('https://openrouter.ai/api/v1/credits', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'ChatGPT Clone'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.displayCredits(data);

        } catch (error) {
            console.error('Failed to load credits:', error);
            creditsAmount.textContent = 'Error';
            creditsAmount.className = 'credits-amount';
        } finally {
            refreshBtn.disabled = false;
        }
    }

    displayCredits(data) {
        const creditsDisplay = document.getElementById('credits-display');
        const creditsAmount = document.getElementById('credits-amount');
        
        if (data && typeof data.total_credits !== 'undefined' && typeof data.total_usage !== 'undefined') {
            const remaining = data.total_credits - data.total_usage;
            // Display as raw numerical value
            creditsAmount.textContent = remaining.toFixed(6);
            creditsAmount.className = 'credits-amount';
            creditsDisplay.classList.remove('hidden');
        } else {
            creditsAmount.textContent = 'N/A';
            creditsAmount.className = 'credits-amount';
            creditsDisplay.classList.remove('hidden');
        }
    }

    hideCreditsDisplay() {
        document.getElementById('credits-display').classList.add('hidden');
    }

    // Session management
    loadSessions() {
        const sessions = localStorage.getItem('chatgpt-clone-sessions');
        if (sessions) {
            this.sessions = JSON.parse(sessions);
        }
    }

    saveSessions() {
        localStorage.setItem('chatgpt-clone-sessions', JSON.stringify(this.sessions));
    }

    createNewSession() {
        const sessionId = 'session_' + Date.now();
        const session = {
            id: sessionId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString()
        };

        this.sessions[sessionId] = session;
        this.currentSessionId = sessionId;
        this.saveSessions();
        this.renderSessions();
        this.renderMessages();
        this.clearWelcomeMessage();
    }

    switchSession(sessionId) {
        if (this.sessions[sessionId]) {
            this.currentSessionId = sessionId;
            this.renderSessions();
            this.renderMessages();
        }
    }

    deleteSession(sessionId) {
        this.showConfirm(`Are you sure you want to delete this chat session?`, () => {
            delete this.sessions[sessionId];
            
            if (this.currentSessionId === sessionId) {
                const remainingSessions = Object.keys(this.sessions);
                if (remainingSessions.length > 0) {
                    this.currentSessionId = remainingSessions[0];
                } else {
                    this.createNewSession();
                    return;
                }
            }
            
            this.saveSessions();
            this.renderSessions();
            this.renderMessages();
        });
    }

    renderSessions() {
        const chatHistory = document.getElementById('chat-history');
        chatHistory.innerHTML = '';

        const sessionIds = Object.keys(this.sessions).sort((a, b) => {
            return new Date(this.sessions[b].createdAt) - new Date(this.sessions[a].createdAt);
        });

        sessionIds.forEach(sessionId => {
            const session = this.sessions[sessionId];
            const sessionElement = document.createElement('div');
            sessionElement.className = `chat-session ${sessionId === this.currentSessionId ? 'active' : ''}`;
            
            const preview = session.messages.length > 0 
                ? session.messages[0].content.substring(0, 50) + '...'
                : 'No messages yet';

            sessionElement.innerHTML = `
                <div class="chat-session-title">${session.title}</div>
                <div class="chat-session-preview">${preview}</div>
                <button class="chat-session-delete" onclick="event.stopPropagation(); chatApp.deleteSession('${sessionId}')">×</button>
            `;

            sessionElement.addEventListener('click', () => this.switchSession(sessionId));
            chatHistory.appendChild(sessionElement);
        });
    }

    // Message handling
    handleInputChange() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        
        // Enable/disable send button
        const hasText = input.value.trim().length > 0;
        const hasFiles = this.uploadedFiles.length > 0;
        sendBtn.disabled = !hasText && !hasFiles;
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    async sendMessage() {
        if (this.isLoading) return;

        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message && this.uploadedFiles.length === 0) return;
        if (!this.apiKey) {
            this.showError('Please configure your OpenRouter API key in settings.');
            return;
        }

        // Add user message
        const userMessage = {
            role: 'user',
            content: message,
            files: [...this.uploadedFiles],
            timestamp: new Date().toISOString()
        };

        this.addMessageToSession(userMessage);
        this.renderMessages();
        
        // Clear input and files
        input.value = '';
        this.uploadedFiles = [];
        this.renderUploadedFiles();
        this.handleInputChange();

        // Update session title if it's the first message
        if (this.sessions[this.currentSessionId].messages.length === 1) {
            this.sessions[this.currentSessionId].title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            this.renderSessions();
        }

        // Send to API
        await this.sendToAPI();
    }

    addMessageToSession(message) {
        if (!this.sessions[this.currentSessionId]) {
            this.createNewSession();
        }
        this.sessions[this.currentSessionId].messages.push(message);
        this.saveSessions();
    }

    async sendToAPI() {
        this.showLoading();

        try {
            const session = this.sessions[this.currentSessionId];
            const messages = this.prepareMessagesForAPI(session.messages);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'ChatGPT Clone'
                },
                body: JSON.stringify({
                    model: this.selectedModel,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: this.maxTokens,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const assistantMessage = {
                    role: 'assistant',
                    content: data.choices[0].message.content,
                    timestamp: new Date().toISOString()
                };

                this.addMessageToSession(assistantMessage);
                this.renderMessages();
            } else {
                throw new Error('Invalid response format from API');
            }

        } catch (error) {
            console.error('API Error:', error);
            this.showError(`Failed to send message: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    prepareMessagesForAPI(messages) {
        return messages.map(msg => {
            const apiMessage = {
                role: msg.role,
                content: msg.content
            };

            // Handle file attachments for vision models
            if (msg.files && msg.files.length > 0 && this.isVisionModel()) {
                const content = [];
                
                if (msg.content) {
                    content.push({
                        type: 'text',
                        text: msg.content
                    });
                }

                msg.files.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        content.push({
                            type: 'image_url',
                            image_url: {
                                url: file.dataUrl
                            }
                        });
                    }
                });

                apiMessage.content = content;
            }

            return apiMessage;
        });
    }

    isVisionModel() {
        const visionModels = ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3-opus', 'anthropic/claude-3-sonnet', 'anthropic/claude-3-haiku'];
        return visionModels.includes(this.selectedModel);
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages');
        const session = this.sessions[this.currentSessionId];
        
        if (!session || session.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to ChatGPT Clone</h2>
                    <p>To get started:</p>
                    <ol>
                        <li>Click the settings button (⚙️) to configure your API key and model</li>
                        <li>Enter your OpenRouter API key</li>
                        <li>Select an AI model</li>
                        <li>Start chatting!</li>
                    </ol>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = '';

        session.messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = 'message';

            const avatar = document.createElement('div');
            avatar.className = `message-avatar ${message.role === 'user' ? 'user-avatar' : 'assistant-avatar'}`;
            avatar.textContent = message.role === 'user' ? 'U' : 'AI';

            const content = document.createElement('div');
            content.className = 'message-content';

            // Render files if any
            if (message.files && message.files.length > 0) {
                const filesDiv = document.createElement('div');
                filesDiv.className = 'message-files';
                
                message.files.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        const img = document.createElement('img');
                        img.src = file.dataUrl;
                        img.className = 'message-image';
                        img.alt = file.name;
                        img.addEventListener('click', () => this.showImageModal(file.dataUrl));
                        filesDiv.appendChild(img);
                    } else {
                        const fileDiv = document.createElement('div');
                        fileDiv.className = 'message-file';
                        fileDiv.textContent = `📎 ${file.name}`;
                        filesDiv.appendChild(fileDiv);
                    }
                });
                
                content.appendChild(filesDiv);
            }

            // Render message text
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.innerHTML = this.formatMessage(message.content);
            content.appendChild(textDiv);

            messageElement.appendChild(avatar);
            messageElement.appendChild(content);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        setTimeout(() => {
            const chatContainer = document.getElementById('chat-container');
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    }

    formatMessage(content) {
        // Basic markdown-like formatting
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        // Handle code blocks
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        return formatted;
    }

    clearWelcomeMessage() {
        const messagesContainer = document.getElementById('messages');
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            messagesContainer.innerHTML = '';
        }
    }

    // File handling
    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                this.showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: e.target.result
                };
                
                this.uploadedFiles.push(fileData);
                this.renderUploadedFiles();
                this.handleInputChange();
            };
            
            reader.readAsDataURL(file);
        });

        // Clear the input
        event.target.value = '';
    }

    renderUploadedFiles() {
        const container = document.getElementById('uploaded-files');
        container.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'uploaded-file';
            
            const icon = file.type.startsWith('image/') ? '🖼️' : '📎';
            fileElement.innerHTML = `
                ${icon} ${file.name}
                <button class="uploaded-file-remove" onclick="chatApp.removeFile(${index})">×</button>
            `;
            
            container.appendChild(fileElement);
        });
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.renderUploadedFiles();
        this.handleInputChange();
    }

    // UI helpers
    showLoading() {
        this.isLoading = true;
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    hideLoading() {
        this.isLoading = false;
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error-modal').classList.add('hidden');
    }

    showConfirm(message, callback) {
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-modal').classList.remove('hidden');
        this.confirmCallback = callback;
    }

    hideConfirm() {
        document.getElementById('confirm-modal').classList.add('hidden');
        this.confirmCallback = null;
    }

    confirmAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
        this.hideConfirm();
    }

    showMessage(message, type = 'info') {
        // Simple toast-like notification
        const toast = document.createElement('div');
        let backgroundColor;
        switch(type) {
            case 'success':
                backgroundColor = '#10a37f';
                break;
            case 'warning':
                backgroundColor = '#f59e0b';
                break;
            case 'error':
                backgroundColor = '#dc3545';
                break;
            default:
                backgroundColor = '#6b7280';
        }
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 5000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    showImageModal(src) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
                <img src="${src}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
                <button class="modal-btn" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    }

    handleResize() {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    }

    updateUI() {
        const hasApiKey = this.apiKey.length > 0;
        const sendBtn = document.getElementById('send-btn');
        
        if (!hasApiKey) {
            sendBtn.disabled = true;
            sendBtn.title = 'Please configure your API key in settings';
        } else {
            this.handleInputChange();
        }
    }
}

// CSS animations for toast notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the app
let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatGPTClone();
});

// Make chatApp globally accessible for onclick handlers
window.chatApp = chatApp;

