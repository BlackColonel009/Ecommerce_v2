function initModernFooter() {
    const form = document.querySelector(".nt-newsletter__form");
    if (!form || form.dataset.initialized === "true") return;

    form.dataset.initialized = "true";
    const formWrap = form.closest(".nt-newsletter__form-wrap");
    const messageBox = document.createElement("div");
    messageBox.className = "newsletter-message mt-2";
    messageBox.setAttribute("aria-live", "polite");
    formWrap.appendChild(messageBox);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const emailInput = form.querySelector("#subscribeSrEmail");
        const submitButton = form.querySelector("button[type='submit']");
        const email = emailInput.value.trim();

        if (!email) return;

        submitButton.disabled = true;
        submitButton.textContent = "Inscription…";
        messageBox.innerHTML = "";

        try {
            const response = await fetch(`${API}/subscribe/newsletter`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email})
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || "Inscription impossible");

            messageBox.innerHTML = `<div class="alert alert-success py-2 px-3 mb-0">${data.message || "Inscription confirmée."}</div>`;
            form.reset();
        } catch (error) {
            messageBox.innerHTML = `<div class="alert alert-danger py-2 px-3 mb-0">${error.message}</div>`;
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `Je m’inscris <i class="fas fa-arrow-right"></i>`;
        }
    });
}

document.addEventListener("footerLoaded", initModernFooter);
if (document.readyState !== "loading") initModernFooter();
