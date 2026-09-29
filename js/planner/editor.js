/**
 * 行程編輯模式：切換、欄位寫回 window.tripData、新增與刪除項目。
 *
 * 可編輯元素以 data-* 屬性描述對應的資料位置：
 * - data-edit-meta="guide" + data-guide-index    → metadata.guides[i]
 * - data-edit-meta="cover"                       → metadata (封面的 title / subtitle)
 * - data-edit-day + data-edit-index              → detail[day].timeline[i]
 * - 再加上 data-edit-sub-index                   → detail[day].timeline[i].subEvents[j] (子行程，一層)
 * - data-edit-day + data-edit-tip-index          → detail[day].tips[i]
 * - data-edit-day + data-edit-guide-index        → detail[day].guides[i]
 * - data-edit-day (無 index)                     → detail[day] (title / subtitle / region)
 * - data-edit-field                              → 欄位名稱
 */

const EDITABLE_ACTIVE_CLASSES = [
    'hover:bg-slate-100', 'transition-colors', 'rounded', 'cursor-text',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-emerald-500/50',
];
const EDIT_TOOLBAR_IDS = ['btn-add-timeline', 'btn-add-day', 'btn-add-tip'];

/**
 * 依目前編輯狀態，套用 contenteditable 與編輯專屬 UI 的顯示。
 * 每次重新渲染 DOM 後都需呼叫 (renderSharedCards / switchDay 已內建)。
 */
function applyEditModeState(root = document) {
    if (!root) return;
    const enabled = plannerState.isEditMode;

    root.querySelectorAll('.editable-element').forEach(el => {
        el.setAttribute('contenteditable', enabled ? 'true' : 'false');
        EDITABLE_ACTIVE_CLASSES.forEach(c => el.classList.toggle(c, enabled));
    });
    root.querySelectorAll('.edit-only-ui').forEach(el => el.classList.toggle('hidden', !enabled));
}

function setEditToolbarVisible(visible) {
    EDIT_TOOLBAR_IDS.forEach(id => toggleDisplay(document.getElementById(id), visible));
    toggleDisplay(document.getElementById('btn-save'), visible);
    toggleDisplay(document.getElementById('btn-export-json'), !visible);
}

function setEditButtonState(isEditing) {
    const btn = document.getElementById('btn-toggle-edit');
    if (!btn) return;

    btn.classList.toggle('bg-white/10', !isEditing);
    btn.classList.toggle('hover:bg-white/20', !isEditing);
    btn.classList.toggle('bg-rose-500', isEditing);
    btn.classList.toggle('hover:bg-rose-600', isEditing);
    btn.innerHTML = `
        <i data-lucide="${isEditing ? 'x-circle' : 'edit-3'}" class="w-4 h-4 shrink-0"></i>
        <span class="text-sm font-medium whitespace-nowrap">${isEditing ? '放棄變更' : '編輯模式'}</span>`;
    refreshIcons(btn);
}

/** 標記是否有未儲存的變更，並更新 Save 按鈕上的提示點 */
function setDirty(dirty) {
    plannerState.isDirty = dirty;
    toggleDisplay(document.getElementById('save-dirty-dot'), dirty, 'inline-block');
}

function markDirty() {
    if (plannerState.isEditMode && !plannerState.isDirty) setDirty(true);
}

function enterEditMode() {
    plannerState.isEditMode = true;
    setDirty(false);
    document.body.classList.add('edit-mode');
    setEditButtonState(true);
    setEditToolbarVisible(true);
    renderMetadataGuides();
    applyEditModeState();
}

function exitEditMode() {
    plannerState.isEditMode = false;
    setDirty(false);
    document.body.classList.remove('edit-mode');
    setEditButtonState(false);
    setEditToolbarVisible(false);
    applyEditModeState();
}

function toggleEditMode() {
    if (!plannerState.isEditMode) {
        enterEditMode();
        return;
    }
    if (!plannerState.isDirty) {
        exitEditMode();
        return;
    }
    if (confirm('確定要放棄剛才的所有修改嗎？')) {
        exitEditMode();
        // 從儲存來源重新載入，捨棄記憶體中的修改
        startApp();
    }
}

// ------------------------------------------
// 欄位寫回
// ------------------------------------------

/**
 * 找出可編輯元素對應的資料物件。
 * @returns {{obj: Object, field: string, kind: 'guide'|'meta'|'timeline'|'tip'|'dayGuide'|'day'}|null}
 */
function resolveEditTarget(el) {
    const { editDay, editIndex, editSubIndex, editTipIndex, editGuideIndex, guideIndex, editMeta, editField } = el.dataset;
    if (!editField || !window.tripData) return null;

    const wrap = (obj, kind) => (obj ? { obj, field: editField, kind } : null);

    if (editMeta === 'guide') {
        return wrap(window.tripData.metadata?.guides?.[guideIndex], 'guide');
    }
    if (editMeta === 'cover') {
        window.tripData.metadata = window.tripData.metadata || {};
        return wrap(window.tripData.metadata, 'meta');
    }

    const day = window.tripData.detail?.[editDay];
    if (!day) return null;

    if (editIndex !== undefined) {
        const item = day.timeline?.[editIndex];
        // 子行程的欄位與主行程相同，沿用 timeline 的寫回規則
        return wrap(editSubIndex !== undefined ? item?.subEvents?.[editSubIndex] : item, 'timeline');
    }
    if (editTipIndex !== undefined) return wrap(day.tips?.[editTipIndex], 'tip');
    if (editGuideIndex !== undefined) return wrap(day.guides?.[editGuideIndex], 'dayGuide');
    return wrap(day, 'day');
}

/** 將元素目前的值寫回 window.tripData */
function saveEditData(el) {
    const target = resolveEditTarget(el);
    if (!target) return;
    const { obj, field, kind } = target;

    const value = el.tagName === 'SELECT' ? el.value : el.innerText.trim();

    if (field === 'amount') {
        const amount = parseFloat(value) || 0;
        if ((obj.amount || 0) !== amount) markDirty();
        obj.amount = amount;
        return;
    }

    if (kind === 'day' && field === 'subtitle') {
        // 畫面上顯示的是去掉「宿：」的名稱；沒改動時保留原始資料
        if (stripHotelPrefix(obj.subtitle) === value) return;
        obj.subtitle = value;
        markDirty();
        syncNavText(el.dataset.editDay, field, value);
        return;
    }

    if (String(obj[field] ?? '').trim() !== value) markDirty();

    obj[field] = value;

    // 封面標題 / 副標題同時顯示在頁首
    if (kind === 'meta') renderPageHeader();
    if (kind === 'day') syncNavText(el.dataset.editDay, field, value);

    if (kind === 'timeline') {
        // 切換類型時移除自訂 icon，改用新類型的預設 icon
        if (field === 'type') delete obj.icon;
    }
}

/**
 * 左側天數選單第二行顯示主題指定的欄位 (trip：住宿、study：標題)。
 * 只更新文字、不重建按鈕，否則失焦當下點擊的天數按鈕會被替換掉而收不到 click。
 */
function syncNavText(dayId, field, value) {
    const theme = getCurrentTheme();
    if (field !== theme.navField) return;
    const navTxt = document.querySelector(`#nav-day-${dayId} .day-title-txt span`);
    if (navTxt) navTxt.textContent = value || theme.navFallback;
}

/**
 * desc 欄位顯示的是 Markdown 轉換後的 HTML；
 * 聚焦時換成原始 Markdown 文字供編輯，失焦時寫回並重新轉換。
 */
function handleEditableFocusIn(event) {
    const el = event.target.closest?.('.editable-element');
    if (!el || !plannerState.isEditMode || el.dataset.editField !== 'desc') return;

    const target = resolveEditTarget(el);
    if (!target) return;
    el.style.whiteSpace = 'pre-wrap';
    el.textContent = target.obj.desc || '';
}

function handleEditableFocusOut(event) {
    const el = event.target.closest?.('.editable-element');
    if (!el || !plannerState.isEditMode) return;

    saveEditData(el);

    if (el.dataset.editField === 'desc') {
        const target = resolveEditTarget(el);
        el.style.whiteSpace = '';
        el.innerHTML = parseMarkdownList(target ? target.obj.desc : '');
        refreshIcons(el);
    }
}

/** type 下拉選單變更：寫回資料並重新渲染對應區塊 */
function handleTypeChange(selectEl) {
    saveEditData(selectEl);

    if (selectEl.dataset.editMeta === 'guide') {
        renderMetadataGuides();
    } else {
        switchDay(getActiveDay());
    }
}

function handleTypeSelectChange(event) {
    if (event.target.matches('select[data-edit-field="type"]')) {
        handleTypeChange(event.target);
    }
}

// ------------------------------------------
// 新增項目
// ------------------------------------------

function getActiveDayData() {
    return window.tripData?.detail?.[getActiveDay()] || null;
}

function scrollToLastChild(containerId) {
    const container = document.getElementById(containerId);
    container?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function addGuideItem() {
    if (!window.tripData) return;
    window.tripData.metadata = window.tripData.metadata || {};
    window.tripData.metadata.guides = window.tripData.metadata.guides || [];
    window.tripData.metadata.guides.push({ type: 'none', title: '', desc: '' });
    markDirty();
    renderMetadataGuides();
    scrollToLastChild('detail-guides');
}

function addTimelineItem() {
    const day = getActiveDayData();
    if (!day) return;

    day.timeline = day.timeline || [];
    day.timeline.push({ time: '', title: '', desc: '', type: '', amount: 0 });
    markDirty();

    switchDay(getActiveDay());
    scrollToLastChild('detail-timeline');
}

function addTipItem() {
    const day = getActiveDayData();
    if (!day) return;

    day.tips = day.tips || [];
    day.tips.push({ type: 'info', title: '新增提示標題', desc: '點擊編輯提示內容...' });
    markDirty();

    switchDay(getActiveDay());
    scrollToLastChild('tips-container');
}

/** 在最後一天之後新增一天 (沒有任何天數時以今天為第一天) */
function addDayItem() {
    if (!window.tripData) return;
    window.tripData.detail = window.tripData.detail || {};

    const dayKeys = getSortedDayKeys(window.tripData.detail);
    let newDate = new Date();
    if (dayKeys.length > 0) {
        newDate = parseDateKey(dayKeys[dayKeys.length - 1]);
        newDate.setDate(newDate.getDate() + 1);
    }
    const newDateKey = formatDateKey(newDate);

    window.tripData.detail[newDateKey] = {
        title: '新的一天',
        region: '新地區',
        subtitle: '未定',
        tips: [],
        timeline: [],
    };
    markDirty();

    setActiveDay(newDateKey);
    render();
}

// ------------------------------------------
// 刪除項目
// ------------------------------------------

/** 依刪除按鈕的 data-* 屬性找出所在陣列與 index */
function resolveDeleteTarget(btn) {
    const { editDay, editIndex, editSubIndex, editTipIndex, editGuideIndex, guideIndex, editMeta } = btn.dataset;

    if (editMeta === 'guide') {
        return { list: window.tripData?.metadata?.guides, index: Number(guideIndex), kind: 'guide' };
    }
    const day = window.tripData?.detail?.[editDay];
    if (!day) return null;
    if (editIndex !== undefined && editSubIndex !== undefined) {
        return { list: day.timeline?.[editIndex]?.subEvents, index: Number(editSubIndex), kind: 'timeline' };
    }
    if (editIndex !== undefined) return { list: day.timeline, index: Number(editIndex), kind: 'timeline' };
    if (editTipIndex !== undefined) return { list: day.tips, index: Number(editTipIndex), kind: 'tip' };
    if (editGuideIndex !== undefined) return { list: day.guides, index: Number(editGuideIndex), kind: 'dayGuide' };
    return null;
}

/** 刪除時間軸 / Tip / Guide 卡片 */
function deleteListItem(btn) {
    const target = resolveDeleteTarget(btn);
    if (!target || !Array.isArray(target.list) || !target.list[target.index]) return;
    const { list, index, kind } = target;

    const item = list[index];
    const label = item.title || '(未命名)';
    const subCount = (item.subEvents || []).length;
    const extra = subCount ? `\n(包含 ${subCount} 個子行程)` : '';
    if (!confirm(`確定要刪除「${label}」嗎？${extra}`)) return;

    list.splice(index, 1);
    markDirty();

    if (kind === 'guide') {
        renderMetadataGuides();
        return;
    }
    switchDay(getActiveDay());
    if (kind === 'timeline') {
        // 時間軸金額會影響預算
        calculateTotalBudget();
        renderBudget();
    }
}

/** 在主行程底下新增一筆子行程 */
function addSubTimelineItem(btn) {
    const item = window.tripData?.detail?.[btn.dataset.editDay]?.timeline?.[btn.dataset.addSubIndex];
    if (!item) return;

    item.subEvents = item.subEvents || [];
    item.subEvents.push({ time: '', title: '', desc: '', type: '', amount: 0 });
    markDirty();
    switchDay(getActiveDay());
}

/** 時間軸 / 卡片上的刪除與「+ 子行程」按鈕 (事件委派) */
function handleDeleteClick(event) {
    if (!plannerState.isEditMode) return;
    const deleteBtn = event.target.closest?.('[data-delete-item]');
    if (deleteBtn) {
        event.preventDefault();
        deleteListItem(deleteBtn);
        return;
    }
    const addSubBtn = event.target.closest?.('[data-add-sub-index]');
    if (addSubBtn) {
        event.preventDefault();
        addSubTimelineItem(addSubBtn);
    }
}

/** 刪除目前選取的天數，之後切換到相鄰的天數 */
function deleteActiveDay() {
    const detail = window.tripData?.detail;
    const dayKey = getActiveDay();
    if (!plannerState.isEditMode || !detail || !detail[dayKey]) return;

    const dayKeys = getSortedDayKeys(detail);
    if (dayKeys.length <= 1) {
        alert('至少需要保留一天。');
        return;
    }

    const title = detail[dayKey].title || '';
    if (!confirm(`確定要刪除 ${dayKey} ${title} 整天的行程嗎？`)) return;

    const pos = dayKeys.indexOf(dayKey);
    const nextKey = dayKeys[pos + 1] || dayKeys[pos - 1];
    delete detail[dayKey];
    markDirty();

    setActiveDay(nextKey);
    render();
}

// ------------------------------------------
// 更改日期 (編輯模式點擊日曆 Icon)
// ------------------------------------------

/**
 * 將目前選取的天數搬到新日期 (即更換 detail 的 key)。
 * @param {string} newDateKey - "YYYY-MM-DD"
 */
function changeActiveDayDate(newDateKey) {
    const detail = window.tripData?.detail;
    const oldDateKey = getActiveDay();
    if (!detail || !detail[oldDateKey] || !newDateKey || newDateKey === oldDateKey) return;

    if (detail[newDateKey]) {
        alert(`${newDateKey} 已經有行程了，請選擇其他日期。`);
        return;
    }

    detail[newDateKey] = detail[oldDateKey];
    delete detail[oldDateKey];
    markDirty();

    setActiveDay(newDateKey);
    render();
}

/** 開啟原生日期選擇器；不支援 showPicker 的瀏覽器改用文字輸入 */
function openDayDatePicker() {
    const currentKey = getActiveDay();
    // 封面沒有日期可改；key 不是日期的主題 (study) 也不能改
    if (!plannerState.isEditMode || isCoverKey(currentKey) || getCurrentTheme().dayKeyFormat !== 'date') return;
    const input = document.getElementById('detail-date-input');

    if (input && typeof input.showPicker === 'function') {
        input.value = currentKey || '';
        try {
            input.showPicker();
            return;
        } catch (e) {
            console.warn('showPicker 失敗，改用文字輸入', e);
        }
    }

    const answer = prompt('請輸入新的日期 (YYYY-MM-DD)', currentKey || '');
    if (answer === null) return;
    const trimmed = answer.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(parseDateKey(trimmed).getTime())) {
        alert('日期格式不正確，請使用 YYYY-MM-DD。');
        return;
    }
    changeActiveDayDate(trimmed);
}

function handleDayDateInputChange(event) {
    changeActiveDayDate(event.target.value);
}

// ------------------------------------------
// 未儲存變更保護
// ------------------------------------------

/** 離開頁面前若有未儲存的變更，請瀏覽器跳出確認 */
function handleBeforeUnload(event) {
    if (!plannerState.isEditMode || !plannerState.isDirty) return;
    event.preventDefault();
    event.returnValue = '';
}

/** 編輯模式下 Cmd+S / Ctrl+S 直接儲存 */
function handleSaveShortcut(event) {
    if (!plannerState.isEditMode) return;
    if ((event.metaKey || event.ctrlKey) && (event.key || '').toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
    }
}
