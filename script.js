// --- 1. 初始化 Quill 編輯器 ---
// 使用更適合手機的 Toolbar 配置
var quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: '開始撰寫精彩內容...',
    modules: {
        toolbar: [
            [{ 'header': [2, 3, false] }],
            ['bold', 'italic', 'underline', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ]
    }
});

const STORAGE_KEY_DRAFTS = 'writer_drafts_v2';
const STORAGE_KEY_CONFIG = 'writer_config';
let currentDraftId = null;

// --- 2. 核心邏輯：載入與儲存 ---

window.onload = function () {
    // 修正 iOS 高度問題
    document.body.style.height = window.innerHeight + 'px';
    window.addEventListener('resize', () => {
        document.body.style.height = window.innerHeight + 'px';
    });

    loadConfig();
    renderDraftList();

    const drafts = getDrafts();
    if (drafts.length > 0) {
        loadDraft(drafts[0].id);
    } else {
        createNewDraft();
    }
};

// --- 側邊欄開關控制 (新增功能) ---
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// 讀取所有草稿
function getDrafts() {
    const json = localStorage.getItem(STORAGE_KEY_DRAFTS);
    return json ? JSON.parse(json) : [];
}

// 渲染列表
function renderDraftList() {
    const listEl = document.getElementById('draft-list');
    const drafts = getDrafts();
    drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    listEl.innerHTML = '';
    drafts.forEach(draft => {
        const li = document.createElement('li');
        li.className = `draft-item ${draft.id === currentDraftId ? 'active' : ''}`;
        // 點擊列表項目後，在手機版要自動關閉側邊欄
        li.onclick = () => {
            loadDraft(draft.id);
            if (window.innerWidth <= 768) closeSidebar();
        };

        const titleText = draft.title || '(無標題)';
        const dateText = new Date(draft.updatedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        // 手機版刪除按鈕改為文字並放在下方
        const isMobile = window.innerWidth <= 768;
        const deleteBtnHtml = isMobile
            ? `<button class="delete-btn" onclick="deleteDraft(event, '${draft.id}')">刪除此草稿</button>`
            : `<button class="delete-btn" onclick="deleteDraft(event, '${draft.id}')">×</button>`;

        li.innerHTML = `
            <span class="draft-title">${titleText}</span>
            <span class="draft-date">${dateText}</span>
            ${deleteBtnHtml}
        `;
        listEl.appendChild(li);
    });
}

// 新增草稿
function createNewDraft() {
    currentDraftId = Date.now().toString();
    document.getElementById('post-title').value = '';
    document.getElementById('post-tags').value = '';
    document.getElementById('post-slug').value = '';
    document.getElementById('post-category').value = '';
    document.getElementById('post-image').value = '';
    quill.setContents([]);
    saveCurrentDraft(true);
    renderDraftList();
    document.getElementById('post-title').focus();
    if (window.innerWidth <= 768) closeSidebar(); // 手機版新增後關閉側邊欄
}

// 載入草稿
function loadDraft(id) {
    const drafts = getDrafts();
    const draft = drafts.find(d => d.id === id);
    if (draft) {
        currentDraftId = id;
        document.getElementById('post-title').value = draft.title || '';
        document.getElementById('post-tags').value = draft.tags || '';
        document.getElementById('post-slug').value = draft.slug || '';
        document.getElementById('post-category').value = draft.category || '';
        document.getElementById('post-image').value = draft.image || '';
        quill.root.innerHTML = draft.content || '';
        renderDraftList();
    }
}

// 儲存草稿
function saveCurrentDraft(silent = false) {
    if (!currentDraftId) return;
    const title = document.getElementById('post-title').value;
    const tags = document.getElementById('post-tags').value;
    const slug = document.getElementById('post-slug').value;
    const category = document.getElementById('post-category').value;
    const image = document.getElementById('post-image').value;
    const content = quill.root.innerHTML;

    let drafts = getDrafts();
    const index = drafts.findIndex(d => d.id === currentDraftId);

    // 保留原有的 publishTime (如果有)，否則設為現在 (針對新草稿)
    let publishTime = new Date().toISOString();
    if (index > -1 && drafts[index].publishTime) {
        publishTime = drafts[index].publishTime;
    }

    const draftData = {
        id: currentDraftId,
        title,
        tags,
        slug,
        category,
        image,
        content,
        publishTime,
        updatedAt: new Date().toISOString()
    };

    if (index > -1) { drafts[index] = draftData; } else { drafts.push(draftData); }
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
    renderDraftList();

    if (!silent) {
        const btn = document.querySelector('.btn-save');
        const originalText = btn.innerText;
        btn.innerText = '✅ 已儲存';
        setTimeout(() => btn.innerText = originalText, 1000);
    }
}

// 刪除草稿
function deleteDraft(event, id) {
    event.stopPropagation();
    if (confirm('確定要刪除這篇草稿嗎？')) {
        let drafts = getDrafts();
        drafts = drafts.filter(d => d.id !== id);
        localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
        if (currentDraftId === id) {
            drafts.length > 0 ? loadDraft(drafts[0].id) : createNewDraft();
        } else {
            renderDraftList();
        }
    }
}

// --- 3. 設定與發送 ---
function saveConfig() { localStorage.setItem(STORAGE_KEY_CONFIG, document.getElementById('gas-url').value); }
function loadConfig() {
    const url = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (url) document.getElementById('gas-url').value = url;
}

document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCurrentDraft(); }
});
quill.on('text-change', () => saveCurrentDraft(true));
document.getElementById('post-title').addEventListener('input', () => saveCurrentDraft(true));
document.getElementById('post-slug').addEventListener('input', () => saveCurrentDraft(true));
document.getElementById('post-category').addEventListener('input', () => saveCurrentDraft(true));
document.getElementById('post-image').addEventListener('input', () => saveCurrentDraft(true));
document.getElementById('post-tags').addEventListener('input', () => saveCurrentDraft(true));

function sendToSheet() {
    const url = document.getElementById('gas-url').value;
    const title = document.getElementById('post-title').value;
    const content = quill.root.innerHTML;
    const tags = document.getElementById('post-tags').value;
    const slug = document.getElementById('post-slug').value;
    const category = document.getElementById('post-category').value;
    const image = document.getElementById('post-image').value;

    // 找出當前草稿以取得 publishTime
    const drafts = getDrafts();
    const currentDraft = drafts.find(d => d.id === currentDraftId);
    const publish = currentDraft ? currentDraft.publishTime : new Date().toISOString();
    const update = new Date().toISOString();

    // 如果沒有 slug，使用 id
    const finalSlug = slug || currentDraftId;

    const statusDiv = document.getElementById('status');

    if (!url) { alert('請設定 Apps Script URL'); return; }
    if (!title) { alert('請填寫標題'); return; }
    saveCurrentDraft(true); // 發送前先存檔

    statusDiv.className = 'status-sending';
    statusDiv.innerText = '⏳ 發送中...';

    const payload = {
        id: currentDraftId,
        slug: finalSlug,
        title: title,
        tags: tags,
        category: category,
        image: image,
        content: content,
        publish: publish,
        update: update
    };

    fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(() => {
            statusDiv.className = 'status-success';
            statusDiv.innerText = '✅ 已發送請求！';
            setTimeout(() => { statusDiv.style.display = 'none'; }, 3000); // 3秒後隱藏提示
        })
        .catch(error => {
            statusDiv.className = '';
            statusDiv.innerText = '❌ 發送失敗';
        });
}
