async function fetchLeads() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(`${API_BASE}/admin/leads`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) {
        console.error("Erreur chargement leads");
        return;
    }

    const leads = await res.json();
    renderLeads(leads);
}

function renderLeads(leads) {
    const tbody = document.getElementById("leadsTableBody");
    tbody.innerHTML = "";

    leads.forEach(lead => {
        const badge =
            lead.status === "confirmed" ? "success" :
            lead.status === "cancelled" ? "danger" : "warning";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${lead.name}</td>
            <td>${lead.whatsapp}</td>
            <td>${lead.product_requested}</td>
            <td><span class="badge badge-${badge}">${lead.status}</span></td>
            <td>${new Date(lead.created_at).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="updateLeadStatus(${lead.id}, 'confirmed')">✔</button>
                <button class="btn btn-sm btn-danger" onclick="updateLeadStatus(${lead.id}, 'cancelled')">✖</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener("DOMContentLoaded", fetchLeads);

async function updateLeadStatus(id, status) {
    const token = localStorage.getItem("access_token");

    const res = await fetch(`${API_BASE}/admin/leads/${id}/status`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    });

    if (res.ok) {
        fetchLeads(); // refresh
    } else {
        alert("Erreur mise à jour du lead");
    }
}

// ******************************************************************

async function fetchRecentLeads() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(`${API_BASE}/admin/leads`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) return;

    const leads = await res.json();

    // On prend les 5 plus récents
    renderRecentLeads(leads.slice(0, 5));
}


function renderRecentLeads(leads) {
    const list = document.getElementById("recentLeadsList");
    const card = document.getElementById("recentLeadsCard");

    list.innerHTML = "";

    if (leads.length === 0) {
        list.innerHTML = `
            <li class="list-group-item text-muted text-center">
                Aucun lead récent
            </li>
        `;
        return;
    }

    // Couleur de la card basée sur le lead le plus récent
    const statusColor =
        leads[0].status === "confirmed" ? "border-left-success" :
        leads[0].status === "cancelled" ? "border-left-danger" :
        "border-left-warning";

    card.classList.remove("border-left-success", "border-left-danger", "border-left-warning");
    card.classList.add(statusColor);

    leads.forEach(lead => {
        const badge =
            lead.status === "confirmed" ? "success" :
            lead.status === "cancelled" ? "danger" :
            "warning";

        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.innerHTML = `
            <span>
                ${lead.name}
            </span>
            <span>
                <i class="fas fa-bell text-${badge}"></i>
            </span>
        `;

        list.appendChild(li);
    });
}

document.addEventListener("DOMContentLoaded", fetchRecentLeads);
