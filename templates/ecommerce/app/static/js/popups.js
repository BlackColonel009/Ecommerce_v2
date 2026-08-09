async function loadPopups() {
  try {
    const res = await fetch(`${API}/popup/`);
    if (!res.ok) throw new Error("Erreur chargement popups");
    const popups = await res.json();

    const now = new Date();

    // Séparer expirées et valides
    const expiredPopups = popups.filter(p => new Date(p.end_date) < now);
    const validPopups = popups.filter(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      return p.is_active && start <= now && now <= end;
    });

    const container = document.getElementById("popup-container");
    container.innerHTML = "";

    // Gestion "une seule fois" pour expirées
    const shownExpired = localStorage.getItem("shownExpiredPopup");
    if (expiredPopups.length > 0 && !shownExpired) {
      const popup = expiredPopups[0]; // première expirée
      showPopup(popup, true);
      localStorage.setItem("shownExpiredPopup", "true");
      return; // on arrête ici, car expirée doit venir en premier
    }

    // Sinon afficher une popup valide aléatoire
    if (validPopups.length > 0) {
      const popup = validPopups[Math.floor(Math.random() * validPopups.length)];
      showPopup(popup, false);
    }

    function showPopup(popup, expired = false) {
      container.innerHTML = `
        <div class="nt-popup-backdrop" id="popup-backdrop-${popup.id}">
          <section class="popup nt-ad-popup ${expired ? 'expired' : ''}" id="popup-${popup.id}" role="dialog" aria-modal="true" aria-labelledby="popup-title-${popup.id}">
            <button type="button" class="close-btn" aria-label="Fermer la publicité"><i class="fas fa-times" aria-hidden="true"></i></button>
            <div class="nt-ad-popup__media">
              <img src="${API}/${popup.image_url}" alt="${popup.title}">
              <span>${expired ? 'Offre terminée' : 'Offre exclusive'}</span>
            </div>
            <div class="nt-ad-popup__content">
              <p class="nt-ad-popup__eyebrow">New Technologies Togo</p>
              <h3 id="popup-title-${popup.id}">${popup.title}</h3>
              <p class="nt-ad-popup__message">${popup.message}</p>
              ${!expired ? `
                <div class="nt-ad-popup__countdown-wrap">
                  <span class="nt-ad-popup__countdown-label">L'offre se termine dans</span>
                  <div class="js-countdown nt-ad-popup__countdown" data-end-date="${popup.end_date}">
                    <div><strong class="js-cd-days">00</strong><small>Jours</small></div>
                    <div><strong class="js-cd-hours">00</strong><small>Heures</small></div>
                    <div><strong class="js-cd-minutes">00</strong><small>Min</small></div>
                    <div><strong class="js-cd-seconds">00</strong><small>Sec</small></div>
                  </div>
                </div>
                <a href="${popup.cta_link}" class="cta" target="_blank" rel="noopener noreferrer">${popup.cta_text} <i class="fas fa-arrow-right" aria-hidden="true"></i></a>
              ` : '<p class="nt-ad-popup__expired-copy">Cette campagne est maintenant terminée.</p>'}
            </div>
          </section>
        </div>
      `;

      const popupEl = document.querySelector(`#popup-${popup.id}`);
      const backdropEl = document.querySelector(`#popup-backdrop-${popup.id}`);
      const closeBtn = popupEl.querySelector(".close-btn");
      let countdownTimer = null;

      const closePopup = () => {
        if (countdownTimer) clearInterval(countdownTimer);
        backdropEl.classList.remove("show");
        popupEl.classList.remove("show");
        document.removeEventListener("keydown", onKeyDown);
        setTimeout(() => backdropEl.remove(), 350);
      };

      const onKeyDown = event => {
        if (event.key === "Escape") closePopup();
      };

      setTimeout(() => {
        backdropEl.classList.add("show");
        popupEl.classList.add("show");
        closeBtn.focus();
        document.addEventListener("keydown", onKeyDown);
        if (!expired) countdownTimer = initCountdownPopup(popupEl);
      }, Math.max(0, Number(popup.delay_seconds) || 0) * 1000);

      closeBtn.addEventListener("click", closePopup);
      backdropEl.addEventListener("click", event => {
        if (event.target === backdropEl) closePopup();
      });


    }
  } catch (err) {
    console.error("Erreur popup:", err);
  }
}

function initCountdownPopup(container) {
  const countdownEl = container.querySelector(".js-countdown");
  if (!countdownEl) return;

  const endDate = new Date(countdownEl.dataset.endDate);
  let intervalId = null;

  function updateCountdown() {
    const now = new Date();
    const diff = endDate - now;

    if (diff <= 0) {
      countdownEl.innerHTML = "<strong>Offre expirée</strong>";
      if (intervalId) clearInterval(intervalId);
      return;
    }

    if (diff <= 24 * 60 * 60 * 1000) {
      countdownEl.classList.add("urgent");
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    countdownEl.querySelector(".js-cd-days").textContent = String(days).padStart(2, "0");
    countdownEl.querySelector(".js-cd-hours").textContent = String(hours).padStart(2, "0");
    countdownEl.querySelector(".js-cd-minutes").textContent = String(minutes).padStart(2, "0");
    countdownEl.querySelector(".js-cd-seconds").textContent = String(seconds).padStart(2, "0");
  }

  updateCountdown();
  intervalId = setInterval(updateCountdown, 1000);
  return intervalId;
}

document.addEventListener("DOMContentLoaded", loadPopups);
