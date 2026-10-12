/**
 * 單張列印頁 (sheet.html)：把行程 JSON 排成單張列印，每頁並排 cols 個 detail 頁面 (天數)，
 * 每頁固定一張紙，字級自動縮放塞進一頁。
 *
 * 行程以外的資料也適用，例如 history/00-總年表.json：臺灣、東亞、世界三頁，
 * 以每頁 3 欄、時間對齊到最底層列印即為三區對照年表 (放不下時依列自動分頁)。
 *
 * 網址參數：
 * - 資料：trip_token / trip_local / trip，意義同 planner.html
 * - 版面：paper=A4|A3|B4|Letter、orient=landscape|portrait、margin=<mm>、fs=auto|<pt>、
 *   cols=<每頁欄數>、days=<key,key,...> (省略為全部)、accent=slate|teal|indigo|rose|amber、
 *   desc=0|1|2|3|all (說明行數)、sub=0|1 (子行程)、tips=0|1、
 *   align=off|1|2|3|4 (依 time 跨欄對齊到第幾層，見 buildAlignRows)、head=0|1 (頁首標題列)、
 *   cover=0|1 (第一頁印封面：標題與 metadata.guides 說明卡)、toc=0|1 (封面第二欄印目錄)、
 *   unit=year|century (年份對齊的單位：同一年一列，或同一世紀一列)、
 *   gutter=<mm> (欄與欄之間的留白；邊界 margin 只用於紙張外緣)、
 *   fold=0|1 (在紙張上下邊界印摺線記號，位置為紙寬的 1/N、2/N …)
 * 預設值：SHEET_DEFAULTS < metadata.sheet (JSON 內指定) < 網址參數
 */

const PAPER_SIZES = { A4: [297, 210], A3: [420, 297], B4: [364, 257], Letter: [279.4, 215.9] };

const SHEET_DEFAULTS = {
    paper: 'A4', orient: 'landscape', margin: '8', fs: 'auto', desc: '2',
    cols: '3', accent: 'slate', sub: '1', tips: '1', days: '', align: 'off', head: '1', cover: '0', toc: '1', unit: 'year', gutter: '6',
    fold: '1',
};

// 自動字級：由大到小嘗試，直到每一欄都放得下
const FS_AUTO_MAX = 11;
const FS_AUTO_MIN = 5.5;
const FS_AUTO_STEP = 0.25;
// 封面說明卡通常較少，允許較大字級
const FS_COVER_MAX = 14;
// 時間對齊版面：縮到此字級仍放不下就分頁
const FS_PAGED_MIN = 8;
// 內容只用到可用高度的這個比例：列印時字型換行可能與螢幕略有不同，預留餘裕避免被裁掉
const FIT_SAFETY = 0.97;

// 與 planner 的 MAX_SUB_DEPTH 相同 (components.js 未載入於本頁)
const MAX_SUB_DEPTH_SHEET = 3;

const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六'];

const sheetParams = new URLSearchParams(window.location.search);
const sheetState = {
    settings: {},
    defaults: { ...SHEET_DEFAULTS },
    trip: null,
    dayKeys: [],
};

// ------------------------------------------
// 設定 (與網址參數同步)
// ------------------------------------------

function getSetting(name) {
    return sheetState.settings[name];
}

function setSetting(name, value) {
    sheetState.settings[name] = String(value);
    const url = new URL(window.location.href);
    if (String(value) === sheetState.defaults[name]) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
    window.history.replaceState(null, '', url);
}

/** 預設值依序由 SHEET_DEFAULTS、metadata.sheet 覆寫，再以網址參數為準 */
function initSettings(metadata) {
    const fromJson = (metadata && metadata.sheet) || {};
    Object.keys(SHEET_DEFAULTS).forEach(name => {
        if (fromJson[name] !== undefined) sheetState.defaults[name] = String(fromJson[name]);
        sheetState.settings[name] = sheetParams.get(name) ?? sheetState.defaults[name];
    });
}

// ------------------------------------------
// 共用工具
// ------------------------------------------

const esc = s => escapeHtml(s ?? '');

/**
 * 是否列入 sheet：hide 含 "sheet" 時隱藏 (行程頁照常顯示)。
 * 適用時間軸項目、子行程 (隱藏時其下子項一併隱藏)、Tips 與封面說明卡。
 */
function isItemVisible(item) {
    return Boolean(item) && !isHiddenIn(item, HIDE_MODES.SHEET);
}

/** 單行行內語法：移除圖片與超連結 (與小冊子列印相同，連結文字也不印)，保留粗體，清單改為「•」 */
function descLineToHtml(line) {
    const plain = line
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s*[(（]\s*[)）]/g, '') // 連結移除後留下的空括號
        .replace(/^\s*[-*]\s+/, '• ')
        .trim();
    return escapeHtml(plain).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

const DESC_TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
// 與行程頁 (markdown.js) 相同：欄數 <= 3 且列數 >= 8 時拆成左右兩組並排
const DESC_TABLE_SPLIT_MAX_COLUMNS = 3;
const DESC_TABLE_SPLIT_MIN_ROWS = 8;

/** 表格列 (第二列為 ---|--- 時第一列視為表頭)；連結移除後整欄空白的欄位不輸出 */
function descTableToHtml(rows) {
    const split = row => row.trim().replace(/^\||\|$/g, '').split('|').map(descLineToHtml);
    const hasHeader = rows.length > 1 && DESC_TABLE_SEPARATOR_RE.test(rows[1]);
    const header = hasHeader ? split(rows[0]) : null;
    const body = (hasHeader ? rows.slice(2) : rows).map(split);
    const colCount = Math.max(header ? header.length : 0, ...body.map(r => r.length));
    const keep = [...Array(colCount).keys()].filter(i => body.some(r => r[i]));
    if (!keep.length) return '';
    const cells = (r, tag) => keep.map(i => `<${tag}>${r[i] || ''}</${tag}>`).join('');
    const build = part => '<table class="dm-table">'
        + (header ? `<thead><tr>${cells(header, 'th')}</tr></thead>` : '')
        + `<tbody>${part.map(r => `<tr>${cells(r, 'td')}</tr>`).join('')}</tbody></table>`;
    if (keep.length <= DESC_TABLE_SPLIT_MAX_COLUMNS && body.length >= DESC_TABLE_SPLIT_MIN_ROWS) {
        const half = Math.ceil(body.length / 2);
        return `<div class="dm-table-split">${build(body.slice(0, half))}${build(body.slice(half))}</div>`;
    }
    return build(body);
}

const DESC_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const DESC_IMAGE_SIZE_RE = /^=(\d+(?:\.\d+)?%?)?(?:x(\d+))?$/;

/** 圖片轉為 <img>；網址後可接尺寸語法 (=60%、=300、=x240、=60%x240)，與行程頁相同 */
function descImageToHtml(alt, target) {
    const parts = target.trim().split(/\s+/);
    const sizeMatch = parts.length > 1 ? DESC_IMAGE_SIZE_RE.exec(parts[parts.length - 1]) : null;
    const url = (sizeMatch ? parts.slice(0, -1) : parts).join(' ');
    if (!/^(https?:|\.?\/|[\w-]+\/)/i.test(url)) return ''; // 只接受 http(s) 與相對路徑
    const styles = [];
    if (sizeMatch && sizeMatch[1]) styles.push(`width:${sizeMatch[1].endsWith('%') ? sizeMatch[1] : `${sizeMatch[1]}px`}`);
    if (sizeMatch && sizeMatch[2]) styles.push(`max-height:${sizeMatch[2]}px`, 'object-fit:contain');
    if (sizeMatch && sizeMatch[2] && !sizeMatch[1]) styles.push('width:auto');
    return `<img class="dm-img" src="${esc(url)}" alt="${esc(alt)}" referrerpolicy="no-referrer"${styles.length ? ` style="${styles.join(';')}"` : ''}>`;
}

/**
 * 說明文字轉為簡短 HTML：移除超連結，保留粗體，清單改為「•」，Markdown 表格畫成小型表格。
 * 圖片預設移除；images = true 時保留 (封面說明卡使用)。
 */
function descToHtml(text, { images = false } = {}) {
    const parts = [];
    let tableRows = [];
    const flushTable = () => {
        if (tableRows.length > 1) parts.push({ block: descTableToHtml(tableRows) });
        else if (tableRows.length) parts.push({ line: descLineToHtml(tableRows[0]) });
        tableRows = [];
    };
    String(text || '').split('\n').forEach(line => {
        // 與行程頁相同：非清單項目且含有「|」視為表格列
        if (line.includes('|') && !/^\s*([-*]|\d+\.)\s+/.test(line)) {
            tableRows.push(line);
            return;
        }
        flushTable();
        if (images) {
            for (const m of line.matchAll(DESC_IMAGE_RE)) {
                const img = descImageToHtml(m[1], m[2]);
                if (img) parts.push({ block: img });
            }
        }
        const html = descLineToHtml(line);
        if (html) parts.push({ line: html });
    });
    flushTable();
    // 表格與圖片是區塊元素，前後不需要 <br>
    return parts.reduce((html, part, i) => {
        if (part.block !== undefined) return html + part.block;
        const prev = parts[i - 1];
        return html + (prev && prev.line !== undefined ? '<br>' : '') + part.line;
    }, '');
}

/**
 * 欄位外緣的 class：第一欄左側、最後一欄右側貼紙張邊緣，用「邊界」留白；其餘靠摺線，用「欄距」的一半。
 * 橫跨整頁的元素 (col = -1) 兩側都是紙張邊緣。
 */
function colEdgeClass(col, cols = Number(getSetting('cols')) || 3) {
    if (col < 0) return ' col-first col-last';
    return (col === 0 ? ' col-first' : '') + (col === cols - 1 ? ' col-last' : '');
}

/**
 * 依「說明」設定輸出說明區塊 (行數限制以 line-clamp 處理；含表格時 line-clamp 無法正確截斷，改為全部顯示)。
 * full = true 時全文列印，不受「說明」行數設定限制 (Tips 使用)。
 */
function renderDesc(text, full = false) {
    const lines = full ? 'all' : getSetting('desc');
    if (!text || lines === '0') return '';
    const html = descToHtml(text);
    if (!html) return '';
    const style = lines === 'all' || html.includes('<table') ? 'display:block' : `-webkit-line-clamp:${lines}`;
    return `<div class="dm-desc" style="${style}">${html}</div>`;
}

async function loadTrip() {
    const token = sheetParams.get('trip_token');
    const local = sheetParams.get('trip_local');
    const file = sheetParams.get('trip');

    if (token || local) {
        const data = TripStorage.getJson(token || local);
        if (!data) throw new Error('找不到行程資料的本機快取，請先在行程頁開啟一次。');
        return data;
    }
    if (file) {
        if (!file.endsWith('.json') || /^[a-z]+:/i.test(file)) throw new Error(`不支援的檔案：${file}`);
        const response = await fetch(file, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${file}：HTTP ${response.status}`);
        return response.json();
    }
    throw new Error('缺少資料參數 (trip / trip_local / trip_token)。');
}

// ------------------------------------------
// 紙張
// ------------------------------------------

function applyPageStyle() {
    const [long, short] = PAPER_SIZES[getSetting('paper')] || PAPER_SIZES.A4;
    const [w, h] = getSetting('orient') === 'portrait' ? [short, long] : [long, short];
    const root = document.documentElement.style;
    root.setProperty('--page-w', `${w}mm`);
    root.setProperty('--page-h', `${h}mm`);
    root.setProperty('--margin', `${Number(getSetting('margin')) || 0}mm`);
    // 欄距平分在摺線兩側
    root.setProperty('--gutter', `${(Number(getSetting('gutter')) || 0) / 2}mm`);
    // 每張 .sheet 自己留白，@page 不留邊界
    document.getElementById('page-style').textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
    document.body.dataset.accent = getSetting('accent') || 'slate';
}

// ------------------------------------------
// sheet
// ------------------------------------------

function getSelectedDayKeys() {
    const all = sheetState.dayKeys;
    const chosen = (getSetting('days') || '').split(',').filter(key => all.includes(key));
    return chosen.length ? all.filter(key => chosen.includes(key)) : all;
}

function isDateTheme() {
    return getCurrentTheme().dayKeyFormat !== 'key';
}

/** 「10/27（二）」；非日期 key 回傳顯示用文字 (例如 "中古 東亞") */
function shortDayLabel(key) {
    if (!isDateTheme()) {
        const info = getDayDisplayInfo(key);
        return [info.startStr, info.mainStr].filter(Boolean).join(' ');
    }
    const d = parseDateKey(key);
    if (Number.isNaN(d.getTime())) return key;
    return `${d.getMonth() + 1}/${d.getDate()}（${DOW_ZH[d.getDay()]}）`;
}

function compactTime(time) {
    return String(time).replace(/\s*[-–~]\s*/g, '–');
}

// ------------------------------------------
// 依 time 跨欄對齊
// ------------------------------------------

/** 年份標示轉成排序用整數，例如「約前1600」「前6世紀」「18世紀中期」「約5萬年前」「1949.12」 */
function parseYear(label) {
    const s = String(label || '');
    const ago = /(\d+)(萬)?(?:[–-]\d+)?年前/.exec(s);
    if (ago) return 2000 - Number(ago[1]) * (ago[2] ? 10000 : 1);
    const m = /(前)?(\d+)(?:[–-]\d+)?(世紀)?/.exec(s);
    if (!m) return null;
    let n = Number(m[2]);
    if (m[3]) n = m[1] ? n * 100 : (n - 1) * 100 + (s.includes('中') ? 50 : 1);
    return m[1] ? -n : n;
}

const CLOCK_RE = /(\d{1,2}):(\d{2})/;

/**
 * 對齊用的排序值 (沒有時間回傳 null)：
 * - 時刻模式 (本頁有任何「08:10」這類時刻)：取第一個時刻，以整點分列；不是時刻的文字 (例如「24 HR」) 視為沒有時間
 * - 年份模式：有數字 year 欄位時直接使用，否則由 time 文字推算年份
 */
function timeSortKey(item, useClock) {
    const time = String(item.time || '');
    if (useClock) {
        const clock = CLOCK_RE.exec(time);
        return clock ? Number(clock[1]) * 60 : null;
    }
    if (typeof item.year === 'number') return item.year;
    return parseYear(time);
}

/** 年份 → 世紀序號：1–100 年為 1，前100–前1 年為 -1 (沒有西元 0 年，0 視為前1世紀) */
function yearToCentury(year) {
    return year > 0 ? Math.ceil(year / 100) : -Math.max(1, Math.ceil(-year / 100));
}

/** 世紀標籤；一萬年以前改用「約 N 萬年前」 */
function centuryLabel(century) {
    if (century <= -100) return `約 ${Math.round(-century / 100)} 萬年前`;
    return century > 0 ? `${century} 世紀` : `前 ${-century} 世紀`;
}

/** 世紀模式：年份對齊且 unit=century (時刻模式不適用) */
function isCenturyMode(useClock) {
    return !useClock && getSetting('unit') === 'century';
}

/**
 * 把一欄的時間軸攤成對齊項目。深度小於 level 且有子項目的是「分組」(自成一列的標題)，
 * 其餘為「項目」(更深的子項目在項目內以清單顯示)。
 */
function collectAlignEntries(items, depth, level, out = []) {
    (items || []).filter(isItemVisible).filter(item => item.title || item.time || item.desc).forEach(item => {
        const subs = (item.subEvents || []).filter(isItemVisible);
        if (depth < level && subs.length) {
            out.push({ kind: 'group', depth, item });
            collectAlignEntries(subs, depth + 1, level, out);
        } else {
            out.push({ kind: 'item', depth, item });
        }
    });
    return out;
}

/**
 * 各欄依 time 排序值分列：排序值相同的放同一列 (分組列排在項目列之前)。
 * 每欄維持原本順序：沒有時間、或時間早於上一個項目的，跟著同一欄的上一個項目。
 * @returns {{key: number, rank: number, kind: string, cells: Object[][]}[]}
 */
function buildAlignRows(keys, level) {
    const columns = keys.map(dayKey => collectAlignEntries((sheetState.trip.detail[dayKey] || {}).timeline, 1, level));
    const useClock = columns.some(entries => entries.some(e => CLOCK_RE.test(e.item.time || '')));
    const century = isCenturyMode(useClock);
    const rows = new Map();
    columns.forEach((entries, col) => {
        let last = -Infinity;
        entries.forEach(entry => {
            let own = timeSortKey(entry.item, useClock);
            if (century && own !== null) own = yearToCentury(own);
            const key = own === null || own < last ? last : own;
            last = key;
            // 世紀模式：同一世紀只有一列，格內依原順序混排分組與項目 (kind = 'century')
            if (century) {
                const id = `c${key}`;
                if (!rows.has(id)) rows.set(id, { key, rank: 0, kind: 'century', cells: keys.map(() => []) });
                rows.get(id).cells[col].push(entry);
                return;
            }
            const rank = entry.kind === 'group' ? entry.depth : MAX_SUB_DEPTH_SHEET + 9;
            const id = `${key}|${rank}`;
            if (!rows.has(id)) rows.set(id, { key, rank, kind: entry.kind, cells: keys.map(() => []) });
            rows.get(id).cells[col].push(entry);
        });
    });
    return [...rows.values()].sort((a, b) => (a.key === b.key ? a.rank - b.rank : a.key - b.key));
}

function renderAlignGroup(item, continued = false) {
    const cfg = getTypeConfig(item.type);
    return `
        <div class="al-group${continued ? ' al-cont' : ''}">
            ${renderIcon(item.icon || cfg.defaultIcon)}
            <b>${esc(item.title)}</b>
            ${item.time ? `<span>${esc(item.time)}</span>` : ''}
        </div>`;
}

/** 一列的 HTML；每個格子標上 data-row，供分頁時量測列高 */
function renderAlignRow(row, rowId, keyCount, continued = false) {
    if (row.kind === 'century' || row.kind === 'carry') return renderCenturyRow(row, rowId);
    const entries = row.cells.flat();
    const filled = row.cells.filter(cell => cell.length).length;
    const sameGroup = row.kind === 'group' && entries.every(e => e.item.title === entries[0].item.title);
    if (sameGroup && (filled > 1 || keyCount === 1)) {
        return `<div class="al-band${colEdgeClass(-1)}" data-row="${rowId}" style="grid-column:1 / -1">${renderAlignGroup(entries[0].item, continued)}</div>`;
    }
    return row.cells.map((cell, col) => {
        const html = cell.map(e => (e.kind === 'group'
            ? renderAlignGroup(e.item, continued)
            : `<ol class="al-list">${renderDmEvent(e.item)}</ol>`)).join('');
        return `<div class="al-cell${colEdgeClass(col)}" data-row="${rowId}" style="grid-column:${col + 1}">${html}</div>`;
    }).join('');
}

/** 世紀列：整列寬的世紀標籤 + 各欄內容 (分組與項目依原順序混排，分組依層級縮排)；carry 為接續上一頁的分組 */
function renderCenturyRow(row, rowId) {
    const carry = row.kind === 'carry';
    const label = carry ? '' : `<div class="al-century${colEdgeClass(-1)}" data-row="${rowId}" style="grid-column:1 / -1">${esc(centuryLabel(row.key))}</div>`;
    const cells = row.cells.map((cell, col) => {
        const html = cell.map(e => {
            const indent = `style="margin-left:${(e.depth - 1) * 0.8}em"`;
            return e.kind === 'group'
                ? `<div ${indent}>${renderAlignGroup(e.item, carry)}</div>`
                : `<ol class="al-list" ${indent}>${renderDmEvent(e.item)}</ol>`;
        }).join('');
        return `<div class="al-cell${carry ? ' al-carry' : ''}${colEdgeClass(col)}" data-row="${rowId}" style="grid-column:${col + 1}">${html}</div>`;
    }).join('');
    return label + cells;
}

/**
 * 對齊版面：第一列為各欄標題，其後每列為同一時間；多欄出現同名分組時合併成橫跨整頁的分期列。
 * @param {string[]} keys - 本頁各欄的 detail key
 * @param {Object} part - 分頁資訊：rows 為 [{ row, index }]、carried 為接續上一頁的分組列、withTips 是否附上 Tips
 */
function renderAlignedBody(keys, part) {
    const heads = keys.map((key, col) => `<div class="al-head${colEdgeClass(col)}" data-row="h" style="grid-column:${col + 1}">${renderDmDayHead(key)}</div>`);
    const carried = part.carried.map(({ row }) => renderAlignRow(row, 'c', keys.length, true));
    const body = part.rows.map(({ row, index }) => renderAlignRow(row, index, keys.length));

    const tips = !part.withTips ? '' : keys.map((key, col) => {
        const list = getSetting('tips') === '1' ? getDayTips(sheetState.trip.detail[key] || {}) : [];
        return list.length ? `<div class="al-tips${colEdgeClass(col)}" data-row="tips" style="grid-column:${col + 1}">${list.map(renderDmTip).join('')}</div>` : '';
    }).join('');

    const cols = Number(getSetting('cols')) || 3;
    return `
        <div class="al-grid" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr));">
            ${heads.join('')}${carried.join('')}${body.join('')}${tips}
        </div>`;
}

/** 世紀模式：第 start 列之前，各欄仍在進行中的分組 (依層級) */
function getOpenGroupsByColumn(rows, start) {
    const stacks = rows.length ? rows[0].cells.map(() => []) : [];
    for (let i = 0; i < start; i++) {
        rows[i].cells.forEach((cell, col) => cell.forEach(e => {
            stacks[col] = stacks[col].filter(g => g.depth < e.depth);
            if (e.kind === 'group') stacks[col].push(e);
        }));
    }
    return stacks;
}

/** 從第 start 列開始的新頁，要重複顯示的分組列 (各層最近一個尚未結束的分組) */
function getCarriedGroups(rows, start) {
    if (rows[0] && rows[0].kind === 'century') {
        if (start === 0) return [];
        const stacks = getOpenGroupsByColumn(rows, start);
        return stacks.some(st => st.length) ? [{ row: { kind: 'carry', key: 0, rank: 0, cells: stacks }, index: 'c' }] : [];
    }
    let stack = [];
    for (let i = 0; i < start; i++) {
        const row = rows[i];
        if (row.kind !== 'group') continue;
        stack = stack.filter(g => g.row.rank < row.rank);
        stack.push({ row, index: i });
    }
    const first = rows[start];
    return first && first.kind === 'group' ? stack.filter(g => g.row.rank < first.rank) : stack;
}

function alignPart(rows, start, end) {
    return {
        rows: rows.slice(start, end).map((row, i) => ({ row, index: start + i })),
        carried: getCarriedGroups(rows, start),
        withTips: end >= rows.length,
    };
}

function renderDmSubs(items, depth) {
    const subs = (items || []).filter(isItemVisible).filter(sub => sub.title);
    return subs.map(sub => {
        const cfg = getTypeConfig(sub.type);
        const isSolo = normalizeType(sub.type) === 'solo';
        const time = sub.time ? `<span class="dm-sub-time">${esc(compactTime(sub.time))}</span> ` : '';
        const line = `
            <li class="dm-sub dm-sub-${depth}${isSolo ? ' dm-solo' : ''}">
                <span class="dm-sub-icon">${renderIcon(sub.icon || cfg.defaultIcon, cfg.icon)}</span>
                <span>${time}${esc(sub.title)}</span>
            </li>`;
        return line + (depth < MAX_SUB_DEPTH_SHEET ? renderDmSubs(sub.subEvents, depth + 1) : '');
    }).join('');
}

function renderDmEvent(item) {
    const cfg = getTypeConfig(item.type);
    const isSolo = normalizeType(item.type) === 'solo';
    // 時間與標題同一行 (時間在前)
    const time = item.time ? `<span class="dm-time">${esc(compactTime(item.time))}</span> ` : '';
    const subs = getSetting('sub') === '1' ? renderDmSubs(item.subEvents, 1) : '';
    return `
        <li class="dm-ev${isSolo ? ' dm-solo' : ''}">
            <span class="dm-dot ${cfg.dot || cfg.box}">${renderIcon(item.icon || cfg.defaultIcon, cfg.icon)}</span>
            <div class="dm-body">
                <div class="dm-ev-title">${time}${esc(item.title)}</div>
                ${renderDesc(item.desc)}
                ${subs ? `<ul class="dm-subs">${subs}</ul>` : ''}
            </div>
        </li>`;
}

function renderDmTip(item) {
    const cfg = getTypeConfig(item.type || 'none');
    // Tips 有勾選就全文列印，不受「說明」行數設定限制
    return `
        <div class="dm-tip ${cfg.box}">
            <div class="dm-tip-title ${cfg.title}">${renderIcon(item.icon || cfg.defaultIcon, cfg.icon)}<span>${esc(item.title)}</span></div>
            ${renderDesc(item.desc, true)}
        </div>`;
}

/** key 的日期部分 (「2026-10-28:2」這類備案頁取冒號前) */
const datePartOf = key => String(key).split(':')[0];

function getUniqueDates() {
    return [...new Set(sheetState.dayKeys.map(datePartOf))];
}

/** 第幾天：以不重複的日期計算，同一天的備案頁共用同一個 DAY N */
function getDayNumber(key) {
    return getUniqueDates().indexOf(datePartOf(key)) + 1;
}

/** 欄位標題的徽章：日期主題為 DAY N / 日 / 月 星期；key 主題為 key 的上方小字 / 中間大字 */
function renderDmBadge(key) {
    const info = getDayDisplayInfo(key);
    if (!isDateTheme()) {
        return `
            <div class="dm-date dm-date-key">
                ${info.startStr ? `<span class="dm-dayno">${esc(info.startStr)}</span>` : ''}
                <span class="dm-daynum">${esc(info.mainStr)}</span>
            </div>`;
    }
    const dayNo = getDayNumber(key);
    const dowClass = info.dowStr === 'Sat' ? ' sat' : info.dowStr === 'Sun' ? ' sun' : '';
    return `
        <div class="dm-date${dowClass}">
            <span class="dm-dayno">DAY ${dayNo}</span>
            <span class="dm-daynum">${esc(info.mainStr)}</span>
            <span class="dm-dow">${esc(`${info.startStr} ${info.endStr}`)}</span>
        </div>`;
}

function getDayTips(day) {
    return (day.tips || []).filter(isItemVisible).filter(item => item.title || item.desc);
}

/** 欄位標題：徽章 + 標題 + region + subtitle */
function renderDmDayHead(key) {
    const day = sheetState.trip.detail[key] || {};
    const theme = getCurrentTheme();
    const subtitle = (day.subtitle || '').replace(/^宿[\s:：]*/, '');
    return `
        <div class="dm-day-head">
            ${renderDmBadge(key)}
            <div class="dm-day-info">
                <div class="dm-day-title">${esc(day.title)}</div>
                ${day.region ? `<div class="dm-meta">${renderIcon(theme.regionIcon || 'map-pin')}<span>${esc(day.region)}</span></div>` : ''}
                ${subtitle ? `<div class="dm-meta">${renderIcon(theme.subtitleIcon)}<span>${esc(subtitle)}</span></div>` : ''}
            </div>
        </div>`;
}

function renderDmDay(key, col = 0) {
    const day = sheetState.trip.detail[key] || {};
    const timeline = (day.timeline || []).filter(isItemVisible).filter(item => item.title || item.time || item.desc);
    const tips = getSetting('tips') === '1' ? getDayTips(day) : [];

    return `
        <article class="dm-day${colEdgeClass(col)}">
            ${renderDmDayHead(key)}
            <ol class="dm-tl">${timeline.map(renderDmEvent).join('')}</ol>
            ${tips.length ? `<div class="dm-tips">${tips.map(renderDmTip).join('')}</div>` : ''}
        </article>`;
}

/** 頁首右側：日期主題不顯示；key 主題為本頁各欄的上方小字 (例如時期名稱) 與 region */
function renderDmRange(keys) {
    if (isDateTheme()) return '';
    const heads = [...new Set(keys.map(key => getDayDisplayInfo(key).startStr).filter(Boolean))];
    const regions = [...new Set(keys.map(key => (sheetState.trip.detail[key] || {}).region).filter(Boolean))];
    return `<b>${esc(heads.join(' / ') || keys.map(shortDayLabel).join(' / '))}</b><span>${esc(regions.join(' / '))}</span>`;
}

/**
 * 摺線記號：在紙寬 1/N、2/N … 處 (即兩欄留白的正中央，見 sheet.css「摺頁對位」)，
 * 於上下邊界各畫一小段短線，不壓到內容。1 欄或 fold=0 時不畫。
 */
function renderFoldMarks() {
    const cols = Number(getSetting('cols')) || 3;
    if (getSetting('fold') !== '1' || cols < 2) return '';
    return Array.from({ length: cols - 1 }, (_, i) =>
        `<div class="dm-fold" style="left:${((i + 1) * 100 / cols).toFixed(4)}%"></div>`).join('');
}

/** 一張紙：頁首 + 內容 (bodyHtml) + 頁碼 (由 numberSheets 填入) */
function renderDmSheet(keys, bodyHtml) {
    const meta = sheetState.trip.metadata || {};
    return `
        <section class="sheet dm">
            ${renderFoldMarks()}
            ${getSetting('head') === '1' ? `
            <header class="dm-head">
                <div class="dm-title">${esc(meta.title)}</div>
                ${meta.subtitle ? `<div class="dm-subtitle">${esc(meta.subtitle)}</div>` : ''}
            </header>` : ''}
            ${bodyHtml}
            <footer class="dm-foot"><span></span><span class="dm-pageno"></span></footer>
        </section>`;
}

function getCoverGuides() {
    const guides = (sheetState.trip.metadata || {}).guides || [];
    return guides.filter(isItemVisible).filter(item => item.title || item.desc);
}

/** 封面說明卡：說明全文列印 (不受「說明」行數設定限制)，圖片照常顯示 (例如行程總覽路線圖) */
function renderCoverGuide(item) {
    const cfg = getTypeConfig(item.type || 'none');
    const html = descToHtml(item.desc, { images: true });
    return `
        <div class="dm-tip dm-cover-card ${cfg.box}">
            <div class="dm-tip-title ${cfg.title}">${renderIcon(item.icon || cfg.defaultIcon, cfg.icon)}<span>${esc(item.title)}</span></div>
            ${html ? `<div class="dm-desc" style="display:block">${html}</div>` : ''}
        </div>`;
}

/**
 * 封面目錄：每天一行 (日期・標題)，不印卡片標題與頁碼。
 * 日期主題的日期與網頁版列印的日曆圖示一致：月 (Oct)／日 (26)／星期 (Mon)，週六綠、週日紅。
 */
function renderCoverToc() {
    const rows = getSelectedDayKeys().filter(hasDayContent).map(key => {
        const day = sheetState.trip.detail[key] || {};
        let when;
        if (isDateTheme()) {
            const info = getDayDisplayInfo(key);
            const dowClass = info.dowStr === 'Sat' ? ' sat' : info.dowStr === 'Sun' ? ' sun' : '';
            when = `
                <span class="dm-toc-cal${dowClass}">
                    <span class="dm-toc-mon">${esc(info.startStr)}</span>
                    <span class="dm-toc-day">${esc(info.mainStr)}</span>
                    <span class="dm-toc-dow">${esc(info.endStr)}</span>
                </span>`;
        } else {
            when = `<span class="dm-toc-when"><span class="dm-toc-date">${esc(shortDayLabel(key))}</span></span>`;
        }
        return `
            <li class="dm-toc-row">
                ${when}
                <span class="dm-toc-title">${esc(day.title || '')}</span>
            </li>`;
    }).join('');
    return `
        <div class="dm-cover-card dm-toc">
            <ol class="dm-toc-list">${rows}</ol>
        </div>`;
}

/**
 * 封面：標題列 (不受 head 設定影響) + 分欄
 * 第一欄：含圖片的說明卡 (例如路線圖)；第二欄：目錄；第三欄之後：其餘說明卡。
 * 欄數不足時依序往前併。
 */
function renderCoverSheet() {
    const meta = sheetState.trip.metadata || {};
    const cols = Number(getSetting('cols')) || 3;
    const cards = getCoverGuides().map(item => ({ item, html: renderCoverGuide(item) }));
    const hasImg = c => /<img\b/.test(c.html);
    const slots = [
        cards.filter(hasImg).map(c => c.html),
        getSetting('toc') === '1' ? [renderCoverToc()] : [],
        cards.filter(c => !hasImg(c)).map(c => c.html),
    ];
    const columns = Array.from({ length: cols }, () => []);
    slots.forEach((list, i) => columns[Math.min(i, cols - 1)].push(...list));
    return `
        <section class="sheet dm dm-cover-sheet">
            ${renderFoldMarks()}
            <header class="dm-head dm-cover-head">
                <div class="dm-title">${esc(meta.title)}</div>
                ${meta.subtitle ? `<div class="dm-subtitle">${esc(meta.subtitle)}</div>` : ''}
            </header>
            <div class="dm-cover" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr));">
                ${columns.map(list => `<div class="dm-cover-col">${list.join('')}</div>`).join('')}
            </div>
            <footer class="dm-foot"><span></span><span class="dm-pageno"></span></footer>
        </section>`;
}

function renderPackedBody(keys) {
    const cols = Number(getSetting('cols')) || 3;
    return `
        <div class="dm-cols" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr));">
            ${keys.map((key, col) => renderDmDay(key, col)).join('')}
        </div>`;
}

/** 這一天是否有可列印的內容 (有標題、副標題、地區、時間軸或 Tips 任一項即列印；只有完全空白的天才略過) */
function hasDayContent(key) {
    const day = sheetState.trip.detail[key] || {};
    if (day.title || day.subtitle || day.region) return true;
    const timeline = (day.timeline || []).filter(isItemVisible).filter(item => item.title || item.time || item.desc);
    return timeline.length > 0 || getDayTips(day).length > 0;
}

/** 依每頁欄數把選取的天數分組 (略過空白天) */
function getKeyGroups() {
    const keys = getSelectedDayKeys().filter(hasDayContent);
    const cols = Number(getSetting('cols')) || 3;
    const groups = [];
    for (let i = 0; i < keys.length; i += cols) groups.push(keys.slice(i, i + cols));
    return groups;
}

// ------------------------------------------
// 選擇要列印的天數 (點選切換；全部選取時等同不指定)
// ------------------------------------------

function renderDayChips() {
    const container = document.getElementById('tb-days');
    if (!container) return;
    const selected = new Set(getSelectedDayKeys());
    container.innerHTML = sheetState.dayKeys.map(key => `
        <label class="tb-day${hasDayContent(key) ? '' : ' empty'}" title="${hasDayContent(key) ? '' : '沒有內容，不會列印'}">
            <input type="checkbox" data-day="${esc(key)}"${selected.has(key) ? ' checked' : ''}>
            <span>${esc(isDateTheme() ? `D${getDayNumber(key)}${key.includes(':') ? ' 備案' : ''} ${shortDayLabel(key)}` : shortDayLabel(key))}</span>
        </label>`).join('');
}

function handleDayChipChange(event) {
    const box = event.target;
    if (!box.matches || !box.matches('input[data-day]')) return;
    const selected = new Set(getSelectedDayKeys());
    const key = box.dataset.day;
    if (box.checked) {
        selected.add(key);
    } else {
        if (selected.size === 1) { box.checked = true; return; } // 至少保留一天
        selected.delete(key);
    }
    const keys = sheetState.dayKeys.filter(k => selected.has(k));
    setSetting('days', keys.length === sheetState.dayKeys.length ? '' : keys.join(','));
    renderSheets();
}

// ------------------------------------------
// 渲染與自動字級
// ------------------------------------------

/**
 * 內容是否超過容器可用高度 (乘上 FIT_SAFETY)。
 * 不能用 scrollHeight：它至少等於 clientHeight，與 FIT_SAFETY (小於 1) 比較時永遠成立，
 * 會讓字級一路縮到最小；而 .dm-tips 的 margin-top: auto 也會把內容撐滿整欄。
 * 因此改為實際量測子元素：.dm-day 為縱向 flex，加總各子元素高度 (忽略 auto 邊界)；
 * .al-grid 由上往下排 (align-content: start)，取最下方子元素的底部。
 */
function isContentOverflowing(el) {
    const box = el.getBoundingClientRect();
    const children = [...el.children];
    const used = el.classList.contains('dm-day')
        ? children.reduce((sum, child) => sum + child.getBoundingClientRect().height, 0)
        : Math.max(0, ...children.map(child => child.getBoundingClientRect().bottom - box.top));
    return used > box.height * FIT_SAFETY;
}

function isSheetOverflowing(sheet) {
    // 封面以 grid 分欄排列，看寬度與高度是否超出
    return [...sheet.querySelectorAll('.dm-day, .al-grid')].some(isContentOverflowing)
        || [...sheet.querySelectorAll('.dm-cover')].some(el => el.scrollWidth > el.clientWidth + 1
            || el.scrollHeight > el.clientHeight + 1);
}

/**
 * 找出放得下的最大字級 (fs=auto，最小到 minFs) 或套用固定字級，回傳字級。
 * 時間對齊版面放不下時會分頁，因此最小字級較大 (FS_PAGED_MIN)，避免字太小。
 */
function fitSheet(sheet, minFs, maxFs = FS_AUTO_MAX) {
    const fsSetting = getSetting('fs');
    let fs = fsSetting === 'auto' ? maxFs : Number(fsSetting) || 9;
    sheet.style.fontSize = `${fs}pt`;
    if (fsSetting === 'auto') {
        while (fs > minFs && isSheetOverflowing(sheet)) {
            fs -= FS_AUTO_STEP;
            sheet.style.fontSize = `${fs}pt`;
        }
    }
    return fs;
}

/**
 * 一般 sheet (不對齊、自動字級)：頁首與欄位標題用整頁字級，各欄的時間軸與 Tips 再各自縮小到放得下，
 * 避免某一天內容特別多時整張紙的字都跟著變小。回傳各欄實際字級 (pt)。
 */
function fitPackedColumns(sheet, fs) {
    const minScale = FS_AUTO_MIN / fs;
    return [...sheet.querySelectorAll('.dm-day')].map(day => {
        let scale = 1;
        day.style.setProperty('--col-scale', '1');
        while (scale > minScale && isContentOverflowing(day)) {
            scale = Math.max(minScale, scale - FS_AUTO_STEP / fs);
            day.style.setProperty('--col-scale', String(scale));
        }
        return Math.round(fs * scale * 4) / 4;
    });
}

/**
 * 量測對齊版面各列高度 (列高只取決於該列內容，分頁後不變)。
 * @returns {{avail: number, height: Function}} avail 為內容區高度；height(rowId) 為該列高度
 */
function measureAlignRows(sheet) {
    const grid = sheet.querySelector('.al-grid');
    const gridTop = grid.getBoundingClientRect().top;
    const tops = new Map();
    let bottom = 0;
    grid.querySelectorAll('[data-row]').forEach(el => {
        const rect = el.getBoundingClientRect();
        const id = el.dataset.row;
        tops.set(id, Math.min(tops.has(id) ? tops.get(id) : Infinity, rect.top - gridTop));
        bottom = Math.max(bottom, rect.bottom - gridTop);
    });
    const ids = [...tops.keys()].sort((a, b) => tops.get(a) - tops.get(b));
    const heights = new Map(ids.map((id, i) => [id, (i + 1 < ids.length ? tops.get(ids[i + 1]) : bottom) - tops.get(id)]));
    // 世紀模式的接續分組列在第一次排版時不存在，以分組標題的高度估算
    const sample = grid.querySelector('.al-group');
    const groupH = sample ? sample.getBoundingClientRect().height * 1.4 : 0;
    // 與列高同樣以 getBoundingClientRect 量測，避免預覽縮放造成單位不一致
    return { avail: grid.getBoundingClientRect().height * FIT_SAFETY, height: id => heights.get(String(id)) || 0, groupH };
}

/** 把放不下的對齊版面依列拆成多張紙，每張重複欄位標題與進行中的分組列 */
function paginateAlignRows(rows, measure) {
    const { avail, height, groupH } = measure;
    const carriedHeight = carried => carried.reduce((sum, g) => sum + (g.index === 'c'
        ? Math.max(0, ...g.row.cells.map(cell => cell.length)) * groupH
        : height(g.index)), 0);
    const parts = [];
    let start = 0;
    while (start < rows.length) {
        const carried = getCarriedGroups(rows, start);
        let used = height('h') + carriedHeight(carried);
        let end = start;
        while (end < rows.length && used + height(end) <= avail) {
            used += height(end);
            end += 1;
        }
        if (end === start) end = start + 1; // 單列就超過一頁時仍需前進
        // 分組列不要留在頁尾
        while (end < rows.length && end - 1 > start && rows[end - 1].kind === 'group') end -= 1;
        parts.push([start, end]);
        start = end;
    }
    // Tips 放在最後一頁，放不下時另起一頁
    const [lastStart, lastEnd] = parts[parts.length - 1];
    const lastUsed = height('h') + carriedHeight(getCarriedGroups(rows, lastStart))
        + rows.slice(lastStart, lastEnd).reduce((sum, _row, i) => sum + height(lastStart + i), 0);
    if (lastUsed + height('tips') > avail && lastEnd - lastStart > 1) {
        parts[parts.length - 1] = [lastStart, lastEnd - 1];
        parts.push([lastEnd - 1, lastEnd]);
    }
    return parts;
}

function numberSheets(root) {
    const sheets = [...root.querySelectorAll('.sheet')];
    sheets.forEach((sheet, i) => {
        const el = sheet.querySelector('.dm-pageno');
        if (el) el.textContent = sheets.length > 1 ? `${i + 1} / ${sheets.length}` : '';
    });
    return sheets.length;
}

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

async function waitForLayout() {
    // 等字型與圖示 (Lucide / Tailwind 產生的樣式) 就緒再量測高度
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await nextFrame();
    await nextFrame();
}

/** 螢幕預覽：紙張比視窗寬時等比縮小 (只影響螢幕，列印為原尺寸) */
function updatePreviewZoom() {
    const root = document.getElementById('sheet-root');
    const sheet = root && root.querySelector('.sheet');
    if (!sheet) return;
    root.style.setProperty('--preview-zoom', '1');
    const available = document.documentElement.clientWidth - 32;
    const zoom = Math.min(1, available / sheet.offsetWidth);
    root.style.setProperty('--preview-zoom', String(Math.max(0.2, zoom)));
}

async function renderSheets() {
    const root = document.getElementById('sheet-root');
    const status = document.getElementById('tb-status');
    const aligned = getSetting('align') !== 'off';
    const level = Number(getSetting('align')) || 1;
    // 量測前先取消預覽縮放
    root.style.setProperty('--preview-zoom', '1');
    applyPageStyle();
    renderDayChips();

    // 1. 每組天數先排成一張紙 (對齊版面含全部列)
    const groups = getKeyGroups().map(keys => ({ keys, rows: aligned ? buildAlignRows(keys, level) : null }));
    const withCover = getSetting('cover') === '1' && (getSetting('toc') === '1' || getCoverGuides().length > 0);
    root.innerHTML = (withCover ? renderCoverSheet() : '') + groups.map(g => renderDmSheet(g.keys,
        aligned ? renderAlignedBody(g.keys, alignPart(g.rows, 0, g.rows.length)) : renderPackedBody(g.keys))).join('');
    refreshIcons(root);
    await waitForLayout();

    // 2. 縮放字級；對齊版面仍放不下時依列分頁
    const used = [];
    const cover = root.querySelector('.dm-cover-sheet');
    if (cover) fitSheet(cover, FS_AUTO_MIN, FS_COVER_MAX);
    const firstPass = [...root.querySelectorAll('.sheet:not(.dm-cover-sheet)')];
    const splits = [];
    firstPass.forEach((sheet, i) => {
        if (!aligned && getSetting('fs') === 'auto') {
            // 整頁字級只縮到欄位標題放得下為止，其餘由各欄自行縮放
            sheet.style.fontSize = `${FS_AUTO_MAX}pt`;
            used.push(...fitPackedColumns(sheet, FS_AUTO_MAX));
            return;
        }
        const fs = fitSheet(sheet, aligned ? FS_PAGED_MIN : FS_AUTO_MIN);
        used.push(fs);
        if (aligned && isSheetOverflowing(sheet)) splits.push({ sheet, group: groups[i], fs });
    });
    splits.forEach(({ sheet, group, fs }) => {
        const parts = paginateAlignRows(group.rows, measureAlignRows(sheet));
        const html = parts.map(([start, end]) => renderDmSheet(group.keys,
            renderAlignedBody(group.keys, alignPart(group.rows, start, end)))).join('');
        const holder = document.createElement('div');
        holder.innerHTML = html;
        const newSheets = [...holder.children];
        newSheets.forEach(el => { el.style.fontSize = `${fs}pt`; });
        sheet.replaceWith(...newSheets);
        newSheets.forEach(el => refreshIcons(el));
    });
    if (splits.length) await waitForLayout();

    root.querySelectorAll('.sheet').forEach(sheet => sheet.classList.toggle('sheet-overflow', isSheetOverflowing(sheet)));
    const total = numberSheets(root);
    updatePreviewZoom();
    const overflow = root.querySelectorAll('.sheet-overflow').length;
    if (status) {
        const fsText = getSetting('fs') === 'auto' && used.length ? ` · 字級 ${Math.min(...used)}–${Math.max(...used)} pt` : '';
        status.textContent = `共 ${total} 頁${fsText}${overflow ? ` · ${overflow} 頁內容超出` : ''}`;
    }
}

// ------------------------------------------
// 設定列
// ------------------------------------------

function initToolbar() {
    document.querySelectorAll('[data-param]').forEach(el => {
        const name = el.dataset.param;
        if (el.type === 'checkbox') {
            el.checked = getSetting(name) === '1';
            el.addEventListener('change', () => { setSetting(name, el.checked ? '1' : '0'); renderSheets(); });
        } else {
            el.value = getSetting(name);
            el.addEventListener('change', () => { setSetting(name, el.value); renderSheets(); });
        }
    });

    document.getElementById('tb-print').addEventListener('click', () => window.print());
    window.addEventListener('resize', updatePreviewZoom);
    document.getElementById('tb-days').addEventListener('change', handleDayChipChange);

    // 返回行程頁 (保留資料參數)
    const query = new URLSearchParams();
    ['trip_token', 'trip_local', 'trip'].forEach(name => {
        if (sheetParams.get(name)) query.set(name, sheetParams.get(name));
    });
    document.getElementById('tb-back').href = `planner.html?${query}`;
}

async function startSheet() {
    const root = document.getElementById('sheet-root');
    try {
        sheetState.trip = await loadTrip();
        const meta = sheetState.trip.metadata || {};
        initSettings(meta);
        setTheme(meta.theme);
        sheetState.dayKeys = getSortedDayKeys(sheetState.trip.detail);
        document.title = `${meta.title || '行程'} · sheet`;
        initToolbar();
        await renderSheets();
    } catch (error) {
        console.error(error);
        root.innerHTML = `<div class="sheet sheet-error">無法產生列印頁：${esc(error.message || String(error))}</div>`;
    }
    refreshIcons();
}

startSheet();
