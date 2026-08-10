// ---------- CONFIG ----------

const TOKEN = localStorage.getItem("access_token"); // clé uniforme

// ---------- HELPERS ----------
function showAlert(message, type = "success") {
  // minimal : remplacer avec tes toasts/alert bootstrap si besoin
  alert((type === "error" ? "Erreur: " : "") + message);
}

//*************************** CATEGORIES & BRANDS  SUBMIT **************************

// Charger les catégories existantes pour le select parent
async function loadParentCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        if (!res.ok) return;

        const categories = await res.json();
        const select = document.getElementById("category-parent");
        select.innerHTML = '<option value="">-- Aucune --</option>'; // reset

        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });

    } catch (err) {
        console.error("Erreur chargement catégories:", err);
    }
}

// Appel au chargement du formulaire
loadParentCategories();

document.getElementById("category-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!TOKEN) return showAlert("Token invalide, reconnectez-vous", "error");

    const name = document.getElementById("category-name").value.trim();
    const slug = document.getElementById("category-slug").value.trim();
    const parent_id = document.getElementById("category-parent").value || null;
    const imageFile = document.getElementById("category-image").files[0]; // <-- fichier

    if (!name) return showAlert("Nom de catégorie vide", "error");

    const btn = this.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Envoi...";

    try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("slug", slug);
        if (parent_id) formData.append("parent_id", parent_id);
        if (imageFile) formData.append("image", imageFile); // <-- ajout fichier

        const res = await fetch(`${API_BASE}/categories`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`
                // ⚠️ pas de Content-Type ici, FormData le gère automatiquement
            },
            body: formData
        });

        if (!res.ok) {
            const error = await res.text();
            console.error("Category error:", error);
            showAlert("Impossible d'ajouter la catégorie", "error");
        } else {
            showAlert("Catégorie ajoutée !");
            this.reset(); // reset form
            loadCategoriesAndBrands();
            loadParentCategories();
        }

    } catch (err) {
        console.error(err);
        showAlert("Erreur réseau", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Ajouter la catégorie";
    }
});

// ------------ LOAD & DELETE CATEGORIE -------

async function loadCategoriesList() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        if (!res.ok) return;

        const categories = await res.json();
        const container = document.getElementById("categories-list");
        container.innerHTML = "";

        categories.forEach(cat => {
            const div = document.createElement("div");
            div.classList.add("d-flex", "justify-content-between", "align-items-center", "mb-2");

            div.innerHTML = `
                <span>${cat.name}</span>
                <button class="btn btn-sm btn-danger" onclick="deleteCategory(${cat.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        console.error("Erreur chargement catégories:", err);
    }
}

async function deleteCategory(id) {
    if (!confirm("Supprimer cette catégorie ?")) return;

    try {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        });

        if (res.ok) {
            showAlert("Catégorie supprimée !");
            loadCategoriesList(); // recharge la liste
            loadParentCategories(); // recharge le select parent
        } else {
            showAlert("Impossible de supprimer la catégorie", "error");
        }
    } catch (err) {
        console.error("Erreur suppression catégorie:", err);
        showAlert("Erreur réseau", "error");
    }
}

// ------------ POST BRAND --------------
document.getElementById("brand-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!TOKEN) return showAlert("Token invalide, reconnectez-vous", "error");

    const input = document.getElementById("brand-name");
    const name = input.value.trim();

    if (!name) return showAlert("Nom de marque vide", "error");

    const btn = this.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Envoi...";

    try {
        const res = await fetch(`${API_BASE}/brands`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name })
        });

        if (!res.ok) {
            const error = await res.text();
            console.error("Brand error:", error);
            showAlert("Impossible d'ajouter la marque", "error");
        } else {
            showAlert("Marque ajoutée !");
            input.value = "";
            loadCategoriesAndBrands(); // recharge product-brand
        }

    } catch (err) {
        console.error(err);
        showAlert("Erreur réseau", "error");
    }

    btn.disabled = false;
    btn.textContent = "Ajouter";
});




// ************************** product.js **************************
// ---------- LOAD CATEGORIES & BRANDS ----------
async function loadCategoriesAndBrands() {
  if (!TOKEN) return;
  try {
    // Categories
    let resCat = await fetch(`${API_BASE}/categories`, {
      headers: { "Authorization": `Bearer ${TOKEN}` }
    });
    let cats = resCat.ok ? await resCat.json() : [];
    const catSel = document.getElementById("product-category");
    catSel.innerHTML = `<option value="">Sélectionner...</option>`;
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      catSel.appendChild(opt);
    });

    // Brands
    let resBrand = await fetch(`${API_BASE}/brands`, {
      headers: { "Authorization": `Bearer ${TOKEN}` }
    });
    let brands = resBrand.ok ? await resBrand.json() : [];
    const brandSel = document.getElementById("product-brand");
    brandSel.innerHTML = `<option value="">Sélectionner...</option>`;
    brands.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      brandSel.appendChild(opt);
    });

  } catch (err) {
    console.error("loadCategoriesAndBrands:", err);
  }
}

// ---------- SPECS UI ----------
function createSpecRow(key = "", value = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "input-group mb-2 spec-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-control spec-input";
  input.placeholder = "Clé:Valeur (ex: RAM:16GB)";
  input.value = key && value ? `${key}:${value}` : (key || value || "");

  const removeBtn = document.createElement("div");
  removeBtn.className = "input-group-append";
  removeBtn.innerHTML = `<button class="btn btn-danger remove-spec" type="button">&times;</button>`;

  wrapper.appendChild(input);
  wrapper.appendChild(removeBtn);

  // remove handler
  removeBtn.querySelector(".remove-spec").addEventListener("click", () => wrapper.remove());

  return wrapper;
}

document.getElementById("add-spec-btn").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("specs-list").appendChild(createSpecRow());
});

// initial one spec row
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("specs-list").appendChild(createSpecRow());
    loadCategoriesAndBrands();
});

// ---------- SUBMIT PRODUCT (validation + envoi asynchrone) ----------
const PRODUCT_API_FIELDS = {
    name: "#product-name",
    slug: "#product-slug",
    category_id: "#product-category",
    brand_id: "#product-brand",
    rating: "#product-rating",
    stock: "#product-stock",
    prices: ".price-input",
    specs: ".spec-input",
    color: ".color-input",
    variants_data: ".variant-price",
    display_price: "#display-price",
    images: "#product-images"
};

function clearProductFieldErrors() {
    document.querySelectorAll("#product-form .is-invalid").forEach(field => {
        field.classList.remove("is-invalid");
        field.removeAttribute("aria-invalid");
    });
    document.querySelectorAll("#product-form .product-field-error").forEach(error => error.remove());
}

function markProductField(fieldOrSelector, message) {
    const field = typeof fieldOrSelector === "string"
        ? document.querySelector(fieldOrSelector)
        : fieldOrSelector;
    if (!field) return null;

    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    const host = field.closest(".form-group") || field.parentElement;
    if (host && !host.querySelector(":scope > .product-field-error")) {
        const feedback = document.createElement("small");
        feedback.className = "product-field-error";
        feedback.textContent = message;
        host.appendChild(feedback);
    }
    return field;
}

function showProductFeedback(type, title, message, issues = []) {
    const modal = document.getElementById("productFeedbackModal");
    const titleElement = document.getElementById("productFeedbackTitle");
    const messageElement = document.getElementById("productFeedbackMessage");
    const issuesElement = document.getElementById("productFeedbackIssues");
    const icon = modal?.querySelector(".product-feedback-icon i");

    if (!modal || !titleElement || !messageElement || !issuesElement) {
        window.alert(`${title}\n${message}`);
        return;
    }

    modal.classList.toggle("is-error", type === "error");
    if (icon) icon.className = type === "error" ? "fas fa-exclamation" : "fas fa-check";
    titleElement.textContent = title;
    messageElement.textContent = message;
    issuesElement.innerHTML = "";
    issues.forEach(issue => {
        const item = document.createElement("li");
        item.textContent = issue.message || String(issue);
        issuesElement.appendChild(item);
    });

    if (window.jQuery && $.fn.modal) $(modal).modal("show");
    else window.alert(`${title}\n${message}`);
}

function validateProductForm() {
    clearProductFieldErrors();
    const issues = [];
    const addIssue = (field, message) => {
        issues.push({ field, message });
        markProductField(field, message);
    };

    const name = document.getElementById("product-name");
    const category = document.getElementById("product-category");
    const brand = document.getElementById("product-brand");
    const rating = document.getElementById("product-rating");
    const hasVariants = document.getElementById("has-variants")?.checked || false;

    if (!name.value.trim()) addIssue(name, "Le nom du produit est obligatoire.");
    if (!category.value) addIssue(category, "Sélectionnez une catégorie.");
    if (!brand.value) addIssue(brand, "Sélectionnez une marque.");
    if (Number(rating.value) < 0 || Number(rating.value) > 5) addIssue(rating, "La note doit être comprise entre 0 et 5.");

    document.querySelectorAll(".spec-input").forEach(field => {
        if (field.value.trim() && !field.value.includes(":")) {
            addIssue(field, "Une caractéristique doit respecter le format Clé:Valeur.");
        }
    });

    if (hasVariants) {
        const variantPrices = [...document.querySelectorAll(".variant-price")];
        const validPrices = variantPrices.filter(field => Number(field.value) > 0);
        if (!variantPrices.length || !validPrices.length) {
            addIssue(variantPrices[0] || "#add-variant-btn", "Ajoutez au moins une variante avec un prix supérieur à 0.");
        }
        variantPrices.forEach(field => {
            if (field.value !== "" && Number(field.value) <= 0) addIssue(field, "Le prix de la variante doit être supérieur à 0.");
        });
        document.querySelectorAll(".variant-stock").forEach(field => {
            if (Number(field.value) < 0) addIssue(field, "Le stock d’une variante ne peut pas être négatif.");
        });
        const displayPrice = document.getElementById("display-price");
        if (displayPrice.value !== "" && Number(displayPrice.value) <= 0) {
            addIssue(displayPrice, "Le prix d’affichage doit être supérieur à 0.");
        }
    } else {
        document.querySelectorAll(".price-input").forEach(field => {
            if (field.value !== "" && Number(field.value) <= 0) addIssue(field, "Le prix doit être supérieur à 0.");
        });
        const stock = document.getElementById("product-stock");
        if (Number(stock.value) < 0) addIssue(stock, "Le stock ne peut pas être négatif.");
    }

    return issues;
}

function fieldFromApiError(fieldName, message) {
    const normalized = String(fieldName || "").replace(/^body\./, "");
    if (PRODUCT_API_FIELDS[normalized]) return PRODUCT_API_FIELDS[normalized];
    const text = String(message || "").toLowerCase();
    if (text.includes("spec")) return PRODUCT_API_FIELDS.specs;
    if (text.includes("couleur") || text.includes("color")) return PRODUCT_API_FIELDS.color;
    if (text.includes("variante") || text.includes("variant")) return PRODUCT_API_FIELDS.variants_data;
    if (text.includes("prix") || text.includes("price")) return PRODUCT_API_FIELDS.prices;
    if (text.includes("stock")) return PRODUCT_API_FIELDS.stock;
    if (text.includes("catégorie") || text.includes("category")) return PRODUCT_API_FIELDS.category_id;
    if (text.includes("marque") || text.includes("brand")) return PRODUCT_API_FIELDS.brand_id;
    if (text.includes("note") || text.includes("rating")) return PRODUCT_API_FIELDS.rating;
    if (text.includes("image")) return PRODUCT_API_FIELDS.images;
    if (text.includes("slug")) return PRODUCT_API_FIELDS.slug;
    if (text.includes("nom") || text.includes("name")) return PRODUCT_API_FIELDS.name;
    return null;
}

async function parseProductApiErrors(response) {
    let payload;
    try { payload = await response.json(); }
    catch (_) { payload = { detail: await response.text().catch(() => "Erreur inconnue") }; }

    const details = Array.isArray(payload?.detail) ? payload.detail : [payload?.detail || payload?.message || `Erreur HTTP ${response.status}`];
    return details.map(detail => {
        const fieldName = typeof detail === "object" ? detail.loc?.[detail.loc.length - 1] : null;
        const message = typeof detail === "object" ? (detail.msg || JSON.stringify(detail)) : String(detail);
        return { field: fieldFromApiError(fieldName, message), message };
    });
}

document.getElementById("product-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!TOKEN) {
        showProductFeedback("error", "Connexion requise", "Votre session administrateur a expiré.", [{ message: "Reconnectez-vous avant d’ajouter le produit." }]);
        return;
    }

    const clientIssues = validateProductForm();
    if (clientIssues.length) {
        clientIssues[0].field?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        showProductFeedback("error", "Formulaire incomplet", "Certains champs doivent être corrigés.", clientIssues);
        return;
    }

    const fd = new FormData();
    fd.append("name", document.getElementById("product-name").value.trim());
    fd.append("slug", document.getElementById("product-slug").value.trim());
    fd.append("description", document.getElementById("product-description").value.trim());
    fd.append("category_id", document.getElementById("product-category").value);
    fd.append("brand_id", document.getElementById("product-brand").value);
    fd.append("currency", document.getElementById("product-currency").value);
    fd.append("rating", document.getElementById("product-rating").value || 0);

    document.querySelectorAll(".spec-input").forEach(field => {
        if (field.value.trim()) fd.append("specs", field.value.trim());
    });
    document.querySelectorAll(".color-input").forEach(field => {
        if (field.value.trim()) fd.append("color", field.value.trim());
    });

    const hasVariants = document.getElementById("has-variants")?.checked || false;
    if (hasVariants) {
        const variants = [...document.querySelectorAll(".variant-card")].map(card => ({
            ram: card.querySelector(".variant-ram")?.value || null,
            storage: card.querySelector(".variant-storage")?.value || null,
            processor: card.querySelector(".variant-processor")?.value || null,
            price: Number(card.querySelector(".variant-price")?.value),
            stock: Number(card.querySelector(".variant-stock")?.value) || 0,
            sku: card.querySelector(".variant-sku")?.value || null
        })).filter(variant => variant.price > 0);
        fd.append("variants_data", JSON.stringify(variants));
        const displayPrice = document.getElementById("display-price").value;
        if (displayPrice) fd.append("display_price", displayPrice);
    } else {
        document.querySelectorAll(".price-input").forEach(field => {
            if (field.value.trim()) fd.append("prices", field.value.trim());
        });
        fd.append("stock", document.getElementById("product-stock").value || 0);
    }

    [...document.getElementById("product-images").files].forEach(file => fd.append("images", file));

    const submitBtn = this.querySelector("button[type='submit']");
    const originalButton = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm mr-2" aria-hidden="true"></span>Enregistrement...';

    try {
        const response = await fetch(`${API_BASE}/products`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${TOKEN}` },
            body: fd
        });

        if (!response.ok) {
            const apiIssues = await parseProductApiErrors(response);
            apiIssues.forEach(issue => { if (issue.field) markProductField(issue.field, issue.message); });
            showProductFeedback("error", "Produit non enregistré", "Le serveur a refusé certaines informations.", apiIssues);
            return;
        }

        const product = await response.json();
        this.reset();
        ["specs-list", "colors-list", "prices-list", "variants-list"].forEach(id => {
            document.getElementById(id).innerHTML = "";
        });
        document.getElementById("specs-list").appendChild(createSpecRow());
        document.getElementById("colors-list").appendChild(createColorRow());
        document.getElementById("prices-list").appendChild(createPriceRow());
        document.getElementById("simple-product-section").style.display = "block";
        document.getElementById("variants-section").style.display = "none";
        clearProductFieldErrors();
        updatePreview();

        await fetchProducts();
        showProductFeedback("success", "Produit enregistré", `Le produit a été ajouté avec succès${product.product_id ? ` (n° ${product.product_id})` : ""}.`, []);
    } catch (error) {
        console.error("submit product error", error);
        showProductFeedback("error", "Connexion impossible", "Le produit n’a pas pu être enregistré.", [{ message: error.message || "Erreur réseau" }]);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalButton;
    }
});


// Ajouter une ligne prix
function createPriceRow() {
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.className = "form-control price-input mb-2";
    input.placeholder = "Ex : 1200";
    return input;
    }
    document.getElementById("add-price-btn").addEventListener("click", () => {
    document.getElementById("prices-list").appendChild(createPriceRow());
    });

    // Ajouter une ligne spec
    function createSpecRow() {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control spec-input mb-2";
    input.placeholder = "Ex : RAM:16GB";
    return input;
    }
    document.getElementById("add-spec-btn").addEventListener("click", () => {
    document.getElementById("specs-list").appendChild(createSpecRow());
});

// Ajouter une ligne couleur
function createColorRow() {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control color-input mb-2";
    input.placeholder = "Ex : Rouge";
    input.setAttribute("list", "existing-product-colors");
    input.setAttribute("autocomplete", "off");
    return input;
}
document.getElementById("add-color-btn").addEventListener("click", () => {
    document.getElementById("colors-list").appendChild(createColorRow());
});

// Initialiser avec une ligne par défaut
document.getElementById("prices-list").appendChild(createPriceRow());
document.getElementById("specs-list").appendChild(createSpecRow());
document.getElementById("colors-list").appendChild(createColorRow());

// ---------- GESTION DES VARIANTES ----------

// Écouter le changement du switch
document.getElementById('has-variants').addEventListener('change', function(e) {
    const isVariant = e.target.checked;
    
    if (isVariant) {
        // Mode variantes
        document.getElementById('simple-product-section').style.display = 'none';
        document.getElementById('variants-section').style.display = 'block';
        
        // Ajouter une première variante par défaut
        if (document.getElementById('variants-list').children.length === 0) {
            addVariantRow();
        }
    } else {
        // Mode simple
        document.getElementById('simple-product-section').style.display = 'block';
        document.getElementById('variants-section').style.display = 'none';
    }
});

// Fonction pour créer une ligne de variante
function createVariantRow(index = null) {
    const variantId = index !== null ? index : Date.now();
    const wrapper = document.createElement('div');
    wrapper.className = 'variant-card';
    wrapper.dataset.variantId = variantId;
    
    // Générer les options de RAM (exemple)
    const ramOptions = ['4GB', '8GB', '16GB', '32GB', '64GB'];
    const storageOptions = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'];
    const processorOptions = ['Dual core','i3', 'i5', 'i7', 'i9', 'Ryzen 5', 'Ryzen 7', 'Ultra 5', 'Ultra 7'];
    
    wrapper.innerHTML = `
        <div class="variant-remove" onclick="this.closest('.variant-card').remove()">
            <i class="fas fa-times-circle"></i>
        </div>
        <div class="variant-title">Variante ${document.querySelectorAll('.variant-card').length + 1}</div>
        
        <div class="row">
            <div class="col-md-4 mb-2">
                <label class="small">RAM</label>
                <select class="form-control form-control-sm variant-ram">
                    <option value="">Sélectionner</option>
                    ${ramOptions.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
            </div>
            
            <div class="col-md-4 mb-2">
                <label class="small">Stockage</label>
                <select class="form-control form-control-sm variant-storage">
                    <option value="">Sélectionner</option>
                    ${storageOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            </div>
            
            <div class="col-md-4 mb-2">
                <label class="small">Processeur</label>
                <select class="form-control form-control-sm variant-processor">
                    <option value="">Sélectionner</option>
                    ${processorOptions.map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>
            </div>
            
            <div class="col-md-4 mb-2">
                <label class="small">Prix (XOF)</label>
                <input type="number" class="form-control form-control-sm variant-price" placeholder="450000" min="0">
            </div>
            
            <div class="col-md-4 mb-2">
                <label class="small">Stock</label>
                <input type="number" class="form-control form-control-sm variant-stock" placeholder="5" min="0" value="0">
            </div>
            
            <div class="col-md-4 mb-2">
                <label class="small">SKU (optionnel)</label>
                <input type="text" class="form-control form-control-sm variant-sku" placeholder="HP290-8-256">
            </div>
        </div>
    `;
    
    return wrapper;
}

// Ajouter une variante
document.getElementById('add-variant-btn').addEventListener('click', function() {
    addVariantRow();
});

function addVariantRow() {
    document.getElementById('variants-list').appendChild(createVariantRow());
}

// Initialiser avec une variante si le switch est activé par défaut (optionnel)
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter une variante par défaut si besoin
    // addVariantRow();
});

// ---------------------- MISE A JOUR DE L APERCU -------------------------------

function updatePreview() {
    // Nom
    document.getElementById("preview-name").textContent =
        document.getElementById("product-name").value || "—";

    // Prix (mode simple)
    const priceNodes = document.querySelectorAll(".price-input");
    const prices = [];
    priceNodes.forEach(p => {
        const v = p.value.trim();
        if (v) prices.push(v);
    });
    document.getElementById("preview-prices").textContent = prices.join(", ") || "—";
    document.getElementById("preview-currency").textContent =
        document.getElementById("product-currency").value;

    // Couleurs
    const colorNodes = document.querySelectorAll(".color-input");
    const colors = [];
    colorNodes.forEach(c => {
        const v = c.value.trim();
        if (v) colors.push(v);
    });
    document.getElementById("preview-colors").textContent = colors.join(", ") || "—";

    // Specs
    const specNodes = document.querySelectorAll(".spec-input");
    const specs = [];
    specNodes.forEach(s => {
        const v = s.value.trim();
        if (v) specs.push(v);
    });
    document.getElementById("preview-specs").textContent = specs.join(" | ") || "—";

    // Stock (mode simple)
    document.getElementById("preview-stock").textContent =
        document.getElementById("product-stock").value || "—";

    // Images
    const files = document.getElementById("product-images").files;
    const previewImages = document.getElementById("preview-images");
    previewImages.innerHTML = "";
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.className = "img-thumbnail mr-2 mb-2";
            img.style.width = "80px";
            img.style.height = "80px";
            previewImages.appendChild(img);
        };
        reader.readAsDataURL(files[i]);
    }

    // ✅ Affichage des variantes (si mode variantes activé)
    const hasVariants = document.getElementById('has-variants')?.checked || false;
    let previewVariants = document.getElementById('preview-variants');
    
    if (!previewVariants) {
        previewVariants = document.createElement('div');
        previewVariants.id = 'preview-variants';
        document.querySelector('#product-preview').appendChild(previewVariants);
    }
    
    if (hasVariants) {
        const variantCards = document.querySelectorAll('.variant-card');
        let variantsHtml = '<strong>Variantes:</strong><ul class="list-unstyled mt-2">';
        
        variantCards.forEach((card, index) => {
            const ram = card.querySelector('.variant-ram')?.value || '?';
            const storage = card.querySelector('.variant-storage')?.value || '?';
            const price = card.querySelector('.variant-price')?.value || '0';
            const stock = card.querySelector('.variant-stock')?.value || '0';
            
            variantsHtml += `<li class="mb-1">⚡ Variante ${index+1}: ${ram} / ${storage} → ${price} XOF (stock: ${stock})</li>`;
        });
        variantsHtml += '</ul>';
        
        previewVariants.innerHTML = variantsHtml;
    } else {
        previewVariants.innerHTML = '';
    }
}

// Attacher les événements
document.getElementById("product-form").addEventListener("input", updatePreview);
document.getElementById("product-images").addEventListener("change", updatePreview);

// Fonction pour afficher les produits dans le tableau
// Modifier displayProducts pour accepter un paramètre
function displayProducts(products) {
    const tbody = document.getElementById("products-body");
    const dataTable = window.jQuery && $.fn.DataTable?.isDataTable("#dataTable")
        ? $("#dataTable").DataTable()
        : null;
    if (dataTable) dataTable.clear();
    else tbody.innerHTML = "";

    products.forEach(product => {
        const mainImage = product.images?.length > 0
            ? product.images.find(img => img.is_main)?.image_url || product.images[0]?.image_url
            : "placeholder.jpg";

        const stock = product.inventory ? product.inventory.quantity : 0;

        const price = product.prices?.length > 0
            ? `${product.prices[0].price} ${product.prices[0].currency}`
            : "N/A";

        const specsSummary = product.specs
            ? product.specs.map(s => `${s.key}: ${s.value}`).join("<br>")
            : "";

        const categoryName = product.category?.name || "-";
        const brandName = product.brand?.name || "-";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <img src="${API_BASE}/${mainImage}" 
                     width="60" 
                     class="img-thumbnail"
                     onerror="this.src='${API_BASE}/placeholder.jpg'">
            </td>
            <td>${product.name}</td>
            <td>${categoryName}</td>
            <td>${brandName}</td>
            <td>${price}</td>
            <td>${stock}</td>
            <td>
                <div class="specs-cell">
                    ${specsSummary}
                </div>
            </td>
            
            <td>
                <button class="btn btn-sm btn-warning" onclick="openEditModal(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        if (dataTable) dataTable.row.add(row);
        else tbody.appendChild(row);
    });

    if (dataTable) dataTable.draw(false);
}

// ---------- LOAD PRODUCTS INTO TABLE ----------
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/products/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Erreur lors de la récupération des produits");
        }

        const products = await response.json();
        displayProducts(products);

    } catch (error) {
        console.error("Erreur GET produits:", error);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
    loadCategoriesList();
    initSearch();
});

//************************* Modifications et Suppressions de produits *************************




async function loadCategoriesInEdit(selectedId) {
    const res = await fetch(`${API_BASE}/categories/`);
    const cats = await res.json();

    const select = document.getElementById("editCategory");
    select.innerHTML = "";

    cats.forEach(c => {
        select.innerHTML += `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${c.name}</option>`;
    });
}

async function loadBrandsInEdit(selectedId) {
    const res = await fetch(`${API_BASE}/brands/`);
    const brands = await res.json();

    const select = document.getElementById("editBrand");
    select.innerHTML = "";

    brands.forEach(b => {
        select.innerHTML += `<option value="${b.id}" ${b.id === selectedId ? "selected" : ""}>${b.name}</option>`;
    });
}


async function deleteProduct(id) {
    if (!confirm("Supprimer ce produit ?")) return;

    const token = localStorage.getItem("access_token");

    const res = await fetch(`${API_BASE}/products/trash/${id}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (res.ok) {
        fetchProducts(); // rafraîchir la liste
    } else {
        alert("Erreur lors de la suppression");
    }
}


// Ouvrir le modal d'édition
async function openEditModal(productId) {
    const token = localStorage.getItem("access_token");
    
    try {
        document.getElementById("editImages").value = "";
        document.getElementById("editMainImageId").value = "";
        document.getElementById("editNewImagesPreview")?.remove();
        window.newMainImageIndex = undefined;

        // 1️⃣ Charger le produit
        const res = await fetch(`${API_BASE}/products/${productId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const product = await res.json();

        // 2️⃣ Remplir les infos de base
        document.getElementById("editProductId").value = product.id;
        document.getElementById("editName").value = product.name;
        document.getElementById("editSlug").value = product.slug || '';
        document.getElementById("editDescription").value = product.description || '';
        document.getElementById("editRating").value = product.rating || 0;

        // 3️⃣ Charger catégories & marques
        await loadCategoriesInEdit(product.category?.id);
        await loadBrandsInEdit(product.brand?.id);

        // 4️⃣ Charger les spécifications
        const specsContainer = document.getElementById("editSpecsList");
        specsContainer.innerHTML = "";
        if (product.specs && product.specs.length > 0) {
            product.specs.forEach(spec => {
                specsContainer.appendChild(createEditSpecRow(spec.key, spec.value));
            });
        } else {
            specsContainer.appendChild(createEditSpecRow());
        }

        // 5️⃣ ✅ CHARGER LES COULEURS CORRECTEMENT
        const colorsContainer = document.getElementById("editColorsList");
        colorsContainer.innerHTML = "";
        
        if (product.colors && product.colors.length > 0) {
            console.log("🎨 Couleurs chargées:", product.colors);
            product.colors.forEach(color => {
                // color peut être un objet {id, color} ou une string
                const colorValue = typeof color === 'object' ? color.color : color;
                colorsContainer.appendChild(createEditColorRow(colorValue));
            });
        } else {
            colorsContainer.appendChild(createEditColorRow());
        }

        // 6️⃣ Vérifier le type de produit
        const hasVariants = product.has_variants || false;
        document.getElementById("editHasVariants").value = hasVariants ? "true" : "false";

        const typeLabel = document.getElementById("editProductTypeLabel");
        const simpleSection = document.getElementById("editSimpleSection");
        const variantsSection = document.getElementById("editVariantsSection");
        
        if (hasVariants) {
            typeLabel.innerHTML = 'Produit à variantes <span class="product-type-badge badge-variants">Variantes</span>';
            simpleSection.style.display = 'none';
            variantsSection.style.display = 'block';
            
            try {
                const variantsRes = await fetch(`${API_BASE}/products/${productId}/variants`);
                if (variantsRes.ok) {
                    const variants = await variantsRes.json();
                    loadVariantsForEdit(variants);
                    document.getElementById("editCurrency").value = product.prices?.[0]?.currency || "XOF";
                    document.getElementById("editDisplayPrice").value = product.prices?.[0]?.price || 0;
                }
            } catch (e) {
                console.error("Erreur chargement variantes:", e);
            }
            
        } else {
            typeLabel.innerHTML = 'Produit simple <span class="product-type-badge badge-simple">Simple</span>';
            simpleSection.style.display = 'block';
            variantsSection.style.display = 'none';
            
            document.getElementById("editPrice").value = product.prices?.[0]?.price || 0;
            document.getElementById("editStock").value = product.inventory?.quantity || 0;
        }

        // 7️⃣ Afficher les images existantes
        displayExistingImages(product.images);

        // 8️⃣ Ouvrir le modal
        $("#editProductModal").modal("show");

    } catch (err) {
        console.error("❌ Erreur chargement produit:", err);
        showAlert("Erreur lors du chargement du produit", "error");
    }
}

// Charger les variantes dans le formulaire d'édition
function loadVariantsForEdit(variants) {
    console.log("🔄 loadVariantsForEdit appelée avec", variants.length, "variantes");
    
    const container = document.getElementById("editVariantsList");
    if (!container) {
        console.error("❌ Container editVariantsList introuvable !");
        return;
    }
    
    container.innerHTML = "";
    
    if (!variants || variants.length === 0) {
        console.warn("⚠️ Aucune variante à afficher");
        container.innerHTML = '<p class="text-muted">Aucune variante existante. Cliquez sur "Ajouter" pour en créer.</p>';
        return;
    }
    
    // Normaliser les données (au cas où l'API renvoie 'quantity' au lieu de 'stock')
    const normalizedVariants = variants.map(v => ({
        id: v.id,
        ram: v.ram || '',
        storage: v.storage || '',
        processor: v.processor || '',
        sku: v.sku || '',
        price: v.price || 0,
        stock: v.stock || v.quantity || 0  // Accepte les deux
    }));
    
    normalizedVariants.forEach((variant, index) => {
        const row = createEditVariantRow(variant, index);
        container.appendChild(row);
    });
    
    console.log(`✅ ${variants.length} variantes affichées`);
}

// Créer une ligne de variante pour l'édition

function createEditVariantRow(variant, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'edit-variant-card';
    wrapper.dataset.variantId = variant.id || 'new';
    
    const ramOptions = ['4GB', '8GB', '16GB', '32GB', '64GB'];
    const storageOptions = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'];
    const processorOptions = ['Dual core', 'i3', 'i5', 'i7', 'i9', 'Ryzen 5', 'Ryzen 7'];
    
    wrapper.innerHTML = `
        <div class="edit-variant-remove" onclick="removeEditVariant(this)">
            <i class="fas fa-times-circle"></i>
        </div>
        <div class="edit-variant-title">Variante ${index + 1} ${!variant.id ? '(Nouvelle)' : ''}</div>
        
        <div class="row">
            <div class="col-md-3 mb-2">
                <label class="small">RAM</label>
                <select class="form-control form-control-sm edit-variant-ram">
                    <option value="">Sélectionner</option>
                    ${ramOptions.map(r => `<option value="${r}" ${variant.ram === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
            
            <div class="col-md-3 mb-2">
                <label class="small">Stockage</label>
                <select class="form-control form-control-sm edit-variant-storage">
                    <option value="">Sélectionner</option>
                    ${storageOptions.map(s => `<option value="${s}" ${variant.storage === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            
            <div class="col-md-3 mb-2">
                <label class="small">Processeur</label>
                <select class="form-control form-control-sm edit-variant-processor">
                    <option value="">Sélectionner</option>
                    ${processorOptions.map(p => `<option value="${p}" ${variant.processor === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
            </div>
            
            <div class="col-md-3 mb-2">
                <label class="small">SKU</label>
                <input type="text" class="form-control form-control-sm edit-variant-sku" 
                       value="${variant.sku || ''}" placeholder="Auto-généré">
            </div>
            
            <div class="col-md-3 mb-2">
                <label class="small">Prix (XOF)</label>
                <input type="number" class="form-control form-control-sm edit-variant-price" 
                       value="${variant.price || 0}" min="0" step="100" required>
            </div>
            
            <div class="col-md-3 mb-2">
                <label class="small">Stock</label>
                <input type="number" class="form-control form-control-sm edit-variant-stock" 
                       value="${variant.stock || variant.quantity || 0}" min="0">
            </div>
        </div>
    `;
    
    return wrapper;
}

// Créer une ligne de spécification pour l'édition
function createEditSpecRow(key = "", value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "input-group mb-2 spec-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control edit-spec-input";
    input.placeholder = "Clé:Valeur (ex: RAM:16GB)";
    input.value = key && value ? `${key}:${value}` : "";

    const removeBtn = document.createElement("div");
    removeBtn.className = "input-group-append";
    removeBtn.innerHTML = `<button class="btn btn-danger remove-spec" type="button">&times;</button>`;

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);

    removeBtn.querySelector(".remove-spec").addEventListener("click", () => wrapper.remove());

    return wrapper;
}

// Créer une ligne de couleur pour l'édition
function createEditColorRow(color = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "input-group mb-2 color-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control edit-color-input";
    input.placeholder = "Couleur (ex: Rouge, Noir, Blanc)";
    input.setAttribute("list", "existing-product-colors");
    input.setAttribute("autocomplete", "off");
    input.value = color;

    const removeBtn = document.createElement("div");
    removeBtn.className = "input-group-append";
    removeBtn.innerHTML = `<button class="btn btn-danger remove-color" type="button">&times;</button>`;

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);

    removeBtn.querySelector(".remove-color").addEventListener("click", () => wrapper.remove());

    return wrapper;
}

// Initialiser les boutons d'ajout
document.getElementById("editAddSpecBtn")?.addEventListener("click", () => {
    document.getElementById("editSpecsList").appendChild(createEditSpecRow());
});

document.getElementById("editAddColorBtn")?.addEventListener("click", () => {
    document.getElementById("editColorsList").appendChild(createEditColorRow());
});

// Ajouter une nouvelle variante dans l'édition
document.getElementById("editAddVariantBtn")?.addEventListener("click", function() {
    const container = document.getElementById("editVariantsList");
    const newVariant = {
        id: null, // null = nouvelle variante à créer
        ram: '',
        storage: '',
        processor: '',
        sku: '',
        price: 0,
        stock: 0
    };
    container.appendChild(createEditVariantRow(newVariant, container.children.length));
});

// Supprimer une variante
function removeEditVariant(element) {
    if (confirm("Supprimer cette variante ?")) {
        element.closest('.edit-variant-card').remove();
    }
}

// Afficher les images existantes



// Ajouter un écouteur pour montrer quelle image sera principale
document.getElementById("editImages")?.addEventListener("change", function(e) {
    const files = e.target.files;
    if (files.length > 0) {
        document.getElementById("editMainImageId").value = "";
        window.newMainImageIndex = 0;
        previewNewImages(files);
    } else {
        window.newMainImageIndex = undefined;
        document.getElementById("editNewImagesPreview")?.remove();
    }
});


// Afficher les images existantes avec option "Définir comme principale"
function displayExistingImages(images) {
    const container = document.getElementById("editExistingImages");
    container.innerHTML = "";
    
    if (!images || images.length === 0) {
        container.innerHTML = '<p class="text-muted small">Aucune image existante</p>';
        return;
    }
    
    images.forEach((img, index) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'position-relative mr-2 mb-2 existing-image-item';
        imgDiv.dataset.imageUrl = img.image_url;
        imgDiv.dataset.imageId = img.id;
        imgDiv.dataset.isMain = img.is_main;
        
        const badgeHtml = img.is_main 
            ? '<span class="badge badge-success position-absolute" style="top: 0; left: 0;">Principale</span>'
            : '<span class="badge badge-secondary position-absolute" style="top: 0; left: 0;">Secondaire</span>';
        
        const setMainBtn = !img.is_main 
            ? `<button type="button" class="btn btn-sm btn-primary set-main-image mt-1" data-image-id="${img.id}" data-image-url="${img.image_url}">Définir principale</button>`
            : '';
        
        imgDiv.innerHTML = `
            <img src="${API_BASE}/${img.image_url}" 
                 class="img-thumbnail" 
                 style="width: 100px; height: 100px; object-fit: cover;">
            ${badgeHtml}
            <div class="text-center mt-1">
                ${setMainBtn}
            </div>
        `;
        container.appendChild(imgDiv);
    });
    
    // ✅ Attacher les événements APRÈS avoir ajouté les boutons
    attachSetMainImageEvents();
}

function attachSetMainImageEvents() {
    document.querySelectorAll('.set-main-image').forEach(btn => {
        // Nettoyer les anciens événements
        btn.removeEventListener('click', handleSetMainClick);
        btn.addEventListener('click', handleSetMainClick);
    });
}

function handleSetMainClick(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const imageId = btn.dataset.imageId;
    const imageUrl = btn.dataset.imageUrl;
    
    // Mettre à jour visuellement
    document.querySelectorAll('.existing-image-item').forEach(item => {
        const badge = item.querySelector('.badge');
        const existingBtn = item.querySelector('.set-main-image');
        
        if (item.dataset.imageId == imageId) {
            // Cette image devient principale
            if (badge) {
                badge.textContent = 'Principale';
                badge.className = 'badge badge-success position-absolute';
            }
            if (existingBtn) existingBtn.remove(); // Enlever le bouton
            item.dataset.isMain = 'true';
        } else {
            // Les autres deviennent secondaires
            item.dataset.isMain = 'false';
            if (badge) {
                badge.textContent = 'Secondaire';
                badge.className = 'badge badge-secondary position-absolute';
            }
            // Ajouter le bouton si pas présent
            if (!item.querySelector('.set-main-image')) {
                const newBtn = document.createElement('button');
                newBtn.type = 'button';
                newBtn.className = 'btn btn-sm btn-primary set-main-image mt-1';
                newBtn.dataset.imageId = item.dataset.imageId;
                newBtn.dataset.imageUrl = item.dataset.imageUrl;
                newBtn.textContent = 'Définir principale';
                newBtn.addEventListener('click', handleSetMainClick);
                item.querySelector('.text-center').appendChild(newBtn);
            }
        }
    });
    
    // Stocker l'ID de la nouvelle image principale
    document.getElementById('editMainImageId').value = imageId;
    document.getElementById('editImages').value = '';
    document.getElementById('editNewImagesPreview')?.remove();
    window.newMainImageIndex = undefined;
}

// Aperçu des nouvelles images avec sélection de la principale
function previewNewImages(files) {
    const container = document.getElementById("editNewImagesPreview") || createPreviewContainer();
    container.innerHTML = '<h6 class="w-100 mt-2">Nouvelles images — elles remplaceront les images existantes :</h6>';
    window.newMainImageIndex = 0;
    
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        const imgDiv = document.createElement('div');
        imgDiv.className = 'position-relative mr-2 mb-2 new-image-item d-inline-block';
        imgDiv.dataset.index = i;
        imgDiv.innerHTML = `
            <img alt="Aperçu image ${i + 1}" style="width: 100px; height: 100px; object-fit: cover;" class="img-thumbnail">
            <span class="badge ${i === 0 ? 'badge-success' : 'badge-secondary'} position-absolute" style="top: 0; left: 0;">${i === 0 ? 'Principale' : `Image ${i + 1}`}</span>
            <button type="button" class="btn btn-sm btn-outline-primary set-new-main mt-1" data-index="${i}" ${i === 0 ? 'disabled' : ''}>${i === 0 ? 'Sélectionnée' : 'Définir principale'}</button>
        `;
        container.appendChild(imgDiv);
        const previewImage = imgDiv.querySelector('img');
        reader.onload = event => { previewImage.src = event.target.result; };
        reader.readAsDataURL(files[i]);
        imgDiv.querySelector('.set-new-main').addEventListener('click', () => selectNewMainImage(i));
    }
}

function selectNewMainImage(newMainIndex) {
    const container = document.getElementById("editNewImagesPreview");
    container?.querySelectorAll('.new-image-item').forEach(item => {
        const itemIndex = Number(item.dataset.index);
        const selected = itemIndex === newMainIndex;
        const badge = item.querySelector('.badge');
        const button = item.querySelector('.set-new-main');
        badge.textContent = selected ? 'Principale' : `Image ${itemIndex + 1}`;
        badge.className = `badge ${selected ? 'badge-success' : 'badge-secondary'} position-absolute`;
        button.disabled = selected;
        button.textContent = selected ? 'Sélectionnée' : 'Définir principale';
    });
    window.newMainImageIndex = newMainIndex;
}

function createPreviewContainer() {
    const container = document.getElementById("editExistingImages");
    const previewDiv = document.createElement('div');
    previewDiv.id = "editNewImagesPreview";
    previewDiv.className = "d-flex flex-wrap mt-3";
    previewDiv.innerHTML = '<h6>Nouvelles images sélectionnées :</h6>';
    container.parentNode.insertBefore(previewDiv, container.nextSibling);
    return previewDiv;
}

//envois des produits modifier
async function submitEditProduct() {
    const id = document.getElementById("editProductId").value;
    const token = localStorage.getItem("access_token");
    const hasVariants = document.getElementById("editHasVariants").value === 'true';

    const formData = new FormData();
    
    // Infos de base
    formData.append("name", document.getElementById("editName").value);
    formData.append("slug", document.getElementById("editSlug").value || '');
    formData.append("description", document.getElementById("editDescription").value);
    formData.append("category_id", document.getElementById("editCategory").value);
    formData.append("brand_id", document.getElementById("editBrand").value);
    formData.append("rating", document.getElementById("editRating").value || 0);

    // Specs
    const specInputs = document.querySelectorAll("#editSpecsList .edit-spec-input");
    specInputs.forEach(input => {
        if (input.value.trim()) {
            formData.append("specs", input.value.trim());
        }
    });

    // ✅ COULEURS - Correction importante
    const colorInputs = document.querySelectorAll("#editColorsList .edit-color-input");
    const colors = [];
    colorInputs.forEach(input => {
        const colorValue = input.value.trim();
        if (colorValue) {
            colors.push(colorValue);
        }
    });
    
    // ✅ Ajouter chaque couleur individuellement avec le même nom de champ "color"
    colors.forEach(color => {
        formData.append("color", color);
    });
    
    console.log("🎨 Couleurs envoyées:", colors); // Debug

    if (hasVariants) {
        // Devise et prix d'affichage
        formData.append("currency", document.getElementById("editCurrency").value);
        formData.append("display_price", document.getElementById("editDisplayPrice").value);

        // Collecter les variantes
        const variantCards = document.querySelectorAll('.edit-variant-card');
        const variants = [];
        
        variantCards.forEach((card, idx) => {
            const ram = card.querySelector('.edit-variant-ram')?.value;
            const storage = card.querySelector('.edit-variant-storage')?.value;
            const processor = card.querySelector('.edit-variant-processor')?.value;
            const price = card.querySelector('.edit-variant-price')?.value;
            const stock = card.querySelector('.edit-variant-stock')?.value;
            const sku = card.querySelector('.edit-variant-sku')?.value;
            const variantId = card.dataset.variantId;
            
            if (!price) {
                alert(`Veuillez remplir le prix pour la variante ${idx + 1}`);
                return;
            }
            
            variants.push({
                id: variantId && variantId !== 'new' && variantId !== 'undefined' ? parseInt(variantId) : null,
                ram: ram || null,
                storage: storage || null,
                processor: processor || null,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                sku: sku || null
            });
        });
        
        if (variants.length === 0) {
            alert("Ajoutez au moins une variante");
            return;
        }
        
        formData.append("variants_data", JSON.stringify(variants));
        
    } else {
        // Produit simple
        formData.append("prices", document.getElementById("editPrice").value);
        formData.append("stock", document.getElementById("editStock").value);
    }

    // Images
    // ✅ GESTION DES IMAGES AVEC SÉLECTION DE LA PRINCIPALE
    const files = document.getElementById("editImages").files;
    const mainImageId = document.getElementById("editMainImageId")?.value; // ID d'une image existante à définir comme principale
    
    if (files.length > 0) {
        console.log(`📸 ${files.length} nouvelle(s) image(s) sélectionnée(s)`);
        
        for (let i = 0; i < files.length; i++) {
            formData.append("images", files[i]);
        }
        formData.append("new_main_image_index", String(window.newMainImageIndex ?? 0));
        console.log(`🖼️ Image principale définie: ${(window.newMainImageIndex ?? 0) + 1}`);
    }
    
    // Si on veut changer l'image principale parmi les existantes
    if (mainImageId && files.length === 0) {
        // On peut passer un paramètre spécial au backend
        formData.append("main_image_id", mainImageId);
    }

    // UI feedback
    const submitBtn = document.querySelector('.modal-footer .btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enregistrement...';

    try {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) {

            // Reset des variables globales
            window.newMainImageIndex = undefined;
            window.newImagesOrder = [];
            document.getElementById("editMainImageId").value = '';

            const error = await res.json();
            console.error("Erreur modification:", error);
            showAlert("Erreur lors de la modification: " + (error.detail || "Erreur inconnue"), "error");
            return;
        }

        showAlert("Produit modifié avec succès", "success");
        $("#editProductModal").modal("hide");
        fetchProducts();

    } catch (err) {
        console.error("Erreur réseau:", err);
        showAlert("Erreur réseau", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ===============================================
// RECHERCHE EN TEMPS RÉEL SUR LE TABLEAU
// ===============================================

// Variable pour stocker tous les produits
let allProducts = [];

function updateProductSuggestions(products) {
    const namesList = document.getElementById("existing-product-names");
    const colorsList = document.getElementById("existing-product-colors");
    if (!namesList || !colorsList) return;

    const uniqueValues = values => {
        const seen = new Set();
        return values.filter(value => {
            const cleanValue = String(value || "").trim();
            const key = cleanValue.toLocaleLowerCase("fr");
            if (!cleanValue || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const productNames = uniqueValues(products.map(product => product.name)).sort((a, b) => a.localeCompare(b, "fr"));
    const productColors = uniqueValues(products.flatMap(product =>
        (product.colors || []).map(color => typeof color === "object" ? color.color : color)
    )).sort((a, b) => a.localeCompare(b, "fr"));

    namesList.replaceChildren(...productNames.map(name => {
        const option = document.createElement("option");
        option.value = name;
        return option;
    }));
    colorsList.replaceChildren(...productColors.map(color => {
        const option = document.createElement("option");
        option.value = color;
        return option;
    }));
}

// Modifier fetchProducts pour stocker tous les produits
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/products/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Erreur lors de la récupération des produits");
        }

        allProducts = await response.json(); // Stocker tous les produits
        displayProducts(allProducts); // Afficher tout
        updateProductSuggestions(allProducts);
        updateSearchResultCount(allProducts.length, allProducts.length);

    } catch (error) {
        console.error("Erreur GET produits:", error);
    }
}

// Fonction de recherche
function filterProducts(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        // Si recherche vide, afficher tout
        displayProducts(allProducts);
        updateSearchResultCount(allProducts.length, allProducts.length);
        return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    const filtered = allProducts.filter(product => {
        // Recherche dans le nom
        const nameMatch = product.name?.toLowerCase().includes(term);
        
        // Recherche dans la catégorie
        const categoryMatch = product.category?.name?.toLowerCase().includes(term);
        
        // Recherche dans la marque
        const brandMatch = product.brand?.name?.toLowerCase().includes(term);
        
        // Recherche dans les specs
        const specsMatch = product.specs?.some(spec => 
            spec.key?.toLowerCase().includes(term) || 
            spec.value?.toLowerCase().includes(term)
        );
        
        // Recherche dans le prix (si le terme est un nombre)
        const priceMatch = product.prices?.[0]?.price && 
                          product.prices[0].price.toString().includes(term);
        
        return nameMatch || categoryMatch || brandMatch || specsMatch || priceMatch;
    });

    displayProducts(filtered);
    updateSearchResultCount(filtered.length, allProducts.length);
}

// Mettre à jour le compteur de résultats
function updateSearchResultCount(filtered, total) {
    const countEl = document.getElementById('searchResultCount');
    if (countEl) {
        if (filtered === total) {
            countEl.textContent = `${total} produit(s)`;
        } else {
            countEl.textContent = `${filtered} résultat(s) sur ${total}`;
        }
    }
}

// Initialiser la recherche
function initSearch() {
    const searchInput = document.getElementById('productSearchInput');
    const searchBtn = document.getElementById('productSearchBtn');
    
    if (!searchInput) return;
    
    // Recherche en temps réel (au fur et à mesure de la saisie)
    searchInput.addEventListener('input', function(e) {
        filterProducts(e.target.value);
    });
    
    // Recherche au clic sur le bouton
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            filterProducts(searchInput.value);
        });
    }
    
    // Recherche avec la touche Entrée
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            filterProducts(searchInput.value);
        }
    });
}

// Ajouter un bouton pour effacer la recherche (optionnel)
function addClearSearchButton() {
    const searchInput = document.getElementById('productSearchInput');
    if (!searchInput) return;
    
    // Créer un bouton "Effacer" qui apparaît quand on tape
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-outline-secondary';
    clearBtn.type = 'button';
    clearBtn.innerHTML = '<i class="fas fa-times"></i>';
    clearBtn.style.display = 'none';
    clearBtn.title = 'Effacer la recherche';
    
    // Insérer le bouton après l'input
    searchInput.parentNode.appendChild(clearBtn);
    
    searchInput.addEventListener('input', function() {
        clearBtn.style.display = this.value ? 'inline-block' : 'none';
    });
    
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        filterProducts('');
        clearBtn.style.display = 'none';
        searchInput.focus();
    });
}

