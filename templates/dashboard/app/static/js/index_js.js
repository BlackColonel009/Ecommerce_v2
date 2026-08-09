// -------------------------
// SCRIPT DASHBOARD
// -------------------------

// Récupérer et afficher le nom de l'admin
async function fetchAdminName() {
    const token = localStorage.getItem("access_token"); // uniformisé ici
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!res.ok) throw new Error("Erreur API fetchAdminName");

        const data = await res.json();
        const adminName = data.username || data.full_name || "Administrateur";
        const nameSpan = document.querySelector("#adminName");
        const menuName = document.querySelector("#adminNameMenu");
        if (nameSpan) nameSpan.textContent = adminName;
        if (menuName) menuName.textContent = adminName;
    } catch (err) {
        console.error("Erreur fetchAdminName:", err);
    }
}

// Récupérer les stats du dashboard
async function fetchDashboardStats() {
    const token = localStorage.getItem("access_token");
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE}/stats/admin/kpis`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Erreur API /admin/kpis');

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des stats :', error);
        return null;
    }
}


// Récupérer les leads de la semaine pour l'Area Chart
async function fetchLeadsWeek() {
    const token = localStorage.getItem("access_token");
    if (!token) return null;

    try {
        const res = await fetch(`${API_BASE}/stats/admin/leads-week`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur API /admin/leads-week');
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Initialiser l'Area Chart
async function initAreaChart() {
    const stats = await fetchLeadsWeek();
    if (!stats || !stats.leadsWeek) return;

    const ctx = document.getElementById('leadsAreaChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: stats.leadsWeek.labels,
            datasets: [{
                label: "Leads de la semaine",
                data: stats.leadsWeek.data,
                backgroundColor: "rgba(237, 0, 18, 0.07)",
                borderColor: "#ed0012",
                borderWidth: 3,
                pointBackgroundColor: "#edd500",
                pointBorderColor: "#111214",
                pointRadius: 4,
                pointHoverRadius: 5,
                lineTension: 0.35,
                fill: true
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { ticks: { beginAtZero: true } }
            }
        }
    });
}

// Initialiser le chart des leads par statut (Pie Chart)
async function initPieChart() {
    const stats = await fetchDashboardStats();
    if (!stats || !stats.leads) return;

    const ctx = document.getElementById('leadsStatusPieChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Confirmed', 'Cancelled'],
            datasets: [{
                data: [
                    stats.leads.pending || 0,
                    stats.leads.confirmed || 0,
                    stats.leads.cancelled || 0
                ],
                backgroundColor: ['#edd500', '#111214', '#ed0012'],
                hoverBackgroundColor: ['#d8c200', '#292b2f', '#c9000f'],
                hoverBorderColor: "#ffffff"
            }]
        },
        options: { maintainAspectRatio: false }
    });
}

// Initialiser le Pie Chart pour les sources de visiteurs
async function initSourcesPieChart() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/stats/sources`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error('Erreur API /sources');

        const stats = await res.json();
        if (!stats.data) return;

        const ctx = document.getElementById('visitorSourcesPieChart')?.getContext('2d');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.data),  // ["Direct", "Social", "Referral"]
                datasets: [{
                    data: Object.values(stats.data), // [countDirect, countSocial, countReferral]
                    backgroundColor: ['#ed0012', '#111214', '#edd500'],
                    hoverBackgroundColor: ['#c9000f', '#292b2f', '#d8c200'],
                    hoverBorderColor: "#ffffff"
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

    } catch (err) {
        console.error('Erreur lors de la récupération des sources :', err);
    }
}

// Mettre à jour les indicateurs KPI sur le dashboard
async function updateKpiStats() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/stats/admin/kpis`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error('Erreur API /admin/kpis');

        const stats = await res.json();

        // Injecter les valeurs dans le DOM
        const kpis = {
            'registered-products': stats.products || 0,
            'total-leads': stats.total || 0,
            'confirmed-leads': stats.leads.confirmed || 0,
            'pending-leads': stats.leads.pending || 0,
            'cancelled-leads': stats.leads.cancelled || 0
        };

        Object.entries(kpis).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

    } catch (err) {
        console.error('Erreur lors de la récupération des KPI :', err);
    }
}

// Notification des leads et messages



async function loadAlerts() {
    const token = localStorage.getItem("access_token");

    const [leadsRes, supportRes] = await Promise.all([
        fetch(`${API_BASE}/admin/leads`, { headers: { Authorization: `Bearer ${token}` }}),
        fetch(`${API_BASE}/support/messages`, { headers: { Authorization: `Bearer ${token}` }})
    ]);

    const leads = await leadsRes.json();
    const supports = await supportRes.json();

    let alerts = [];

    // Leads → notifications
    leads.slice(0, 5).forEach(lead => {
        alerts.push({
            id: lead.id,
            type: "lead",
            message: `Nouveau lead : ${lead.name}`,
            created_at: lead.created_at,
            link: "/admin/leads"
        });
    });

    // Support → notifications
    supports.slice(0, 5).forEach(msg => {
        alerts.push({
            id: msg.id,
            type: "support",
            message: `Message support de ${msg.name}`,
            created_at: msg.created_at,
            link: "/admin/support"
        });
    });

    // Trier par date décroissante
    alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderAlerts(alerts.slice(0, 6));
}



function renderAlerts(alerts) {
    const list = document.getElementById("alertsList");
    const counter = document.getElementById("alertsCount");

    if (!list || !counter) return;

    list.innerHTML = "";

    if (!alerts.length) {
        counter.classList.add("d-none");
        list.innerHTML = `
            <div class="dropdown-item text-center text-gray-500">
                Aucune alerte
            </div>`;
        return;
    }

    counter.textContent = alerts.length;
    counter.classList.remove("d-none");

    alerts.forEach(alert => {
        list.innerHTML += `
            <a class="dropdown-item d-flex align-items-center" href="${alert.link}">
                <div class="mr-3">
                    <div class="icon-circle bg-${alert.type === "lead" ? "primary" : "warning"}">
                        <i class="fas ${alert.type === "lead" ? "fa-user-plus" : "fa-life-ring"} text-white"></i>
                    </div>
                </div>
                <div>
                    <div class="small text-gray-500">${timeAgo(alert.created_at)}</div>
                    <span class="font-weight-bold">${alert.message}</span>
                </div>
            </a>
        `;
    });
}

async function loadMessages() {
    const res = await fetch(`${API_BASE}/support/messages`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("access_token") }
    });

    const messages = await res.json();

    const list = document.getElementById("messagesList");
    const counter = document.getElementById("messagesCount");

    if (!list || !counter) return;

    list.innerHTML = "";

    if (!messages.length) {
        counter.classList.add("d-none");
        list.innerHTML = `
            <div class="dropdown-item text-center text-gray-500">
                Aucun message
            </div>`;
        return;
    }

    counter.textContent = messages.length;
    counter.classList.remove("d-none");

    messages.slice(0, 5).forEach(msg => {
        list.innerHTML += `
            <a class="dropdown-item d-flex align-items-center" href="${API_BASE}/admin/support">
                <div class="dropdown-list-image mr-3">
                    <img class="rounded-circle" src="img/undraw_profile.svg">
                    <div class="status-indicator bg-success"></div>
                </div>
                <div class="font-weight-bold">
                    <div class="text-truncate">${msg.message}</div>
                    <div class="small text-gray-500">${msg.name} · ${timeAgo(msg.created_at)}</div>
                </div>
            </a>
        `;
    });
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const units = [
        { label: "j", value: 86400 },
        { label: "h", value: 3600 },
        { label: "min", value: 60 }
    ];

    for (let u of units) {
        const val = Math.floor(seconds / u.value);
        if (val >= 1) return `${val}${u.label}`;
    }
    return "à l'instant";
}


async function updateSupportMessagesCount() {
    try {
        const token = localStorage.getItem("access_token"); // ou "access_token"
        if (!token) return;

        const res = await fetch(`${API_BASE}/support/messages`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Erreur API /support/messages");

        const messages = await res.json();
        const count = messages.length || 0;
        const countEl = document.getElementById("supportMessagesCount");
        const kpiEl = document.getElementById("supportMessagesKpi");
        if (countEl) countEl.textContent = count;
        if (kpiEl) kpiEl.textContent = count;

    } catch (err) {
        console.error("Erreur lors de la récupération des messages :", err);
    }
}

let dashboardInitialized = false;

function initializeDashboard() {
    if (dashboardInitialized) return;
    dashboardInitialized = true;

    fetchAdminName();
    initSourcesPieChart();
    updateKpiStats();
    initAreaChart();
    initPieChart();
    updateSupportMessagesCount();
    loadAlerts();
    loadMessages();
    setInterval(updateSupportMessagesCount, 60000);
    setInterval(loadAlerts, 60000);
    setInterval(loadMessages, 60000);
}

document.addEventListener("dashboard:components-ready", initializeDashboard);

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("#alertsList")) initializeDashboard();
});
