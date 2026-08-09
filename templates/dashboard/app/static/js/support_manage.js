

// *******************************


const token = localStorage.getItem("access_token");

async function loadSupportMessages() {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/support/messages`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const messages = await res.json();

    let pending = 0;
    let answered = 0;

    const container = document.getElementById("supportMessages");
    container.innerHTML = "";

    messages.forEach(msg => {
        if (msg.replied) answered++;
        else pending++;

        container.innerHTML += `
            <div class="card shadow mb-3 border-left-${msg.replied ? "success" : "warning"}">
                <div class="card-body">
                    <strong>${msg.name}</strong>
                    <div class="text-muted small">${msg.email}</div>
                    <p class="mt-2">${msg.message}</p>

                    <button class="btn btn-sm btn-primary reply-btn"
                        data-id="${msg.id}"
                        data-email="${msg.email}">
                        Répondre
                    </button>
                </div>
            </div>
        `;
    });

    document.getElementById("pendingCount").textContent = pending;
    document.getElementById("answeredCount").textContent = answered;

    // Bind boutons répondre
    document.querySelectorAll(".reply-btn").forEach(btn => {
        btn.onclick = () => openReplyModal(btn.dataset.id, btn.dataset.email);
    });
}




function openReplyModal(id, email) {
    document.getElementById("replyMessageId").value = id;
    document.getElementById("replyEmail").value = email;
    $('#replyModal').modal('show');
}

document.getElementById("replyForm").onsubmit = async e => {
    e.preventDefault();

    await fetch(`${API_BASE}/support/reply`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            message_id: replyMessageId.value,
            email: replyEmail.value,
            reply: replyText.value
        })
    });

    $('#replyModal').modal('hide');
    loadSupportMessages();
};



document.getElementById("replyForm").addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
        message_id: document.getElementById("replyMessageId").value,
        email: document.getElementById("replyEmail").value,
        reply: document.getElementById("replyText").value
    };

    const res = await fetch(`${API_BASE}/support/reply`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        $('#replyModal').modal('hide');
        loadSupportMessages();
    } else {
        alert("Erreur lors de l'envoi");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadSupportMessages();
});
