document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    // 1. Lógica para abrir/cerrar el Sidebar en móviles
    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            overlay.classList.toggle("show");
        });

        // Cerrar al hacer clic en el fondo oscuro
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            overlay.classList.remove("show");
        });
    }

    // 2. Lógica para el Acordeón de Submenús
    document.querySelectorAll('.menu-group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sub = btn.nextElementSibling;
            if (sub && sub.classList.contains('submenu')) {
                sub.classList.toggle('open');
                btn.querySelector('.chevron')?.classList.toggle('rotate');
            }
        });
    });
});

// ====================================================
// RESTSOFT - LÓGICA DE LOGOUT (MINIMALISTA)
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    // Efecto visual rápido al hacer clic
    logoutBtn.style.opacity = "0.5";
    logoutBtn.style.pointerEvents = "none"; // Evita doble clic

    // Limpiar SOLO las claves de la sesión del panel (admin).
    // NO usar localStorage.clear(): borraba también la sesión del
    // cliente (token_cliente, slugEmpresaActual, idEmpresaActual)
    // y otros datos de este mismo navegador.
    localStorage.removeItem("token");
    localStorage.removeItem("restsoft_user");
    localStorage.removeItem("restsoft_empresa");
    localStorage.removeItem("restsoft_rol");
    localStorage.removeItem("restsoft_menu");
    localStorage.removeItem("restsoft_cart");
    localStorage.removeItem("perfilData");

    // Redirección inmediata al login
    window.location.href = "index.html"; // Cambia esto si tu login se llama distinto
  });
});