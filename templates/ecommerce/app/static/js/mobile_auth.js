const API = window.API;

function authMessage(containerId, message, type = "danger") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="alert alert-${type} mt-3" role="alert">${message}</div>`;
}

function apiErrorMessage(data, fallback) {
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length) {
        return data.detail.map((item) => item.msg).join(" ");
    }
    return fallback;
}

function setSubmitting(form, submitting, loadingText) {
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    if (submitting) {
        button.dataset.originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm mr-2"></span>${loadingText}`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalHtml || button.innerHTML;
    }
}

function saveSession(data) {
    localStorage.setItem("access_token", data.access_token);
    if (data.admin) localStorage.setItem("user", JSON.stringify(data.admin));
}

async function loginRequest(identifier, password) {
    const formData = new FormData();
    formData.append("username", identifier);
    formData.append("password", password);

    const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        body: formData,
        credentials: "include"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(apiErrorMessage(data, "Identifiants incorrects"));
    saveSession(data);
    return data;
}

async function redirectIfLoggedIn() {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
        const response = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Session expirée");
        const user = await response.json();
        localStorage.setItem("user", JSON.stringify(user));
        window.location.replace("/my-account");
    } catch (_) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
    }
}

async function handleMobileLogin(form) {
    const identifier = form.querySelector("#signinUsername")?.value.trim();
    const password = form.querySelector("#signinPassword")?.value || "";
    if (!identifier || !password) {
        authMessage("login-messages", "Veuillez remplir tous les champs.");
        return;
    }

    setSubmitting(form, true, "Connexion...");
    try {
        await loginRequest(identifier, password);
        authMessage("login-messages", "Connexion réussie. Redirection…", "success");
        window.location.replace("/my-account");
    } catch (error) {
        authMessage("login-messages", error.message || "Connexion impossible.");
    } finally {
        setSubmitting(form, false);
    }
}

async function handleMobileSignup(form) {
    const username = form.querySelector("#signupUsername")?.value.trim();
    const email = form.querySelector("#signupEmail")?.value.trim().toLowerCase();
    const password = form.querySelector("#signupPassword")?.value || "";
    const confirmation = form.querySelector("#signupConfirmPassword")?.value || "";

    if (!username || !email || !password || !confirmation) {
        authMessage("signup-messages", "Tous les champs sont obligatoires.");
        return;
    }
    if (password !== confirmation) {
        authMessage("signup-messages", "Les mots de passe ne correspondent pas.");
        return;
    }
    if (password.length < 6) {
        authMessage("signup-messages", "Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }
    if (new TextEncoder().encode(password).length > 72) {
        authMessage("signup-messages", "Le mot de passe est trop long (72 octets maximum).");
        return;
    }

    setSubmitting(form, true, "Création...");
    try {
        const response = await fetch(`${API}/auth/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(apiErrorMessage(data, "Impossible de créer le compte."));
        }

        await loginRequest(email, password);
        authMessage("signup-messages", "Compte créé avec succès. Redirection…", "success");
        window.location.replace("/my-account");
    } catch (error) {
        authMessage("signup-messages", error.message || "Erreur lors de l'inscription.");
    } finally {
        setSubmitting(form, false);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!API) {
        console.error("API non définie");
        return;
    }
    redirectIfLoggedIn();

    const loginForm = document.getElementById("loginFormMobile");
    const signupForm = document.getElementById("signupFormMobile");
    loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        handleMobileLogin(loginForm);
    });
    signupForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        handleMobileSignup(signupForm);
    });
});
