const accountToken = localStorage.getItem("access_token");
let currentAccountUser = null;

function accountHeaders(json = false) {
    const headers = { Authorization: `Bearer ${accountToken}` };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
}

function accountMessage(elementId, message, type) {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

function accountApiError(data, fallback) {
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map((item) => item.msg).join(" ");
    return fallback;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
}

function leaveAccountPage() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.replace("/my-mobile-account");
}

async function loadCurrentUser() {
    if (!accountToken) {
        leaveAccountPage();
        return null;
    }
    const response = await fetch(`${API}/auth/me`, { headers: accountHeaders() });
    if (response.status === 401 || response.status === 404) {
        leaveAccountPage();
        return null;
    }
    if (!response.ok) throw new Error("Impossible de charger le compte");

    currentAccountUser = await response.json();
    localStorage.setItem("user", JSON.stringify(currentAccountUser));
    document.getElementById("userName").textContent = currentAccountUser.username;
    document.getElementById("userEmail").textContent = currentAccountUser.email;
    document.getElementById("userRole").textContent = currentAccountUser.role?.name || "Client";
    document.getElementById("profileUsername").value = currentAccountUser.username;
    document.getElementById("profileEmail").value = currentAccountUser.email;
    return currentAccountUser;
}

async function loadNewsletterBonus(userId) {
    try {
        const response = await fetch(`${API}/subscribe/newsletter/user/${userId}`, {
            headers: accountHeaders()
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const subscription = data.newsletter_subscriptions?.[0];
        const active = document.getElementById("bonusActive");
        const inactive = document.getElementById("bonusInactive");
        if (subscription?.bonus_code) {
            document.getElementById("bonusCode").textContent = subscription.bonus_code;
            document.getElementById("bonusAmount").textContent = subscription.bonus_amount || "10 000 FCFA";
            active.style.display = "block";
            inactive.style.display = "none";
        } else {
            active.style.display = "none";
            inactive.style.display = "block";
        }
    } catch (_) {
        document.getElementById("bonusActive").style.display = "none";
        document.getElementById("bonusInactive").style.display = "block";
    }
}

async function loadUserReviews(userId) {
    const container = document.getElementById("reviewsContainer");
    if (!container) return;
    try {
        const response = await fetch(`${API}/reviews/${userId}/reviews`, { headers: accountHeaders() });
        if (!response.ok) throw new Error();
        const reviews = await response.json();
        if (!reviews.length) {
            container.innerHTML = '<p class="text-gray-60 text-center">Aucun avis pour le moment</p>';
            return;
        }
        container.innerHTML = reviews.map((review) => {
            const image = review.product_image
                ? `${API}/${String(review.product_image).replace(/^\//, "")}`
                : "/static/img/placeholder.jpg";
            const stars = Array.from({ length: 5 }, (_, index) =>
                `<i class="${index < review.rating ? "fas" : "far"} fa-star"></i>`
            ).join("");
            return `<div class="card border-0 mb-4"><div class="card-body p-4">
                <div class="d-flex mb-3"><img src="${escapeHtml(image)}" alt="${escapeHtml(review.product_name)}"
                    style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-right:15px">
                    <div><h6 class="font-size-16 mb-1">${escapeHtml(review.product_name)}</h6>
                    <div class="text-warning">${stars}</div></div></div>
                <p class="text-gray-60 mb-2">${escapeHtml(review.comment)}</p>
                <small class="text-gray-40">${new Date(review.created_at).toLocaleDateString("fr-FR")}</small>
            </div></div>`;
        }).join("");
    } catch (_) {
        container.innerHTML = '<p class="text-danger text-center">Erreur de chargement des avis</p>';
    }
}

async function updateProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = document.getElementById("submitProfileBtn");
    button.disabled = true;
    try {
        const response = await fetch(`${API}/auth/user/profile`, {
            method: "PUT",
            headers: accountHeaders(true),
            body: JSON.stringify({
                username: document.getElementById("profileUsername").value.trim(),
                email: document.getElementById("profileEmail").value.trim().toLowerCase()
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(accountApiError(data, "Modification impossible"));
        currentAccountUser = data;
        localStorage.setItem("user", JSON.stringify(data));
        document.getElementById("userName").textContent = data.username;
        document.getElementById("userEmail").textContent = data.email;
        accountMessage("profileMessage", "Informations mises à jour avec succès.", "success");
    } catch (error) {
        accountMessage("profileMessage", escapeHtml(error.message), "danger");
    } finally {
        button.disabled = false;
    }
}

async function changePassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmation = document.getElementById("confirmPassword").value;
    if (newPassword !== confirmation) {
        accountMessage("passwordMessage", "Les mots de passe ne correspondent pas.", "danger");
        return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
        accountMessage("passwordMessage", "Le mot de passe est trop long (72 octets maximum).", "danger");
        return;
    }
    const button = document.getElementById("submitPasswordBtn");
    button.disabled = true;
    try {
        const response = await fetch(`${API}/auth/user/change-password`, {
            method: "POST",
            headers: accountHeaders(true),
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(accountApiError(data, "Modification impossible"));
        event.currentTarget.reset();
        document.getElementById("passwordMatchMsg").textContent = "";
        accountMessage("passwordMessage", "Mot de passe modifié avec succès.", "success");
    } catch (error) {
        accountMessage("passwordMessage", escapeHtml(error.message), "danger");
    } finally {
        button.disabled = false;
    }
}

async function logout() {
    try {
        await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
        leaveAccountPage();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("profileForm")?.addEventListener("submit", updateProfile);
    document.getElementById("changePasswordForm")?.addEventListener("submit", changePassword);
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    document.getElementById("confirmPassword")?.addEventListener("input", function () {
        const matches = this.value && this.value === document.getElementById("newPassword").value;
        const target = document.getElementById("passwordMatchMsg");
        target.textContent = this.value ? (matches ? "Mots de passe identiques" : "Mots de passe différents") : "";
        target.style.color = matches ? "#28a745" : "#dc3545";
    });

    try {
        const user = await loadCurrentUser();
        if (user) await Promise.all([loadNewsletterBonus(user.id), loadUserReviews(user.id)]);
    } catch (error) {
        accountMessage("profileMessage", "Le compte ne peut pas être chargé pour le moment.", "danger");
    }
});
