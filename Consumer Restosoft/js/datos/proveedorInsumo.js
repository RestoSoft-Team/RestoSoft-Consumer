import api from '../consumo/apiProveedorInsumo.js';

let todosLosInsumos = [];
let todasLasRelaciones = [];
let filtroActivo = '';

// ── SIDEBAR MOBILE (sin cambios) ──
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
    menuToggle.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    menuToggle.style.alignItems = 'center';
    menuToggle.style.justifyContent = 'center';
}
window.addEventListener('resize', checkMobile);
checkMobile();

// ── NOTIFICACIÓN ──
function showNotif(titulo, texto, esError = false) {
    const el = document.getElementById('notification');
    document.getElementById('notificationTitle').textContent = titulo;
    document.getElementById('notificationText').textContent = texto;
    el.classList.toggle('is-error', esError);
    document.getElementById('notificationIcon').className = esError
        ? 'fa-solid fa-circle-xmark'
        : 'fa-solid fa-circle-check';
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3500);
}

// ── FORMATEAR MONEDA ──
function fmtCOP(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '—';
    return '$' + n.toLocaleString('es-CO');
}

// ✅✅✅ OBTENER PROVEEDORES POR CADA INSUMO (agrupar relaciones)
// ✅ CORREGIDA
function agruparProveedoresPorInsumo(insumos, relaciones) {
    
    // 🔍 DEBUG: Ver qué está llegando
    console.log('📋 INSUMOS:', insumos);
    console.log('🔗 RELACIONES:', relaciones);
    
    return insumos.map(insumo => {
        
        // ✅ Usar == (comparación flexible) en lugar de ===
        const relacionesDeEsteInsumo = relaciones.filter(r => r.idInsumo == insumo.id);
        
        console.log(`🔍 Insumo "${insumo.nombre}" (ID: ${insumo.id}) → ${relacionesDeEsteInsumo.length} proveedores`);
        
        const proveedores = relacionesDeEsteInsumo.map(r => ({
            id: r.idProveedor,
            nombre: r.nombreProveedor,
            empresa: r.nombreEmpresa || 'Sin empresa'
        }));

        return {
            ...insumo,
            proveedores: proveedores
        };
    });
}

// ✅ OBTENER PROVEEDORES ÚNICOS
function obtenerProveedores(insumos) {
    const mapa = {};
    insumos.forEach(i => {
        if (i.proveedores && i.proveedores.length > 0) {
            i.proveedores.forEach(p => {
                if (!mapa[p.nombre]) {
                    mapa[p.nombre] = { nombre: p.nombre, count: 0, id: p.id };
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
window.filtrarPorProveedor = function(nombre) {
    filtroActivo = nombre;
    document.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.proveedor === nombre);
    });
    renderGrid(obtenerFiltrados());
};

function obtenerFiltrados() {
    let lista = todosLosInsumos;
    
    if (filtroActivo) {
        lista = lista.filter(i => 
            i.proveedores && i.proveedores.some(p => p.nombre === filtroActivo)
        );
    }
    
    const q = (document.getElementById('inputBusqueda').value || '').toLowerCase().trim();
    if (q) {
        lista = lista.filter(i => {
            const matchInsumo = (i.nombre || '').toLowerCase().includes(q) ||
                                (i.categoria || '').toLowerCase().includes(q);
            const matchProveedor = i.proveedores && i.proveedores.some(p => 
                p.nombre.toLowerCase().includes(q) ||
                (p.empresa || '').toLowerCase().includes(q)
            );
            return matchInsumo || matchProveedor;
        });
    }
    return lista;
}

// ✅✅✅ RENDERIZAR GRID - MÚLTIPLES PROVEEDORES
function renderGrid(lista) {
    const grid = document.getElementById('relacionGrid');

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

        // Badge de estado
        let estadoBadge = '';
        if (esAgotado) {
            estadoBadge = '<span class="badge-soft badge-inactivo">Agotado</span>';
        } else if (esBajo) {
            estadoBadge = '<span class="badge-soft badge-stock-bajo">Stock Bajo</span>';
        } else if (estado === 'ACTIVO') {
            estadoBadge = '<span class="badge-soft badge-activo">Disponible</span>';
        } else {
            estadoBadge = '<span class="badge-soft badge-inactivo">Inactivo</span>';
        }

        // ✅ HTML para MÚLTIPLES proveedores
        let proveedoresHTML = '';
        
        if (tieneProveedor) {
            proveedoresHTML = proveedores.map(p => {
                const inicial = p.nombre.charAt(0).toUpperCase();
                return `<div class="proveedor-badge">
                    <div class="proveedor-avatar">${inicial}</div>
                    <div>
                        <h6>${p.nombre}</h6>
                        <span>${p.empresa}</span>
                    </div>
                </div>`;
            }).join('');
        } else {
            proveedoresHTML = `<div class="no-proveedor">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Sin proveedor asignado
            </div>`;
        }

        // Contador
        const contadorHTML = tieneProveedor 
            ? `<div style="margin-bottom: 12px; font-size: 12px; color: var(--gray); font-weight: 600;">
                <i class="fa-solid fa-truck" style="margin-right: 4px;"></i>
                ${proveedores.length} proveedor${proveedores.length > 1 ? 'es' : ''}
               </div>`
            : '';

        const fechaVence = ins.fechaVencimiento
            ? new Date(ins.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        return `<div class="card-premium relacion-card">
            <div class="relacion-top">
                <div class="insumo-icon"><i class="fa-solid fa-cube"></i></div>
                ${estadoBadge}
            </div>
            <h4>${ins.nombre || 'Sin nombre'}</h4>
            <div class="sub-text">${ins.categoria || 'Sin categoría'} • ${ins.unidadMedida || '—'}</div>
            ${contadorHTML}
            ${proveedoresHTML}
            <div class="meta-grid">
                <div class="meta-item">
                    <label>Stock Actual</label>
                    <span>${stock} ${ins.unidadMedida || ''}</span>
                </div>
                <div class="meta-item">
                    <label>Costo Unitario</label>
                    <span>${fmtCOP(ins.costoUnitario)}</span>
                </div>
                <div class="meta-item">
                    <label>Stock Mínimo</label>
                    <span>${stockMin} ${ins.unidadMedida || ''}</span>
                </div>
                <div class="meta-item">
                    <label>Vencimiento</label>
                    <span>${fechaVence}</span>
                </div>
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
            i.proveedores.forEach(p => proveedoresSet.add(p.id));
        }
    });
    
    const sinP = insumos.length - conP;

    document.getElementById('statTotal').textContent = insumos.length;
    document.getElementById('statConProveedor').textContent = conP;
    document.getElementById('statSinProveedor').textContent = sinP;
    document.getElementById('statProveedoresUnicos').textContent = proveedoresSet.size;
}

// ── BÚSQUEDA ──
document.getElementById('inputBusqueda').addEventListener('input', () => {
    renderGrid(obtenerFiltrados());
});

// ✅✅✅ CARGAR DATOS - 2 LLAMADAS PARALELAS
async function cargarInsumos() {
    try {
        const [insumos, relaciones] = await Promise.all([
            api.obtenerInsumos(),
            api.obtenerRelaciones()
        ]);

        // 🔍 DEBUG: Verificar que no estén vacíos
        console.log('✅ Insumos recibidos:', insumos.length);
        console.log('✅ Relaciones recibidas:', relaciones.length);
        
        // Si relaciones es 0, el problema es el backend
        if (relaciones.length === 0) {
            console.warn('⚠️ ALERTA: No llegaron relaciones. Verifica el endpoint GET /api/proveedor-insumos');
        }

        todosLosInsumos = agruparProveedoresPorInsumo(insumos, relaciones);

        actualizarStats(todosLosInsumos);
        renderChips(todosLosInsumos);
        renderGrid(todosLosInsumos);

    } catch (error) {
        console.error('[ERROR]', error);
    }
}

cargarInsumos();