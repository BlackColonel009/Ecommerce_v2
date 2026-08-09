// ===============================================
// AUTHENTIFICATION - LOGIN & SIGNUP
// ===============================================

// Fonction pour gérer les messages d'erreur/succès
function showAuthMessage(form, message, type = 'error') {
    // Supprimer l'ancien message s'il existe
    const oldMessage = form.querySelector('.auth-message');
    if (oldMessage) oldMessage.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message alert alert-${type === 'error' ? 'danger' : 'success'} mt-3`;
    messageDiv.textContent = message;
    
    // Ajouter le message après le formulaire
    form.appendChild(messageDiv);
    
    // Auto-suppression après 5 secondes pour les succès
    if (type === 'success') {
        setTimeout(() => messageDiv.remove(), 5000);
    }
}

// ===============================================
// CONNEXION
// ===============================================
async function handleLogin(form) {
    // ✅ Récupérer les éléments d'abord
    const usernameInput = form.querySelector('#signinUsername');
    const passwordInput = form.querySelector('#signinPassword');
    
    // ✅ Vérification que les champs existent
    if (!usernameInput || !passwordInput) {
        console.error("❌ Champs de connexion non trouvés!");
        showAuthMessage(form, '❌ Erreur technique: formulaire incomplet', 'error');
        return;
    }
    
    // ✅ Maintenant on peut récupérer les valeurs
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    console.log("🔐 Tentative de connexion:", { username });
    
    if (!username || !password) {
        showAuthMessage(form, '❌ Veuillez remplir tous les champs', 'error');
        return;
    }
    
    try {
        // Créer FormData
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log("📡 Réponse login:", data);
        
        if (response.ok) {
            // ✅ Sauvegarder le token
            if (data.access_token) {
                localStorage.setItem("access_token", data.access_token);
                if (data.admin) {
                    localStorage.setItem("user", JSON.stringify(data.admin));
                }
                console.log("✅ Token sauvegardé dans localStorage");
            }
            
            showAuthMessage(form, '✅ Connexion réussie !', 'success');
            
            // ✅ Récupérer les infos utilisateur
            try {
                const token = localStorage.getItem("access_token");
                
                const userRes = await fetch(`${API}/auth/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (userRes.ok) {
                    const userData = await userRes.json();
                    console.log("✅ Infos utilisateur:", userData);
                    
                    // Mettre à jour le bouton
                    const authButton = document.getElementById('sidebarNavToggler');
                    if (authButton) {
                        authButton.innerHTML = `<i class="ec ec-user mr-1"></i> ${userData.username || username}`;
                    }
                    
                    localStorage.setItem('user', JSON.stringify(userData));
                }
                
            } catch (userError) {
                console.error("❌ Erreur récupération user:", userError);
            }
            
            // Fermer la sidebar
            setTimeout(() => {
                document.getElementById('sidebarContent').style.display = 'none';
            }, 1500);
            
        } else {
            const errorMsg = data.detail || 'Erreur de connexion';
            showAuthMessage(form, `❌ ${errorMsg}`, 'error');
        }
        
    } catch (error) {
        console.error("❌ Erreur réseau:", error);
        showAuthMessage(form, '❌ Erreur de connexion au serveur', 'error');
    }
}
// ✅ Fonction pour vérifier si déjà connecté au chargement
async function checkLoggedInUser() {
    const token = localStorage.getItem("access_token");
    console.log("🔍 Vérification token:", token ? "Présent" : "Absent");
    
    if (!token) return;
    
    try {
        const response = await fetch(`${API}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("📡 checkLoggedInUser status:", response.status);
        
        if (response.ok) {
            const userData = await response.json();
            console.log("👤 Utilisateur déjà connecté:", userData);
            
            const authButton = document.getElementById('sidebarNavToggler');
            if (authButton) {
                authButton.innerHTML = `<i class="ec ec-user mr-1"></i> ${userData.username}`;
            }
            
            localStorage.setItem('user', JSON.stringify(userData));
        } else {
            // Token invalide ou expiré
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
        }
    } catch (e) {
        console.error("❌ Erreur vérification utilisateur:", e);
    }
}

// Appeler au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkLoggedInUser, 100);
});
// À ajouter dans auth.js
async function checkLoggedInUser() {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    try {
        const response = await fetch(`${API}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            const authButton = document.getElementById('sidebarNavToggler');
            if (authButton) {
                authButton.innerHTML = `<i class="ec ec-user mr-1"></i> ${userData.username}`;
            }
            localStorage.setItem('user', JSON.stringify(userData));
            console.log("👤 Utilisateur déjà connecté:", userData);
        }
    } catch (e) {
        console.log("Utilisateur non connecté");
    }
}

// Appeler au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkLoggedInUser, 100); // Petit délai pour laisser le DOM se charger
});

// ===============================================
// INSCRIPTION
// ===============================================
async function handleSignup(form) {
    const email = form.querySelector('#signupEmail').value;
    const password = form.querySelector('#signupPassword').value;
    const confirmPassword = form.querySelector('#signupConfirmPassword').value;
    const emailPrefix = email.split('@')[0].trim();
    const usernameInput = form.querySelector('#sidebarSignupUsername');
    const generatedUsername = (usernameInput?.value.trim() ||
        (emailPrefix.length >= 3 ? emailPrefix : `client-${emailPrefix}`)).slice(0, 50);
    
    console.log("📝 Tentative d'inscription:", { email });
    
    // Vérifier que les mots de passe correspondent
    if (password !== confirmPassword) {
        showAuthMessage(form, '❌ Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    // Vérifier la force du mot de passe (optionnel)
    if (password.length < 6) {
        showAuthMessage(form, '❌ Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API}/auth/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username: generatedUsername,
                email: email,
                password: password,
                // role_id: 2  // Si besoin d'un rôle par défaut (client)
            }),
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log("📡 Réponse inscription:", data);
        
        if (response.ok) {
            // Succès
            showAuthMessage(form, '✅ Compte créé avec succès ! Vous pouvez maintenant vous connecter.', 'success');
            
            // Rediriger vers le formulaire de connexion après 2 secondes
            setTimeout(() => {
                // Simuler un clic sur le lien "Se connecter"
                const loginLink = form.querySelector('[data-target="#login"]');
                if (loginLink) loginLink.click();
                
                // Vider les champs
                form.querySelector('#signupEmail').value = '';
                if (usernameInput) usernameInput.value = '';
                form.querySelector('#signupPassword').value = '';
                form.querySelector('#signupConfirmPassword').value = '';
            }, 2000);
            
        } else {
            // Erreur
            const errorMsg = Array.isArray(data.detail)
                ? data.detail.map(item => item.msg).join(' ')
                : (data.detail || data.message || 'Erreur lors de l\'inscription');
            
            // Gérer les erreurs spécifiques (email déjà utilisé)
            if (errorMsg.includes('already exists') || errorMsg.includes('déjà utilisé')) {
                showAuthMessage(form, '❌ Cet email est déjà utilisé', 'error');
            } else {
                showAuthMessage(form, `❌ ${errorMsg}`, 'error');
            }
        }
        
    } catch (error) {
        console.error("❌ Erreur réseau:", error);
        showAuthMessage(form, '❌ Erreur de connexion au serveur', 'error');
    }
}

// ===============================================
// RÉCUPÉRATION DE MOT DE PASSE
// ===============================================
async function handleForgotPassword(form) {
    const email = form.querySelector('#recoverEmail').value;
    
    console.log("🔑 Demande de récupération:", { email });
    
    if (!email) {
        showAuthMessage(form, '❌ Veuillez entrer votre email', 'error');
        return;
    }
    
    try {
        // À adapter selon votre endpoint de récupération
        const response = await fetch(`${API}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
            credentials: 'include'
        });
        
        if (response.ok) {
            showAuthMessage(form, '✅ Email de récupération envoyé ! Vérifiez votre boîte de réception.', 'success');
            
            // Vider le champ
            form.querySelector('#recoverEmail').value = '';
            
        } else {
            const data = await response.json();
            showAuthMessage(form, `❌ ${data.detail || 'Email non trouvé'}`, 'error');
        }
        
    } catch (error) {
        console.error("❌ Erreur réseau:", error);
        showAuthMessage(form, '❌ Erreur de connexion au serveur', 'error');
    }
}

// ===============================================
// INITIALISATION DES FORMULAIRES AUTH
// ===============================================
function initAuthForms() {
    console.log("🔧 Initialisation des formulaires d'authentification...");
    
    const sidebar = document.getElementById('sidebarContent');
    if (!sidebar) return;
    
    const form = sidebar.querySelector('form.js-validate');
    if (!form) return;
    if (form.dataset.authInitialized === 'true') return;
    
    // Supprimer les anciens événements (en clonant)
    const newForm = form.cloneNode(true);
    newForm.dataset.authInitialized = 'true';
    form.parentNode.replaceChild(newForm, form);

    // Navigation interne du panneau injecté dynamiquement.
    newForm.addEventListener('click', (event) => {
        const link = event.target.closest('.js-animation-link[data-target]');
        if (!link) return;
        event.preventDefault();
        const target = newForm.querySelector(link.dataset.target);
        if (!target) return;
        newForm.querySelectorAll('[data-target-group="idForm"]').forEach(section => {
            section.style.display = 'none';
            section.style.opacity = '0';
        });
        target.style.display = 'block';
        requestAnimationFrame(() => { target.style.opacity = '1'; });
    });
    
    // Gestionnaire unique pour les soumissions
    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log("📤 Formulaire soumis");
        
        // Déterminer quel formulaire est visible
        const loginVisible = this.querySelector('#login').style.display !== 'none';
        const signupVisible = this.querySelector('#signup').style.display !== 'none';
        const forgotVisible = this.querySelector('#forgotPassword').style.display !== 'none';
        
        console.log("Formulaire visible:", { loginVisible, signupVisible, forgotVisible });
        
        if (loginVisible) {
            await handleLogin(this);
        } else if (signupVisible) {
            await handleSignup(this);
        } else if (forgotVisible) {
            await handleForgotPassword(this);
        }
    });
    
    console.log("✅ Formulaires auth initialisés");
}

// Conserver une référence privée : plusieurs anciens templates déclarent aussi
// une fonction globale `initAuthForms`. Sans cette capture, leur fonction
// remplace celle-ci et le MutationObserver clone le formulaire sans fin.
const initializeAuthFormsOnce = initAuthForms;

// ===============================================
// MISE À JOUR DE L'INTERFACE UTILISATEUR CONNECTÉ
// ===============================================
async function updateUserNav() {
    try {
        const response = await fetch(`${API}/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            console.log("👤 Utilisateur connecté:", user);
            
            // Mettre à jour le texte du bouton de connexion
            const authButton = document.querySelector('#sidebarNavToggler');
            if (authButton) {
                const username = user.username || user.email;
                authButton.innerHTML = `<i class="ec ec-user mr-1"></i> ${username}`;
            }
            
            // Stocker les infos utilisateur dans localStorage (optionnel)
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (error) {
        console.error("❌ Erreur chargement utilisateur:", error);
    }
}

// ===============================================
// DÉCONNEXION
// ===============================================
async function logout() {
    try {
        await fetch(`${API}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        // Supprimer les infos utilisateur
        localStorage.removeItem('user');
        
        // Recharger la page
        location.reload();
        
    } catch (error) {
        console.error("❌ Erreur déconnexion:", error);
    }
}

// ===============================================
// INITIALISATION GLOBALE
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si l'utilisateur est déjà connecté
    updateUserNav();
    
    // Initialiser les formulaires quand la sidebar est chargée
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && (node.id === 'sidebarContent' || node.matches?.('form.js-validate') || node.querySelector?.('form.js-validate'))) {
                        console.log("📌 Sidebar détectée, initialisation...");
                        initializeAuthFormsOnce();
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Si la sidebar existe déjà
    if (document.getElementById('sidebarContent')) {
        initializeAuthFormsOnce();
    }
});

document.addEventListener('authContainerLoaded', initializeAuthFormsOnce);

// Les fournisseurs sociaux ne sont pas encore configurés.
document.addEventListener('click', (event) => {
    const socialButton = event.target.closest('[data-social-unavailable]');
    if (!socialButton) return;
    event.preventDefault();
    const form = socialButton.closest('form');
    if (form) showAuthMessage(form, 'Connexion Google et Facebook indisponible pour le moment.', 'error');
});

