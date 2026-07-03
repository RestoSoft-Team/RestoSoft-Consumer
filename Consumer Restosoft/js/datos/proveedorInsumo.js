import api from '../consumo/apiProveedorInsumo.js';
import { apiProfile } from "../consumo/apiProfile.js"; // <-- Importación añadida
import { generarSidebar } from './create-sidebar.js';


let todosLosInsumos = [];
let todasLasRelaciones = [];
let filtroActivo = '';
let idRelacionEliminar = null;

// ── Datos para los selectores del modal ──
let listaInsumosModal = [];
let listaProveedoresModal = [];
let seleccionInsumo = null;
let seleccionProveedor = null;

// ── SIDEBAR MOBILE ──
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.style.opacity = sidebar.classList.contains('open') ? '1' : '0';
    sidebarOverlay.style.visibility = sidebar.classList.contains('open') ? 'visible' : 'hidden';
});
sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.style.opacity = '0';
    sidebarOverlay.style.visibility = 'hidden';
});

function checkMobile() {
    if (menuToggle) {
        menuToggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        menuToggle.style.alignItems = 'center';
        menuToggle.style.justifyContent = 'center';
    }
}
window.addEventListener('resize', checkMobile);
checkMobile();

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

// ── FORMATEAR MONEDA ──
function fmtCOP(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '—';
    return '$' + n.toLocaleString('es-CO');
}

// ── AGRUPAR PROVEEDORES POR INSUMO ──
function agruparProveedoresPorInsumo(insumos, relaciones) {
    return insumos.map(insumo => {
        const relacionesDeEsteInsumo = relaciones.filter(r => r.idInsumo == insumo.id);
        const proveedores = relacionesDeEsteInsumo.map(r => ({
            idRelacion: r.id,
            idProveedor: r.idProveedor,
            nombre: r.nombreProveedor,
            empresa: r.nombreEmpresa || 'Sin empresa'
        }));
        return { ...insumo, proveedores: proveedores };
    });
}

// ── OBTENER PROVEEDORES ÚNICOS ──
function obtenerProveedores(insumos) {
    const mapa = {};
    insumos.forEach(i => {
        if (i.proveedores && i.proveedores.length > 0) {
            i.proveedores.forEach(p => {
                if (!mapa[p.nombre]) {
                    mapa[p.nombre] = { nombre: p.nombre, count: 0, id: p.idProveedor };
                }
                mapa[p.nombre].count++;
            });
        }
    });
    return Object.values(mapa).sort((a, b) => b.count - a.count);
}

// ── RENDERIZAR CHIPS ──
function renderChips(insumos) {
    const container = document.getElementById('filtroChips');
    const proveedores = obtenerProveedores(insumos);
    const todos = insumos.length;

    let html = `<div class="chip ${filtroActivo === '' ? 'active' : ''}" data-proveedor="" onclick="window.filtrarPorProveedor('')">
        Todos <span class="chip-count">${todos}</span>
    </div>`;

    proveedores.forEach(p => {
        const nombreEsc = p.nombre.replace(/'/g, "\\'");
        html += `<div class="chip ${filtroActivo === p.nombre ? 'active' : ''}" data-proveedor="${p.nombre}" onclick="window.filtrarPorProveedor('${nombreEsc}')">
            ${p.nombre} <span class="chip-count">${p.count}</span>
        </div>`;
    });

    container.innerHTML = html;
}

// ── FILTRAR ──
window.filtrarPorProveedor = function (nombre) {
    filtroActivo = nombre;
    document.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.proveedor === nombre);
    });
    renderGrid(obtenerFiltrados());
};

function obtenerFiltrados() {
    let lista = todosLosInsumos;
    if (filtroActivo) {
        lista = lista.filter(i => i.proveedores && i.proveedores.some(p => p.nombre === filtroActivo));
    }
    const q = (document.getElementById('inputBusqueda').value || '').toLowerCase().trim();
    if (q) {
        lista = lista.filter(i => {
            const matchInsumo = (i.nombre || '').toLowerCase().includes(q) || (i.categoria || '').toLowerCase().includes(q);
            const matchProveedor = i.proveedores && i.proveedores.some(p => p.nombre.toLowerCase().includes(q) || (p.empresa || '').toLowerCase().includes(q));
            return matchInsumo || matchProveedor;
        });
    }
    return lista;
}

// ── TOGGLE TARJETA ──
window.toggleCard = function (cardEl) {
    document.querySelectorAll('.relacion-card.is-active').forEach(c => {
        if (c !== cardEl) c.classList.remove('is-active');
    });
    cardEl.classList.toggle('is-active');
};

// ── TOGGLE PROVEEDORES OCULTOS ──
window.toggleProveedoresOcultos = function (id, btn) {
    const lista = document.getElementById(id);
    if (!lista) return;
    const seAbre = !lista.classList.contains('is-open');
    lista.classList.toggle('is-open', seAbre);
    btn.classList.toggle('is-open', seAbre);
    const cantidad = lista.querySelectorAll('.proveedor-badge').length;
    btn.innerHTML = seAbre
        ? `<i class="fa-solid fa-chevron-up"></i> Ocultar`
        : `<i class="fa-solid fa-chevron-down"></i> Ver ${cantidad} más`;
};

// ── RENDERIZAR GRID ──
function renderGrid(lista) {
    const grid = document.getElementById('relacionGrid');
    const MAX_VISIBLE = 1;

    if (!lista || lista.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
            <i class="fa-solid fa-link-slash"></i>
            <h4>No se encontraron insumos</h4>
            <p>Cambia el filtro o la búsqueda para ver resultados.</p>
        </div>`;
        return;
    }

    grid.innerHTML = lista.map(ins => {
        const proveedores = ins.proveedores || [];
        const tieneProveedor = proveedores.length > 0;
        const stock = ins.stockActual ?? ins.stock ?? 0;
        const stockMin = ins.stockMinimo ?? 0;
        const esBajo = stock <= stockMin && stock > 0;
        const esAgotado = stock <= 0;
        const estado = ins.estado || 'ACTIVO';

        let estadoBadge = '';
        if (esAgotado) estadoBadge = '<span class="badge-soft badge-inactivo">Agotado</span>';
        else if (esBajo) estadoBadge = '<span class="badge-soft badge-stock-bajo">Stock Bajo</span>';
        else if (estado === 'ACTIVO') estadoBadge = '<span class="badge-soft badge-activo">Disponible</span>';
        else estadoBadge = '<span class="badge-soft badge-inactivo">Inactivo</span>';

        let proveedoresHTML = '';
        if (tieneProveedor) {
            const visibles = proveedores.slice(0, MAX_VISIBLE);
            const ocultos = proveedores.slice(MAX_VISIBLE);

            visibles.forEach(p => {
                const inicial = p.nombre.charAt(0).toUpperCase();
                proveedoresHTML += `<div class="proveedor-badge">
                    <div class="proveedor-avatar">${inicial}</div>
                    <div><h6>${p.nombre}</h6><span>${p.empresa}</span></div>
                    <button class="prov-del-btn" onclick="event.stopPropagation(); window.abrirModalEliminar(${p.idRelacion})" title="Eliminar Relación">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                </div>`;
            });

            if (ocultos.length > 0) {
                const hiddenId = `prov-hidden-${ins.id}`;
                proveedoresHTML += `
                    <div class="prov-show-more" onclick="event.stopPropagation(); window.toggleProveedoresOcultos('${hiddenId}', this)">
                        <i class="fa-solid fa-chevron-down"></i> Ver ${ocultos.length} más
                    </div>
                    <div class="prov-hidden-list" id="${hiddenId}">
                        ${ocultos.map(p => {
                    const inicial = p.nombre.charAt(0).toUpperCase();
                    return `<div class="proveedor-badge">
                                <div class="proveedor-avatar">${inicial}</div>
                                <div><h6>${p.nombre}</h6><span>${p.empresa}</span></div>
                                <button class="prov-del-btn" onclick="event.stopPropagation(); window.abrirModalEliminar(${p.idRelacion})" title="Eliminar Relación">
                                    <i class="fa-solid fa-trash"></i> Eliminar
                                </button>
                            </div>`;
                }).join('')}
                    </div>`;
            }
        } else {
            proveedoresHTML = `<div class="no-proveedor">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Sin proveedor asignado
            </div>`;
        }

        const contadorHTML = tieneProveedor
            ? `<div style="margin-bottom: 12px; font-size: 12px; color: var(--gray); font-weight: 600;">
                <i class="fa-solid fa-truck" style="margin-right: 4px;"></i>
                ${proveedores.length} proveedor${proveedores.length > 1 ? 'es' : ''}
               </div>` : '';

        const fechaVence = ins.fechaVencimiento
            ? new Date(ins.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        return `<div class="card-premium relacion-card" onclick="window.toggleCard(this)">
            <div class="relacion-top">
                <div class="insumo-icon"><i class="fa-solid fa-cube"></i></div>
                ${estadoBadge}
            </div>
            <h4>${ins.nombre || 'Sin nombre'}</h4>
            <div class="sub-text">${ins.categoria || 'Sin categoría'} • ${ins.unidadMedida || '—'}</div>
            ${contadorHTML}
            ${proveedoresHTML}
            <div class="meta-grid">
                <div class="meta-item"><label>Stock Actual</label><span>${stock} ${ins.unidadMedida || ''}</span></div>
                <div class="meta-item"><label>Costo Unitario</label><span>${fmtCOP(ins.costoUnitario)}</span></div>
                <div class="meta-item"><label>Stock Mínimo</label><span>${stockMin} ${ins.unidadMedida || ''}</span></div>
                <div class="meta-item"><label>Vencimiento</label><span>${fechaVence}</span></div>
            </div>
            <div class="card-footer-actions">
                <button class="btn-add-prov" onclick="event.stopPropagation(); window.abrirModalCrear(${ins.id})">
                    <i class="fa-solid fa-plus"></i> Agregar Proveedor
                </button>
            </div>
        </div>`;
    }).join('');
}

// ── ESTADÍSTICAS ──
function actualizarStats(insumos) {
    let conP = 0;
    const proveedoresSet = new Set();
    insumos.forEach(i => {
        if (i.proveedores && i.proveedores.length > 0) {
            conP++;
            i.proveedores.forEach(p => proveedoresSet.add(p.idProveedor));
        }
    });
    document.getElementById('statTotal').textContent = insumos.length;
    document.getElementById('statConProveedor').textContent = conP;
    document.getElementById('statSinProveedor').textContent = insumos.length - conP;
    document.getElementById('statProveedoresUnicos').textContent = proveedoresSet.size;
}

// ── BÚSQUEDA ──
document.getElementById('inputBusqueda').addEventListener('input', () => {
    renderGrid(obtenerFiltrados());
});

// ── CARGAR DATOS PRINCIPALES ──
async function cargarInsumos() {
    try {
        const [insumos, relaciones] = await Promise.all([
            api.obtenerInsumos(),
            api.obtenerRelaciones()
        ]);
        todasLasRelaciones = relaciones;
        todosLosInsumos = agruparProveedoresPorInsumo(insumos, relaciones);
        actualizarStats(todosLosInsumos);
        renderChips(todosLosInsumos);
        renderGrid(todosLosInsumos);
    } catch (error) {
        console.error('[ERROR]', error);
        window.showNotification('No se pudieron cargar los datos.', 'error');
    }
}

// ────────────────────────────────────────────────────────
// ── SELECTORES CON BÚSQUEDA DEL MODAL
// ────────────────────────────────────────────────────────

function initSelector(inputId, dropdownId, displayId, clearId, dataKey, colorClass, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const display = document.getElementById(displayId);
    const clearBtn = document.getElementById(clearId);
    let seleccionado = null;

    function renderDropdown(filtro = '') {
        const q = filtro.toLowerCase().trim();
        const datos = dataKey === 'insumo' ? listaInsumosModal : listaProveedoresModal;
        const filtrados = q
            ? datos.filter(d => d.nombre.toLowerCase().includes(q) || (d.sub || '').toLowerCase().includes(q))
            : datos;

        if (filtrados.length === 0) {
            dropdown.innerHTML = `<div class="dropdown-empty"><i class="fa-solid fa-magnifying-glass"></i>Sin resultados para "${filtro}"</div>`;
        } else {
            dropdown.innerHTML = filtrados.map(d => {
                const isSelected = seleccionado && seleccionado.id === d.id;
                const inicial = d.nombre.charAt(0).toUpperCase();
                return `<div class="dropdown-item ${isSelected ? 'selected' : ''}" data-id="${d.id}">
                    <div class="dropdown-item-icon ${colorClass}">${inicial}</div>
                    <div>
                        <div>${d.nombre}</div>
                        ${d.sub ? `<div class="dropdown-item-sub">${d.sub}</div>` : ''}
                    </div>
                </div>`;
            }).join('');
        }
        dropdown.classList.add('is-open');
    }

    function seleccionar(id) {
        const datos = dataKey === 'insumo' ? listaInsumosModal : listaProveedoresModal;
        const item = datos.find(d => d.id === id);
        if (!item) return;

        seleccionado = item;
        input.value = '';
        dropdown.classList.remove('is-open');

        display.querySelector('strong').textContent = item.nombre;
        display.querySelector('span').textContent = item.sub || '—';
        display.classList.add('visible');
        input.style.display = 'none';

        if (onSelect) onSelect(item);
    }

    function limpiar() {
        seleccionado = null;
        input.value = '';
        input.style.display = '';
        display.classList.remove('visible');
        if (onSelect) onSelect(null);
    }

    input.addEventListener('focus', () => renderDropdown(input.value));
    input.addEventListener('input', () => renderDropdown(input.value));

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (item) seleccionar(parseInt(item.dataset.id));
    });

    clearBtn.addEventListener('click', limpiar);

    document.addEventListener('click', (e) => {
        if (!e.target.closest(`#${inputId}`) && !e.target.closest(`#${dropdownId}`)) {
            dropdown.classList.remove('is-open');
        }
    });

    return {
        seleccionar(id) { seleccionar(id); },
        limpiar() { limpiar(); },
        getSeleccionado() { return seleccionado; },
        bloquear() { input.disabled = true; input.placeholder = 'Insumo preseleccionado...'; },
        desbloquear() { input.disabled = false; input.placeholder = dataKey === 'insumo' ? 'Buscar insumo por nombre...' : 'Buscar proveedor por nombre o empresa...'; }
    };
}

const selectorInsumo = initSelector(
    'searchInsumo', 'dropdownInsumo', 'selectedInsumo', 'clearInsumo', 'insumo', 'primary-soft',
    (item) => { seleccionInsumo = item; }
);

const selectorProveedor = initSelector(
    'searchProveedor', 'dropdownProveedor', 'selectedProveedor', 'clearProveedor', 'proveedor', 'success-soft',
    (item) => { seleccionProveedor = item; }
);

// ── CARGAR DATOS EN LOS SELECTORES ──
async function cargarSelects() {
    // Insumos
    listaInsumosModal = todosLosInsumos.map(i => ({
        id: i.id,
        nombre: i.nombre || 'Sin nombre',
        sub: `${i.categoria || 'Sin categoría'} • ${i.unidadMedida || '—'}`
    }));

    // Proveedores
    listaProveedoresModal = [];
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8080/api/proveedores`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const proveedores = await res.json();
            listaProveedoresModal = proveedores.map(p => ({
                id: p.idProveedor || p.id,
                nombre: p.nombre || p.razonSocial || 'Sin nombre',
                sub: p.razonSocial || p.direccion || ''
            }));
        } else {
            throw new Error("Endpoint no disponible");
        }
    } catch (error) {
        console.warn("Usando proveedores de relaciones existentes");
        const unicos = new Map();
        todasLasRelaciones.forEach(r => {
            if (!unicos.has(r.idProveedor)) {
                unicos.set(r.idProveedor, { nombre: r.nombreProveedor, empresa: r.nombreEmpresa || '' });
            }
        });
        unicos.forEach((data, id) => {
            listaProveedoresModal.push({ id, nombre: data.nombre, sub: data.empresa });
        });
    }
}

// ── ABRIR MODAL CREAR ──
window.abrirModalCrear = async function (idInsumo = null) {
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-link me-2"></i>Asignar Proveedor a Insumo';

    await cargarSelects();

    selectorInsumo.limpiar();
    selectorProveedor.limpiar();
    seleccionInsumo = null;
    seleccionProveedor = null;

    if (idInsumo) {
        selectorInsumo.seleccionar(idInsumo);
        selectorInsumo.bloquear();
        document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-link me-2"></i>Agregar Proveedor al Insumo';
    } else {
        selectorInsumo.desbloquear();
    }

    const modal = new bootstrap.Modal(document.getElementById('modalForm'));
    modal.show();
};

// ── GUARDAR RELACIÓN ──
document.getElementById('btnGuardarRelacion').addEventListener('click', async () => {
    if (!seleccionInsumo || !seleccionProveedor) {
        window.showNotification('Debes seleccionar un insumo y un proveedor.', 'error');
        return;
    }

    try {
        await api.guardarRelacion({
            idInsumo: seleccionInsumo.id,
            idProveedor: seleccionProveedor.id
        });
        window.showNotification('La relación se creó correctamente.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalForm')).hide();
        cargarInsumos();
    } catch (error) {
        window.showNotification(error.message || 'Ocurrió un error en el servidor.', 'error');
    }
});

// ── MODAL ELIMINAR ──
window.abrirModalEliminar = function (idRelacion) {
    idRelacionEliminar = idRelacion;
    const modal = new bootstrap.Modal(document.getElementById('modalDelete'));
    modal.show();
};

window.confirmarEliminar = async function () {
    if (!idRelacionEliminar) return;
    try {
        await api.eliminarRelacion(idRelacionEliminar);
        bootstrap.Modal.getInstance(document.getElementById('modalDelete')).hide();
        window.showNotification('La asignación fue removida exitosamente.', 'success');
        cargarInsumos();
    } catch (error) {
        window.showNotification(error.message || 'No se pudo eliminar.', 'error');
    }
};

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
    generarSidebar('sidebar-container', "inventario", "proveedores_insumo", perfilData.rol.nombre);
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

// ── INICIALIZAR ──
async function init() {
    try {
        // Intentamos cargar el perfil (si falla, no rompe el resto de la página)
        try {
            const perfilData = await apiProfile.obtenerInfoMe();
            cargarPerfilUsuario(perfilData);
        } catch (profileError) {
            console.warn("No se pudo cargar el perfil:", profileError);
        }

        await cargarInsumos();
    } catch (error) {
        console.error('Error al inicializar:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);