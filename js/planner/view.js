/**
 * 行程頁面渲染：頁首、左側天數選單、每日內容 (時間軸 / Tips / Guides)。
 */

const plannerState = {
    isEditMode: false,
    /** 編輯模式中是否有尚未儲存的變更 */
    isDirty: false,
};

const DAY_BUTTON_BASE_CLASS = 'snap-start flex-shrink-0 flex items-center lg:w-full space-x-3 px-4 py-3 rounded-xl border text-left transition-all duration-300';

/**
 * 左側選單中「封面」的 key。封面把 metadata 當成一個特殊的天數，
 * 同樣經由 switchDay() 顯示 (標題 = metadata.title、副標題 = metadata.subtitle、guides = metadata.guides)。
 * 不是日期格式，所以不會與 detail 的 key 衝突。
 */
const COVER_KEY = 'cover';

function isCoverKey(dayId) {
    return dayId === COVER_KEY;
}

/** 左側選單所有項目的 key：封面 + 依日期排序的天數 */
function getNavKeys() {
    return [COVER_KEY, ...getSortedDayKeys(window.tripData?.detail)];
}

/** 把 metadata 包裝成 switchDay() 使用的天數資料格式 (guides 直接引用原陣列) */
function getCoverViewData() {
    const metadata = window.tripData?.metadata || {};
    return {
        title: metadata.title,
        subtitle: metadata.subtitle,
        guides: metadata.guides || [],
        tips: [],
        timeline: [],
    };
}

/** 封面 guides 卡片的 data-* 屬性 */
const buildCoverGuideAttrs = index => `data-edit-meta="guide" data-guide-index="${index}"`;

function getActiveDay() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_DAY);
}

function setActiveDay(dayId) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DAY, dayId);
}

/** 產生 type 下拉選單的 <option> */
function buildTypeOptions(selectedType, formatLabel = t => t) {
    return Object.keys(TYPE_CONFIG)
        .map(t => `<option value="${t}" ${t === selectedType ? 'selected' : ''}>${formatLabel(t)}</option>`)
        .join('');
}

/**
 * 編輯模式專用的刪除按鈕 (點擊由 editor.js 的 handleDeleteClick 事件委派處理)。
 * @param {string} attrs - 與可編輯欄位相同的 data-edit-* 屬性，用來找出要刪除的資料
 * @param {string} positionClass - 絕對定位位置
 */
function buildDeleteButtonHtml(attrs, positionClass) {
    return `
        <button type="button" class="edit-only-ui hidden absolute ${positionClass} z-20 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            ${attrs} data-delete-item title="刪除" aria-label="刪除">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>`;
}

/**
 * 渲染可編輯的卡片列表 (Tips / Guides 共用)。
 * @param {string} containerId
 * @param {Array} items
 * @param {function(number): string} buildDataAttributes - 依 index 產生 data-edit-* 屬性字串
 */
function renderSharedCards(containerId, items, buildDataAttributes) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '';
        return;
    }

    const capitalize = t => t.charAt(0).toUpperCase() + t.slice(1);

    container.innerHTML = items.map((item, index) => {
        const type = item.type || 'none';
        const style = (plannerState.isEditMode && isInvisibleType(type))
            ? getTypeConfig('none')
            : getTypeConfig(type);
        const iconName = item.icon || style.defaultIcon || 'info';
        const attrs = buildDataAttributes(index);

        return `
            <div class="rounded-xl p-2 border relative group print:bg-transparent ${style.box}">
                ${buildDeleteButtonHtml(attrs, 'top-1 right-1')}
                <div class="flex items-start gap-2 mb-2">
                    ${renderIcon(iconName, `w-5 h-5 ${style.icon} shrink-0 mt-0.5`)}
                    <h3 class="ui-title ${style.title || ''} editable-element w-full edit-pad-right"
                        ${attrs}
                        data-edit-field="title"
                        data-placeholder="新增標題">${item.title || ''}</h3>
                </div>

                <div class="edit-only-ui flex items-center gap-2 mb-2 text-xs text-slate-500 hidden">
                    <i data-lucide="tag" class="w-3 h-3"></i>
                    <select class="bg-transparent border-b border-slate-300 focus:outline-none focus:border-emerald-500 pb-0.5 cursor-pointer"
                        ${attrs}
                        data-edit-field="type">
                        ${buildTypeOptions(normalizeType(type), capitalize)}
                    </select>
                </div>

                <div class="ui-desc editable-element text-sm text-slate-600 mt-0"
                     ${attrs}
                     data-edit-field="desc"
                     data-placeholder="新增詳細內容...">${parseMarkdownList(item.desc || '')}</div>
            </div>
        `;
    }).join('');

    refreshIcons(container);
    applyEditModeState(container);
}

/** 重新渲染封面 guides (只有目前選取封面時才需要) */
function renderMetadataGuides() {
    if (!isCoverKey(getActiveDay())) return;
    renderSharedCards('detail-guides', window.tripData?.metadata?.guides || [], buildCoverGuideAttrs);
}

function updateDayNavSelection(dayId) {
    const theme = getCurrentTheme();

    getNavKeys().forEach(key => {
        const btn = document.getElementById(`nav-day-${key}`);
        if (!btn) return;
        const badge = btn.querySelector('.day-badge');
        const dateTxt = btn.querySelector('.day-date-txt');
        const titleTxt = btn.querySelector('.day-title-txt');

        if (key === dayId) {
            btn.className = `${DAY_BUTTON_BASE_CLASS} font-bold ${theme.selectedDay}`;
            badge.className = `day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${theme.selectedBadge}`;
            if (dateTxt) dateTxt.className = 'day-date-txt font-bold text-xs truncate text-white';
            if (titleTxt) titleTxt.className = 'day-title-txt text-[10px] text-white/95 truncate mt-0.5 font-medium flex items-center gap-1';
        } else {
            btn.className = `${DAY_BUTTON_BASE_CLASS} border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 text-slate-700`;
            badge.className = 'day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs bg-slate-100 text-slate-500';
            if (dateTxt) dateTxt.className = 'day-date-txt font-bold text-xs truncate text-slate-800';
            if (titleTxt) titleTxt.className = 'day-title-txt text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1';
        }
    });
}

/** 住宿名稱去掉開頭的「宿：」(畫面上已有床的 icon) */
function stripHotelPrefix(subtitle) {
    return (subtitle || '').replace(/^宿[\s:：]*/, '');
}

/** 將靜態元素標記為可編輯的每日欄位 (封面則對應 metadata) */
function markDayField(el, dayId, field) {
    el.classList.add('editable-element');
    if (isCoverKey(dayId)) {
        delete el.dataset.editDay;
        el.dataset.editMeta = 'cover';
    } else {
        el.dataset.editDay = dayId;
        delete el.dataset.editMeta;
    }
    el.dataset.editField = field;
}

/** 封面在日曆位置顯示的 Icon */
function generateCoverIconHtml() {
    return `
    <div class="w-[72px] h-[72px] shrink-0 mt-2 rounded-xl border-[2.5px] border-slate-800 bg-white flex items-center justify-center shadow-sm">
        <i data-lucide="book-open" class="w-8 h-8 text-slate-800"></i>
    </div>`;
}

function renderDayHeader(dayId, data) {
    const theme = getCurrentTheme();

    const calendarContainer = document.getElementById('detail-calendar-icon-container');
    const isCover = isCoverKey(dayId);
    if (calendarContainer) {
        calendarContainer.innerHTML = isCover ? generateCoverIconHtml() : generateCalendarIconHtml(getDayDisplayInfo(dayId));
    }

    const detailTitle = document.getElementById('detail-title');
    if (detailTitle) {
        detailTitle.textContent = data.title || '';
        markDayField(detailTitle, dayId, 'title');
    }

    // 住宿與地區：沒有資料時隱藏，但編輯模式仍會顯示 (CSS .edit-reveal) 以便新增
    const subtitleContainer = document.getElementById('detail-subtitle-container');
    const subtitleIcon = document.getElementById('detail-subtitle-icon');
    const subtitleTxt = document.getElementById('detail-subtitle-txt');
    // 封面的副標題原樣顯示；天數的住宿去掉「宿：」
    const subtitle = isCover ? (data.subtitle || '') : stripHotelPrefix(data.subtitle);
    if (subtitleContainer) subtitleContainer.classList.toggle('hidden', !subtitle);
    if (subtitleIcon) subtitleIcon.innerHTML = `<i data-lucide="${theme.subtitleIcon}" class="w-4 h-4 text-slate-400 shrink-0"></i>`;
    if (subtitleTxt) {
        subtitleTxt.textContent = subtitle;
        subtitleTxt.dataset.placeholder = isCover ? '新增副標題' : theme.subtitlePlaceholder;
        markDayField(subtitleTxt, dayId, 'subtitle');
    }

    const regionContainer = document.getElementById('detail-region-container');
    const region = document.getElementById('detail-region');
    const regionTxt = document.getElementById('detail-region-txt');
    if (regionContainer) regionContainer.classList.toggle('hidden', !data.region);
    if (region) region.className = `inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md transition-colors duration-300 ${theme.detailBadge}`;
    if (regionTxt) {
        regionTxt.textContent = data.region || '';
        markDayField(regionTxt, dayId, 'region');
    }
}

/**
 * 單筆時間軸項目 (網頁版)。子行程 (subEvents) 只支援一層。
 * @param {string} dayId
 * @param {Object} item
 * @param {number} index - 在 timeline 中的位置
 * @param {number} [subIndex] - 子行程在 subEvents 中的位置 (主行程為 undefined)
 */
function renderTimelineItemHtml(dayId, item, index, subIndex) {
    const theme = getCurrentTheme();
    const isSub = subIndex !== undefined;
    const attrs = `data-edit-day="${dayId}" data-edit-index="${index}"${isSub ? ` data-edit-sub-index="${subIndex}"` : ''}`;
    const typeVal = normalizeType(item.type || 'none');
    const iconId = isSub ? `${dayId}-${index}-${subIndex}` : `${dayId}-${index}`;

    // 子行程：較小的圓點與縮排
    const wrapperClass = isSub ? 'relative pl-6' : 'relative pl-8 transition-all duration-300 hover:translate-x-0.5';
    const dotClass = isSub
        ? 'absolute -left-2.5 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-sm z-10'
        : 'absolute -left-3 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-transform duration-300 hover:scale-110';

    const subEvents = isSub ? [] : (item.subEvents || []);
    const subHtml = isSub ? '' : `
                ${subEvents.length ? `
                <div class="relative mt-3 ml-1 border-l border-slate-200 space-y-3">
                    ${subEvents.map((sub, i) => renderTimelineItemHtml(dayId, sub, index, i)).join('')}
                </div>` : ''}
                <button type="button" class="edit-only-ui hidden mt-2 inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors"
                    data-edit-day="${dayId}" data-add-sub-index="${index}">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                    <span>子行程</span>
                </button>`;

    return `
        <div class="${wrapperClass}">
            ${buildDeleteButtonHtml(attrs, 'top-0 right-0')}
            <div id="timeline-icon-${iconId}" class="${dotClass} ${getEventBg(item.type)}">
                ${getEventIcon(item.type, item.icon, isSub ? 'w-3 h-3' : 'w-4 h-4')}
            </div>
            <div class="edit-pad-right ${getTypeConfig(item.type).frame || ''}">
                <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1">
                    <span class="whitespace-nowrap ui-title font-black tracking-widest px-2 py-0.5 rounded-md w-max ${theme.timelineTime} editable-element" ${attrs} data-edit-field="time" data-placeholder="新增時間">${item.time || ''}</span>
                    <h3 class="ui-title text-slate-800 editable-element" ${attrs} data-edit-field="title" data-placeholder="新增標題">${item.title || ''}</h3>
                </div>

                <!-- 編輯模式專屬：Type 下拉與金額 -->
                <div class="flex flex-wrap gap-4 mt-2">
                    <div class="edit-only-ui hidden flex items-center gap-2 text-xs text-slate-500">
                        <i data-lucide="tag" class="w-3 h-3 shrink-0"></i>
                        <select class="bg-transparent border-b border-slate-300 focus:outline-none focus:border-emerald-500 pb-0.5 cursor-pointer font-medium text-slate-700"
                                ${attrs}
                                data-edit-field="type">
                            ${buildTypeOptions(typeVal)}
                        </select>
                    </div>

                    <div class="edit-only-ui hidden flex items-center gap-2 text-xs text-slate-500">
                        <i data-lucide="dollar-sign" class="w-3 h-3 shrink-0"></i>
                        <span class="editable-element border-b border-slate-300 focus:outline-none focus:border-emerald-500 pb-0.5 min-w-[2em] font-medium text-slate-700 placeholder:text-slate-400"
                            ${attrs}
                            data-edit-field="amount">${item.amount || 0}</span>
                    </div>
                </div>

                <div class="ui-desc editable-element mt-0" ${attrs} data-edit-field="desc" data-placeholder="點擊新增描述...">${parseMarkdownList(item.desc || '')}</div>
                ${subHtml}
            </div>
        </div>
        `;
}

function renderTimeline(dayId, timeline) {
    const container = document.getElementById('detail-timeline');
    if (!container) return;
    container.innerHTML = timeline.map((item, index) => renderTimelineItemHtml(dayId, item, index)).join('');
}

/** 切換到指定天數並重新渲染中間與右側內容 */
function switchDay(dayId) {
    const isCover = isCoverKey(dayId);
    const data = isCover ? getCoverViewData() : window.tripData?.detail?.[dayId];
    if (!data) return;
    setActiveDay(dayId);
    // 封面時隱藏時間軸、Tips 等天數專屬區塊 (見 planner.css 的 .day-only / .cover-only)
    document.body.classList.toggle('cover-active', isCover);

    updateDayNavSelection(dayId);
    renderDayHeader(dayId, data);

    renderSharedCards('tips-container', data.tips || [],
        index => `data-edit-day="${dayId}" data-edit-tip-index="${index}"`);
    renderSharedCards('detail-guides', data.guides || [], isCover
        ? buildCoverGuideAttrs
        : index => `data-edit-day="${dayId}" data-edit-guide-index="${index}"`);

    renderTimeline(dayId, data.timeline || []);

    const mainSection = document.getElementById('main-content-section');
    refreshIcons(mainSection);
    applyEditModeState(mainSection);

    // 手機版切換天數時，自動捲回內容頂部
    if (window.innerWidth < 1024) {
        document.getElementById('detail-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderPageHeader() {
    const metadata = window.tripData?.metadata;
    if (!metadata) return;

    const titleEl = document.getElementById('header-title');
    const subtitleEl = document.getElementById('header-subtitle');
    if (titleEl) titleEl.textContent = metadata.title || '';
    if (subtitleEl) subtitleEl.textContent = metadata.subtitle || '';
    document.title = `${metadata.title || ''}・行程規劃助手`;
}

function renderDayNav(dayKeys) {
    const dayNav = document.getElementById('day-nav');
    if (!dayNav) return;

    const theme = getCurrentTheme();
    dayNav.innerHTML = '';
    dayNav.appendChild(createCoverNavButton());
    dayKeys.forEach((key, index) => {
        const day = window.tripData.detail[key];
        const dateInfo = getDayDisplayInfo(key);
        // trip：D1、D2…；study：key 的後半段 (例如 "B1-L1" → "L1")
        const badge = theme.dayKeyFormat === 'key' ? dateInfo.mainStr : `D${index + 1}`;
        const navText = day[theme.navField] || theme.navFallback;

        const btn = document.createElement('button');
        btn.id = `nav-day-${key}`;
        btn.className = `${DAY_BUTTON_BASE_CLASS} font-medium text-xs lg:text-sm`;
        btn.innerHTML = `
            <span class="day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors duration-300">${escapeHtml(badge)}</span>
            <div class="hidden sm:block text-left min-w-0 flex-grow">
                <div class="day-date-txt font-bold text-xs truncate">${escapeHtml(dateInfo.display)}</div>
                ${navText ? `
                <div class="day-title-txt text-[10px] opacity-75 truncate mt-0.5 font-medium flex items-center gap-1">
                    <i data-lucide="${theme.navIcon}" class="w-3 h-3 shrink-0"></i>
                    <span class="truncate">${navText}</span>
                </div>` : ''}
            </div>
        `;
        btn.addEventListener('click', () => switchDay(key));
        dayNav.appendChild(btn);
    });
}

/** 左側選單最上方的「封面」按鈕 (樣式與天數按鈕相同，由 updateDayNavSelection 切換選取狀態) */
function createCoverNavButton() {
    const btn = document.createElement('button');
    btn.id = `nav-day-${COVER_KEY}`;
    btn.className = `${DAY_BUTTON_BASE_CLASS} font-medium text-xs lg:text-sm`;
    btn.innerHTML = `
        <span class="day-badge w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors duration-300">
            <i data-lucide="book-open" class="w-4 h-4"></i>
        </span>
        <div class="hidden sm:block text-left min-w-0 flex-grow">
            <div class="day-date-txt font-bold text-xs truncate">封面</div>
            <div class="day-title-txt text-[10px] opacity-75 truncate mt-0.5 font-medium flex items-center gap-1">
                <span class="truncate">總覽與指南</span>
            </div>
        </div>
    `;
    btn.addEventListener('click', () => switchDay(COVER_KEY));
    return btn;
}

/** 完整渲染整個頁面 */
function render() {
    setTheme(window.tripData?.metadata?.theme);
    renderPageHeader();

    const dayKeys = getSortedDayKeys(window.tripData?.detail);
    renderDayNav(dayKeys);

    // 恢復上次選取的天數 (或封面)；若不屬於當前行程則回到第一天，沒有任何天數時顯示封面
    const lastDay = getActiveDay();
    if (isCoverKey(lastDay) || dayKeys.includes(lastDay)) switchDay(lastDay);
    else switchDay(dayKeys[0] || COVER_KEY);

    calculateTotalBudget();
    renderBudget();
    // 預先產生列印內容，隨時按 Cmd+P 都能列印
    generatePrintContent();

    refreshIcons();
}

/**
 * 載入失敗時的錯誤細節 HTML。
 * @param {Object} [error] - { message } 或 locateJsonError() 的結果
 */
function buildLoadErrorDetailHtml(error) {
    if (!error) return '';

    if (!error.line) {
        return `<div class="mt-2 text-xs font-mono break-all">${escapeHtml(error.message)}</div>`;
    }

    // 以 ^ 標出出錯的欄位 (tab 保留，讓 ^ 與原文對齊)
    const prefix = error.lineText.slice(0, Math.max(0, error.column - 1)).replace(/[^\t]/g, ' ');
    return `
        <div class="mt-2 text-sm"><strong>JSON 格式錯誤：第 ${error.line} 行，第 ${error.column} 欄</strong></div>
        <pre class="mt-1 p-2 bg-white/70 border border-red-200 rounded-lg text-xs overflow-x-auto">${escapeHtml(error.lineText)}\n${prefix}^</pre>
        <div class="mt-1 text-xs font-mono break-all opacity-80">${escapeHtml(error.message)}</div>`;
}

/**
 * 顯示資料載入失敗訊息。
 * @param {string} sourceName
 * @param {Object} [error] - loadTripFile() 回傳的錯誤資訊
 */
function loadFail(sourceName, error) {
    const fallbackWarning = document.getElementById('fallback-warning');
    const fallbackReasonText = document.getElementById('fallback-reason-text');
    const detailTitle = document.getElementById('detail-title');
    const dataStatusTxt = document.getElementById('data-status-txt');

    if (fallbackWarning) fallbackWarning.classList.remove('hidden');
    if (fallbackReasonText) {
        const hint = error?.line
            ? '請修正 JSON 檔後重新整理頁面。'
            : '請確認該檔案與網頁置於同個資料夾中，或者檢查網址 query 參數是否正確。';
        fallbackReasonText.innerHTML = `無法讀取到行程數據 <strong>${escapeHtml(sourceName)}</strong>。<br>${hint}${buildLoadErrorDetailHtml(error)}`;
    }
    if (detailTitle) detailTitle.textContent = '數據檔載入失敗';
    if (dataStatusTxt) dataStatusTxt.textContent = '狀態：載入失敗';
    refreshIcons();
}
