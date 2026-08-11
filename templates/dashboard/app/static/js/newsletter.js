
document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("newsletterTableBody");
    const recentList = document.getElementById("recentNewsletterList");
    const searchInput = document.getElementById("searchNewsletter");
    const campaignForm = document.getElementById("newsletterCampaignForm");
    const notice = document.getElementById("newsletterNotice");

    function showNotice(message, type = "danger") {
        if (!notice) return;
        notice.textContent = message;
        notice.className = `alert alert-${type}`;
    }

    function clearNotice() {
        if (notice) notice.className = "alert d-none";
    }

    async function loadSubscribers() {
        try {
            const res = await fetch(`${API_BASE}/subscribe/admin/newsletter`, {
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Impossible de charger les abonnés.");
            const subscribers = Array.isArray(data) ? data : [];
            clearNotice();
            renderTable(subscribers);
            renderRecent(subscribers);
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Impossible de charger les abonnés.</td></tr>';
            recentList.innerHTML = "";
            showNotice(error.message || "Votre session a peut-être expiré. Connectez-vous de nouveau.");
        }
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
                <td><code>${sub.bonus_code || "—"}</code></td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${!sub.bonus_used ? "checked" : ""} onchange="toggleBonus(${sub.id}, this.checked)" title="Désactiver après validation du premier achat">
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
        const res = await fetch(`${API_BASE}/subscribe/newsletter/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) return showNotice(data.detail || "Suppression impossible.");
        alert(data.message);
        loadSubscribers();
    }

    window.toggleSubscription = async function(id, activate) {
        // ⚠️ Prévoir un endpoint backend pour gérer l’abonnement actif
        alert(`Abonnement ${activate ? "activé" : "désactivé"} pour l’ID ${id}`);
        loadSubscribers();
    }

    window.toggleBonus = async function(id, activate) {
        if (!activate && !confirm("Confirmer le premier achat ? Le code sera marqué comme utilisé et un e-mail de remerciement sera envoyé au client.")) {
            loadSubscribers();
            return;
        }
        const res = await fetch(`${API_BASE}/subscribe/newsletter/bonus/${id}?activate=${activate}`, {
            method: "PUT",
            credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) return showNotice(data.detail || "Mise à jour impossible.");
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

    campaignForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = document.getElementById("sendNewsletterCampaign");
        const payload = {
            subject: document.getElementById("campaignSubject").value.trim(),
            title: document.getElementById("campaignTitle").value.trim(),
            message: document.getElementById("campaignMessage").value.trim(),
            cta_label: document.getElementById("campaignCtaLabel").value.trim() || "Voir les offres",
        };
        const ctaUrl = document.getElementById("campaignCtaUrl").value.trim();
        if (ctaUrl) payload.cta_url = ctaUrl;

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Mise en file…';
        try {
            const response = await fetch(`${API_BASE}/subscribe/newsletter/campaign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Envoi impossible");
            alert(`${result.message} ${result.recipient_count} abonné(s) actif(s) concerné(s).`);
            campaignForm.reset();
            document.getElementById("campaignCtaLabel").value = "Voir les offres";
        } catch (error) {
            alert(error.message || "Une erreur est survenue lors de l’envoi.");
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane mr-1"></i> Envoyer l’offre';
        }
    });

    loadSubscribers();
});
