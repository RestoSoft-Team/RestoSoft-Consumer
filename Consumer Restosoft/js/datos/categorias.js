import api from '../consumo/apiCategoria.js';

// ── Estado en memoria ──────────────────────────────────────────
let listaCategorias = [];
let idParaEliminar = null;

// ══════════════════════════════════════════════════════════════
// NOTIFICACIÓN NATIVA
// ══════════════════════════════════════════════════════════════
function showNotification(tipo, titulo, texto, duracion = 3500) {
    const notif = document.getElementById('notification');
    const icon = document.getElementById('notificationIcon');
    const titleEl = document.getElementById('notificationTitle');
    const textEl = document.getElementById('notificationText');
    if (!notif) return;

    const esError = tipo === 'error' || tipo === 'delete';
    notif.classList.toggle('is-error', esError);
    icon.className = esError ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-check';
    titleEl.textContent = titulo;
    textEl.textContent = texto;

    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), duracion);
}

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
                <span class="badge-soft badge-${cat.estado || 'activa'}">
                    ${(cat.estado || 'activa').replace('-', ' ')}
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
        showNotification('error', 'Faltan datos', 'El nombre de la categoría es obligatorio.');
        return;
    }

    try {
        const response = await api.actualizarCategoria(id, { nombre, descripcion, estado });
        if (response.ok) {
            cerrarModalEditar();
            showNotification('success', 'Categoría actualizada', `"${nombre}" fue modificada correctamente.`);
            listaCategorias = await api.obtenerCategorias();
            renderizarGrid();
        } else {
            const msg = await response.text();
            showNotification('error', 'No se pudo actualizar', msg || 'Verifica los datos e inténtalo de nuevo.');
        }
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        showNotification('error', 'Ocurrió un problema', 'No fue posible conectar con el servidor.');
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
            showNotification('delete', 'Categoría eliminada', `"${nombreEl}" fue removida del sistema.`);
            listaCategorias = await api.obtenerCategorias();
            renderizarGrid();
        } else {
            showNotification('error', 'No se pudo eliminar', 'Verifica que la categoría no tenga productos asociados.');
        }
    } catch (error) {
        cerrarModalEliminar();
        console.error('Error eliminando categoría:', error);
        showNotification('error', 'Ocurrió un problema', 'No fue posible conectar con el servidor.');
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
            showNotification('success', 'Categoría registrada', `"${nombre}" fue agregada correctamente al sistema.`);
            listaCategorias = await api.obtenerCategorias();
            renderizarGrid();
            limpiarFormulario();
        } else {
            const msg = await response.text();
            showNotification('error', 'No se pudo registrar', msg || 'Ese nombre ya existe en el sistema.');
        }
    } catch (error) {
        console.error("Error:", error);
        showNotification('error', 'Ocurrió un problema', 'No fue posible conectar con el servidor.');
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
        showNotification('error', 'Error al cargar', 'No se pudieron obtener las categorías del servidor.');
    }
}

// ── Sidebar responsive ────────────────────────────────────────
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

document.addEventListener("DOMContentLoaded", cargarCategorias);