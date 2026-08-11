// ==============================
// CONFIG
// ==============================

const token = localStorage.getItem("access_token"); // si authentification
const DEFAULT_POPUP_WHATSAPP = "https://wa.me/22890045876?text=Bonjour%20New%20Technologies%2C%20je%20souhaite%20en%20savoir%20plus%20sur%20votre%20offre.";
let promotionProducts = [];
let promotionItems = [];

function authHeaders() {
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

// ==============================
// POPUPS
// ==============================
const popupForm = document.getElementById("popupForm");
if (popupForm) {
    popupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(popupForm);

        try {
            const res = await fetch(`${API_BASE}/popup`, {
                method: "POST",
                headers: authHeaders(),
                body: formData
            });
            if (!res.ok) throw await res.json();

            popupForm.reset();
            fetchPopups();
            alert("Popup créée avec succès");
        } catch (err) {
            console.error("Erreur création popup:", err);
            alert("Erreur lors de la création du popup");
        }
    });
}

async function fetchPopups() {
    const container = document.getElementById("popupsContainer");
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/popup`, { headers: authHeaders() });
        if (!res.ok) throw new Error("Erreur GET popups");

        const popups = await res.json();
        container.innerHTML = "";

        if (popups.length === 0) {
            container.innerHTML = "<p class='text-muted'>Aucun popup créé</p>";
            return;
        }

        popups.forEach(popup => {
            const col = document.createElement("div");
            col.className = "col-md-6 mb-3";
            col.innerHTML = `
                <div class="card shadow-sm">
                    <img src="${API_BASE}/${popup.image_url}" class="card-img-top" style="max-height:200px; object-fit:cover">
                    <div class="card-body">
                        <h6 class="card-title">${popup.title}</h6>
                        <p class="card-text small">${popup.message}</p>
                        <span class="badge badge-${popup.is_active ? 'success' : 'secondary'}">
                            ${popup.is_active ? "Actif" : "Inactif"}
                        </span>
                        <div class="mt-2 d-flex justify-content-between">
                            <small class="text-muted">${popup.trigger}</small>
                            <button class="btn btn-sm btn-primary mr-1" onclick="openEditPopup(${popup.id})">
                                <i class="fas fa-edit"></i>
                            </button>

                            <button class="btn btn-sm btn-danger" onclick="deletePopup(${popup.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(col);
        });

    } catch (err) {
        console.error(err);
    }
}

async function deletePopup(id) {
    if (!confirm("Supprimer ce popup ?")) return;

    try {
        const res = await fetch(`${API_BASE}/popup/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        if (!res.ok) throw new Error("Erreur suppression");
        fetchPopups();
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la suppression");
    }
}

async function openEditPopup(id) {
  try {
    const res = await fetch(`${API_BASE}/popup/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Erreur GET popup");
    const popup = await res.json();

    // Remplir le formulaire
    document.getElementById("editPopupId").value = popup.id;
    document.getElementById("editTitle").value = popup.title;
    document.getElementById("editMessage").value = popup.message;
    document.getElementById("editCtaText").value = popup.cta_text || "";
    document.getElementById("editCtaLink").value = popup.cta_link || DEFAULT_POPUP_WHATSAPP;
    document.getElementById("editTrigger").value = popup.trigger;
    document.getElementById("editDelay").value = popup.delay_seconds || "";
    document.getElementById("editActive").checked = popup.is_active;
    document.getElementById("editStartDate").value = popup.start_date ? popup.start_date.split("T")[0] : "";
    document.getElementById("editEndDate").value = popup.end_date ? popup.end_date.split("T")[0] : "";
    document.getElementById("editImage").value = "";
    document.getElementById("editImageCurrent").textContent = popup.image_url
      ? "Image actuelle conservée si vous ne choisissez pas de nouveau fichier."
      : "Aucune image actuellement enregistrée.";

    // Ouvrir le modal
    $("#editPopupModal").modal("show");
  } catch (err) {
    console.error(err);
    alert("Erreur chargement popup");
  }
}

const editPopupForm = document.getElementById("editPopupForm");
if (editPopupForm) {
  editPopupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editPopupId").value;
    const formData = new FormData(editPopupForm);
    const imageInput = document.getElementById("editImage");
    // Un champ fichier vide ne doit jamais remplacer l’image enregistrée.
    if (!imageInput.files || imageInput.files.length === 0) formData.delete("image");

    try {
      const res = await fetch(`${API_BASE}/popup/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: formData
      });
      if (!res.ok) throw await res.json();

      $("#editPopupModal").modal("hide");
      fetchPopups();
      alert("Popup modifié avec succès");
    } catch (err) {
      console.error("Erreur modification popup:", err);
      alert("Erreur lors de la modification du popup");
    }
  });
}

// ==============================
// PROMOS
// ==============================
const promoForm = document.getElementById("promoForm");
let editModal;
if (promoForm) {
    editModal = new bootstrap.Modal(document.getElementById("editPromoModal"));
    promoForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const data = new FormData();
        data.append("product_id", f.product_id.value);
        data.append("tag", f.tag.value);
        data.append("discount_percent", f.discount_percentage.value);
        data.append("start_date", f.start_date.value);
        data.append("end_date", f.end_date.value);

        try {
            const res = await fetch(`${API_BASE}/marketing/promo`, { 
                method: "POST",
                headers: authHeaders(),
                body: data });
            if (!res.ok) throw new Error("Erreur création promo");

            f.reset();
            loadPromos();
        } catch (err) {
            console.error(err);
            alert("Erreur création promo");
        }
    });
}

async function loadPromos() {
    const res = await fetch(`${API_BASE}/marketing/promo`);
    if (!res.ok) return console.error("Erreur GET promos");
    promotionItems = await res.json();

    renderPromos();
}

function filterPromotionItems(query) {
    const term = String(query || "").trim().toLocaleLowerCase();
    if (!term) return promotionItems;
    return promotionItems.filter(promo =>
        `${promo.product_name || ""} ${promo.tag || ""}`.toLocaleLowerCase().includes(term)
    );
}

function renderPromos() {
    const list = document.getElementById("promoList");
    const preview = document.getElementById("promosContainer");
    const listSearch = document.getElementById("promoListSearch");
    const previewSearch = document.getElementById("promoPreviewSearch");
    if (!list || !preview) return;

    list.innerHTML = "";
    preview.innerHTML = "";

    const listPromos = filterPromotionItems(listSearch?.value);
    const previewPromos = filterPromotionItems(previewSearch?.value);

    if (!listPromos.length) {
        list.innerHTML = '<p class="small text-muted py-2 mb-0">Aucune promotion ne correspond à cette recherche.</p>';
    }
    listPromos.forEach(p => {
        list.innerHTML += `
            <div class="border rounded p-2 mb-2 d-flex justify-content-between align-items-center">
                <div>
                    <strong>${p.discount_percent}%</strong> sur <em>${p.product_name}</em><br>
                    <strong>Tag:</strong> ${p.tag}<br>
                    <small>${p.start_date.split("T")[0]} → ${p.end_date.split("T")[0]}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1"
                        onclick="openEditPromo(${p.id}, ${p.discount_percent}, '${p.start_date}', '${p.end_date}', '${p.tag}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger"
                        onclick="deletePromo(${p.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    if (!previewPromos.length) {
        preview.innerHTML = '<div class="col-12"><p class="small text-muted py-2 mb-0">Aucune promotion à afficher.</p></div>';
    }
    previewPromos.forEach(p => {
        preview.innerHTML += `
            <div class="col-md-6 mb-2">
                <div class="alert alert-warning text-center mb-0"><strong>-${p.discount_percent}%</strong> sur ${p.product_name}<br><small>Tag : ${p.tag}</small></div>
            </div>
        `;
    });
}

document.getElementById("promoListSearch")?.addEventListener("input", renderPromos);
document.getElementById("promoPreviewSearch")?.addEventListener("input", renderPromos);

async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        if (!res.ok) throw new Error("Erreur GET produits");

        const products = await res.json();
        const select = document.getElementById("productSelect");
        const search = document.getElementById("productSearch");
        if (!select) return;

        promotionProducts = Array.isArray(products) ? products : [];
        const renderProductOptions = (query = "") => {
            const normalizedQuery = query.trim().toLocaleLowerCase();
            const selectedId = select.value;
            const matches = promotionProducts.filter(product =>
                String(product.name || "").toLocaleLowerCase().includes(normalizedQuery)
            );
            select.innerHTML = "";
            if (!matches.length) {
                const emptyOption = new Option("Aucun produit trouvé", "", true, true);
                emptyOption.disabled = true;
                select.add(emptyOption);
                return;
            }
            matches.forEach(p => {
                const option = document.createElement("option");
                option.value = p.id;
                option.textContent = p.name;
                select.appendChild(option);
            });
            if ([...select.options].some(option => option.value === selectedId)) select.value = selectedId;
        };

        renderProductOptions();
        search?.addEventListener("input", () => renderProductOptions(search.value));
    } catch (err) {
        console.error("Erreur chargement produits:", err);
    }
}


async function deletePromo(id) {
    if (!confirm("Supprimer cette promotion ?")) return;
    try {
        const res = await fetch(`${API_BASE}/marketing/promo/${id}`, { method: "DELETE", headers: authHeaders() });
        if (!res.ok) throw new Error("Erreur suppression");
        loadPromos();
    } catch (err) {
        console.error(err);
        alert("Erreur suppression promo");
    }
}

async function loadPromoTags() {
    const res = await fetch(`${API_BASE}/marketing/promo/tags`);
    if (!res.ok) return console.error("Erreur GET promo tags");

    const tags = await res.json();
    
    // Champs select dans le formulaire principal
    const select = document.getElementById("promoTag");
    // Champs select dans le modal d'édition
    const editSelect = document.getElementById("editPromoTag");
    if (!select || !editSelect) return;

    select.innerHTML = "";
    editSelect.innerHTML = "";

    tags.forEach(tag => {
        const opt = `<option value="${tag}">${tag}</option>`;
        select.innerHTML += opt;
        editSelect.innerHTML += opt;
    });
}


function openEditPromo(id, discount, start, end) {
    document.getElementById("editPromoId").value = id;
    document.getElementById("editPromoTag").value = ""; // reset tag field
    document.getElementById("editDiscount").value = discount;
    document.getElementById("editStartDate").value = start.split("T")[0];
    document.getElementById("editEndDate").value = end.split("T")[0];
    editModal.show();
}

async function submitEditPromo() {
    const id = document.getElementById("editPromoId").value;
    const data = new FormData();
    data.append("tag", document.getElementById("editPromoTag").value);
    data.append("discount_percent", document.getElementById("editDiscount").value);
    data.append("start_date", document.getElementById("editStartDate").value);
    data.append("end_date", document.getElementById("editEndDate").value);

    try {
        const res = await fetch(`${API_BASE}/marketing/promo/${id}`, {
                method: "PUT",
                headers: authHeaders(),
                body: data });
        if (!res.ok) throw new Error("Erreur modification");
        editModal.hide();
        loadPromos();
    } catch (err) {
        console.error(err);
        alert("Erreur modification promo");
    }
}

// ==============================
// AUTO LOAD
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    fetchPopups();
    loadPromos();
    loadProducts(); // charger le select produits
    loadPromoTags(); // charger les tags de promo
});
