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