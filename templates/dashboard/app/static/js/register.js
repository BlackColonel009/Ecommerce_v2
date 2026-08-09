

document.addEventListener('DOMContentLoaded', () => {
    loadRoles();

    const form = document.getElementById('registerForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitRegistrationForm();
    });
});

async function loadRoles() {
    try {
        const res = await fetch(`${API_BASE}/roles/`);
        const roles = await res.json();
        const select = document.getElementById('roleDropdown');
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;  // id envoyé au backend
            option.text = role.name; // affiché à l'utilisateur
            select.add(option);
        });
    } catch (err) {
        console.error("Erreur lors du chargement des rôles:", err);
    }
}

async function submitRegistrationForm() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeatPassword').value;
    const roleId = document.getElementById('roleDropdown').value;

    if (password !== repeatPassword) {
        alert("Passwords do not match!");
        return;
    }

    const token = localStorage.getItem("access_token"); // token uniformisé

    try {
        const res = await fetch(`${API_BASE}/auth/create/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                role_id: parseInt(roleId)
            })
        });

        if (res.ok) {
            alert('User successfully registered!');
            window.location.href = '/login'; // redirection optionnelle
        } else {
            const data = await res.json();
            alert('Error: ' + (data.detail || 'Registration failed'));
        }
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la création de l’utilisateur');
    }
}