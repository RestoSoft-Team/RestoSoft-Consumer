
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");

menuToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("show");
});

overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("show");
});

document.querySelectorAll('.menu-group-btn').forEach(btn => {
    btn.addEventListener('click', () => { const sub = btn.nextElementSibling; if (sub) { sub.classList.toggle('open'); btn.querySelector('.chevron')?.classList.toggle('rotate'); } });
});

