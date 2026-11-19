import { EntradasConsumer } from '../consumo/apiEntradaMercancia.js';
import { apiProfile } from "../consumo/apiProfile.js";
import { generarSidebar } from './create-sidebar.js';

// ── ESTADO GLOBAL ──────────────────────────────────────────
let entradasRegistradas = [];
let insumos = [];
let todasLasRelaciones = []; // ¡NUEVO! Guardar las relaciones insumo-proveedor

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

// ── HELPERS FORMATO FECHA ─────────────────────────────────
function parseFecha(raw) {
    if (raw == null) return '—';
    let fechaStr = raw;
    if (Array.isArray(raw)) fechaStr = raw[0];
    if (typeof raw === 'number') fechaStr = new Date(raw).toISOString();
    try {
        const d = new Date(fechaStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (err) {
        return String(raw).substring(0, 10);
    }
}

// ── HELPER NOMBRE PROVEEDOR ────
function getProveedorNombre(e) {
    return e?.proveedor?.nombre || e?.proveedorNombre || e?.nombreProveedor || '—';
}

// ── OBTENER STOCK DE UN INSUMO DEL ARRAY LOCAL ───────────
function obtenerStockInsumo(insumoId) {
    const id = parseInt(insumoId);
    const found = insumos.find(i => i.id === id);
    if (!found) return 0;
    return found.stockActual ?? found.stock ?? found.cantidad ?? found.stockDisponible ?? 0;
}

// ── AL SELECCIONAR INSUMO → LLENAR PROVEEDORES Y STOCK ────────
function onInsumoChange() {
    const insumoId = document.getElementById('selectInsumo').value;
    const selProv = document.getElementById('selectProveedor');
    const preview = document.getElementById('stockPreview');

    if (!insumoId) {
        preview.style.display = 'none';
        document.getElementById('inputStockAnterior').value = '';
        document.getElementById('inputStockNuevo').value = '';
        document.getElementById('spStockAnterior').textContent = '0';
        document.getElementById('spCantidad').textContent = '0';
        document.getElementById('spStockNuevo').textContent = '0';

        selProv.innerHTML = '<option value="">Seleccione un insumo primero...</option>';
        selProv.disabled = true;
        return;
    }

    // Filtrar proveedores para este insumo específico
    const proveedoresDeEsteInsumo = todasLasRelaciones.filter(r => r.idInsumo == insumoId);

    if (proveedoresDeEsteInsumo.length === 0) {
        selProv.innerHTML = '<option value="">Sin proveedores asignados</option>';
        selProv.innerHTML += '<option value="GESTIONAR">➕ Ir a asignar proveedores...</option>';
        selProv.disabled = false;
        window.showNotification('Este insumo no tiene proveedores. Por favor, asignale uno.', 'warning');
    } else {
        selProv.innerHTML = '<option value="">Seleccionar proveedor...</option>';
        proveedoresDeEsteInsumo.forEach(p => {
            const op = document.createElement('option');
            op.value = p.idProveedor;
            op.textContent = p.nombreProveedor || 'Proveedor #' + p.idProveedor;
            selProv.appendChild(op);
        });
        selProv.innerHTML += '<option value="GESTIONAR">➕ Asignar/Quitar proveedores...</option>';
        selProv.disabled = false;
    }

    // Llenar stock anterior
    const stockActual = obtenerStockInsumo(insumoId);
    document.getElementById('inputStockAnterior').value = stockActual;
    document.getElementById('spStockAnterior').textContent = stockActual;

    preview.style.display = 'flex';
    recalcularStockNuevo();
}

// Listener para redirigir si selecciona "GESTIONAR"
document.getElementById('selectProveedor')?.addEventListener('change', function () {
    if (this.value === 'GESTIONAR') {
        window.location.href = 'ProveedorInsumo.html';
    }
});

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

// ── CARGAR INSUMOS Y RELACIONES ────────────────────────────────
async function cargarInsumosYRelaciones() {
    const sel = document.getElementById('selectInsumo');
    const selProv = document.getElementById('selectProveedor');

    selProv.innerHTML = '<option value="">Seleccione un insumo primero...</option>';
    selProv.disabled = true;

    try {
        // Cargamos insumos y relaciones al mismo tiempo
        const [insumosData, relacionesData] = await Promise.all([
            EntradasConsumer.obtenerInsumos(),
            EntradasConsumer.obtenerRelaciones()
        ]);

        insumos = insumosData;
        todasLasRelaciones = relacionesData;

        sel.innerHTML = '<option value="">Seleccionar insumo</option>';
        insumos.forEach(i => {
            const op = document.createElement('option');
            op.value = i.id;
            op.textContent = i.nombre || i.name || 'Insumo #' + i.id;
            sel.appendChild(op);
        });

        document.getElementById('statTotalInsumos').textContent = insumos.length;
        document.getElementById('statTotalProveedores').textContent = new Set(relacionesData.map(r => r.idProveedor)).size;

    } catch (error) {
        console.error('[Error carga inicial] ' + error.message);
        sel.innerHTML = '<option value="">Error al cargar insumos</option>';
        document.getElementById('statTotalInsumos').textContent = '0';
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

function generarFilaHTML(e) {
    const insumoNombre = e.nombreInsumo || 'Insumo #—';
    const proveedorNombre = getProveedorNombre(e);
    const inicial = proveedorNombre !== '—' ? proveedorNombre.charAt(0).toUpperCase() : 'P';
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
    const proveedorNombre = getProveedorNombre(e);
    const inicial = proveedorNombre !== '—' ? proveedorNombre.charAt(0).toUpperCase() : 'P';
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
        ? (ultima.nombreInsumo || ultima.insumoNombre || ultima.insumo?.nombre || 'Movimiento #' + (ultima.id || '—'))
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
        const proveedorNombre = getProveedorNombre(e);
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

    if (!insumoId) return window.showNotification('Debes seleccionar un insumo.', 'error');
    if (!proveedorId || proveedorId === 'GESTIONAR') return window.showNotification('Debes seleccionar un proveedor válido.', 'error');
    if (!cantidad || Number(cantidad) <= 0) return window.showNotification('La cantidad debe ser mayor a 0.', 'error');
    if (!costoUnit || Number(costoUnit) < 0) return window.showNotification('El costo no es válido.', 'error');
    if (!fecha) return window.showNotification('Debes seleccionar una fecha.', 'error');

    const cantNum = parseFloat(cantidad);
    const stockAntNum = parseFloat(stockAnterior) || 0;
    const stockNuevoNum = stockAntNum + cantNum;

    const btn = document.getElementById('btnRegistrar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Registrando...';

    const payload = {
        idInsumo: parseInt(insumoId),
        idProveedor: parseInt(proveedorId),
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

        nuevaEntrada.nombreInsumo = insumoSel.options[insumoSel.selectedIndex].text;
        if (!nuevaEntrada.proveedor) {
            nuevaEntrada.proveedor = { nombre: provSel.options[provSel.selectedIndex].text };
        }

        nuevaEntrada.costoUnitario = payload.costoUnitario;
        nuevaEntrada.stockAnterior = payload.stockAnterior;
        nuevaEntrada.stockNuevo = payload.stockNuevo;
        nuevaEntrada.fechaMovimiento = fecha;

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

        window.showNotification(`Entrada registrada: +${cantNum} uds (Stock: ${stockAntNum} → ${stockNuevoNum})`, 'success');

        document.getElementById('selectInsumo').value = '';
        document.getElementById('selectProveedor').innerHTML = '<option value="">Seleccione un insumo primero...</option>';
        document.getElementById('selectProveedor').disabled = true;
        document.getElementById('inputCantidad').value = '';
        document.getElementById('inputCostoUnitario').value = '';
        document.getElementById('inputStockAnterior').value = '';
        document.getElementById('inputStockNuevo').value = '';
        document.getElementById('inputFecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('totalCosto').textContent = '$0.00';
        document.getElementById('stockPreview').style.display = 'none';
    } catch (err) {
        window.showNotification(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus me-2"></i>Registrar';
    }
}

// ── BÚSQUEDA EN TIEMPO REAL ───────────────────────────────
document.getElementById('inputBusquedaEntradas')?.addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    if (!q) { renderizarVista(entradasRegistradas); return; }
    const filtradas = entradasRegistradas.filter(e => {
        const nombre = (e.nombreInsumo || e.insumoNombre || e.insumo?.nombre || '').toLowerCase();
        const proveedor = getProveedorNombre(e).toLowerCase();
        return nombre.includes(q) || proveedor.includes(q);
    });
    renderizarVista(filtradas);
});

// ── EXPORTAR A EXCEL ──────────────────────────
function exportarCSV() {
    if (typeof XLSX === 'undefined') return window.showNotification('Librería Excel no cargada.', 'error');
    if (entradasRegistradas.length === 0) return window.showNotification('No hay entradas para exportar.', 'error');

    const datos = entradasRegistradas.map(e => {
        const insumoLocal = insumos.find(i => i.id === e.idInsumo);
        return {
            'Insumo': String(e.nombreInsumo || e.insumoNombre || e.insumo?.nombre || '—'),
            'Proveedor': String(getProveedorNombre(e)),
            'Stock Anterior': Number(e.stockAnterior ?? e.stock_anterior ?? 0),
            'Cantidad': Number(e.cantidad || 0),
            'Stock Nuevo': Number(e.stockNuevo ?? e.stock_nuevo ?? 0),
            'Fecha': String(parseFecha(e.fechaMovimiento || e.fechaEntrada || e.fecha_movimiento || e.fecha))
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [
        { wch: 25 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Entradas');
    XLSX.writeFile(wb, `Entradas_Mercancia_${new Date().toISOString().slice(0, 10)}.xlsx`);
    window.showNotification(`Se exportaron ${datos.length} registros.`, 'success');
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

    generarSidebar('sidebar-container', "inventario", "entradas", perfilData.rol.nombre);
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

// ── FECHA POR DEFECTO Y EVENTOS ───────────────────────────
document.getElementById('inputFecha').value = new Date().toISOString().split('T')[0];
document.getElementById('selectInsumo')?.addEventListener('change', onInsumoChange);
document.getElementById('btnRegistrar')?.addEventListener('click', registrarEntrada);
document.getElementById('inputCantidad')?.addEventListener('input', calcularTotal);
document.getElementById('inputCostoUnitario')?.addEventListener('input', calcularTotal);
document.getElementById('btnExportar')?.addEventListener('click', exportarCSV);

// ── INICIALIZACIÓN ────────────────────────────────────────
(async () => {
    console.log('[INIT] Cargando datos...');

    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        cargarPerfilUsuario(perfilData);
    } catch (profileError) {
        console.warn("No se pudo cargar el perfil:", profileError);
    }

    await cargarInsumosYRelaciones();
    await cargarEntradas();
    console.log('[INIT] Carga finalizada.');
})();