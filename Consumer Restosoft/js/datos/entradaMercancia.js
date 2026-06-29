// ── ESTADO GLOBAL ──────────────────────────────────────────
let entradasRegistradas = [];
let insumos = [];
let proveedores = [];

// ── NOTIFICACIONES ────────────────────────────────────────
function mostrarNotificacion(titulo, texto, esError = false) {
    const notif = document.getElementById('notification');
    const icon = document.getElementById('notificationIcon');
    document.getElementById('notificationTitle').textContent = titulo;
    document.getElementById('notificationText').textContent = texto;
    notif.classList.toggle('is-error', esError);
    icon.className = esError ? 'fa-solid fa-xmark' : 'fa-solid fa-check';
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3500);
}

// ── HELPERS FORMATO FECHA ─────────────────────────────────
function parseFecha(raw) {
    if (raw == null) return '—';
    let fechaStr = raw;
    if (Array.isArray(raw)) fechaStr = raw[0];
    if (typeof raw === 'number') fechaStr = new Date(raw).toISOString();
    try {
        return new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (err) {
        return String(raw).substring(0, 10);
    }
}

// ── OBTENER STOCK DE UN INSUMO DEL ARRAY LOCAL ───────────
function obtenerStockInsumo(insumoId) {
    const id = parseInt(insumoId);
    const found = insumos.find(i => i.id === id);
    if (!found) return 0;
    return found.stockActual ?? found.stock ?? found.cantidad ?? found.stockDisponible ?? 0;
}

// ── AL SELECCIONAR INSUMO → LLENA STOCK ANTERIOR ────────
function onInsumoChange() {
    const insumoId = document.getElementById('selectInsumo').value;
    const preview = document.getElementById('stockPreview');

    if (!insumoId) {
        preview.style.display = 'none';
        document.getElementById('inputStockAnterior').value = '';
        document.getElementById('inputStockNuevo').value = '';
        document.getElementById('spStockAnterior').textContent = '0';
        document.getElementById('spCantidad').textContent = '0';
        document.getElementById('spStockNuevo').textContent = '0';
        return;
    }

    const stockActual = obtenerStockInsumo(insumoId);
    document.getElementById('inputStockAnterior').value = stockActual;
    document.getElementById('spStockAnterior').textContent = stockActual;

    preview.style.display = 'flex';
    recalcularStockNuevo();
}

// ── RECALCULAR STOCK NUEVO ───────────────────────────────
function recalcularStockNuevo() {
    const stockAnt = parseFloat(document.getElementById('inputStockAnterior').value) || 0;
    const cantidad = parseFloat(document.getElementById('inputCantidad').value) || 0;
    const stockNuevo = stockAnt + cantidad;

    document.getElementById('inputStockNuevo').value = stockNuevo;
    document.getElementById('spCantidad').textContent = cantidad;
    document.getElementById('spStockNuevo').textContent = stockNuevo;
}

// ── CÁLCULO DE TOTAL EN DINERO ───────────────────────────
function calcularTotal() {
    const cant = parseFloat(document.getElementById('inputCantidad').value) || 0;
    const costo = parseFloat(document.getElementById('inputCostoUnitario').value) || 0;
    const total = cant * costo;
    document.getElementById('totalCosto').textContent = '$' + total.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    recalcularStockNuevo();
}

// ── CARGAR INSUMOS ────────────────────────────────────────
async function cargarInsumos() {
    const sel = document.getElementById('selectInsumo');
    try {
        insumos = await EntradasConsumer.obtenerInsumos();
        sel.innerHTML = '<option value="">Seleccionar insumo</option>';
        insumos.forEach(i => {
            const op = document.createElement('option');
            op.value = i.id;
            op.textContent = i.nombre || i.name || 'Insumo #' + i.id;
            sel.appendChild(op);
        });
        document.getElementById('statTotalInsumos').textContent = insumos.length;
    } catch (error) {
        console.error('[Insumos] ' + error.message);
        sel.innerHTML = '<option value="">Error al cargar insumos</option>';
        document.getElementById('statTotalInsumos').textContent = '0';
    }
}

// ── CARGAR PROVEEDORES ────────────────────────────────────
async function cargarProveedores() {
    const sel = document.getElementById('selectProveedor');
    try {
        proveedores = await EntradasConsumer.obtenerProveedores();
        sel.innerHTML = '<option value="">Seleccionar proveedor</option>';
        proveedores.forEach(p => {
            const op = document.createElement('option');
            op.value = p.id;
            op.textContent = p.nombre || p.name || 'Proveedor #' + p.id;
            sel.appendChild(op);
        });
        document.getElementById('statTotalProveedores').textContent = proveedores.length;
    } catch (error) {
        console.error('[Proveedores] ' + error.message);
        sel.innerHTML = '<option value="">Error al cargar proveedores</option>';
        document.getElementById('statTotalProveedores').textContent = '0';
    }
}

// ── CARGAR ENTRADAS ───────────────────────────────────────
async function cargarEntradas() {
    try {
        entradasRegistradas = await EntradasConsumer.obtenerEntradas();
    } catch (error) {
        console.error('[Entradas] ' + error.message);
        entradasRegistradas = [];
    }
    renderizarVista(entradasRegistradas);
    actualizarResumen(entradasRegistradas);
    actualizarTimeline(entradasRegistradas);
}

// ── GENERADORES DE HTML (TABLA VS CARDS) ──────────────────
function generarFilaHTML(e) {
    const insumoNombre = e.nombreInsumo || 'Insumo #—';
    const proveedorNombre = e.proveedorNombre || 'Proveedor';
    const inicial = proveedorNombre !== 'Proveedor' ? proveedorNombre.charAt(0).toUpperCase() : 'P';
    const stockAnt = e.stockAnterior != null ? e.stockAnterior : '—';
    const stockNue = e.stockNuevo != null ? e.stockNuevo : '—';
    const fechaFormato = parseFecha(e.fechaMovimiento);

    return '<tr>' +
        '<td data-label="Insumo"><div style="font-weight:700;">' + insumoNombre + '</div></td>' +
        '<td data-label="Proveedor"><div class="supplier"><div class="supplier-avatar">' + inicial + '</div><div><h6>' + proveedorNombre + '</h6><span>Proveedor</span></div></div></td>' +
        '<td data-label="Stock Ant.">' + stockAnt + '</td>' +
        '<td data-label="Cantidad">+' + (e.cantidad || '0') + '</td>' +
        '<td data-label="Stock Nuevo"><strong style="color:var(--success);">' + stockNue + '</strong></td>' +
        '<td data-label="Fecha">' + fechaFormato + '</td>' +
        '</tr>';
}

function generarCardHTML(e) {
    const insumoNombre = e.nombreInsumo || 'Insumo #—';
    const proveedorNombre = e.proveedorNombre || 'Proveedor';
    const inicial = proveedorNombre !== 'Proveedor' ? proveedorNombre.charAt(0).toUpperCase() : 'P';
    const stockAnt = e.stockAnterior != null ? e.stockAnterior : '—';
    const stockNue = e.stockNuevo != null ? e.stockNuevo : '—';
    const fechaFormato = parseFecha(e.fechaMovimiento);

    return `
    <div style="background:white; border-radius:16px; margin-bottom:15px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.05); border:1px solid #eef0f4;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #f0f2f5; padding-bottom:10px;">
            <h6 style="margin:0; font-weight:700; font-size:15px; color:var(--dark);">${insumoNombre}</h6>
            <span style="font-size:12px; color:var(--gray); font-weight:600;">${fechaFormato}</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
            <div style="width:35px; height:35px; border-radius:10px; background:var(--dark); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">${inicial}</div>
            <span style="font-size:13px; color:var(--dark-light); font-weight:600;">${proveedorNombre}</span>
        </div>
        <div style="display:flex; justify-content:space-between; background:#f7f9fb; padding:12px; border-radius:10px;">
            <div style="text-align:center; flex:1;">
                <label style="display:block; font-size:11px; color:var(--gray); font-weight:600; margin-bottom:4px;">ANTERIOR</label>
                <span style="font-weight:700; font-size:15px; color:var(--dark);">${stockAnt}</span>
            </div>
            <div style="text-align:center; flex:1;">
                <label style="display:block; font-size:11px; color:var(--gray); font-weight:600; margin-bottom:4px;">ENTRADA</label>
                <span style="font-weight:700; font-size:15px; color:var(--success);">+${e.cantidad || '0'}</span>
            </div>
            <div style="text-align:center; flex:1;">
                <label style="display:block; font-size:11px; color:var(--gray); font-weight:600; margin-bottom:4px;">NUEVO</label>
                <span style="font-weight:700; font-size:15px; color:var(--primary);">${stockNue}</span>
            </div>
        </div>
    </div>`;
}

// ── RENDERIZADO DINÁMICO (RESPONSIVE) ─────────────────────
function renderizarVista(lista) {
    const tbody = document.getElementById('tablaEntradas');
    const table = tbody.closest('table');
    const thead = table ? table.querySelector('thead') : null;

    if (!lista || lista.length === 0) {
        if (thead) thead.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4"><i class="fa-solid fa-inbox me-2"></i>No hay entradas registradas aún.</td></tr>';
        return;
    }

    if (window.innerWidth <= 768) {
        if (thead) thead.style.display = 'none';
        tbody.innerHTML = lista.map(e => generarCardHTML(e)).join('');
    } else {
        if (thead) thead.style.display = 'table-header-group';
        tbody.innerHTML = lista.map(e => generarFilaHTML(e)).join('');
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (entradasRegistradas.length > 0 || document.getElementById('tablaEntradas').innerHTML !== '') {
            renderizarVista(entradasRegistradas);
        }
    }, 250);
});

// ── ACTUALIZAR RESUMEN ────────────────────────────────────
function actualizarResumen(lista) {
    const totalUnidades = lista.reduce((s, e) => s + (Number(e.cantidad) || 0), 0);
    const totalValor = lista.reduce((s, e) => {
        const costo = e.costoUnitario ?? e.costo_unitario ?? e.precioUnitario ?? 0;
        return s + ((Number(e.cantidad) || 0) * (Number(costo) || 0));
    }, 0);
    const ultima = lista.length > 0 ? lista[0] : null;
    document.getElementById('resumenUnidades').textContent = totalUnidades.toLocaleString('es-CO') + ' uds';
    document.getElementById('resumenValor').textContent = '$' + totalValor.toLocaleString('es-CO', { minimumFractionDigits: 0 });
    document.getElementById('resumenUltima').textContent = ultima
        ? (ultima.insumoNombre || ultima.nombreInsumo || ultima.insumo?.nombre || 'Movimiento #' + (ultima.idmovimiento || '—'))
        : '—';
    document.getElementById('statTotalEntradas').textContent = lista.length;
}

// ── ACTUALIZAR TIMELINE ───────────────────────────────────
function actualizarTimeline(lista) {
    const timeline = document.getElementById('timelineActividad');
    if (!lista || lista.length === 0) {
        timeline.innerHTML = '<div class="timeline-item"><h6>Sin actividad reciente</h6><p>Registra la primera entrada.</p></div>';
        return;
    }
    timeline.innerHTML = lista.slice(0, 5).map(e => {
        const insumoNombre = e.nombreInsumo || 'Insumo';
        const proveedorNombre = e.proveedorNombre || 'Proveedor';
        const fechaRelativa = parseFecha(e.fechaMovimiento);
        const stockNue = e.stockNuevo != null ? e.stockNuevo : '';
        return '<div class="timeline-item"><h6>' + insumoNombre + ' • +' + (e.cantidad || 0) + ' uds' + (stockNue ? ' → ' + stockNue : '') + '</h6><p>' + proveedorNombre + ' • ' + fechaRelativa + '</p></div>';
    }).join('');
}

// ── REGISTRAR NUEVA ENTRADA ───────────────────────────────
async function registrarEntrada() {
    const insumoId = document.getElementById('selectInsumo').value;
    const proveedorId = document.getElementById('selectProveedor').value;
    const cantidad = document.getElementById('inputCantidad').value;
    const costoUnit = document.getElementById('inputCostoUnitario').value;
    const fecha = document.getElementById('inputFecha').value;
    const stockAnterior = document.getElementById('inputStockAnterior').value;

    let valido = true;
    [
        ['selectInsumo', !insumoId],
        ['selectProveedor', !proveedorId],
        ['inputCantidad', !cantidad || Number(cantidad) <= 0],
        ['inputCostoUnitario', !costoUnit || Number(costoUnit) < 0],
        ['inputFecha', !fecha]
    ].forEach(([id, cond]) => {
        document.getElementById(id).classList.toggle('is-invalid', cond);
        if (cond) valido = false;
    });

    if (!valido) {
        mostrarNotificacion('Campos incompletos', 'Completa todos los campos requeridos.', true);
        return;
    }

    const cantNum = parseFloat(cantidad);
    const stockAntNum = parseFloat(stockAnterior) || 0;
    const stockNuevoNum = stockAntNum + cantNum;

    const btn = document.getElementById('btnRegistrar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Registrando...';

    const payload = {
        idInsumo: parseInt(insumoId),
        idEmpresa: 1,
        cantidad: cantNum,
        costoUnitario: parseFloat(costoUnit),
        stockAnterior: stockAntNum,
        stockNuevo: stockNuevoNum,
        observacion: 'Entrada de mercancía',
        tipoMovimiento: 'ENTRADA',
        fechaMovimiento: new Date(fecha + 'T12:00:00Z').toISOString()
    };

    try {
        const nuevaEntrada = await EntradasConsumer.guardarEntrada(payload);

        const insumoSel = document.getElementById('selectInsumo');
        const provSel = document.getElementById('selectProveedor');
        nuevaEntrada.insumoNombre = insumoSel.options[insumoSel.selectedIndex].text;
        nuevaEntrada.proveedorNombre = provSel.options[provSel.selectedIndex].text;
        nuevaEntrada.costoUnitario = payload.costoUnitario;
        nuevaEntrada.stock_anterior = payload.stockAnterior;
        nuevaEntrada.stock_nuevo = payload.stockNuevo;
        nuevaEntrada.fecha_movimiento = fecha;

        const idxInsumo = insumos.findIndex(i => i.id === parseInt(insumoId));
        if (idxInsumo !== -1) {
            insumos[idxInsumo].stock = stockNuevoNum;
            insumos[idxInsumo].stockActual = stockNuevoNum;
            insumos[idxInsumo].cantidad = stockNuevoNum;
        }

        entradasRegistradas.unshift(nuevaEntrada);
        renderizarVista(entradasRegistradas);
        actualizarResumen(entradasRegistradas);
        actualizarTimeline(entradasRegistradas);

        mostrarNotificacion('Éxito', 'Entrada registrada: +' + cantNum + ' uds (Stock: ' + stockAntNum + ' → ' + stockNuevoNum + ')');

        document.getElementById('selectInsumo').value = '';
        document.getElementById('selectProveedor').value = '';
        document.getElementById('inputCantidad').value = '';
        document.getElementById('inputCostoUnitario').value = '';
        document.getElementById('inputStockAnterior').value = '';
        document.getElementById('inputStockNuevo').value = '';
        document.getElementById('inputFecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('totalCosto').textContent = '$0.00';
        document.getElementById('stockPreview').style.display = 'none';
    } catch (err) {
        mostrarNotificacion('Error al registrar', err.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus me-2"></i>Registrar';
        ['selectInsumo', 'selectProveedor', 'inputCantidad', 'inputCostoUnitario', 'inputFecha']
            .forEach(id => document.getElementById(id).classList.remove('is-invalid'));
    }
}

// ── BÚSQUEDA EN TIEMPO REAL ───────────────────────────────
document.getElementById('inputBusquedaEntradas').addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    if (!q) { renderizarVista(entradasRegistradas); return; }
    const filtradas = entradasRegistradas.filter(e => {
        const nombre = (e.insumoNombre || e.nombreInsumo || e.insumo?.nombre || '').toLowerCase();
        const proveedor = (e.proveedorNombre || e.nombreProveedor || e.proveedor?.nombre || '').toLowerCase();
        return nombre.includes(q) || proveedor.includes(q);
    });
    renderizarVista(filtradas);
});

// ── EXPORTAR A EXCEL REAL (USA SHEETJS) ──────────────────
function exportarCSV() {
    if (typeof XLSX === 'undefined') {
        mostrarNotificacion('Error', 'No se pudo cargar la herramienta de Excel. Recarga la página.', true);
        return;
    }

    if (entradasRegistradas.length === 0) {
        mostrarNotificacion('Sin datos', 'No hay entradas para exportar.', true);
        return;
    }

    const datos = entradasRegistradas.map(e => {
        const fechaFormato = parseFecha(e.fechaMovimiento || e.fechaEntrada || e.fecha_movimiento || e.fecha);
        return {
            'Insumo': e.insumoNombre || e.nombreInsumo || e.insumo?.nombre || '—',
            'Proveedor': e.proveedorNombre || e.nombreProveedor || e.proveedor?.nombre || '—',
            'Stock Anterior': e.stock_anterior ?? e.stockAnterior ?? '—',
            'Cantidad': e.cantidad || 0,
            'Stock Nuevo': e.stock_nuevo ?? e.stockNuevo ?? '—',
            'Costo Unitario': e.costoUnitario ?? 0,
            'Fecha': fechaFormato
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [
        { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Entradas');
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Entradas_Mercancia_${fecha}.xlsx`);
    mostrarNotificacion('¡Exportación exitosa!', `Se exportaron ${datos.length} registros a Excel correctamente.`);
}

// ── FECHA POR DEFECTO Y EVENTOS ───────────────────────────
document.getElementById('inputFecha').value = new Date().toISOString().split('T')[0];
document.getElementById('selectInsumo').addEventListener('change', onInsumoChange);

// ── INICIALIZACIÓN ────────────────────────────────────────
(async () => {
    console.log('[INIT] Cargando datos...');
    await Promise.allSettled([cargarInsumos(), cargarProveedores()]);
    await cargarEntradas();
    console.log('[INIT] Carga finalizada.');
})();