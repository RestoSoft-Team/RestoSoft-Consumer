import { api } from '../consumo/ApiInventario2.js';
import { apiProfile } from "../consumo/apiProfile.js";
import { generarSidebar } from './create-sidebar.js';

let productosExportar = [];
let productosCargados = [];
let perfilData = null; // ← Perfil del usuario logueado (nivel módulo)

const iconos = {
    'lácteos': 'fa-cheese', 'lacteos': 'fa-cheese',
    'carnes': 'fa-drumstick-bite', 'carne': 'fa-drumstick-bite',
    'condimentos': 'fa-bottle-droplet', 'granos': 'fa-wheat-awn',
    'verduras': 'fa-leaf', 'vegetales': 'fa-leaf',
    'bebidas': 'fa-wine-bottle', 'postres': 'fa-cake-candles',
    'pescado': 'fa-fish', 'pescados': 'fa-fish',
    'mariscos': 'fa-shrimp', 'frutas': 'fa-apple-whole',
    'panaderia': 'fa-bread-slice', 'panadería': 'fa-bread-slice',
};

// ─── HELPERS ROBUSTOS ─────────────────────────────────────────────────
function resolverTexto(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    if (typeof valor === 'string') return valor.trim();
    if (typeof valor === 'object') {
        return (valor.nombre || valor.name || valor.descripcion || '').toString().trim();
    }
    return String(valor).trim();
}

function capitalizar(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getCategoria(p) {
    const val = resolverTexto(p.categoriaNombre) || resolverTexto(p.categoriaName) ||
        resolverTexto(p.categoria) || resolverTexto(p.tipoInsumo) || resolverTexto(p.tipo);
    return val || '—';
}

function getStock(p) { return p.stockActual ?? p.cantidad ?? p.stock ?? 0; }
function getStockMin(p) { return p.stockMinimo ?? p.cantidadMinima ?? p.stockMin ?? null; }

function formatStockMin(val, unidad) {
    if (val === null || val === undefined) return '—';
    return val + (unidad ? ' ' + unidad : '');
}

function getCosto(p) { return p.costoUnitario ?? p.precioUnitario ?? p.costo ?? p.precio ?? 0; }

function getProveedor(p) {
    const raw = resolverTexto(p.proveedorNombre) || resolverTexto(p.proveedor) || 'N/A';
    return raw === raw.toLowerCase() ? capitalizar(raw) : raw;
}

function getEstadoInfo(p) {
    const raw = (resolverTexto(p.estado) || resolverTexto(p.status) || '').toLowerCase();
    if (['agotado', 'out_of_stock', 'inactive', 'inactivo'].includes(raw)) return { clase: 'status-danger', texto: 'Agotado' };
    if (['stock bajo', 'stock_bajo', 'low_stock', 'warning'].includes(raw)) return { clase: 'status-warning', texto: 'Stock Bajo' };
    if (['disponible', 'activo', 'active', 'available'].includes(raw)) return { clase: 'status-success', texto: 'Disponible' };
    return null;
}

function getUnidad(p) { return resolverTexto(p.unidadMedida) || resolverTexto(p.unidad) || ''; }

function getDescripcion(p) {
    const candidatos = [p.descripcion, p.observaciones, p.description, p.details, p.notes, p.note];
    for (const v of candidatos) {
        const s = resolverTexto(v);
        if (s) return s;
    }
    return '';
}

// ─── EXTRAER DATOS DEL PRODUCTO ─────────────────────────────────────
function getProductoData(p) {
    const stock = getStock(p);
    const stockMin = getStockMin(p);
    const costo = getCosto(p);
    const cat = getCategoria(p);
    const unidad = getUnidad(p);
    const prov = getProveedor(p);
    const desc = getDescripcion(p);

    const catKey = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const icono = iconos[catKey] || 'fa-box';
    const nombreEscape = (p.nombre || 'producto').replace(/'/g, "\\'");

    let estadoClass, estadoTexto;
    if (Number(stock) <= 0) {
        estadoClass = 'status-danger';
        estadoTexto = 'Agotado';
    } else if (stockMin !== null && Number(stock) <= Number(stockMin)) {
        estadoClass = 'status-warning';
        estadoTexto = 'Stock Bajo';
    } else {
        const estadoInfo = getEstadoInfo(p);
        estadoClass = estadoInfo ? estadoInfo.clase : 'status-success';
        estadoTexto = estadoInfo ? estadoInfo.texto : 'Disponible';
    }

    return { stock, stockMin, costo, cat, unidad, prov, desc, icono, nombreEscape, estadoClass, estadoTexto, p };
}

// ─── GENERADORES DE HTML (TABLA VS CARDS) ───────────────────────────
function getDetailHTML(data) {
    return `
        <div class="product-detail-row">
            <div class="detail-field"><label>Stock Mínimo</label><span>${formatStockMin(data.stockMin, data.unidad)}</span></div>
            <div class="detail-field"><label>Fecha Vencimiento</label><span>${data.p.fechaVencimiento || 'No registra'}</span></div>
            <div class="detail-field"><label>Costo Unitario</label><span>$${Number(data.costo).toLocaleString('es-CO')}</span></div>
            <div class="detail-field"><label>Categoría</label><span>${data.cat}</span></div>
            <div class="detail-field"><label>Proveedor</label><span>${data.prov}</span></div>
            <div class="detail-description">
                <label>Descripción</label>
                ${data.desc ? `<p>${data.desc}</p>` : `<p class="empty-desc">Sin descripción registrada.</p>`}
            </div>
            <div class="detail-actions">
                <button class="btn-edit" onclick="event.stopPropagation(); window.location.href='producto-editar.html?id=${data.p.id}'">
                    <i class="fa-regular fa-pen-to-square"></i> Editar
                </button>
                <button class="btn-delete" onclick="event.stopPropagation(); window.abrirConfirmacion(${data.p.id}, '${data.nombreEscape}')">
                    <i class="fa-regular fa-trash-can"></i> Eliminar
                </button>
            </div>
        </div>
    `;
}

function generarFilaHTML(p) {
    const data = getProductoData(p);
    return `
        <div class="product-row-wrapper">
            <div class="product-main-row" onclick="window.toggleRow(this)">
                <div class="col-toggle">
                    <div class="toggle-chevron"><i class="fa-solid fa-chevron-down"></i></div>
                </div>
                <div class="col-producto">
                    <div class="product-box">
                        <div class="product-image"><i class="fa-solid ${data.icono}"></i></div>
                        <div>
                            <h6>${p.nombre || '—'}</h6>
                            <span class="sub">${data.cat} · ${data.unidad || 'Unid'}</span>
                        </div>
                    </div>
                </div>
                <div class="col-categoria" style="font-size:14px;font-weight:600;">${data.cat}</div>
                <div class="col-stock" style="font-size:14px;font-weight:700;">${data.stock} ${data.unidad}</div>
                <div class="col-estado">
                    <span class="status ${data.estadoClass}">
                        <i class="fa-solid fa-circle" style="font-size:6px;"></i>${data.estadoTexto}
                    </span>
                </div>
                <div class="col-precio">$${Number(data.costo).toLocaleString('es-CO')}</div>
                <div class="col-proveedor">${data.prov}</div>
            </div>
            ${getDetailHTML(data)}
        </div>
    `;
}

function generarCardHTML(p) {
    const data = getProductoData(p);
    return `
        <div class="product-row-wrapper is-card">
            <div class="product-main-row is-card-top" onclick="window.toggleRow(this)">
                <div class="card-header-left">
                    <div class="product-image"><i class="fa-solid ${data.icono}"></i></div>
                    <div>
                        <h6 style="margin:0; font-size:16px;">${p.nombre || '—'}</h6>
                        <span class="sub">${data.cat} · ${data.unidad || 'Unid'}</span>
                    </div>
                </div>
                <div class="card-right-side">
                    <span class="status ${data.estadoClass}">
                        <i class="fa-solid fa-circle" style="font-size:6px;"></i>${data.estadoTexto}
                    </span>
                    <div class="toggle-chevron"><i class="fa-solid fa-chevron-down"></i></div>
                </div>
            </div>
            <div class="card-quick-stats">
                <div class="card-stat">
                    <label>Stock Actual</label>
                    <span>${data.stock} ${data.unidad}</span>
                </div>
                <div class="card-stat">
                    <label>Costo Unitario</label>
                    <span>$${Number(data.costo).toLocaleString('es-CO')}</span>
                </div>
            </div>
            ${getDetailHTML(data)}
        </div>
    `;
}

// ─── RENDERIZADO DINÁMICO (RESPONSIVE) ────────────────────────────────
function renderizarVista(productos) {
    const contenedor = document.getElementById('tablaProductos');
    const tableHeader = document.getElementById('tableHeader');

    if (window.innerWidth <= 768) {
        if (tableHeader) tableHeader.style.display = 'none';
        contenedor.innerHTML = productos.map(p => generarCardHTML(p)).join('');
    } else {
        if (tableHeader) tableHeader.style.display = 'flex';
        contenedor.innerHTML = productos.map(p => generarFilaHTML(p)).join('');
    }
}

// Listener para re-renderizar si el usuario cambia el tamaño de la pantalla
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (productosCargados.length > 0) {
            renderizarVista(productosCargados);
        }
    }, 250); // Pequeño delay para no saturar el navegador al redimensionar
});

// ─── TOGGLE DE FILAS / CARDS ─────────────────────────────────────────
window.toggleRow = function (mainRow) {
    const wrapper = mainRow.closest('.product-row-wrapper');
    const detail = wrapper.querySelector('.product-detail-row');
    const chevron = mainRow.querySelector('.toggle-chevron');
    const isOpen = detail.classList.contains('open');

    document.querySelectorAll('.product-detail-row.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.toggle-chevron.rotated').forEach(c => c.classList.remove('rotated'));
    if (!isOpen) {
        detail.classList.add('open');
        if (chevron) chevron.classList.add('rotated');
    }
};

// ─── NOTIFICACIÓN MODERNA ────────────────────────────────────────────
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

// ─── SIDEBAR: ABRIR Y CERRAR AL CLIC FUERA ────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function cerrarSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) {
        sidebarOverlay.style.opacity = '0';
        sidebarOverlay.style.visibility = 'hidden';
    }
}

menuToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar?.classList.toggle('open');
    const abierto = sidebar?.classList.contains('open');
    if (sidebarOverlay) {
        sidebarOverlay.style.opacity = abierto ? '1' : '0';
        sidebarOverlay.style.visibility = abierto ? 'visible' : 'hidden';
    }
});

document.addEventListener('click', (e) => {
    if (sidebar?.classList.contains('open')) {
        const clicDentro = sidebar.contains(e.target) || menuToggle.contains(e.target);
        if (!clicDentro) {
            cerrarSidebar();
        }
    }
});

// ─── MODAL CONFIRMAR ELIMINAR ─────────────────────────────────────────
let pendingDeleteId = null;
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmName = document.getElementById('confirmProductName');
const btnCancel = document.getElementById('btnConfirmCancel');
const btnDelete = document.getElementById('btnConfirmDelete');

window.abrirConfirmacion = function (id, nombre) {
    pendingDeleteId = id;
    confirmName.textContent = nombre;
    confirmOverlay.classList.add('show');
};

function cerrarConfirmacion() {
    confirmOverlay.classList.remove('show');
    pendingDeleteId = null;
}

btnCancel.addEventListener('click', cerrarConfirmacion);
confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) cerrarConfirmacion(); });

btnDelete.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    cerrarConfirmacion();

    btnDelete.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';
    btnDelete.disabled = true;

    try {
        await api.eliminarInsumo(id);
        window.showNotification('Producto eliminado correctamente.');
        cargarInventario();
    } catch (err) {
        console.error(err);
        window.showNotification('Error de red al intentar eliminar.', 'error');
    } finally {
        btnDelete.innerHTML = '<i class="fa-solid fa-trash-can"></i> Eliminar';
        btnDelete.disabled = false;
    }
});

// ─── CARGA INVENTARIO ─────────────────────────────────────────────────
async function cargarInventario() {
    const tabla = document.getElementById('tablaProductos');
    try {
        const productos = await api.obtenerInsumos();
        productosCargados = productos;

        if (productos.length === 0) {
            tabla.innerHTML = '<div class="p-4 text-center text-secondary">No hay productos registrados.</div>';
            actualizarEstadisticas([]);
            return;
        }

        poblarFiltroCategoria(productos);

        // Renderiza la vista inicial (decide si muestra tabla o cards)
        renderizarVista(productos);

        actualizarEstadisticas(productos);
        actualizarPanelAlertas(productos);
        productosExportar = productos;

    } catch (error) {
        console.error('Error cargando los productos:', error);
        tabla.innerHTML = `
            <div class="p-4 text-center text-danger">
                <i class="fa-solid fa-triangle-exclamation mb-2 fs-3"></i>
                <p class="mb-0 fw-semibold">Error al conectar con la base de datos. Verifica tu backend.</p>
            </div>
        `;
    }
}

function poblarFiltroCategoria(productos) {
    const select = document.getElementById('filtroCategoria');
    if (!select) return;
    const cats = [...new Set(productos.map(p => getCategoria(p)).filter(c => c && c !== 'Sin categoría'))].sort();
    select.innerHTML = `<option value="">Todas las categorías</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function actualizarEstadisticas(productos) {
    document.getElementById('totalProductos').textContent = productos.length;
    const totalStock = productos.reduce((s, p) => s + Number(getStock(p)), 0);
    document.getElementById('totalStockGeneral').textContent = totalStock;
    const criticos = productos.filter(p => {
        const sm = getStockMin(p);
        return Number(getStock(p)) <= 0 || (sm !== null && Number(getStock(p)) <= Number(sm));
    }).length;
    document.getElementById('totalCritico').textContent = criticos;
    const valor = productos.reduce((s, p) => s + (Number(getStock(p)) * Number(getCosto(p))), 0);
    document.getElementById('totalValor').textContent = '$' + valor.toLocaleString('es-CO');
}

function actualizarPanelAlertas(productos) {
    const panel = document.getElementById('panelAlertas');
    const afectados = productos.filter(p => {
        const sm = getStockMin(p);
        return Number(getStock(p)) <= 0 || (sm !== null && Number(getStock(p)) <= Number(sm));
    });

    if (afectados.length === 0) {
        panel.innerHTML = `
            <div class="alert-item">
                <div class="alert-icon bg-success-soft" style="color:white;"><i class="fa-solid fa-square-check"></i></div>
                <div><p class="text-secondary mb-0">Todo correcto. No hay alertas.</p></div>
            </div>
        `;
        return;
    }

    panel.innerHTML = afectados.slice(0, 3).map(p => `
        <div class="alert-item">
            <div class="alert-icon ${Number(getStock(p)) <= 0 ? 'bg-danger-soft' : 'bg-warning-soft'}" style="color:white;">
                <i class="fa-solid ${Number(getStock(p)) <= 0 ? 'fa-ban' : 'fa-triangle-exclamation'}"></i>
            </div>
            <div>
                <h6 class="fw-bold mb-1" style="font-size:14px;">${p.nombre}</h6>
                <p class="text-secondary mb-0" style="font-size:12px;">
                    ${Number(getStock(p)) <= 0 ? '¡Producto completamente agotado!' : `Stock crítico: solo quedan ${getStock(p)} ${getUnidad(p) || 'uds'}.`}
                </p>
            </div>
        </div>
    `).join('');
}

// ─── BÚSQUEDA Y FILTROS ──────────────────────────────────────────────
document.getElementById('inputBusqueda')?.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.product-row-wrapper').forEach(wrapper => {
        const texto = wrapper.textContent.toLowerCase();
        wrapper.style.display = texto.includes(q) ? '' : 'none';
    });
});

function aplicarFiltros() {
    const cat = document.getElementById('filtroCategoria')?.value.toLowerCase() || '';
    const estado = document.getElementById('filtroEstado')?.value.toLowerCase() || '';
    document.querySelectorAll('.product-row-wrapper').forEach(wrapper => {
        const texto = wrapper.textContent.toLowerCase();
        const catOk = !cat || texto.includes(cat);
        const estadoOk = !estado || texto.includes(estado === 'activo' ? 'disponible' : estado);
        wrapper.style.display = (catOk && estadoOk) ? '' : 'none';
    });
}

document.getElementById('filtroCategoria')?.addEventListener('change', aplicarFiltros);
document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltros);

// ─── ACCIONES RÁPIDAS ─────────────────────────────────────────────────
document.querySelector('[data-accion="entrada"]')?.addEventListener('click', () => window.showNotification('Funcionalidad de entrada próximamente'));
document.querySelector('[data-accion="salida"]')?.addEventListener('click', () => window.showNotification('Funcionalidad de salida próximamente'));

document.querySelector('[data-accion="exportar"]')?.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') return window.showNotification('Error de librería', 'error');
    if (!productosExportar.length) return window.showNotification('Sin datos para exportar.', 'error');

    const datos = productosExportar.map(p => {
        const stock = getStock(p);
        const stockMin = getStockMin(p) ?? '—';
        let estadoTexto = 'Disponible';
        if (Number(stock) <= 0) estadoTexto = 'Agotado';
        else if (stockMin !== '—' && Number(stock) <= Number(stockMin)) estadoTexto = 'Stock Bajo';

        return {
            'ID': p.id, 'Nombre': p.nombre || '', 'Categoría': getCategoria(p),
            'Unidad de Medida': getUnidad(p), 'Stock Actual': stock, 'Stock Mínimo': stockMin,
            'Costo Unitario': getCosto(p), 'Estado': estadoTexto, 'Proveedor': getProveedor(p),
            'Fecha Vencimiento': p.fechaVencimiento || 'Sin fecha'
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `Inventario_RestSoft_${new Date().toISOString().slice(0, 10)}.xlsx`);
    window.showNotification(`Se exportaron ${datos.length} productos a Excel correctamente.`);
});

// ══════════════════════════════════════════════════════════════
// PERFIL DE USUARIO (BARRA SUPERIOR)
// ══════════════════════════════════════════════════════════════
function cargarPerfilUsuario(perfilData) {

    generarSidebar('sidebar-container', "inventario", "inventario", perfilData.rol.nombre);


    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

    const empresaData = perfilData?.empresa || perfilData?.data?.empresa;
    const nombreRaw = empresaData?.nombre || "";

    if (nombreRaw.trim() !== "") {
        nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
    } else {
        nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
    }

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

// ══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════
async function inicializarModulo() {
    try {
        // Intentamos cargar el perfil (si falla, no rompe el resto)
        try {
            perfilData = await apiProfile.obtenerInfoMe();
            cargarPerfilUsuario(perfilData);
        } catch (profileError) {
            console.warn("No se pudo cargar el perfil:", profileError);
        }

        await cargarInventario();
    } catch (error) {
        console.error('Error al inicializar el módulo:', error);
        window.showNotification('No fue posible conectar con el servidor.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', inicializarModulo);