
async function consultarSessao() {
  const status = document.getElementById("status");

  try {
    const response = await fetch("/api/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });

    if (response.status === 401) {
      status.textContent = "Nenhuma sessão neste navegador.";
      return;
    }

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    // Aceita tanto { user: {...} } quanto um perfil na raiz.
    const user = data.user ??
      (data.email || data.display_name || data.displayName
        ? data
        : null);

    if (user) {
      const nome = user.display_name ??
        user.displayName ??
        user.name ??
        user.email ??
        "Usuário autenticado";

      status.textContent = `Sessão de ${nome}.`;
    } else {
      status.textContent = "Nenhuma sessão neste navegador.";
    }
  } catch (error) {
    console.error("Erro ao consultar sessão:", error);
    status.textContent = "Não foi possível consultar a sessão.";
  }
}

consultarSessao();
