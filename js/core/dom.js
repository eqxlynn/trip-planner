/**
 * DOM 共用工具：HTML 跳脫、Lucide 圖示刷新、顯示切換、狀態列。
 */

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * 重新掃描並渲染 Lucide 圖示。
 * @param {Element} [root] - 限制掃描範圍，避免全域掃描拖慢速度
 */
function refreshIcons(root) {
    if (typeof lucide === 'undefined') return;
    if (root && root !== document) {
        lucide.createIcons({ root });
    } else {
        lucide.createIcons();
    }
}

// Lucide 圖示名稱格式 (例如 "train"、"waves-vertical")；不符合者視為 emoji / 文字圖示
const LUCIDE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * 自製圖示 (Lucide 沒有的日本在地符號)。
 * 依 Lucide 規格繪製：24x24、線寬 2、圓角端點，與其他圖示風格一致。
 */
const CUSTOM_ICONS = {
    // 鳥居 (神社)
    'jp-torii': ['M2 4c4 2 16 2 20 0', 'M4 9h16', 'M7 5.5V21', 'M17 5.5V21', 'M12 6v3'],
    // 日式城堡 (天守)
    'jp-castle': [
        'M8 6c1.5-.3 2.5-1.2 3-2h2c.5.8 1.5 1.7 3 2z', 'M10 6v2', 'M14 6v2',
        'M4 11c3-.5 5-2 5.5-3h5c.5 1 2.5 2.5 5.5 3z', 'M7 11v6', 'M17 11v6',
        'M5 21l1-4h12l1 4z', 'M11 17v-3h2v3',
    ],
    // 溫泉記號
    'jp-onsen': [
        'M4 15c0 3 3.6 5 8 5s8-2 8-5',
        'M8 13c-1.2-1.3-1.2-2.7 0-4s1.2-2.7 0-4',
        'M12 13c-1.2-1.3-1.2-2.7 0-4s1.2-2.7 0-4',
        'M16 13c-1.2-1.3-1.2-2.7 0-4s1.2-2.7 0-4',
    ],
    // 雪人 (玩雪)
    'jp-snowman': [
        'M8.5 6.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0z',
        'M6.5 15.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0z',
        'M6.8 13.5L3.5 11', 'M17.2 13.5l3.3-2.5', 'M12 14h.01', 'M12 17h.01',
    ],
    // 郵便記號
    'jp-post': ['M5 4h14', 'M5 9h14', 'M12 9v11'],
    // 東橫INN ご当地GENKIバッジ (盾牌徽章 + 星星)
    'jp-genki-badge': [
        'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
        'M12 8l1.06 2.54 2.74.22-2.09 1.8.64 2.68L12 13.8l-2.35 1.44.64-2.68-2.09-1.8 2.74-.22z',
    ],
    // 地鐵標誌 (圓圈 + M)
    'jp-metro': ['M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z', 'M8 16V8l4 5 4-5v8'],
    // 提燈 (祭典)
    'jp-matsuri': [
        'M9 3h6', 'M9 21h6',
        'M9 5h6c2.5 0 4 3 4 7s-1.5 7-4 7H9c-2.5 0-4-3-4-7s1.5-7 4-7z',
        'M5.3 9.5h13.4', 'M5.3 14.5h13.4',
    ],
    // 打上花火 (放射 + 升空軌跡)
    'jp-hanabi': [
        'M12 6V2.5', 'M15 9h3.5', 'M9 9H5.5',
        'M14.12 6.88L16.6 4.4', 'M9.88 6.88L7.4 4.4',
        'M14.12 11.12L16.6 13.6', 'M9.88 11.12L7.4 13.6',
        'M12 13v2', 'M12 18v1', 'M12 21.5h.01',
    ],
    // 拉麵 (碗 + 筷子)
    'jp-ramen': ['M3 11h18', 'M4 11c0 4.5 3.6 8 8 8s8-3.5 8-8', 'M9 21h6', 'M13 11l7-8', 'M10 11l6-8'],
    // 糰子 (和菓子)
    'jp-dango': [
        'M3 21l3.7-3.7', 'M17.3 6.7L20 4',
        'M13 8.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
        'M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
        'M6 15.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    ],
    // 飯糰
    'jp-onigiri': [
        'M12 3c1 0 1.7.6 2.2 1.4l6.3 11.2c1 1.8-.3 4.4-2.4 4.4H5.9c-2.1 0-3.4-2.6-2.4-4.4l6.3-11.2C10.3 3.6 11 3 12 3z',
        'M9 20v-5h6v5',
    ],
};

/**
 * 產生圖示 HTML，依序支援：
 * 1. 自製圖示 (CUSTOM_ICONS) → inline SVG
 * 2. Lucide 名稱 → <i data-lucide>，由 refreshIcons() 轉為 SVG
 * 3. 其他 (例如 emoji) → 直接輸出文字
 * @param {string} name - 圖示名稱或 emoji
 * @param {string} className - 尺寸與顏色 class (例如 "w-5 h-5 text-sky-600")
 */
function renderIcon(name, className = '') {
    const customPaths = Object.prototype.hasOwnProperty.call(CUSTOM_ICONS, name) ? CUSTOM_ICONS[name] : null;
    if (customPaths) {
        const paths = customPaths.map(d => `<path d="${d}"/>`).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">${paths}</svg>`;
    }
    if (!name || LUCIDE_NAME_PATTERN.test(name)) {
        return `<i data-lucide="${name || 'info'}" class="${className}"></i>`;
    }
    // emoji 依 Tailwind 的 w-N 換算字級 (w-1 = 0.25rem)，讓大小與 Lucide 圖示一致
    const widthMatch = /\bw-(\d+(?:\.\d+)?)\b/.exec(className);
    const fontSize = widthMatch ? `${Number(widthMatch[1]) * 0.25 * 0.9}rem` : '1em';
    return `<span class="${className} inline-flex items-center justify-center leading-none" style="font-size:${fontSize}">${escapeHtml(name)}</span>`;
}

/**
 * 切換元素顯示狀態 (Tailwind 的 hidden 與 display class)。
 * @param {Element|null} el
 * @param {boolean} visible
 * @param {string|null} [displayClass='flex'] - 顯示時要套用的 display class，傳 null 則只切換 hidden
 */
function toggleDisplay(el, visible, displayClass = 'flex') {
    if (!el) return;
    el.classList.toggle('hidden', !visible);
    if (displayClass) el.classList.toggle(displayClass, visible);
}

const STATUS_STYLES = {
    loading: { color: 'text-blue-500', icon: 'loader-2', spin: true },
    success: { color: 'text-emerald-600', icon: 'check-circle-2' },
    error: { color: 'text-red-500', icon: 'alert-circle' },
    local: { color: 'text-slate-600', icon: 'save' },
    offline: { color: 'text-slate-400', icon: 'cloud-off' },
};

/**
 * 更新狀態列文字與圖示。
 * @param {'loading'|'success'|'error'|'local'|'offline'} state
 * @param {string} text
 * @param {string} [elementId='status-text']
 */
function setStatus(state, text, elementId = 'status-text') {
    const el = document.getElementById(elementId);
    if (!el) return;
    const style = STATUS_STYLES[state] || STATUS_STYLES.success;
    const spin = style.spin ? ' animate-spin' : '';
    el.innerHTML = `<span class="${style.color} flex items-center justify-center gap-1"><i data-lucide="${style.icon}" class="w-3.5 h-3.5${spin}"></i> ${escapeHtml(text)}</span>`;
    refreshIcons(el);
}
