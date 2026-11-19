import { api } from './ApiInventario.js';

// ─── 1. ESTADO GLOBAL ──────────────────────────────────────────────────────────
const state = {
    insumos: [],
    filtrados: [],
    cargando: false,
    idEmpresaSeleccionada: 1,   // cambiar por el id real de sesión
    filtros: {
        texto: '',
        categoria: '',
        estado: ''
    }
};

// ─── 2. HELPERS DE ESTILO ──────────────────────────────────────────────────────
function claseStock(stock) {
    if (stock > 50) return 'stock-high';
    if (stock > 15) return 'stock-medium';
    return 'stock-low';
}

function claseEstado(estado) {
    if (!estado) return 'status-warning';
    const e = estado.toUpperCase();
    if (e === 'ACTIVO' || e === 'DISPONIBLE') return 'status-success';
    if (e === 'INACTIVO' || e === 'AGOTADO')  return 'status-danger';
    return 'status-warning';
}

function iconoEstado(estado) {
    if (!estado) return 'fa-clock';
    const e = estado.toUpperCase();
    if (e === 'ACTIVO' || e === 'DISPONIBLE') return 'fa-circle-check';
    if (e === 'INACTIVO' || e === 'AGOTADO')  return 'fa-triangle-exclamation';
    return 'fa-clock';
}

// ─── 3. STATS HEADER ──────────────────────────────────────────────────────────
function actualizarStats() {
    const elTotal   = document.getElementById('totalProductos');
    const elStock   = document.getElementById('totalStockGeneral');
    const elCritico = document.getElementById('totalCritico');
    const elValor   = document.getElementById('totalValor');

    if (elTotal) elTotal.textContent = state.insumos.length;

    if (elStock) {
        const total = state.insumos.reduce((s, i) => s + (parseFloat(i.stockActual) || 0), 0);
        elStock.textContent = total.toFixed(0);
    }

    if (elCritico) {
        const criticos = state.insumos.filter(i => (parseFloat(i.stockActual) || 0) <= 15);
        elCritico.textContent = criticos.length;
    }

    if (elValor) {
        const valor = state.insumos.reduce(
            (s, i) => s + ((parseFloat(i.stockActual) || 0) * (parseFloat(i.costoUnitario) || 0)),
            0
        );
        // Formato compacto: $18.4K, $1.2M, etc.
        if (valor >= 1_000_000) {
            elValor.textContent = `$${(valor / 1_000_000).toFixed(1)}M`;
        } else if (valor >= 1_000) {
            elValor.textContent = `$${(valor / 1_000).toFixed(1)}K`;
        } else {
            elValor.textContent = `$${valor.toFixed(0)}`;
        }
    }

    renderAlertas();
}

// ─── 3b. PANEL DE ALERTAS ─────────────────────────────────────────────────────
function renderAlertas() {
    const panel = document.getElementById('panelAlertas');
    if (!panel) return;

    const criticos = state.insumos
        .filter(i => (parseFloat(i.stockActual) || 0) <= (parseFloat(i.stockMinimo) || 15))
        .sort((a, b) => (parseFloat(a.stockActual) || 0) - (parseFloat(b.stockActual) || 0))
        .slice(0, 5);   // máximo 5 alertas visibles

    if (criticos.length === 0) {
        panel.innerHTML = `
            <div class="alert-item">
                <div class="alert-icon bg-success-soft"><i class="fa-solid fa-circle-check"></i></div>
                <div>
                    <h6 class="fw-bold mb-1">Todo en orden</h6>
                    <p class="text-secondary mb-0">No hay productos en stock crítico.</p>
                </div>
            </div>`;
        return;
    }

    panel.innerHTML = criticos.map(item => `
        <div class="alert-item">
            <div class="alert-icon bg-danger-soft"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div>
                <h6 class="fw-bold mb-1">${item.nombre}</h6>
                <p class="text-secondary mb-0">Stock crítico • ${item.stockActual} ${item.unidadMedida ?? 'uds'} restantes.</p>
            </div>
        </div>
    `).join('');
}

// ─── 4. MOTOR DE RENDER ────────────────────────────────────────────────────────
function renderTabla() {
    const tbody = document.querySelector('.table-premium tbody');
    if (!tbody) return;

    if (state.cargando) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca7b4;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size:22px;"></i>
                <p style="margin-top:12px;">Cargando inventario...</p>
            </td></tr>`;
        return;
    }

    if (state.filtrados.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca7b4;">
                <i class="fa-solid fa-box-open" style="font-size:28px;margin-bottom:12px;display:block;"></i>
                ${state.insumos.length === 0
                    ? 'No hay productos registrados o el backend no responde.'
                    : 'Ningún producto coincide con los filtros aplicados.'}
            </td></tr>`;
        return;
    }

    tbody.innerHTML = state.filtrados.map(item => `
        <tr>
            <td data-label="Producto">
                <div class="product-box">
                    <div class="product-image">
                        <i class="fa-solid fa-box"></i>
                    </div>
                    <div>
                        <h6>${item.nombre}</h6>
                        <span>ID #${item.id} • Prov: ${item.proveedor?.nombre ?? 'N/A'}</span>
                    </div>
                </div>
            </td>
            <td data-label="Categoría / Unidad">
                <span style="font-weight:600;">${item.categoria ?? '—'}</span><br>
                <span style="color:#9ca7b4;font-size:13px;">${item.unidadMedida ?? 'Unidad'}</span>
            </td>
            <td data-label="Stock">
                <div class="stock-wrapper">
                    <span style="font-weight:600;">${item.stockActual}</span>
                    <span style="color:#9ca7b4;font-size:13px;"> ${item.unidadMedida ?? 'uds'}</span>
                    <div class="stock-bar">
                        <div class="stock-progress ${claseStock(item.stockActual)}"></div>
                    </div>
                </div>
            </td>
            <td data-label="Estado">
                <span class="status ${claseEstado(item.estado)}">
                    <i class="fa-solid ${iconoEstado(item.estado)}"></i>
                    ${item.estado ?? 'DISPONIBLE'}
                </span>
            </td>
            <td data-label="Precio Costo">
                $${(item.costoUnitario ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
            </td>
        </tr>
    `).join('');
}

// ─── 5. MOTOR DE FILTRADO ─────────────────────────────────────────────────────
function aplicarFiltros() {
    const { texto, categoria, estado } = state.filtros;

    state.filtrados = state.insumos.filter(item => {
        const nombreOk = !texto ||
            item.nombre?.toLowerCase().includes(texto.toLowerCase()) ||
            item.proveedor?.nombre?.toLowerCase().includes(texto.toLowerCase()) ||
            String(item.id).includes(texto);

        const catOk = !categoria ||
            (item.categoria ?? '').toLowerCase() === categoria.toLowerCase();

        const estOk = !estado ||
            (item.estado ?? '').toUpperCase() === estado.toUpperCase();

        return nombreOk && catOk && estOk;
    });

    renderTabla();
}

// ─── 6. POBLAR FILTRO DE CATEGORÍAS DINÁMICAMENTE ─────────────────────────────
function poblarSelectCategorias() {
    const select = document.getElementById('filtroCategoria');
    if (!select) return;

    const categorias = [...new Set(
        state.insumos.map(i => i.categoria).filter(Boolean)
    )].sort();

    select.innerHTML = `<option value="">Todas las categorías</option>` +
        categorias.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ─── 7. CARGA DESDE EL BACKEND ────────────────────────────────────────────────
async function cargarInsumos() {
    state.cargando = true;
    renderTabla();

    try {
        state.insumos  = await api.obtenerInsumos(state.idEmpresaSeleccionada);
        state.filtrados = [...state.insumos];
    } catch (err) {
        console.error('Error cargando insumos:', err);
        if (window.showNotification) {
            window.showNotification('No se pudo conectar con el inventario');
        }
        state.insumos  = [];
        state.filtrados = [];
    } finally {
        state.cargando = false;
        poblarSelectCategorias();
        actualizarStats();
        renderTabla();
    }
}

// ─── 8. EVENTOS ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    cargarInsumos();

    // Búsqueda en tiempo real (input del topbar)
    const inputBusqueda = document.querySelector('.search-box input');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', e => {
            state.filtros.texto = e.target.value.trim();
            aplicarFiltros();
        });
    }

    // Select de categoría
    const selCategoria = document.getElementById('filtroCategoria');
    if (selCategoria) {
        selCategoria.addEventListener('change', e => {
            state.filtros.categoria = e.target.value;
            aplicarFiltros();
        });
    }

    // Select de estado
    const selEstado = document.getElementById('filtroEstado');
    if (selEstado) {
        selEstado.addEventListener('change', e => {
            state.filtros.estado = e.target.value;
            aplicarFiltros();
        });
    }

    // Botón "Registrar Entrada" (placeholder — conectar a flujo real)
    document.querySelector('[data-accion="entrada"]')?.addEventListener('click', () => {
        window.showNotification?.('Funcionalidad de entrada próximamente');
    });

    // Botón "Registrar Salida"
    document.querySelector('[data-accion="salida"]')?.addEventListener('click', () => {
        window.showNotification?.('Funcionalidad de salida próximamente');
    });

    // Botón "Exportar"
    document.querySelector('[data-accion="exportar"]')?.addEventListener('click', () => {
        exportarCSV();
    });
});

// ─── 9. EXPORTAR CSV (BONUS) ──────────────────────────────────────────────────
function exportarCSV() {
    if (state.filtrados.length === 0) {
        window.showNotification?.('No hay datos para exportar');
        return;
    }

    const filas = [
        ['ID', 'Nombre', 'Categoría', 'Unidad', 'Stock', 'Estado', 'Costo Unitario', 'Proveedor'],
        ...state.filtrados.map(i => [
            i.id,
            i.nombre,
            i.categoria ?? '',
            i.unidadMedida ?? '',
            i.stockActual,
            i.estado ?? '',
            i.costoUnitario ?? 0,
            i.proveedor?.nombre ?? ''
        ])
    ];

    const csv = filas.map(f => f.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `inventario_${new Date().toISOString().slice(0, 10)}.csv`
    });
    a.click();
    URL.revokeObjectURL(url);
    window.showNotification?.('Inventario exportado como CSV');
}