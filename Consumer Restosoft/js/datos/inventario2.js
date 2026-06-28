

import api from '../consumo/ApiInventario2.js';

let productosExportar = [];

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

function getStock(p) {
    return p.stockActual ?? p.cantidad ?? p.stock ?? 0;
}

function getStockMin(p) {
    return p.stockMinimo ?? p.cantidadMinima ?? p.stockMin ?? null;
}

function formatStockMin(val, unidad) {
    if (val === null || val === undefined) return '—';
    return val + (unidad ? ' ' + unidad : '');
}

function getCosto(p) {
    return p.costoUnitario ?? p.precioUnitario ?? p.costo ?? p.precio ?? 0;
}

function getProveedor(p) {
    const raw = resolverTexto(p.proveedorNombre) || resolverTexto(p.proveedor) || 'N/A';
    return raw === raw.toLowerCase() ? capitalizar(raw) : raw;
}

function getEstadoInfo(p) {
    const raw = (resolverTexto(p.estado) || resolverTexto(p.status) || '').toLowerCase();
    if (['agotado', 'out_of_stock', 'inactive', 'inactivo'].includes(raw)) {
        return { clase: 'status-danger', texto: 'Agotado' };
    }
    if (['stock bajo', 'stock_bajo', 'low_stock', 'warning'].includes(raw)) {
        return { clase: 'status-warning', texto: 'Stock Bajo' };
    }
    if (['disponible', 'activo', 'active', 'available'].includes(raw)) {
        return { clase: 'status-success', texto: 'Disponible' };
    }
    return null;
}

function getUnidad(p) {
    return resolverTexto(p.unidadMedida) || resolverTexto(p.unidad) || '';
}

function getDescripcion(p) {
    const candidatos = [p.descripcion, p.observaciones, p.description, p.details, p.notes, p.note];
    for (const v of candidatos) {
        const s = resolverTexto(v);
        if (s) return s;
    }
    return '';
}

function debugProducto(p) {
    console.group('🔍 RestSoft — primer producto recibido del backend');
    console.log('Objeto completo:', JSON.parse(JSON.stringify(p)));
    console.log('Claves:', Object.keys(p));
    console.log('getCategoria →', getCategoria(p));
    console.log('getProveedor →', getProveedor(p));
    console.log('getUnidad    →', getUnidad(p));
    console.log('getStock     →', getStock(p));
    console.log('getCosto     →', getCosto(p));
    console.groupEnd();
}

// ─── TOGGLE DE FILAS ─────────────────────────────────────────────────
window.toggleRow = function(mainRow) {
    const wrapper = mainRow.closest('.product-row-wrapper');
    const detail = wrapper.querySelector('.product-detail-row');
    const chevron = mainRow.querySelector('.toggle-chevron');
    const isOpen = detail.classList.contains('open');

    document.querySelectorAll('.product-detail-row.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.toggle-chevron.rotated').forEach(c => c.classList.remove('rotated'));
    if (!isOpen) {
        detail.classList.add('open');
        chevron.classList.add('rotated');
    }
};

// ─── TOAST ───────────────────────────────────────────────────────────
const notification = document.getElementById('notification');

window.showNotification = function(text = 'Operación realizada', tipo = 'success') {
    const title = document.getElementById('notificationTitle');
    const icon = document.getElementById('notificationIcon');
    const textNode = document.getElementById('notificationText');
    if (textNode) textNode.innerHTML = text;
    if (!notification || !title || !icon) return;

    if (tipo === true || tipo === 'error') {
        title.textContent = 'Error';
        icon.className = 'fa-solid fa-xmark text-danger';
        notification.classList.add('is-error');
    } else if (tipo === 'warning') {
        title.textContent = 'Alerta de Stock';
        icon.className = 'fa-solid fa-triangle-exclamation text-warning';
        notification.classList.remove('is-error');
    } else {
        title.textContent = 'Operación Realizada';
        icon.className = 'fa-solid fa-check text-success';
        notification.classList.remove('is-error');
    }
    
    notification.classList.add('show');
    const t = tipo === 'warning' ? 4500 : 3500;
    setTimeout(() => notification.classList.remove('show'), t);
};

// ─── SIDEBAR MOBILE ───────────────────────────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebarOverlay');
menuToggle?.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('show'); });
overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); });

// ─── MODAL CONFIRMAR ELIMINAR ─────────────────────────────────────────
let pendingDeleteId = null;
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmName = document.getElementById('confirmProductName');
const btnCancel = document.getElementById('btnConfirmCancel');
const btnDelete = document.getElementById('btnConfirmDelete');

window.abrirConfirmacion = function(id, nombre) {
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
        console.log('📦 Insumos recibidos del backend:', productos);
        
        if (productos.length > 0) debugProducto(productos[0]);

        if (productos.length === 0) {
            tabla.innerHTML = '<div class="p-4 text-center text-secondary">No hay productos registrados.</div>';
            actualizarEstadisticas([]);
            return;
        }

        poblarFiltroCategoria(productos);
        
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

        tabla.innerHTML = productos.map(p => {
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

            return `
                <div class="product-row-wrapper">
                    <div class="product-main-row" onclick="window.toggleRow(this)">
                        <div class="col-toggle">
                            <div class="toggle-chevron"><i class="fa-solid fa-chevron-down"></i></div>
                        </div>
                        <div class="col-producto">
                            <div class="product-box">
                                <div class="product-image"><i class="fa-solid ${icono}"></i></div>
                                <div>
                                    <h6>${p.nombre || '—'}</h6>
                                    <span class="sub">${cat} · ${unidad || 'Unid'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="col-categoria" style="font-size:14px;font-weight:600;">${cat}</div>
                        <div class="col-stock" style="font-size:14px;font-weight:700;">${stock} ${unidad}</div>
                        <div class="col-estado">
                            <span class="status ${estadoClass}">
                                <i class="fa-solid fa-circle" style="font-size:6px;"></i>${estadoTexto}
                            </span>
                        </div>
                        <div class="col-precio">$${Number(costo).toLocaleString('es-CO')}</div>
                        <div class="col-proveedor">${prov}</div>
                    </div>
                    <div class="product-detail-row">
                        <div class="detail-field"><label>Stock Mínimo</label><span>${formatStockMin(stockMin, unidad)}</span></div>
                        <div class="detail-field"><label>Fecha Vencimiento</label><span>${p.fechaVencimiento || 'No registra'}</span></div>
                        <div class="detail-field"><label>Costo Unitario</label><span>$${Number(costo).toLocaleString('es-CO')}</span></div>
                        <div class="detail-field"><label>Categoría</label><span>${cat}</span></div>
                        <div class="detail-field"><label>Proveedor</label><span>${prov}</span></div>
                        <div class="detail-description">
                            <label>Descripción</label>
                            ${desc ? `<p>${desc}</p>` : `<p class="empty-desc">Sin descripción registrada.</p>`}
                        </div>
                        <div class="detail-actions">
                            <button class="btn-edit" onclick="event.stopPropagation(); window.location.href='producto-editar.html?id=${p.id}'">
                                <i class="fa-regular fa-pen-to-square"></i> Editar
                            </button>
                            <button class="btn-delete" onclick="event.stopPropagation(); window.abrirConfirmacion(${p.id}, '${nombreEscape}')">
                                <i class="fa-regular fa-trash-can"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        actualizarEstadisticas(productos);
        actualizarPanelAlertas(productos);
        productosExportar = productos;

        const afectados = productos.filter(p => {
            const sm = getStockMin(p);
            return Number(getStock(p)) <= 0 || (sm !== null && Number(getStock(p)) <= Number(sm));
        });
        
        if (afectados.length > 0) {
            const agotados = afectados.filter(p => Number(getStock(p)) <= 0).length;
            let msg = `Tienes <strong>${afectados.length} insumo(s)</strong> por debajo del mínimo crítico.`;
            if (agotados > 0) msg += ` (${agotados} agotados por completo).`;
            setTimeout(() => window.showNotification(msg, 'warning'), 1000);
        }

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

// ─── POBLAR FILTRO DE CATEGORÍAS CON DATOS REALES ─────────────────────
function poblarFiltroCategoria(productos) {
    const select = document.getElementById('filtroCategoria');
    if (!select) return;
    const cats = [...new Set(productos.map(p => getCategoria(p)).filter(c => c && c !== 'Sin categoría'))].sort();
    select.innerHTML = `<option value="">Todas las categorías</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────
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

// ─── PANEL ALERTAS ────────────────────────────────────────────────────
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
                    ${Number(getStock(p)) <= 0
            ? '¡Producto completamente agotado!'
            : `Stock crítico: solo quedan ${getStock(p)} ${getUnidad(p) || 'uds'}.`}
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
// ══════════════════════════════════════════════════════════════
// EXPORTAR A EXCEL REAL (USA SHEETJS)
// ══════════════════════════════════════════════════════════════
document.querySelector('[data-accion="exportar"]')?.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
        window.showNotification('Error de librería', 'No se pudo cargar la herramienta de Excel. Recarga la página.', 'error');
        return;
    }

    if (!productosExportar.length) {
        window.showNotification('Sin datos', 'No hay productos para exportar.', 'error');
        return;
    }

    // 1. Mapear los datos a un array de objetos planos (como en proveedores.js)
    const datos = productosExportar.map(p => {
        const stock = getStock(p);
        const stockMin = getStockMin(p) ?? '—';
        
        let estadoTexto = 'Disponible';
        if (Number(stock) <= 0) estadoTexto = 'Agotado';
        else if (stockMin !== '—' && Number(stock) <= Number(stockMin)) estadoTexto = 'Stock Bajo';

        return {
            'ID':               p.id,
            'Nombre':           p.nombre || '',
            'Categoría':        getCategoria(p),
            'Unidad de Medida': getUnidad(p),
            'Stock Actual':     stock,
            'Stock Mínimo':     stockMin,
            'Costo Unitario':   getCosto(p),
            'Estado':           estadoTexto,
            'Proveedor':        getProveedor(p),
            'Fecha Vencimiento': p.fechaVencimiento || 'Sin fecha'
        };
    });

    // 2. Crear el libro y la hoja de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);

    // 3. Ajustar el ancho de las columnas para que se vea bonito
    ws['!cols'] = [
        { wch: 6 },  // ID
        { wch: 22 }, // Nombre
        { wch: 16 }, // Categoría
        { wch: 16 }, // Unidad
        { wch: 14 }, // Stock Actual
        { wch: 14 }, // Stock Mínimo
        { wch: 16 }, // Costo
        { wch: 14 }, // Estado
        { wch: 22 }, // Proveedor
        { wch: 18 }  // Fecha
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // 4. Generar y descargar el archivo .xlsx (EXTENSIÓN REAL)
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Inventario_RestSoft_${fecha}.xlsx`);

    window.showNotification('¡Exportación exitosa!', `Se exportaron ${datos.length} productos a Excel correctamente.`);
});
// ─── INICIALIZACIÓN ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', cargarInventario);