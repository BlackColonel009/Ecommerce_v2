// --------------------------------------------------------
// Création ou mise à jour du device_id de manière silencieuse
// --------------------------------------------------------
function forceDeviceIdUpdate() {
    // 1. Chercher le device_id dans les cookies
    const match = document.cookie.match(/(?:^|; )device_id=([^;]*)/);
    let deviceId = match ? decodeURIComponent(match[1]) : null;

    // 2. S'il n'existe pas, on en crée un NOUVEAU !
    if (!deviceId) {
        deviceId = generateDeviceId();
        console.log("[forceDeviceIdUpdate] 🆕 Nouveau device_id généré :", deviceId);
    } else {
        console.log("[forceDeviceIdUpdate] 🔄 Ancien device_id détecté :", deviceId);
    }

    // 3. Supprimer l'ancien cookie si on fait une mise à jour
    if (match) {
        console.log("[forceDeviceIdUpdate] 🗑 Suppression de l'ancien cookie");
        document.cookie = `device_id=; path=/; max-age=0; domain=newtechnologiestg.com`;
        document.cookie = `device_id=; path=/; max-age=0; domain=.newtechnologiestg.com`;
        document.cookie = `device_id=; path=/; max-age=0;` // Sans domaine aussi
    }

    // 4. Recréer le cookie avec les bons attributs
    const cookieValue = encodeURIComponent(deviceId);
    const cookieOptions = [
        `device_id=${cookieValue}`,
        `path=/`,
        `max-age=${60*60*24*365}`, // 1 an
        `domain=.newtechnologiestg.com`,
        `Secure`,
        `SameSite=None`
    ].join('; ');
    
    document.cookie = cookieOptions;
    
    // 5. Également définir sans domaine (fallback)
    document.cookie = `device_id=${cookieValue}; path=/; max-age=${60*60*24*365}; Secure; SameSite=None`;

    console.log("[forceDeviceIdUpdate] ✅ Cookie créé avec device_id :", deviceId);

    return deviceId;
}

// --------------------------------------------------------
// Générer un ID unique pour le visiteur
// --------------------------------------------------------
function generateDeviceId() {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `guest-${random}${timestamp}`;
}

// --------------------------------------------------------
// Récupérer le device_id (crée s'il n'existe pas)
// --------------------------------------------------------
function getDeviceId() {
    // Chercher dans les cookies
    const match = document.cookie.match(/(?:^|; )device_id=([^;]*)/);
    
    if (match) {
        return decodeURIComponent(match[1]);
    }
    
    // Pas de cookie ? On en crée un !
    const newDeviceId = generateDeviceId();
    
    // Définir le cookie
    document.cookie = `device_id=${encodeURIComponent(newDeviceId)}; path=/; max-age=${60*60*24*365}; Secure; SameSite=None`;
    
    return newDeviceId;
}


// --------------------------------------------------------
// Liaison du device_id avec l’API /visitor
// --------------------------------------------------------
async function registerVisitor() {
    const deviceId = forceDeviceIdUpdate(); // récupère le device_id mis à jour

    try {
        const res = await fetch(`${API}/visitor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                device_id: deviceId,
                source: "Direct"
            }),
            credentials: "include" // pour que les cookies soient envoyés
        });

        if (!res.ok) throw new Error("Erreur lors de l'enregistrement du visiteur");

        const data = await res.json();
        console.log("[Visitor] ✅ Enregistré côté backend:", data);

        // Mise à jour éventuelle du cookie si backend renvoie un autre device_id
        if (data.device_id && data.device_id !== deviceId) {
            document.cookie = `device_id=${encodeURIComponent(data.device_id)}; path=/; max-age=${60*60*24*365}; domain=.newtechnologiestg.com; Secure; SameSite=None`;
            console.log("[deviceId] 🔹 Mis à jour depuis backend :", data.device_id);
        }

    } catch (err) {
        console.error("[Visitor] ❌ Erreur:", err);
    }
}

// --------------------------------------------------------
// Initialisation au chargement
// --------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("[Visitor] 🌐 Initialisation visitor.js au chargement de la page");
    registerVisitor();
});
