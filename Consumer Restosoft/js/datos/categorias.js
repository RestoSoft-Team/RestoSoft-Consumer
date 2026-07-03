import api from '../consumo/apiCategoria.js';
import { apiProfile } from "../consumo/apiProfile.js"; // <-- Importación añadida
import { generarSidebar } from './create-sidebar.js';

// ── Estado en memoria ──────────────────────────────────────────
let listaCategorias = [];
let idParaEliminar = null;

// ══════════════════════════════════════════════════════════════
// NOTIFICACIÓN MODERNA
// ══════════════════════════════════════════════════════════════
window.showNotification = (text, type = "success") => {
    const contenedor = document.getElementById("notificationContainer");
    if (!contenedor) {
        console.warn("Contenedor de notificaciones no encontrado:", text);
        return;
    }

    const config = {
        success: { icon: "fa-circle-check", title: "Operación Exitosa" },
        warning: { icon: "fa-triangle-exclamation", title: "Aviso" },
        error: { icon: "fa-circle-xmark", title: "Error" },
    };

    const { icon, title } = config[type] || config.success;

    const notif = document.createElement("div");
    notif.className = `notification ${type}`;
    notif.innerHTML = `
    <div class="notification-icon">
      <i class="fa-solid ${icon}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${text}</div>
    </div>
    <button class="notification-close">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

    contenedor.appendChild(notif);
    void notif.offsetWidth;

    setTimeout(() => notif.classList.add("show"), 10);

    const cerrarNotif = () => {
        notif.classList.remove("show");
        setTimeout(() => notif.remove(), 400);
    };

    notif
        .querySelector(".notification-close")
        .addEventListener("click", cerrarNotif);

    setTimeout(cerrarNotif, 4000);
};

// ══════════════════════════════════════════════════════════════
// ÍCONOS POR NOMBRE
// ══════════════════════════════════════════════════════════════
const ICON_MAPPER = {
    lacteos: { icon: "fa-cheese", style: "primary-soft" },
    leche: { icon: "fa-cow", style: "primary-soft" },
    bebidas: { icon: "fa-wine-bottle", style: "success-soft" },
    licores: { icon: "fa-martini-glass", style: "success-soft" },
    mariscos: { icon: "fa-fish", style: "warning-soft" },
    pescado: { icon: "fa-fish", style: "warning-soft" },
    carnes: { icon: "fa-bacon", style: "danger-soft" },
    carne: { icon: "fa-bacon", style: "danger-soft" },
    pollo: { icon: "fa-drumstick-bite", style: "danger-soft" },
    verduras: { icon: "fa-carrot", style: "success-soft" },
    vegetales: { icon: "fa-seedling", style: "success-soft" },
    frutas: { icon: "fa-apple-whole", style: "warning-soft" },
    panaderia: { icon: "fa-bread-slice", style: "warning-soft" },
    postres: { icon: "fa-ice-cream", style: "info-soft" },
    cafeteria: { icon: "fa-mug-hot", style: "info-soft" }
};

function obtenerIcono(nombre) {
    const limpio = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const clave in ICON_MAPPER) {
        if (limpio.includes(clave)) return ICON_MAPPER[clave];
    }
    return { icon: "fa-bowl-food", style: "primary-soft" };
}

// ══════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════════════════════════
function actualizarEstadisticas() {
    const txtActivas = document.getElementById("txtCategoríasActivas");
    const txtProductos = document.getElementById("txtProductosOrganizados");
    if (txtActivas) txtActivas.innerText = listaCategorias.length;
    if (txtProductos) txtProductos.innerText = 0;
}


// ══════════════════════════════════════════════════════════════
// RENDERIZAR GRID
// ══════════════════════════════════════════════════════════════
function renderizarGrid() {
    const grid = document.getElementById("categoryGrid");
    if (!grid) return;
    grid.innerHTML = "";

    if (listaCategorias.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gray);">
                <i class="fa-solid fa-layer-group" style="font-size:36px;opacity:.3;display:block;margin-bottom:14px;"></i>
                No hay categorías registradas aún
            </div>`;
        actualizarEstadisticas();
        return;
    }

    listaCategorias.forEach(cat => {
        const cfg = obtenerIcono(cat.nombre);
        const card = document.createElement("div");
        card.className = "card-premium category-card";

        // Lógica para el estado y colores
        const estadoRaw = (cat.estado || 'ACTIVO').toUpperCase();
        const esActivo = estadoRaw === 'ACTIVO' || estadoRaw === 'ACTIVA' || estadoRaw === 'DISPONIBLE';

        // Colores directo en el estilo para garantizar que se vean
        const badgeStyle = esActivo
            ? 'background:var(--success-soft); color:var(--success);'
            : 'background:var(--danger-soft); color:var(--danger);';

        const badgeText = estadoRaw.charAt(0).toUpperCase() + estadoRaw.slice(1).toLowerCase();

        card.innerHTML = `
            <div class="category-top">
                <div class="category-icon ${cfg.style}">
                    <i class="fa-solid ${cfg.icon}"></i>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="category-menu btn-edit-cat" data-id="${cat.id}" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="category-menu btn-delete-cat" data-id="${cat.id}" data-nombre="${cat.nombre}" title="Eliminar"
                        style="background:#fff0f2;">
                        <i class="fa-solid fa-trash-can" style="color:var(--danger);"></i>
                    </button>
                </div>
            </div>
            <h4>${cat.nombre}</h4>
            <p style="color:var(--gray);line-height:1.7;margin-bottom:24px;min-height:48px;">
                ${cat.descripcion || 'Sin descripción'}
            </p>
            <div class="category-meta">
                <span class="badge-soft" style="${badgeStyle} padding: 6px 12px; border-radius: 10px; font-size: 13px; font-weight: 600;">
                    ${badgeText}
                </span>
                <span class="category-count">
                    ${cat.cantidadInsumos ?? 0} producto${cat.cantidadInsumos !== 1 ? 's' : ''}
                </span>
            </div>
        `;
        grid.appendChild(card);
    });

    actualizarEstadisticas();
    attachGridEvents();
}

function attachGridEvents() {
    document.querySelectorAll('.btn-edit-cat').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEditar(Number(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-delete-cat').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEliminar(Number(btn.dataset.id), btn.dataset.nombre));
    });
}

// ══════════════════════════════════════════════════════════════
// MODAL EDITAR
// ══════════════════════════════════════════════════════════════
function abrirModalEditar(id) {
    const cat = listaCategorias.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('edit-cat-nombre').value = cat.nombre;
    document.getElementById('edit-cat-descripcion').value = cat.descripcion || '';
    document.getElementById('edit-cat-estado').value = cat.estado || 'activa';

    document.getElementById('editCatOverlay').classList.add('show');
}

function cerrarModalEditar() {
    document.getElementById('editCatOverlay').classList.remove('show');
    document.getElementById('form-editar-cat').reset();
}

document.getElementById('btnCloseEditCat')?.addEventListener('click', cerrarModalEditar);
document.getElementById('btnCancelEditCat')?.addEventListener('click', cerrarModalEditar);
document.getElementById('editCatOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalEditar();
});

document.getElementById('form-editar-cat')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = Number(document.getElementById('edit-cat-id').value);
    const nombre = document.getElementById('edit-cat-nombre').value.trim();
    const descripcion = document.getElementById('edit-cat-descripcion').value.trim();
    const estado = document.getElementById('edit-cat-estado').value;

    if (!nombre) {
        window.showNotification('El nombre de la categoría es obligatorio.', 'error');
        return;
    }

    try {
        const response = await api.actualizarCategoria(id, { nombre, descripcion, estado });
        if (response.ok) {
            cerrarModalEditar();
            window.showNotification(`"${nombre}" fue modificada correctamente.`, 'success');
            listaCategorias = await api.obtenerCategorias();
            renderizarGrid();
        } else {
            const msg = await response.text();
            window.showNotification(msg || 'Verifica los datos e inténtalo de nuevo.', 'error');
        }
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        window.showNotification('No fue posible conectar con el servidor.', 'error');
    }
});

// ══════════════════════════════════════════════════════════════
// MODAL ELIMINAR
// ══════════════════════════════════════════════════════════════
function abrirModalEliminar(id, nombre) {
    idParaEliminar = id;
    document.getElementById('confirmCatNombre').textContent = nombre;
    document.getElementById('confirmCatOverlay').classList.add('show');
}

function cerrarModalEliminar() {
    idParaEliminar = null;
    document.getElementById('confirmCatOverlay').classList.remove('show');
}

document.getElementById('btnCancelDeleteCat')?.addEventListener('click', cerrarModalEliminar);
document.getElementById('confirmCatOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalEliminar();
});

document.getElementById('btnConfirmDeleteCat')?.addEventListener('click', async () => {
    if (!idParaEliminar) return;
    const nombreEl = document.getElementById('confirmCatNombre').textContent;

    try {
        const response = await api.eliminarCategoria(idParaEliminar);
        cerrarModalEliminar();

        if (response.ok || response.status === 204) {
            window.showNotification(`"${nombreEl}" fue removida del sistema.`, 'success');
            listaCategorias = await api.obtenerCategorias();
            renderizarGrid();
        } else {
            window.showNotification('Verifica que la categoría no tenga productos asociados.', 'error');
        }
    } catch (error) {
        cerrarModalEliminar();
        console.error('Error eliminando categoría:', error);
        window.showNotification('No fue posible conectar con el servidor.', 'error');
    }
});

// ══════════════════════════════════════════════════════════════
// FORMULARIO CREAR
// ══════════════════════════════════════════════════════════════
document.getElementById('formCategoria')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombreCategoria').value.trim();
    const estado = document.getElementById('estadoCategoria').value;
    const descripcion = document.getElementById('descripcionCategoria').value.trim();

    try {
        const response = await api.crearCategoria({ nombre, estado, descripcion });

        if (response.ok) {
            window.showNotification(`"${nombre}" fue agregada correctamente al sistema.`, 'success');
            listaCategorias = await api.obtenerCategorias();
            renderizarGrid();
            limpiarFormulario();
        } else {
            const msg = await response.text();
            window.showNotification(msg || 'Ese nombre ya existe en el sistema.', 'error');
        }
    } catch (error) {
        console.error("Error:", error);
        window.showNotification('No fue posible conectar con el servidor.', 'error');
    }
});

// ══════════════════════════════════════════════════════════════
// CARGA INICIAL
// ══════════════════════════════════════════════════════════════
async function cargarCategorias() {
    try {
        listaCategorias = await api.obtenerCategorias();
        renderizarGrid();
    } catch (error) {
        console.error("Error cargando categorías:", error);
        window.showNotification('No se pudieron obtener las categorías del servidor.', 'error');
    }
}

// ══════════════════════════════════════════════════════════════
// PERFIL DE USUARIO (BARRA SUPERIOR)
// ══════════════════════════════════════════════════════════════
function cargarPerfilUsuario(perfilData) {

    const rolesPermitidos = ["ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }

    generarSidebar('sidebar-container', "inventario", "categorias_inv", perfilData.rol.nombre);

    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

    const empresaData = perfilData?.empresa || perfilData?.data?.empresa;
    const nombreRaw = empresaData?.nombre || "";

    if (nombreEmpresaContainer) {
        if (nombreRaw.trim() !== "") {
            nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
        } else {
            nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
        }
    }

    if (!infoPerfilContainer) return;

    const urlPerfil = "perfil.html";

    if (perfilData) {
        const iniciales =
            (
                (perfilData.usuario.nombres || "").substring(0, 1) +
                (perfilData.usuario.apellidos || "").substring(0, 1)
            ).toUpperCase() || "EP";

        const avatarHTML = perfilData.usuario.imagenUrl
            ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />`
            : `<div class="profile-text-avatar">${iniciales}</div>`;

        const nombreCompleto =
            `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() ||
            "Usuario sin nombre";

        const rol = perfilData.rol.nombre || "Sin rol asignado";

        infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" class="profile-link">
          ${avatarHTML}
          <div class="profile-info">
            <strong>${nombreCompleto}</strong>
            <div style="font-size: 13px; color: var(--gray)">
              ${rol}
            </div>
          </div>
        </a>
      `;
    } else {
        infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" class="profile-link">
          <div class="profile-text-avatar">UA</div>
          <div class="profile-info">
            <strong>Usuario Anónimo</strong>
            <div style="font-size: 13px; color: var(--gray)">Invitado</div>
          </div>
        </a>
      `;
    }
}

// ── Sidebar responsive ────────────────────────────────────────
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");

menuToggle?.addEventListener("click", (e) => {
    e.stopPropagation(); // ESTO EVITA QUE EL CLIC SE PROPAGUE Y CANCELE LA APERTURA
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("show");
});

overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("show");
});

function limpiarFormulario() {
    document.getElementById('formCategoria')?.reset();
}
window.limpiarFormulario = limpiarFormulario;

// ── INICIALIZACIÓN ────────────────────────────────────────
async function init() {
    try {
        // Intentamos cargar el perfil (si falla, no rompe el resto de la página)
        try {
            const perfilData = await apiProfile.obtenerInfoMe();
            cargarPerfilUsuario(perfilData);
        } catch (profileError) {
            console.warn("No se pudo cargar el perfil:", profileError);
        }

        await cargarCategorias();
    } catch (error) {
        console.error('Error al inicializar:', error);
    }
}

document.addEventListener("DOMContentLoaded", init);