/**
 * 輕量 Markdown 轉 HTML (支援粗體、圖片、連結、行內程式碼、兩層清單)。
 */

// Google Drive 圖片顯示寬度上限 (px)
const DRIVE_IMAGE_WIDTH = 2000;

/**
 * 將 Google Drive 分享連結轉為可直接嵌入 <img> 的網址。
 * 分享連結 (/file/d/ID/view、open?id=ID、uc?id=ID) 回傳的是 HTML 預覽頁或會被瀏覽器擋下，
 * 改用 thumbnail 端點可直接取得圖片 (檔案需設為「知道連結的任何人」可檢視)。
 * 非 Drive 網址原樣回傳。
 */
function normalizeImageUrl(url) {
    if (!url) return url;
    const trimmed = url.trim();
    if (!/^https?:\/\/(drive|docs)\.google\.com\//i.test(trimmed)) return trimmed;

    const match = /\/file\/d\/([\w-]+)/.exec(trimmed) || /[?&]id=([\w-]+)/.exec(trimmed);
    if (!match) return trimmed;
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${DRIVE_IMAGE_WIDTH}`;
}

/**
 * 圖片尺寸語法：接在圖片網址後面，以空白分隔。
 *   ![](url =50%)     寬度 50%，置中
 *   ![](url =300)     寬度 300px (超過卡片寬度時縮到 100%)
 *   ![](url =x240)    高度最多 240px，寬度依比例
 *   ![](url =50%x240) 同時限制寬度與高度
 * 沒有指定時維持原本的填滿寬度。
 */
const IMAGE_SIZE_RE = /^=(\d+(?:\.\d+)?%?)?(?:x(\d+))?$/;

/** 將尺寸語法轉為 inline style；格式不符或未指定時回傳空字串 */
function imageSizeStyle(sizeSpec) {
    const match = sizeSpec ? IMAGE_SIZE_RE.exec(sizeSpec.trim()) : null;
    if (!match || (!match[1] && !match[2])) return '';
    const [, width, height] = match;
    const styles = ['display:block', 'max-width:100%', 'margin-left:auto', 'margin-right:auto'];
    if (width) styles.push(`width:${width.endsWith('%') ? width : `${width}px`}`);
    if (height) styles.push(`max-height:${height}px`, 'object-fit:contain');
    if (height && !width) styles.push('width:auto');
    return styles.join(';');
}

/** 將 "網址 =50%" 拆成網址與尺寸 style */
function splitImageTarget(target) {
    const parts = target.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (parts.length > 1 && IMAGE_SIZE_RE.test(last)) {
        return { url: parts.slice(0, -1).join(' '), style: imageSizeStyle(last) };
    }
    return { url: target.trim(), style: '' };
}

function renderImage(alt, rawUrl, title = '', sizeSpec = '') {
    const url = normalizeImageUrl(rawUrl);

    // 白名單協定，擋掉 javascript: 等惡意來源
    if (!/^(https?:|data:image\/)/i.test(url)) {
        console.warn('已阻擋不安全的圖片來源:', url);
        return `<span class="text-xs text-rose-500">[圖片來源不安全]</span>`;
    }

    const safeAlt = escapeHtml(alt);
    const safeTitle = title ? ` title="${escapeHtml(title)}"` : '';
    const sizeStyle = imageSizeStyle(sizeSpec);

    return `
    <figure class="my-2 break-inside-avoid">
      <img src="${url}"
           alt="${safeAlt}"${safeTitle}
           loading="lazy"
           referrerpolicy="no-referrer"
           class="w-full rounded-lg border border-slate-200 object-cover print:max-h-48"${sizeStyle ? ` style="${sizeStyle}"` : ''}
           onerror="this.closest('figure').innerHTML='<span class=\\'text-xs text-slate-400\\'>圖片載入失敗</span>'">
      ${safeAlt ? `<figcaption class="text-xs text-slate-400 mt-1 text-center">${safeAlt}</figcaption>` : ''}
    </figure>`;
}

function parseInlineMarkdown(text) {
    if (!text) return '';

    return text
        // 圖片必須先處理 (語法比連結多一個驚嘆號)
        .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+(=[\d.%x]+))?(?:\s+"([^"]*)")?\)/g,
            (m, alt, url, size, title) => renderImage(alt, url, title, size))
        // 連結
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-600 underline">$1</a>')
        // 粗體
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // 行內程式碼
        .replace(/`([^`]+)`/g, '<code class="px-1 bg-slate-100 rounded text-xs">$1</code>');
}

// 表格欄數 <= 此值且列數 >= 下限時，拆成左右兩組並排顯示
const TABLE_SPLIT_MAX_COLUMNS = 3;
const TABLE_SPLIT_MIN_ROWS = 8;

// Checklist 語法：- [ ] 未完成、- [x] 已完成
const TASK_ITEM_RE = /^\[( |x|X)\]\s+(.*)/;

/**
 * 單筆清單項目；checklist 項目改用方框取代圓點 (純顯示，不可點選)。
 * @param {string} content - 清單項目文字 (已處理過行內語法)
 * @param {boolean} isSubItem - 是否為第二層
 */
function renderListItem(content, isSubItem) {
    const task = TASK_ITEM_RE.exec(content);
    if (!task) return `<li>${content}</li>`;
    const checked = task[1] !== ' ';
    const box = `<span class="inline-flex items-center justify-center shrink-0 w-3.5 h-3.5 mt-[0.3em] rounded-sm border ${checked ? 'border-slate-500 bg-slate-500 text-white' : 'border-slate-400 bg-white'}" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">${checked ? '<svg viewBox="0 0 12 12" class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 6.5 L5 9 L9.5 3.5"/></svg>' : ''}</span>`;
    const text = checked ? `<span class="line-through text-slate-400">${task[2]}</span>` : `<span>${task[2]}</span>`;
    return `<li class="list-none flex items-start gap-1.5 ${isSubItem ? '-ml-4' : '-ml-5'}">${box}${text}</li>`;
}

/**
 * 將 Markdown 語法轉換為 HTML
 * @param {string} text - 原始 Markdown 文字
 * @param {boolean} isPrint - 是否為列印模式 (列印時移除連結)
 */
function parseMarkdownList(text, isPrint = false) {
    if (!text || typeof text !== 'string') return '';

    let html = text;

    // 1. 粗體
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. 圖片 ![替代文字](圖片路徑) 或 ![替代文字](圖片路徑 =50%)
    const imgClass = isPrint
        ? 'w-full mt-3 rounded-xl border border-slate-200 shadow-sm break-inside-avoid'
        : 'w-full mt-3 rounded-xl border border-slate-200 shadow-sm';
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, target) => {
        const { url, style } = splitImageTarget(target);
        const styleAttr = style ? ` style="${style}"` : '';
        return `<img src="${normalizeImageUrl(url)}" alt="${alt}" referrerpolicy="no-referrer" class="${imgClass}"${styleAttr}>`;
    });

    // 3. 連結 [文字](網址)
    if (isPrint) {
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '');
    } else {
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) =>
            `<a href="${url}" target="_blank" class="inline-flex items-center gap-0.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 px-1.5 py-0.5 rounded text-xs font-bold tracking-wide transition-colors duration-200 shadow-sm align-middle mx-1 -translate-y-[1px]"><span>${label}</span><i data-lucide="external-link" class="w-3 h-3"></i></a>`
        );
    }
    html = parseInlineMarkdown(html);

    // 4. 混排的清單與一般段落 (支援兩層巢狀)
    const lines = html.split('\n');
    let finalHtml = '';
    let mainListType = null; // 'ol' 或 'ul'
    let inSubList = false;
    let tableRows = []; // 暫存連續的表格列

    const closeSubList = () => {
        if (inSubList) {
            finalHtml += '</ul>';
            inSubList = false;
        }
    };
    const closeMainList = () => {
        if (mainListType) {
            finalHtml += `</${mainListType}>`;
            mainListType = null;
        }
    };
    // 輸出表格：若第二列為分隔線 (---|---)，第一列視為表頭
    const flushTable = () => {
        if (!tableRows.length) return;
        // 單獨一行不視為表格，當作一般文字
        if (tableRows.length === 1) {
            finalHtml += `<div class="ui-desc mt-1">${tableRows[0].trim()}</div>`;
            tableRows = [];
            return;
        }
        const splitCells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const isSeparator = row => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(row);
        let header = null;
        let body = tableRows;
        if (tableRows.length > 1 && isSeparator(tableRows[1])) {
            header = splitCells(tableRows[0]);
            body = tableRows.slice(2);
        }
        const cellClass = 'border border-slate-200 px-2 py-1 align-top';
        const buildTable = (rows, extraClass) => {
            let t = `<table class="w-full text-sm border-collapse ${extraClass}">`;
            if (header) {
                t += '<thead><tr>' + header.map(c => `<th class="${cellClass} bg-slate-50 text-left font-bold">${c}</th>`).join('') + '</tr></thead>';
            }
            t += '<tbody>' + rows.map(r => '<tr>' + splitCells(r).map(c => `<td class="${cellClass}">${c}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
            return t;
        };

        // 欄數少 (<= 3) 且列數多 (>= 8) 的表格，撐滿寬度會很空，拆成左右兩組並排 (各自有表頭)
        const columnCount = Math.max(header ? header.length : 0, ...body.map(r => splitCells(r).length));
        if (columnCount <= TABLE_SPLIT_MAX_COLUMNS && body.length >= TABLE_SPLIT_MIN_ROWS) {
            const half = Math.ceil(body.length / 2);
            // 網頁：窄螢幕回到單組；列印：固定兩組
            const gridClass = isPrint ? 'grid grid-cols-2 gap-x-4 items-start break-inside-avoid' : 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 items-start';
            finalHtml += `<div class="${gridClass} mt-2 mb-2">${buildTable(body.slice(0, half), '')}${buildTable(body.slice(half), '')}</div>`;
        } else {
            finalHtml += buildTable(body, isPrint ? 'mt-2 mb-2 break-inside-avoid' : 'mt-2 mb-2');
        }
        tableRows = [];
    };

    lines.forEach(line => {
        // 不先 trim()，需要前方空白數量判斷階層
        if (!line.trim()) {
            flushTable();
            return;
        }

        // 擷取 (1.前方空白) (2.文字內容)
        const ulMatch = /^(\s*)[-*]\s+(.*)/.exec(line);
        const olMatch = /^(\s*)(?:\d+|#)\.\s+(.*)/.exec(line);

        // 表格列：非清單項目且含有 |
        if (!ulMatch && !olMatch && line.includes('|')) {
            closeSubList();
            closeMainList();
            tableRows.push(line);
            return;
        }
        flushTable();

        if (!ulMatch && !olMatch) {
            // 一般文字：先關閉所有清單
            closeSubList();
            closeMainList();
            finalHtml += `<div class="ui-desc mt-1">${line.trim()}</div>`;
            return;
        }

        const isUl = !!ulMatch;
        const match = isUl ? ulMatch : olMatch;
        const isSubItem = match[1].length > 0; // 有縮排就是子項目
        const content = match[2];
        const itemHtml = renderListItem(content, isSubItem);

        if (isSubItem) {
            if (!inSubList) {
                finalHtml += '<ul class="list-[circle] list-outside ml-6 space-y-1 mt-1.5 mb-2 text-slate-600">';
                inSubList = true;
            }
            finalHtml += itemHtml;
            return;
        }

        closeSubList();
        const targetType = isUl ? 'ul' : 'ol';
        if (mainListType !== targetType) {
            closeMainList();
            const listClass = isUl ? 'list-disc' : 'list-decimal';
            finalHtml += `<${targetType} class="${listClass} list-outside ml-5 space-y-1.5 ui-desc mt-2 mb-2">`;
            mainListType = targetType;
        }
        finalHtml += itemHtml;
    });

    flushTable();
    closeSubList();
    closeMainList();
    return finalHtml;
}
