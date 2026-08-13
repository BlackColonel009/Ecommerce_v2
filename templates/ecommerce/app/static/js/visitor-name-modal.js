(() => {
    "use strict";
    const CACHE_KEY = "nt_visitor_first_name";
    let pending = null;

    async function knownName() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) return cached;
        try {
            const response = await fetch(`${window.API || ""}/visitor/first-name`, { credentials: "include" });
            const data = response.ok ? await response.json() : {};
            if (data.first_name) localStorage.setItem(CACHE_KEY, data.first_name);
            return data.first_name || "";
        } catch (_) { return ""; }
    }

    async function saveName(value) {
        const response = await fetch(`${window.API || ""}/visitor/first-name`, {
            method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name: value })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "Impossible d'enregistrer le prénom.");
        localStorage.setItem(CACHE_KEY, data.first_name || value);
    }

    function showModal() {
        return new Promise(resolve => {
            const layer = document.createElement("div");
            layer.className = "nt-visitor-name-backdrop";
            layer.innerHTML = `<section class="nt-visitor-name-modal" role="dialog" aria-modal="true" aria-labelledby="nt-visitor-name-title"><div class="nt-visitor-name-modal__mascot" aria-hidden="true"><img src="/static/img/mascot-whatsapp.png" alt=""></div><h2 id="nt-visitor-name-title">Laissez-nous votre petit nom, s'il vous plaît ?</h2><p>Pour mieux vous accueillir sur WhatsApp.</p><form><input class="nt-visitor-name-modal__input" name="first_name" maxlength="80" autocomplete="given-name" placeholder="Votre prénom" required><span class="nt-visitor-name-modal__error" aria-live="polite"></span><div class="nt-visitor-name-modal__actions"><button class="nt-visitor-name-modal__continue" type="submit">Continuer <i class="fab fa-whatsapp"></i></button><button class="nt-visitor-name-modal__skip" type="button">Continuer sans prénom</button></div></form></section>`;
            const finish = () => { layer.remove(); resolve(true); };
            const form = layer.querySelector("form"), input = layer.querySelector("input"), error = layer.querySelector(".nt-visitor-name-modal__error"), submit = layer.querySelector("[type=submit]");
            layer.querySelector(".nt-visitor-name-modal__skip").addEventListener("click", finish);
            form.addEventListener("submit", async event => {
                event.preventDefault();
                const value = input.value.trim();
                if (value.length < 2) { error.textContent = "Indiquez au moins 2 caractères, s'il vous plaît."; input.focus(); return; }
                submit.disabled = true; submit.textContent = "Un instant…"; error.textContent = "";
                try { await saveName(value); finish(); } catch (err) { error.textContent = err.message; submit.disabled = false; submit.innerHTML = 'Continuer <i class="fab fa-whatsapp"></i>'; }
            });
            document.body.appendChild(layer);
            setTimeout(() => input.focus(), 40);
        });
    }

    window.NTVisitorName = {
        async ensure() {
            if (await knownName()) return true;
            if (!pending) pending = showModal().finally(() => { pending = null; });
            return pending;
        }
    };
})();
