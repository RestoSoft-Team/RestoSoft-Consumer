// ── ESTADO GLOBAL ──────────────────────────────────────────
let entradasRegistradas = [];
let insumos = [];
let proveedores = [];

// ── SIDEBAR MÓVIL ──────────────────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

menuToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
});
overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
});

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

// ── OBTENER STOCK DE UN INSUMO DEL ARRAY LOCAL ───────────
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

    // Mostrar el preview
    preview.style.display = 'flex';

    recalcularStockNuevo();

    console.log('[Stock] Insumo #' + insumoId + ' → stockActual: ' + stockActual);
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
    // También recalcular stock nuevo si cambia la cantidad
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

        // Log para verificar qué campo de stock trae cada insumo
        if (insumos.length > 0) {
            console.log('[DEBUG] Primer insumo recibido:', JSON.stringify(insumos[0], null, 2));
        }
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
    renderTabla(entradasRegistradas);
    actualizarResumen(entradasRegistradas);
    actualizarTimeline(entradasRegistradas);
}

// ── RENDERIZAR TABLA ──────────────────────────────────────
function renderTabla(lista) {
    const tbody = document.getElementById('tablaEntradas');
    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4"><i class="fa-solid fa-inbox me-2"></i>No hay entradas registradas aún.</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(e => {
        const insumoNombre = e.nombreInsumo || 'Insumo #—';
        const proveedorNombre = e.proveedorNombre || 'Proveedor';
        const costo = e.costoUnitario;
        const costoUnit = costo != null ? '$' + Number(costo).toLocaleString('es-CO') : '—';
        const stockAnt = e.stockAnterior != null ? e.stockAnterior : '—';
        const stockNue = e.stockNuevo != null ? e.stockNuevo : '—';
        const inicial = proveedorNombre !== 'Proveedor' ? proveedorNombre.charAt(0).toUpperCase() : 'P';

        // Parsear fecha robusto: Instant puede venir como string, array o número
        let fechaFormato = '—';
        const raw = e.fechaMovimiento;
        if (raw != null) {
            let fechaStr = raw;
            // Si viene como array ["2026-06-24T17:00:44Z"], tomar el primer elemento
            if (Array.isArray(raw)) {
                fechaStr = raw[0];
            }
            // Si viene como número (timestamp en milisegundos)
            if (typeof raw === 'number') {
                fechaStr = new Date(raw).toISOString();
            }
            try {
                fechaFormato = new Date(fechaStr).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
            } catch (err) {
                fechaFormato = String(raw).substring(0, 10);
            }
        }

        return '<tr>' +
            '<td data-label="Insumo"><div style="font-weight:700;">' + insumoNombre + '</div></td>' +
            '<td data-label="Proveedor"><div class="supplier"><div class="supplier-avatar">' + inicial + '</div><div><h6>' + proveedorNombre + '</h6><span>Proveedor</span></div></div></td>' +
            '<td data-label="Stock Ant.">' + stockAnt + '</td>' +
            '<td data-label="Cantidad">+' + (e.cantidad || '0') + '</td>' +
            '<td data-label="Stock Nuevo"><strong style="color:var(--success);">' + stockNue + '</strong></td>' +
            '<td data-label="Fecha">' + fechaFormato + '</td>' +
            '</tr>';
    }).join('');
}

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

        let fechaRelativa = '';
        const raw = e.fechaMovimiento;
        if (raw != null) {
            let fechaStr = raw;
            if (Array.isArray(raw)) fechaStr = raw[0];
            if (typeof raw === 'number') fechaStr = new Date(raw).toISOString();
            try {
                fechaRelativa = new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
            } catch (err) {
                fechaRelativa = String(raw).substring(0, 10);
            }
        }

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

    // Validaciones
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

    // Payload sincronizado con tu DTO de Java (MovimientoInventarioDTO)
    const payload = {
        idInsumo: parseInt(insumoId),
        idEmpresa: 1,
        cantidad: cantNum,
        costoUnitario: parseFloat(costoUnit),
        stockAnterior: stockAntNum,
        stockNuevo: stockNuevoNum,
        observacion: 'Entrada de mercancía',
        tipoMovimiento: 'ENTRADA',
        fechaMovimiento: new Date(fecha + 'T12:00:00Z').toISOString()    };

    try {
        const nuevaEntrada = await EntradasConsumer.guardarEntrada(payload);

        // Texto para mostrar sin recargar
        const insumoSel = document.getElementById('selectInsumo');
        const provSel = document.getElementById('selectProveedor');
        nuevaEntrada.insumoNombre = insumoSel.options[insumoSel.selectedIndex].text;
        nuevaEntrada.proveedorNombre = provSel.options[provSel.selectedIndex].text;
        nuevaEntrada.costoUnitario = payload.costoUnitario;
        nuevaEntrada.stock_anterior = payload.stockAnterior;
        nuevaEntrada.stock_nuevo = payload.stockNuevo;
        nuevaEntrada.fecha_movimiento = fecha;

        // Actualizar el stock local del insumo para futuras entradas
        const idxInsumo = insumos.findIndex(i => i.id === parseInt(insumoId));
        if (idxInsumo !== -1) {
            insumos[idxInsumo].stock = stockNuevoNum;
            insumos[idxInsumo].stockActual = stockNuevoNum;
            insumos[idxInsumo].cantidad = stockNuevoNum;
        }

        entradasRegistradas.unshift(nuevaEntrada);
        renderTabla(entradasRegistradas);
        actualizarResumen(entradasRegistradas);
        actualizarTimeline(entradasRegistradas);

        mostrarNotificacion('Éxito', 'Entrada registrada: +' + cantNum + ' uds (Stock: ' + stockAntNum + ' → ' + stockNuevoNum + ')');

        // Limpiar formulario
        document.getElementById('selectInsumo').value = '';
        document.getElementById('selectProveedor').value = '';
        document.getElementById('inputCantidad').value = '';
        document.getElementById('inputCostoUnitario').value = '';
        document.getElementById('inputStockAnterior').value = '';
        document.getElementById('inputStockNuevo').value = '';
        document.getElementById('inputFecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('totalCosto').textContent = '$0.00';
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
    if (!q) { renderTabla(entradasRegistradas); return; }
    const filtradas = entradasRegistradas.filter(e => {
        const nombre = (e.insumoNombre || e.nombreInsumo || e.insumo?.nombre || '').toLowerCase();
        const proveedor = (e.proveedorNombre || e.nombreProveedor || e.proveedor?.nombre || '').toLowerCase();
        return nombre.includes(q) || proveedor.includes(q);
    });
    renderTabla(filtradas);
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

    // 1. Mapear los datos a un array de objetos planos
    const datos = entradasRegistradas.map(e => {
        // Formatear fecha de forma robusta
        let fechaFormato = '—';
        const raw = e.fechaMovimiento || e.fechaEntrada || e.fecha_movimiento || e.fecha;
        if (raw != null) {
            let fechaStr = raw;
            if (Array.isArray(raw)) fechaStr = raw[0];
            if (typeof raw === 'number') fechaStr = new Date(raw).toISOString();
            try {
                fechaFormato = new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (err) {
                fechaFormato = String(raw).substring(0, 10);
            }
        }

        return {
            'Insumo':         e.insumoNombre || e.nombreInsumo || e.insumo?.nombre || '—',
            'Proveedor':      e.proveedorNombre || e.nombreProveedor || e.proveedor?.nombre || '—',
            'Stock Anterior': e.stock_anterior ?? e.stockAnterior ?? '—',
            'Cantidad':       e.cantidad || 0,
            'Stock Nuevo':    e.stock_nuevo ?? e.stockNuevo ?? '—',
            'Costo Unitario': e.costoUnitario ?? 0,
            'Fecha':          fechaFormato
        };
    });

    // 2. Crear el libro y la hoja de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);

    // 3. Ajustar el ancho de las columnas
    ws['!cols'] = [
        { wch: 22 }, // Insumo
        { wch: 22 }, // Proveedor
        { wch: 16 }, // Stock Anterior
        { wch: 12 }, // Cantidad
        { wch: 14 }, // Stock Nuevo
        { wch: 18 }, // Costo Unitario
        { wch: 20 }  // Fecha
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Entradas');

    // 4. Generar y descargar el archivo .xlsx real
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Entradas_Mercancia_${fecha}.xlsx`);

    mostrarNotificacion('¡Exportación exitosa!', `Se exportaron ${datos.length} registros a Excel correctamente.`);
}

// ── FECHA POR DEFECTO ─────────────────────────────────────
document.getElementById('inputFecha').value = new Date().toISOString().split('T')[0];

// ── EVENTO: cambio de insumo → llenar stock anterior ─────
document.getElementById('selectInsumo').addEventListener('change', onInsumoChange);

// ── INICIALIZACIÓN ────────────────────────────────────────
(async () => {
    console.log('[INIT] Cargando datos...');
    await Promise.allSettled([cargarInsumos(), cargarProveedores()]);
    await cargarEntradas();
    console.log('[INIT] Carga finalizada.');
})();