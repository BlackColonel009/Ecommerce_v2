function ensureDashboardTheme() {
    if (document.getElementById("dashboard-modern-css")) return;

    const stylesheet = document.createElement("link");
    stylesheet.id = "dashboard-modern-css";
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/static/css/dashboard-modern.css";
    document.head.appendChild(stylesheet);
}

async function loadComponentByClass(className, file) {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Erreur de chargement : ${file}`);
    const content = await response.text();

    document.querySelectorAll(`.${className}`).forEach((element) => {
        element.innerHTML = content;
    });
}

function setActiveDashboardLink() {
    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
    document.querySelectorAll("[data-dashboard-path]").forEach((link) => {
        const linkPath = link.dataset.dashboardPath.replace(/\/$/, "") || "/";
        const isActive = linkPath === currentPath;
        link.closest(".nav-item")?.classList.toggle("active", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    ensureDashboardTheme();

    try {
        await Promise.all([
            loadComponentByClass("nav-container", "/nav"),
            loadComponentByClass("topnav-container", "/topnav")
        ]);
        setActiveDashboardLink();
        document.dispatchEvent(new CustomEvent("dashboard:components-ready"));
    } catch (error) {
        console.error("Erreur lors du chargement de la navigation :", error);
    }
});

document.addEventListener("click", (event) => {
    const logoutButton = event.target.closest("#logoutModal a.btn-primary, [data-dashboard-logout]");
    if (logoutButton) {
        event.preventDefault();
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/logout");
        return;
    }

    const toggle = event.target.closest("#sidebarToggle, #sidebarToggleTop");
    if (toggle) {
        event.preventDefault();
        document.body.classList.toggle("sidebar-toggled");
        document.querySelector(".sidebar")?.classList.toggle("toggled");
        return;
    }

    if (document.body.classList.contains("sidebar-toggled") &&
        !event.target.closest(".sidebar") &&
        !event.target.closest("#sidebarToggleTop")) {
        document.body.classList.remove("sidebar-toggled");
        document.querySelector(".sidebar")?.classList.remove("toggled");
    }
});
