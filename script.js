const API_URL = "https://script.google.com/macros/s/AKfycbxTpQZXDU9tFHp7JVlHeWPgm9NzvwIjXYYGAsrZSngeoXxy08IRPIsOj8BOiyvoPChnyg/exec";

let COL = {};
let rawData = [];
let headers = [];

let resultOptions = [];

let resultChart;
let techChart;
let activeFilter = "all";
let selectedMonth = "";

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    fetchData();
    generateMonths();
});

// =========================
// Fetch Data
// =========================
async function fetchData() {
    const res = await fetch(API_URL);
    const json = await res.json();

    headers = json.headers;
    rawData = json.data;

    headers.forEach((h, i) => {
        COL[String(h).trim()] = i;
    });

    resultOptions = [
        ...new Set(
            rawData
                .map(r => r[COL["نتيجة المنافسة"]])
                .filter(v => v && v !== "غير محدد")
        )
    ];

    updateDashboard();
    renderTable(rawData);
    renderResultChart();
    renderTechChart();
}

// =========================
// Dashboard
// =========================
function updateDashboard() {

    const competitionsCount = new Set(
        rawData
            .map(r => r[COL["اسم المنافسة"]])
            .filter(v => v && v.trim() !== "")
    ).size;

    document.getElementById('total-count').innerText = competitionsCount;

    const totalOffer = rawData.reduce((s, r) => {
        let val = r[COL["سعر العرض"]];
        val = String(val || "").replace(/,/g, "").trim();
        return s + (parseFloat(val) || 0);
    }, 0);

    document.getElementById('total-value').innerText =
        totalOffer.toLocaleString() + " ر.س";

    const awardTotal = rawData.reduce((s, r) => {
        let val = r[COL["سعر الترسية"]];

        if (!val) return s;

        val = String(val)
            .replace(/,/g, "")
            .replace(/[^\d.]/g, "")
            .trim();

        return s + (parseFloat(val) || 0);
    }, 0);

    document.getElementById('award-total').innerText =
        awardTotal.toLocaleString() + " ر.س";
}

// =========================
// Table
// =========================
function renderTable(data) {

    document.getElementById('tableHeader').innerHTML = `
    <tr>
        <th>اسم المنافسة</th>
        <th>الجهة</th>
        <th>تاريخ التقديم</th>
        <th>تاريخ الترسية</th>
        <th>نتيجة المنافسة</th>
        <th>سعر العرض</th>
    </tr>`;

    document.getElementById('tableBody').innerHTML =
        data.map((r, i) => `
        <tr>
            <td>${r[COL["اسم المنافسة"]] || ""}</td>
            <td>${r[COL["الجهة المستفيدة"]] || ""}</td>
            <td class="date-cell">${formatDate(r[COL["تاريخ التقديم"]])}</td>
            <td class="date-cell">${formatDate(r[COL["تاريخ الترسية"]])}</td>

            <td>
                <select onchange="updateResult(${i}, this.value)">
                    ${renderResultOptions(r[COL["نتيجة المنافسة"]])}
                </select>
            </td>

            <td>${(parseFloat(r[COL["سعر العرض"]]) || 0).toLocaleString()}</td>
        </tr>
    `).join('');
}

// =========================
// Dropdown
// =========================
function renderResultOptions(selected){
    return resultOptions.map(v => `
        <option ${v === selected ? "selected" : ""}>
            ${v}
        </option>
    `).join('');
}

// =========================
// Update Result
// =========================
async function updateResult(i, val){
    rawData[i][COL["نتيجة المنافسة"]] = val;

    await fetch(API_URL,{
        method:"POST",
        body:JSON.stringify({
            row:i+2,
            colName:"نتيجة المنافسة",
            value:val
        })
    });

    renderResultChart();
    renderTechChart();
}

// =========================
// Date format
// =========================
function formatDate(d) {
    if (!d) return "";

    if (typeof d === "number") {
        const date = new Date(Math.round((d - 25569) * 86400 * 1000));
        return formatLocalDate(date);
    }

    const date = new Date(d);
    if (isNaN(date)) return d;

    return formatLocalDate(date);
}

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// =========================
// Result Chart
// =========================
function getResultStats() {
    const stats = {};

    rawData.forEach(r => {
        let val = r[COL["نتيجة المنافسة"]];
        if (!val || val === "غير محدد") return;
        stats[val] = (stats[val] || 0) + 1;
    });

    return stats;
}

function renderResultChart() {
    const stats = getResultStats();
    const labels = Object.keys(stats);
    const data = Object.values(stats);

    if (resultChart) resultChart.destroy();

    resultChart = new Chart(document.getElementById('resultChart'), {
        type: 'pie',
        data: { labels, datasets: [{ data }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12, 
                        padding: 15,
                        font: { size: 11 } 
                    }
                },
                datalabels: {
                    color: '#fff', 
                    font: { weight: 'bold', size: 12 },
                    formatter: v => v
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function normalizeText(t) {
    return String(t || "")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي");
}

function getTechStats() {

    let rejectedTech = 0;
    let acceptedRejectedFinance = 0;
    let acceptedHigherPrice = 0;

    rawData.forEach(r => {

        const val = normalizeText(r[COL["نتيجة المنافسة"]]);

       
        if (val.includes("مرفوض فني")) {
            rejectedTech++;
        }

       
        else if (val.includes("مقبول فني") && val.includes("مرفوض")) {
            acceptedRejectedFinance++;
        }

      
        else if (val.includes("مقبول فني") && val.includes("السعر")) {
            acceptedHigherPrice++;
        }
    });

    return {
        rejectedTech,
        acceptedRejectedFinance,
        acceptedHigherPrice
    };
}

// =========================
// TECH CHART
// =========================
function renderTechChart() {
    const stats = getTechStats();
    const dataArr = [stats.rejectedTech, stats.acceptedRejectedFinance, stats.acceptedHigherPrice];
    const total = dataArr.reduce((a, b) => a + b, 0);

    if (techChart) techChart.destroy();

    techChart = new Chart(document.getElementById('techChart'), {
        type: 'doughnut',
        data: {
            labels: ["مرفوض فني", "مقبول فني مرفوض مالي", "مقبول فني السعر أعلى"],
            datasets: [{
                data: dataArr,
                backgroundColor: ["#ff4d4f", "#faad14", "#52c41a"],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%', 
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 11 }
                    }
                },
                datalabels: {
                    color: '#000',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => {
                        return total ? ((value / total) * 100).toFixed(1) + "%" : "0%";
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}
// =========================
// Navigation
// =========================
function setupNavigation(){
    const sidebar=document.getElementById('sidebar');
    const toggle=document.getElementById('toggle-sidebar');
    const main=document.getElementById('main-content');
    const overlay=document.getElementById('overlay');

    document.querySelectorAll('.nav-item').forEach(item=>{
        item.onclick=()=>{
            document.querySelectorAll('.nav-item,.page').forEach(e=>e.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.dataset.page).classList.add('active');
        };
    });

    function closeSidebar(){
        sidebar.classList.remove('show');
        main.classList.remove('shift');
        overlay.classList.remove('show');
    }

    toggle.onclick=()=>{
        sidebar.classList.toggle('show');
        main.classList.toggle('shift');
        overlay.classList.toggle('show');
    };

    overlay.onclick = closeSidebar;

    document.addEventListener("click", (e) => {
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
            closeSidebar();
        }
    });
}

// =========================
// Month Filter Generator
// =========================
function generateMonths() {
    const start = new Date(2025, 9);
    const end = new Date(2026, 11);

    const select = document.getElementById("monthFilter");

    while (start <= end) {
        const value = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
        const label = start.toLocaleString("ar", { month: "long", year: "numeric" });

        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;

        select.appendChild(option);
        start.setMonth(start.getMonth() + 1);
    }
}

// =========================
// Event Listeners (Filters)
// =========================
document.getElementById("searchInput").addEventListener("input", applyFilters);

document.getElementById("btnAll").addEventListener("click", () => {
    activeFilter = "all";
    document.getElementById("monthFilter").value = "";
    applyFilters();
});

document.getElementById("monthFilter").addEventListener("change", (e) => {
    activeFilter = "month";
    selectedMonth = e.target.value;
    applyFilters();
});


// =========================
// Filters Logic
// =========================

function applyFilters() {
    let filtered = [...rawData];

    const search = document.getElementById("searchInput").value.toLowerCase();

    if (search) {
        filtered = filtered.filter(r =>
            (r[COL["اسم المنافسة"]] || "").toLowerCase().includes(search) ||
            (r[COL["الجهة المستفيدة"]] || "").toLowerCase().includes(search)
        );
    }

    if (activeFilter === "month" && selectedMonth) {
        filtered = filtered.filter(r => {
            const d1 = formatDateToMonth(r[COL["تاريخ التقديم"]]);
            const d2 = formatDateToMonth(r[COL["تاريخ الترسية"]]);

            return d1 === selectedMonth || d2 === selectedMonth;
        });
    }

    renderTable(filtered);
}

// =========================
// Date Utilities
// =========================
function formatDateToMonth(d) {
    if (!d) return "";

    let date = new Date(d);

    if (typeof d === "number") {
        date = new Date(Math.round((d - 25569) * 86400 * 1000));
    }

    if (isNaN(date)) return "";

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
