async function loadTrash() {
    const token = localStorage.getItem("access_token");

    const res = await fetch(`${API_BASE}/products/trash`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const products = await res.json();

    const tbody = document.getElementById("trashBody");
    tbody.innerHTML = "";

    products.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.category.name}</td>
                <td>${p.brand.name}</td>
                <td>${p.inventory?.quantity ?? 0}</td>

                <td>
                    <button class="btn btn-success btn-sm" onclick="restoreProduct(${p.id})">
                        <i class="fas fa-undo"></i> Restaurer
                    </button>

                    <button class="btn btn-danger btn-sm" onclick="deletePermanent(${p.id})">
                        <i class="fas fa-trash-alt"></i> Supprimer définitivement
                    </button>
                </td>
            </tr>
        `;
    });
}
document.addEventListener("DOMContentLoaded", () => {
    loadTrash();
});

async function restoreProduct(id) {
    if (!confirm("Restaurer ce produit ?")) return;

    const token = localStorage.getItem("access_token");

    const res = await fetch(`${API_BASE}/products/restore/${id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
        alert("Produit restauré !");
        loadProducts();  // recharge les produits actifs
        loadTrash();     // recharge la corbeille
    } else {
        alert("Erreur lors de la restauration.");
    }
}

async function deletePermanent(id) {
    if (!confirm("Supprimer définitivement ce produit ? Cette action est irréversible !")) return;

    const token = localStorage.getItem("access_token");

    const res = await fetch(`${API_BASE}/products/permanent/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
        alert("Produit supprimé définitivement !");
        loadTrash();
    } else {
        alert("Erreur lors de la suppression.");
    }
}
