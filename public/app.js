fetch("/api/me", {
    credentials: "same-origin"
})
.then((response) => {
    if (!response.ok) {
        throw new Error("Erro ao consultar sessão");
    }

    return response.json();
})
.then((data) => {

    const status = document.getElementById("status");

    if (data.user) {
        status.textContent =
            `Sessão de ${data.user.email ?? data.user.displayName}.`;
    } else {
        status.textContent =
            "Nenhuma sessão neste navegador.";
    }

})
.catch(() => {
    document.getElementById("status").textContent =
        "Não foi possível consultar a sessão.";
});
