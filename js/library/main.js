/**
 * 行程庫頁面進入點：事件綁定、匯入 JSON、新增空白行程。
 */

window.addEventListener('load', () => {
    restoreSession();
    loadTripList();
    bindLibraryEvents();
    loadDebugDataList();
    refreshIcons();
});

function bindLibraryEvents() {
    const on = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    on('auth-btn', 'click', handleAuthClick);
    on('picker-btn', 'click', openDrivePicker);
    on('logout-btn', 'click', handleLogout);
    on('import-btn', 'click', () => document.getElementById('file-upload').click());
    on('file-upload', 'change', handleFileImport);
    on('edit-toggle', 'click', toggleEditMode);
    on('btn-create-json', 'click', handleCreateNewTrip);
    on('debug-refresh-btn', 'click', loadDebugDataList);
}

// ------------------------------------------
// 從電腦匯入 JSON
// ------------------------------------------

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const fileContent = e.target.result;
        try {
            const tripData = JSON.parse(fileContent);
            setStatus('loading', '正在處理中...');

            if (libraryState.accessToken) {
                // 雲端模式：上傳並更新雲端總表，快取以 Drive file ID 為 key
                const driveFileId = await createOrUpdateTripFile(fileContent, file.name);
                if (driveFileId) {
                    TripStorage.setJson(driveFileId, tripData);
                    await updateTripListInCloud('add', driveFileId, file.name);
                    setStatus('success', '匯入並同步完成');
                }
            } else {
                // 本地模式：以檔名為 key
                TripStorage.setJson(file.name, tripData);
                addToLocalTripList(file.name, file.name);
                setStatus('local', '已儲存至本地');
            }

            loadTripList();
        } catch (error) {
            console.error(error);
            alert('檔案格式錯誤或上傳失敗。');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ------------------------------------------
// 新增空白行程
// ------------------------------------------

function buildNewTripTemplate(today = new Date()) {
    return {
        metadata: {
            title: '新建立的行程',
            subtitle: `${today.getFullYear()} ${MONTH_NAMES[today.getMonth()]}`,
        },
        detail: {
            [formatDateKey(today)]: {
                title: '抵達與市區觀光',
                subtitle: '未定',
                region: '未定',
                tips: [
                    {
                        type: 'info',
                        title: '行程提醒',
                        desc: '這是您的第一天行程，點擊右上角「編輯模式」開始規劃！',
                    },
                ],
                timeline: [
                    {
                        time: '12:00',
                        title: '開始旅程',
                        type: 'flight',
                        desc: '點擊修改航班與詳細資訊...',
                        amount: 0,
                    },
                ],
            },
        },
    };
}

async function handleCreateNewTrip() {
    const input = prompt('請輸入新行程的檔案名稱:', '未命名新行程.json');
    const fileName = input ? input.trim() : '';
    if (!fileName) return;

    // 避免覆蓋同名行程 (本地以檔名為 id，雲端以 name 比對)
    const exists = libraryState.tripMasterData.trips.some(t => t.id === fileName || t.name === fileName);
    if (exists) {
        alert(`已經存在名為「${fileName}」的行程，請使用其他名稱！`);
        return;
    }

    const template = buildNewTripTemplate();
    setStatus('loading', '正在建立新行程...');

    try {
        if (libraryState.accessToken) {
            const driveFileId = await createOrUpdateTripFile(JSON.stringify(template), fileName);
            if (driveFileId) {
                TripStorage.setJson(driveFileId, template);
                await updateTripListInCloud('add', driveFileId, fileName);
                setStatus('success', '新增並同步完成');
                window.open(buildPlannerUrl(driveFileId, true), '_blank');
            }
        } else {
            TripStorage.setJson(fileName, template);
            addToLocalTripList(fileName, fileName);
            setStatus('local', '已建立至本地');
            window.open(buildPlannerUrl(fileName, false), '_blank');
        }

        loadTripList();
    } catch (error) {
        console.error('建立行程失敗:', error);
        alert('建立失敗，請檢查網路連線或儲存空間。');
    }
}
