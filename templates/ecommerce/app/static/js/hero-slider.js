(function () {
    'use strict';

    const hero = document.querySelector('.nt-hero');
    if (!hero) return;

    const slides = Array.from(hero.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(hero.querySelectorAll('[data-hero-dot]'));
    const previousButton = hero.querySelector('[data-hero-prev]');
    const nextButton = hero.querySelector('[data-hero-next]');
    const toggleButton = hero.querySelector('[data-hero-toggle]');
    const status = hero.querySelector('[data-hero-status]');
    const duration = 6500;

    if (slides.length < 2 || !toggleButton) return;

    let activeIndex = 0;
    let remaining = duration;
    let deadline = performance.now() + duration;
    let animationFrame = null;
    let userPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pagePaused = document.hidden;

    const isPaused = () => userPaused || pagePaused;

    function updateToggle() {
        const icon = toggleButton.querySelector('i');
        const paused = isPaused();
        toggleButton.setAttribute('aria-label', paused
            ? 'Reprendre le défilement automatique'
            : 'Mettre en pause le défilement automatique');
        if (icon) icon.className = paused ? 'fas fa-play' : 'fas fa-pause';
        if (status) status.textContent = paused
            ? 'Lecture automatique en pause'
            : 'Lecture automatique active';
    }

    function updateProgress(value) {
        toggleButton.style.setProperty('--hero-progress', String(Math.max(0, Math.min(1, value))));
    }

    function showSlide(index) {
        const nextIndex = (index + slides.length) % slides.length;

        slides.forEach((slide, slideIndex) => {
            const active = slideIndex === nextIndex;
            slide.classList.toggle('is-active', active);
            slide.setAttribute('aria-hidden', active ? 'false' : 'true');
            if (active) {
                slide.removeAttribute('inert');
            } else {
                slide.setAttribute('inert', '');
            }
        });

        dots.forEach((dot, dotIndex) => {
            const active = dotIndex === nextIndex;
            dot.classList.toggle('is-active', active);
            if (active) {
                dot.setAttribute('aria-current', 'true');
            } else {
                dot.removeAttribute('aria-current');
            }
        });

        activeIndex = nextIndex;
        remaining = duration;
        deadline = performance.now() + duration;
        updateProgress(1);
    }

    function stopTimer() {
        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    function runTimer(now) {
        if (isPaused()) {
            animationFrame = null;
            return;
        }

        remaining = Math.max(0, deadline - now);
        updateProgress(remaining / duration);

        if (remaining <= 0) {
            showSlide(activeIndex + 1);
        }

        animationFrame = requestAnimationFrame(runTimer);
    }

    function restartTimer() {
        stopTimer();
        remaining = duration;
        deadline = performance.now() + duration;
        updateProgress(1);
        if (!isPaused()) animationFrame = requestAnimationFrame(runTimer);
    }

    function pauseTimer() {
        remaining = Math.max(0, deadline - performance.now());
        stopTimer();
        updateToggle();
    }

    function resumeTimer() {
        if (isPaused()) {
            updateToggle();
            return;
        }
        deadline = performance.now() + remaining;
        updateToggle();
        stopTimer();
        animationFrame = requestAnimationFrame(runTimer);
    }

    function navigateTo(index) {
        showSlide(index);
        restartTimer();
    }

    previousButton?.addEventListener('click', () => navigateTo(activeIndex - 1));
    nextButton?.addEventListener('click', () => navigateTo(activeIndex + 1));
    dots.forEach((dot) => dot.addEventListener('click', () => navigateTo(Number(dot.dataset.heroDot))));

    toggleButton.addEventListener('click', () => {
        userPaused = !userPaused;
        if (userPaused) pauseTimer();
        else resumeTimer();
    });

    hero.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') navigateTo(activeIndex - 1);
        if (event.key === 'ArrowRight') navigateTo(activeIndex + 1);
    });

    document.addEventListener('visibilitychange', () => {
        pagePaused = document.hidden;
        if (pagePaused) pauseTimer();
        else resumeTimer();
    });

    showSlide(0);
    updateToggle();
    if (!isPaused()) animationFrame = requestAnimationFrame(runTimer);
})();
