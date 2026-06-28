import { apiSalidas } from '../consumo/apiSalidaMermas.js';

let salidasRegistradas = [];
let insumos = [];

function traducirTipo(tipo) {
    if (!tipo) return '—';
    const mapa = { 'MERMA': 'Merma', 'CONSUMO_INTERNO': 'Consumo Interno', 'DANO': 'Daño', 'SALIDA': 'Salida' };
    return mapa[tipo.toUpperCase()] || tipo.replace(/_/g, ' ');
}

function mostrarNotificacion(texto, esError = false) {
    const notif = document.getElementById('notification');
    const icon = notif.querySelector('.notification-icon i');
    const title = notif.querySelector('h6');
    const text = notif.querySelector('p');

    if (esError) {
        notif.classList.add('is-error');
        notif.style.borderLeftColor = 'var(--danger)';
        icon.className = 'fa-solid fa-circle-xmark';
    } else {
        notif.classList.remove('is-error');
        notif.style.borderLeftColor = 'var(--success)';
        icon.className = 'fa-solid fa-circle-check';
    }
    title.textContent = esError ? 'Error' : 'Operación Exitosa';
    text.textContent = texto;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 4000);
}

// ── MODAL ─────────────────────────────────────────────────
const modalOverlay = document.getElementById('modalOverlay');
const modalCard = document.getElementById('modalCard');

function abrirModal() {
    if (insumos.length === 0) { mostrarNotificacion('No hay insumos disponibles.', true); return; }
    modalOverlay.style.display = 'flex';
    setTimeout(() => modalCard.style.transform = 'scale(1)', 10);
}

function cerrarModal() {
    modalCard.style.transform = 'scale(.95)';
    setTimeout(() => {
        modalOverlay.style.display = 'none';
        document.getElementById('inputCantidad').value = '';
        document.getElementById('inputMotivo').value = '';
    }, 300);
}

document.getElementById('btnAbrirModal')?.addEventListener('click', abrirModal);
document.getElementById('btnCancelarSalida')?.addEventListener('click', cerrarModal);
modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) cerrarModal(); });

// ── CARGAR DATOS ───────────────────────────────────────────
async function cargarInsumos() {
    try {
        insumos = await apiSalidas.obtenerInsumos();
        const sel = document.getElementById('selectInsumo');
        sel.innerHTML = '<option value="">Seleccionar insumo...</option>';
        insumos.forEach(i => {
            sel.innerHTML += `<option value="${i.id}">${i.nombre} (Stock: ${i.stockActual ?? 0})</option>`;
        });
    } catch (error) { console.error(error); }
}

async function cargarSalidas() {
    try {
        salidasRegistradas = await apiSalidas.obtenerSalidas();
    } catch (error) {
        console.warn("Backend no disponible, cargando datos de prueba...");
        salidasRegistradas = [
            { id: 1, nombreInsumo: "Queso Mozzarella", cantidad: 5, costoUnitario: 15000, tipoMovimiento: "MERMA", fechaMovimiento: "2026-06-27T12:00:00Z", observacion: "Se venció" },
            { id: 2, nombreInsumo: "Vino Tinto", cantidad: 2, costoUnitario: 35000, tipoMovimiento: "CONSUMO_INTERNO", fechaMovimiento: "2026-06-26T18:00:00Z", observacion: "Evento especial" }
        ];
    }
    renderTabla(salidasRegistradas);
    actualizarEstadisticas();
}

// ── RENDERIZAR TABLA ──────────────────────────────────────
function renderTabla(lista) {
    const tbody = document.getElementById('tablaSalidas');
    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4"><i class="fa-solid fa-inbox me-2"></i>No hay salidas registradas.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(s => {
        const nombre = s.nombreInsumo || 'Desconocido';
        const tipo = s.tipoMovimiento || 'SALIDA';
        const cantidad = s.cantidad || 0;
        const unidad = s.unidadMedida || 'Uds';

        let fechaFormato = '—';
        const raw = s.fechaMovimiento || s.fecha;
        if (raw != null) {
            try {
                let fechaStr = Array.isArray(raw) ? raw[0] : raw;
                fechaFormato = new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) { fechaFormato = String(raw).substring(0, 10); }
        }

        return `<tr>
            <td data-label="Producto"><strong>${nombre}</strong></td>
            <td data-label="Tipo">${traducirTipo(tipo)}</td>
            <td data-label="Cantidad">-${cantidad} ${unidad}</td>
            <td data-label="Observaciones">${s.observacion || '—'}</td>
            <td data-label="Fecha">${fechaFormato}</td>
        </tr>`;
    }).join('');
}

// ── ESTADÍSTICAS ─────────────────────────────────
function actualizarEstadisticas() {
    const stats = document.querySelectorAll('.stat-info h3');
    if (stats.length >= 2) {
        stats[0].textContent = salidasRegistradas.length;
        const perdidas = salidasRegistradas.reduce((s, e) => s + ((e.cantidad || 0) * (e.costoUnitario || 0)), 0);
        stats[1].textContent = '$' + perdidas.toLocaleString('es-CO');
    }
}

// ── REGISTRAR SALIDA ──────────────────────────────────────
document.getElementById('btnGuardarSalida')?.addEventListener('click', async () => {
    const idInsumo = document.getElementById('selectInsumo').value;
    const cantidad = parseFloat(document.getElementById('inputCantidad').value);
    const tipo = document.getElementById('selectTipo').value;
    const motivo = document.getElementById('inputMotivo').value;

    if (!idInsumo || !cantidad || cantidad <= 0) {
        mostrarNotificacion('Completa el insumo y una cantidad válida.', true);
        return;
    }

    const insumoSeleccionado = insumos.find(i => i.id == idInsumo);
    const stockActual = insumoSeleccionado?.stockActual ?? 0;

    if (cantidad > stockActual) {
        mostrarNotificacion(`Stock insuficiente. Solo hay ${stockActual} disponibles.`, true);
        return;
    }

    const btn = document.getElementById('btnGuardarSalida');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...';

    const payload = {
        idInsumo: parseInt(idInsumo),
        idEmpresa: 1,
        cantidad: cantidad,
        costoUnitario: insumoSeleccionado?.costoUnitario || 0,
        stockAnterior: stockActual,
        stockNuevo: stockActual - cantidad,
        observacion: motivo || `Salida por ${tipo}`,
        tipoMovimiento: tipo,
        fechaMovimiento: new Date().toISOString()
    };

    try {
        await apiSalidas.registrarSalida(payload);
        mostrarNotificacion(`Salida registrada: -${cantidad} uds de ${insumoSeleccionado.nombre}`);
        cerrarModal();
        cargarSalidas();
        cargarInsumos();
    } catch (error) {
        mostrarNotificacion(error.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check me-2"></i>Guardar Salida';
    }
});

// ── FILTROS EN TIEMPO REAL ────────────────────────────────
function aplicarFiltros() {
    const texto = (document.getElementById('filtroProducto')?.value || '').toLowerCase();
    const tipo = document.getElementById('filtroTipo')?.value || '';

    const filtradas = salidasRegistradas.filter(s => {
        const nombre = (s.nombreInsumo || '').toLowerCase();
        const sTipo = (s.tipoMovimiento || '').toUpperCase();
        return (!texto || nombre.includes(texto)) && (!tipo || sTipo === tipo);
    });
    renderTabla(filtradas);
}

document.getElementById('filtroProducto')?.addEventListener('input', aplicarFiltros);
document.getElementById('filtroTipo')?.addEventListener('change', aplicarFiltros);

// ── EXPORTAR A EXCEL ──────────────────────────────────────
document.getElementById('btnExportar')?.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') { mostrarNotificacion('Error: Librería de Excel no cargada.', true); return; }
    if (salidasRegistradas.length === 0) { mostrarNotificacion('No hay salidas para exportar.', true); return; }

    const datos = salidasRegistradas.map(s => {
        let fechaFormato = '—';
        const raw = s.fechaMovimiento || s.fecha;
        if (raw != null) {
            try {
                let fechaStr = Array.isArray(raw) ? raw[0] : raw;
                fechaFormato = new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) { fechaFormato = String(raw).substring(0, 10); }
        }
        return {
            'Insumo': s.nombreInsumo || '—',
            'Tipo Salida': traducirTipo(s.tipoMovimiento),
            'Cantidad': s.cantidad || 0,
            'Pérdida Total': (s.cantidad || 0) * (s.costoUnitario || 0),
            'Fecha': fechaFormato,
            'Observación': s.observacion || '—'
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Salidas y Mermas');

    XLSX.writeFile(wb, `Salidas_Mermas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    mostrarNotificacion(`Se exportaron ${datos.length} registros a Excel correctamente.`);
});

(async () => {
    await Promise.allSettled([cargarInsumos(), cargarSalidas()]);
})();