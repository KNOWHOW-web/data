const API_URL = "https://script.google.com/macros/s/AKfycby4L4PKEgjPW2iF4rpIEAP5aT9QjFHkkpLhHpU10qACc8ExbkRaHvnsF3WtL44gt82adw/exec";

// تعيين أماكن الأعمدة بناءً على ملفك
const MAP = { OPPORTUNITY: 1, ENTITY: 3, DATE: 4, STATUS: 7, VALUE: 9 };

let rawData = [];
let headers = [];
let hiddenRows = new Set(); 
let statusChart; // ✅ جديد

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const json = await response.json();

        headers = json.headers;
        rawData = json.data;

        console.log("HEADERS:", headers);
        console.log("RAW DATA:", rawData);

        updateDashboard();
        renderTable(rawData);
        populateMonthFilter();

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// تنظيف النصوص
const cleanText = (str) => {
    if (!str) return "";
    return String(str).toLowerCase()
        .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
        .replace(/أ|إ|آ/g, "ا").replace(/\\/g, '/').trim();
};

// البحث
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = cleanText(e.target.value);
    const filtered = rawData.filter(row => 
        row.some(cell => cleanText(cell).includes(term))
    );
    renderTable(filtered);
});

function populateMonthFilter() {
    const sel = document.getElementById('monthFilter');
    const options = ["أكتوبر 2025", "نوفمبر 2025", "ديسمبر 2025",
"يناير 2026", "فبراير 2026", "مارس 2026", "أبريل 2026", "مايو 2026", "يونيو 2026",
"يوليو 2026", "أغسطس 2026", "سبتمبر 2026", "أكتوبر 2026", "نوفمبر 2026", "ديسمبر 2026"];
    sel.innerHTML = '<option value="all">الاشهر</option>';
    options.forEach(m => sel.innerHTML += `<option value="${m}">${m}</option>`);

    sel.onchange = (e) => {
        if(e.target.value === "all") { resetFilters(); return; }
        document.getElementById('btnAll').classList.remove('active');
        filterDataByMonth(e.target.value);
    };
}

function resetFilters() {
    document.getElementById('btnAll').classList.add('active');
    document.getElementById('monthFilter').value = "all";
    document.getElementById('searchInput').value = "";
    renderTable(rawData);
}

function filterDataByMonth(selectedMonth) {
    const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    const filtered = rawData.filter(row => {
        let cell = row[MAP.DATE];
        let d;

        if (cell instanceof Date) {
            d = cell;
        } else {
            let clean = String(cell).replace(/\\/g, '/');
            let parts = clean.split('/');

            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    d = new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    d = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            } else {
                d = new Date(clean);
            }
        }

        if (isNaN(d)) return false;

        const formatted = `${monthsAr[d.getMonth()]} ${d.getFullYear()}`;
        return cleanText(formatted) === cleanText(selectedMonth);
    });

    renderTable(filtered);
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    document.getElementById('tableHeader').innerHTML = `<tr>
        <th>${headers[MAP.OPPORTUNITY]}</th><th>${headers[MAP.ENTITY]}</th><th>تاريخ التقديم</th>
        <th>حالة المنافسة</th><th>سعر العرض</th><th>عرض</th>
    </tr>`;

    tableBody.innerHTML = data.map((row, index) => {
        const isHidden = hiddenRows.has(index);
        const currentStatus = row[MAP.STATUS];
        return `
        <tr id="row-${index}">
            <td>${isHidden ? '**********' : row[MAP.OPPORTUNITY]}</td>
            <td>${isHidden ? '**********' : row[MAP.ENTITY]}</td>
            <td>${row[MAP.DATE]}</td>
            <td>
                <select class="status-dropdown" onchange="updateStatus(${index}, this.value)">
                    ${getStatusOptions(currentStatus)}
                </select>
            </td>
            <td>${isHidden ? '**********' : (parseFloat(row[MAP.VALUE]) || 0).toLocaleString()}</td>
            <td>
                <button class="eye-btn" onclick="togglePrivacy(${index})">
                    ${isHidden ? getClosedEyeSVG() : getOpenEyeSVG()}
                </button>
            </td>
        </tr>`;
    }).join('');
}

function getStatusOptions(selected) {
    const statuses = ["قيد التقديم", "تم التقديم", "بانتظار النتيجة", "منتهية", "مرحله الترسية", "تم الإلغاء", "تم اعتماد الترسية", "مرحلة فحص العروض الفنية"];
    return statuses.map(opt => `<option value="${opt}" ${opt.trim() === String(selected).trim() ? 'selected' : ''}>${opt}</option>`).join('');
}

function togglePrivacy(index) {
    hiddenRows.has(index) ? hiddenRows.delete(index) : hiddenRows.add(index);
    renderTable(rawData);
}

function getOpenEyeSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#718096" viewBox="0 0 24 24">
        <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
        <circle cx="12" cy="12" r="2.5"/>
    </svg>`;
}
function getClosedEyeSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#718096" viewBox="0 0 24 24">
        <path d="M2 2l20 20"/>
        <path d="M12 5c-7 0-11 7-11 7a21.8 21.8 0 0 0 5 5"/>
        <path d="M9.5 9.5a3 3 0 0 0 4 4"/>
    </svg>`;
}
// =========================
// ✅ الشارت
// =========================
function getStatusCounts() {
    const counts = {};

    rawData.forEach(row => {
        let status = row[MAP.STATUS];

        if (!status || String(status).trim() === "") return;

        counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
}

function renderChart() {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const counts = getStatusCounts();

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function updateDashboard() {
    document.getElementById('total-count').innerText = rawData.length;
    const totalVal = rawData.reduce((sum, row) => sum + (parseFloat(row[MAP.VALUE]) || 0), 0);
    document.getElementById('total-value').innerText = totalVal.toLocaleString() + " ر.س";

    renderChart(); // ✅
}

function setupNavigation() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const mainContent = document.getElementById('main-content'); // ✅

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item, .page').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.dataset.page).classList.add('active');

            sidebar.classList.remove('show');
            mainContent.classList.remove('shift'); // ✅
        });
    });

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('show');
        mainContent.classList.toggle('shift'); // ✅
    });

    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('show') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
            sidebar.classList.remove('show');
            mainContent.classList.remove('shift'); // ✅
        }
    });
}

async function updateStatus(rowIndex, newValue) {
    const originalValue = rawData[rowIndex][MAP.STATUS];
    rawData[rowIndex][MAP.STATUS] = newValue;

    updateDashboard(); // ✅ تحديث مباشر

    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
                row: rowIndex + 2,
                value: newValue
            })
        });

    } catch (error) {
        rawData[rowIndex][MAP.STATUS] = originalValue;
        renderTable(rawData);
        alert("فشل الاتصال");
    }
}