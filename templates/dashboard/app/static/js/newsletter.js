
document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("newsletterTableBody");
    const recentList = document.getElementById("recentNewsletterList");
    const searchInput = document.getElementById("searchNewsletter");

    async function loadSubscribers() {
        const res = await fetch(`${API_BASE}/subscribe/admin/newsletter`);
        const subscribers = await res.json();
        renderTable(subscribers);
        renderRecent(subscribers);
    }

    function renderTable(subscribers) {
        tableBody.innerHTML = "";
        subscribers.forEach(sub => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${sub.email}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${sub.is_active ? "checked" : ""} onchange="toggleSubscription(${sub.id}, this.checked)">
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${sub.is_active ? "checked" : ""} onchange="toggleBonus(${sub.id}, this.checked)">
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>${sub.bonus_amount ?? 0}</td>
                <td>${sub.bonus_used ? "Oui" : "Non"}</td>
                <td>${new Date(sub.subscribed_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteSubscriber(${sub.id})">Supprimer</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function renderRecent(subscribers) {
        recentList.innerHTML = "";
        subscribers.slice(0, 5).forEach(sub => {
            const li = document.createElement("li");
            li.className = "list-group-item";
            li.textContent = `${sub.email} - ${new Date(sub.subscribed_at).toLocaleDateString()}`;
            recentList.appendChild(li);
        });
    }

    window.deleteSubscriber = async function(id) {
        if (!confirm("Supprimer cet abonné ?")) return;
        const res = await fetch(`${API_BASE}/subscribe/newsletter/${id}`, { method: "DELETE" });
        const data = await res.json();
        alert(data.message);
        loadSubscribers();
    }

    window.toggleSubscription = async function(id, activate) {
        // ⚠️ Prévoir un endpoint backend pour gérer l’abonnement actif
        alert(`Abonnement ${activate ? "activé" : "désactivé"} pour l’ID ${id}`);
        loadSubscribers();
    }

    window.toggleBonus = async function(id, activate) {
        const res = await fetch(`${API_BASE}/subscribe/newsletter/bonus/${id}?activate=${activate}`, { method: "PUT" });
        const data = await res.json();
        alert(data.message);
        loadSubscribers();
    }

    searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const rows = tableBody.querySelectorAll("tr");
        rows.forEach(row => {
            const email = row.querySelector("td").textContent.toLowerCase();
            row.style.display = email.includes(filter) ? "" : "none";
        });
    });

    loadSubscribers();
});
