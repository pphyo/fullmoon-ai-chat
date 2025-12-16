const API_URL = "http://127.0.0.1:5000";

let currentSessionId = null;
let currentModelId = null;
let isNewChatActive = true;

const chatContainer = document.getElementById('chat-container');
const modelSelect = document.getElementById('model-select');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const historyList = document.getElementById('history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const welcomeScreen = document.getElementById('welcome-screen');
const modelIcon = document.getElementById('current-model-icon');

marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
        return hljs.highlightAuto(code).value;
    },
    breaks: true
});

document.addEventListener('DOMContentLoaded', () => {
    loadModels();
    loadSessions();
    updateNewChatButtonState();
    userInput.focus();
});

function updateNewChatButtonState() {
    newChatBtn.disabled = isNewChatActive;
    if(isNewChatActive) {
        newChatBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        newChatBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function getModelIconClass(modelId) {
    if (!modelId) return "ri-robot-line";

    const id = modelId.toLowerCase();

    if (id.includes('llama') || id.includes('meta')) {
        return "ri-meta-fill";
    } else if (id.includes('gemini') || id.includes('google')) {
        return "ri-gemini-fill";
    } else if (id.includes('openai') || id.includes('gpt')) {
        return "ri-openai-fill";
    } else if (id.includes('anthropic')) {
        return "ri-anthropic-fill";
    } else if (id.includes('deepseek')) {
        return "ri-deepseek-fill";
    }

    return "ri-ai-generate-3d-line";
}

function updateHeaderIcon() {
    const currentId = modelSelect.value;
    modelIcon.className = `${getModelIconClass(currentId)} text-lg text-white`;
}

async function loadModels() {
    try {
        const res = await fetch(`${API_URL}/models`);
        const models = await res.json();
        modelSelect.innerHTML = "";
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            modelSelect.appendChild(opt);
        });
        if(models.length > 0) {
            currentModelId = models[0].id;
            updateHeaderIcon();
        }
    } catch (e) { console.error(e); }
}

async function loadSessions() {
    try {
        const res = await fetch(`${API_URL}/sessions`);
        const sessions = await res.json();
        renderHistoryList(sessions);
    } catch (e) { console.error(e); }
}

function renderHistoryList(sessions) {
    historyList.innerHTML = "";
    sessions.forEach(session => {
        const div = document.createElement('div');
        div.className = "group relative flex items-center justify-between p-2 rounded-md hover:bg-[#202123] cursor-pointer transition text-sm mb-1";
        if(currentSessionId === session.id) div.classList.add('bg-[#202123]');

        let iconClass
        if (session.model.includes('google')) iconClass = "ri-gemini-fill";
        else if (session.model.includes('meta')) iconClass = "ri-meta-fill";
        else if (session.model.includes('openai')) iconClass = "ri-openai-fill";
        else if (session.model.includes('anthropic')) iconClass = "ri-anthropic-line";
        else if (session.model.includes('deepseek')) iconClass = "ri-deepseek-fill";
        else iconClass = "ri-ai-generate-3d-line";

        div.innerHTML = `
            <div class="flex items-center gap-2 overflow-hidden w-full">
                <i class="${iconClass} text-xs text-gray-500 shrink-0"></i>

                <div class="marquee-container text-gray-300 flex-1" id="title-${session.id}">
                    <span>${session.title}</span>
                </div>

                <input type="text" id="input-${session.id}" value="${session.title}"
                    class="hidden bg-[#2f2f2f] text-white text-xs px-1 py-0.5 rounded outline-none w-full border border-blue-500"
                    onclick="event.stopPropagation()">
            </div>

            <div class="action-buttons hidden absolute right-1 bg-[#202123] pl-2 gap-2 text-gray-400">
                <button onclick="enableEdit(event, '${session.id}')" class="hover:text-white"><i class="ri-pencil-line text-xs"></i></button>
                <button onclick="deleteSession(event, '${session.id}')" class="hover:text-red-500"><i class="ri-delete-bin-7-fill text-xs"></i></button>
            </div>
        `;

        div.onclick = (e) => {
            if(document.getElementById(`input-${session.id}`).classList.contains('hidden')) {
                loadChatHistory(session.id);
                document.querySelectorAll('#history-list > div').forEach(d => d.classList.remove('bg-[#202123]'));
                div.classList.add('bg-[#202123]');
            }
        };
        historyList.appendChild(div);
    });
}

function enableEdit(e, sessionId) {
    e.stopPropagation();

    const titleDiv = document.getElementById(`title-${sessionId}`);
    const input = document.getElementById(`input-${sessionId}`);
    const actions = e.currentTarget.parentElement;

    titleDiv.classList.add('hidden');
    input.classList.remove('hidden');
    actions.classList.add('hidden'); // Edit နေတုန်း button တွေ ဖျောက်ထားမယ်
    input.focus();

    input.onkeydown = async (ev) => {
        if(ev.key === 'Enter') {
            await saveTitle(sessionId, input.value);
        }
    };

    input.onblur = async () => {
        await saveTitle(sessionId, input.value);
    };
}

function initNewChat() {
    if (isNewChatActive) return;
    currentSessionId = null;
    isNewChatActive = true;
    updateNewChatButtonState();

    chatContainer.innerHTML = "";
    chatContainer.appendChild(welcomeScreen);
    welcomeScreen.style.display = "flex";
    userInput.focus();
    document.querySelectorAll('#history-list > div').forEach(d => d.classList.remove('bg-[#202123]'));
}

async function loadChatHistory(sessionId) {
    currentSessionId = sessionId;
    isNewChatActive = false;
    updateNewChatButtonState();

    welcomeScreen.style.display = "none";
    chatContainer.innerHTML = '<div class="text-center text-gray-500 mt-10">Loading chat...</div>';

    try {
        const res = await fetch(`${API_URL}/history/${sessionId}`);
        const messages = await res.json();
        chatContainer.innerHTML = "";
        messages.forEach(msg => appendMessage(msg.role, msg.content, false));
        scrollToBottom();
    } catch (e) { console.error(e); }
}

async function saveTitle(sessionId, newTitle) {
    if(!newTitle.trim()) return;

    try {
        await fetch(`${API_URL}/sessions/${sessionId}/title`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ title: newTitle })
        });
        loadSessions();
    } catch(e) { console.error(e); }
}

async function deleteSession(e, sessionId) {
    e.stopPropagation();
    if(!confirm("Delete this chat?")) return;

    try {
        await fetch(`${API_URL}/sessions/${sessionId}`, { method: "DELETE" });

        if(currentSessionId === sessionId) {
            initNewChat();
        }
        loadSessions();
    } catch(e) { console.error(e); }
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    welcomeScreen.style.display = "none";
    appendMessage('user', text, false);
    userInput.value = "";
    sendBtn.disabled = true;

    const loadingDiv = document.createElement('div');
    loadingDiv.className = "flex w-full mb-6 justify-start max-w-3xl mx-auto";

    const modelName = modelSelect.options[modelSelect.selectedIndex]?.text || "AI";

    loadingDiv.innerHTML = `
        <div class="flex items-center gap-3 text-gray-400 bg-[#2f2f2f]/50 px-4 py-2 rounded-full border border-gray-700/50">
            <div class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>

            <span class="text-xs font-medium tracking-wide">
                ${modelName} is thinking...
            </span>
        </div>
    `;
    chatContainer.appendChild(loadingDiv);
    scrollToBottom();

    try {
        if (!currentSessionId) {
            const startRes = await fetch(`${API_URL}/start_chat`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ model: currentModelId || modelSelect.value })
            });
            const startData = await startRes.json();
            currentSessionId = startData.session_id;
            isNewChatActive = false;
            updateNewChatButtonState();
        }

        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                session_id: currentSessionId,
                model: currentModelId || modelSelect.value,
                message: text
            })
        });
        const data = await res.json();

        chatContainer.removeChild(loadingDiv);
        appendMessage('assistant', data.reply, true);
        loadSessions();

    } catch (e) {
        loadingDiv.innerHTML = "<span class='text-red-500 pl-4'>Network Error.</span>";
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function appendMessage(role, text, animate = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-6 ${role === 'user' ? 'justify-end' : 'justify-start'} max-w-3xl mx-auto`;

    const contentDiv = document.createElement('div');
    if (role === 'user') {
        contentDiv.className = "bg-[#2f2f2f] text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm leading-6";
        contentDiv.textContent = text;
    } else {
        contentDiv.className = "text-gray-200 max-w-full text-sm leading-7 prose prose-invert";
    }

    wrapper.appendChild(contentDiv);
    chatContainer.appendChild(wrapper);

    if (role === 'assistant') {
        if (animate) {
            let i = 0;
            const speed = 50;
            function typeWriter() {
                if (i < text.length) {
                    const currentText = text.substring(0, i + 1);
                    contentDiv.innerHTML = marked.parse(currentText);
                    i += 2;
                    scrollToBottom();
                    setTimeout(typeWriter, speed);
                } else {
                    contentDiv.innerHTML = marked.parse(text);
                    hljs.highlightAll();
                    scrollToBottom();
                }
            }
            typeWriter();
        } else {
            contentDiv.innerHTML = marked.parse(text);
            hljs.highlightAll();
        }
    }
    scrollToBottom();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
modelSelect.addEventListener('change', (e) => {
    currentModelId = e.target.value;
    updateHeaderIcon();
    if (!isNewChatActive) initNewChat();
});
newChatBtn.addEventListener('click', initNewChat);