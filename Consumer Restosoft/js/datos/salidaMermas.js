import { apiSalidas } from '../consumo/apiSalidaMermas.js';
import { apiProfile } from "../consumo/apiProfile.js"; // <-- Importación añadida
import { generarSidebar } from './create-sidebar.js';

// ─── ESTADO ────────────────────────────────────────────────────────────
let salidasRegistradas = [];
let insumos = [];

// ─── ELEMENTOS DEL DOM ──────────────────────────────────────────────────
const modalOverlay = document.getElementById('modalOverlay');
const btnAbrirModal = document.getElementById('btnAbrirModal');
const btnCancelarSalida = document.getElementById('btnCancelarSalida');
const btnGuardarSalida = document.getElementById('btnGuardarSalida');
const tablaSalidas = document.getElementById('tablaSalidas');

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

// ─── ABRIR Y CERRAR MODAL ──────────────────────────────────────────────
function abrirModal() {
    if (modalOverlay) modalOverlay.style.display = 'flex';
}

function cerrarModal() {
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        limpiarFormulario();
    }
}

if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) cerrarModal();
    });
}

function limpiarFormulario() {
    const selectInsumo = document.getElementById('selectInsumo');
    const inputCantidad = document.getElementById('inputCantidad');
    const selectTipo = document.getElementById('selectTipo');
    const inputMotivo = document.getElementById('inputMotivo');

    if (selectInsumo) selectInsumo.value = '';
    if (inputCantidad) inputCantidad.value = '';
    if (selectTipo) selectTipo.value = 'MERMA';
    if (inputMotivo) inputMotivo.value = '';
}

if (btnAbrirModal) btnAbrirModal.addEventListener('click', abrirModal);
if (btnCancelarSalida) btnCancelarSalida.addEventListener('click', cerrarModal);

// ─── CARGAR INSUMOS EN EL SELECT ─────────────────────────────────────────
async function cargarInsumos() {
    const select = document.getElementById('selectInsumo');
    if (!select) return;

    try {
        insumos = await apiSalidas.obtenerInsumos();
        select.innerHTML = '<option value="">Seleccione un insumo...</option>';

        insumos.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            const stock = i.stockActual ?? i.stock ?? 0;
            opt.textContent = `${i.nombre} (Stock: ${stock})`;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error cargando insumos:', error);
        select.innerHTML = '<option value="">Error al cargar insumos</option>';
    }
}

// ─── GUARDAR SALIDA ──────────────────────────────────────────────────────
if (btnGuardarSalida) {
    btnGuardarSalida.addEventListener('click', async () => {
        const idInsumo = document.getElementById('selectInsumo').value;
        const cantidad = document.getElementById('inputCantidad').value;
        const tipoMovimiento = document.getElementById('selectTipo').value;
        const motivo = document.getElementById('inputMotivo').value.trim();

        if (!idInsumo) return window.showNotification('Debes seleccionar un insumo.', 'error');
        if (!cantidad || Number(cantidad) <= 0) return window.showNotification('La cantidad debe ser mayor a 0.', 'error');
        if (!tipoMovimiento) return window.showNotification('Debes seleccionar el tipo de salida.', 'error');

        btnGuardarSalida.disabled = true;
        btnGuardarSalida.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...';

        // El idEmpresa NO se envía en el payload, el backend lo extrae del token JWT
        const payload = {
            idInsumo: parseInt(idInsumo),
            cantidad: parseInt(cantidad),
            tipoMovimiento: tipoMovimiento,
            observacion: motivo || `Salida registrada por tipo: ${tipoMovimiento}`
        };

        try {
            await apiSalidas.registrarSalida(payload);
            window.showNotification(`Se descontaron ${cantidad} unidades del inventario.`, 'success');
            cerrarModal();
            await cargarSalidas();
        } catch (error) {
            console.error('Error al guardar:', error);
            window.showNotification('No se pudo procesar la salida. Revisa la consola para más detalles.', 'error');
        } finally {
            btnGuardarSalida.disabled = false;
            btnGuardarSalida.innerHTML = '<i class="fa-solid fa-check me-2"></i>Guardar Salida';
        }
    });
}

// ─── PROCESAMIENTO DE DATOS Y COLORES ───────────────────────────────────
function procesarDatosSalida(s) {
    let fechaFormato = '—';
    const raw = s.fechaMovimiento;
    if (raw != null) {
        let d;
        if (Array.isArray(raw)) {
            // Si viene como arreglo [2026, 6, 30, 12, 0, 0]
            d = new Date(raw[0], raw[1] - 1, raw[2], raw[3] || 0, raw[4] || 0, raw[5] || 0);
        } else {
            d = new Date(raw);
        }
        try {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            fechaFormato = `${day}/${month}/${year}`;
        } catch (e) {
            fechaFormato = String(raw).substring(0, 10);
        }
    }

    const nombreInsumo = s.nombreInsumo || 'Insumo Desconocido';
    const cantidad = s.cantidad || 0;
    const observacion = s.observacion || 'Sin observación';

    let config = {
        bg: 'rgba(107, 30, 40, 0.1)', text: '#6b1e28', icon: 'fa-arrow-right-arrow-left', label: 'SALIDA'
    };

    const tipoRaw = (s.tipoMovimiento || '').toUpperCase();
    if (tipoRaw === 'MERMA') {
        config = { bg: 'rgba(217, 164, 65, 0.12)', text: '#d9a441', icon: 'fa-recycle', label: 'MERMA' };
    } else if (tipoRaw === 'DANO' || tipoRaw === 'DAÑO') {
        config = { bg: 'rgba(187, 58, 75, 0.1)', text: '#bb3a4b', icon: 'fa-burst', label: 'DAÑO' };
    } else if (tipoRaw === 'CONSUMO_INTERNO') {
        config = { bg: 'rgba(38, 47, 60, 0.08)', text: '#39485c', icon: 'fa-utensils', label: 'CONSUMO INTERNO' };
    }

    return { nombreInsumo, fechaFormato, config, cantidad, observacion };
}

// ─── GENERADORES DE HTML (TABLA VS CARDS PREMIUM) ───────────────────────
function generarFilaHTML(s) {
    const data = procesarDatosSalida(s);
    return `
        <tr>
            <td><strong>${data.nombreInsumo}</strong></td>
            <td><span class="badge px-3 py-2 rounded-pill" style="background:${data.config.bg}; color:${data.config.text};"><i class="fa-solid ${data.config.icon} me-1"></i>${data.config.label}</span></td>
            <td style="font-weight:700; color:var(--danger);">- ${data.cantidad}</td>
            <td>${data.observacion}</td>
            <td>${data.fechaFormato}</td>
        </tr>
    `;
}

function generarCardHTML(s) {
    const data = procesarDatosSalida(s);
    return `
    <div style="background:white; border-radius:18px; margin-bottom:18px; box-shadow:0 6px 18px rgba(38, 47, 60, 0.05); border:1px solid #eef0f4; overflow:hidden;">
        <!-- Header de la tarjeta -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #f0f2f5;">
            <h6 style="margin:0; font-weight:700; font-size:16px; color:#262f3c; display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:10px; background:#f5f6f8; display:flex; align-items:center; justify-content:center; color:#6f7782;">
                    <i class="fa-solid fa-box" style="font-size:14px;"></i>
                </div>
                ${data.nombreInsumo}
            </h6>
            <span style="font-size:12px; color:#6f7782; font-weight:600; background:#f7f8fa; padding:5px 12px; border-radius:20px;">${data.fechaFormato}</span>
        </div>
        
        <!-- Cuerpo de la tarjeta -->
        <div style="padding:18px 20px;">
            <!-- Etiqueta de tipo de salida -->
            <div style="margin-bottom:16px;">
                <span style="display:inline-flex; align-items:center; gap:6px; background:${data.config.bg}; color:${data.config.text}; padding:8px 14px; border-radius:10px; font-size:12px; font-weight:700; letter-spacing:0.5px;">
                    <i class="fa-solid ${data.config.icon}"></i> ${data.config.label}
                </span>
            </div>
            
            <!-- Contenedores de cantidad y observación -->
            <div style="display:flex; gap:14px;">
                <!-- Cantidad (Resaltada en rojo) -->
                <div style="flex:0 0 35%; background:#fff5f6; border-radius:14px; padding:14px; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center; border:1px solid rgba(187,58,75,0.1);">
                    <span style="font-size:11px; color:#6f7782; font-weight:700; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Cantidad</span>
                    <span style="font-weight:800; font-size:22px; color:#bb3a4b;">-${data.cantidad}</span>
                </div>
                
                <!-- Observación (Fondo gris suave) -->
                <div style="flex:1; background:#f7f9fb; border-radius:14px; padding:14px; border:1px solid #f0f2f5;">
                    <span style="display:block; font-size:11px; color:#9ca7b4; font-weight:700; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Observación</span>
                    <span style="font-weight:500; font-size:14px; color:#39485c; display:block; line-height:1.5;">${data.observacion}</span>
                </div>
            </div>
        </div>
    </div>`;
}

// ─── RENDERIZADO DINÁMICO (RESPONSIVE) ─────────────────────────────────
function renderizarVista(lista) {
    const tbody = document.getElementById('tablaSalidas');
    const thead = document.getElementById('theadSalidas');

    if (!lista || lista.length === 0) {
        if (thead) thead.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4"><i class="fa-solid fa-inbox me-2"></i>No hay salidas registradas aún.</td></tr>';
        return;
    }

    if (window.innerWidth <= 768) {
        if (thead) thead.style.display = 'none';
        tbody.innerHTML = lista.map(s => generarCardHTML(s)).join('');
    } else {
        if (thead) thead.style.display = 'table-header-group';
        tbody.innerHTML = lista.map(s => generarFilaHTML(s)).join('');
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (salidasRegistradas.length > 0 || tablaSalidas.innerHTML !== '') {
            renderizarVista(salidasRegistradas);
        }
    }, 250);
});

// ─── CARGAR Y RENDERIZAR TABLA ──────────────────────────────────────────
async function cargarSalidas() {
    if (!tablaSalidas) return;
    tablaSalidas.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Cargando salidas...</td></tr>';

    try {
        salidasRegistradas = await apiSalidas.obtenerSalidas();
        renderizarVista(salidasRegistradas);
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error cargando salidas:', error);
        tablaSalidas.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Error al conectar con el servidor.</td></tr>';
    }
}

// ─── ACTUALIZAR ESTADÍSTICAS ──────────────────────────────────────────
function actualizarEstadisticas() {
    const statTotal = document.getElementById('statTotalSalidas');
    const statPerdidas = document.getElementById('statPerdidas');

    if (statTotal) statTotal.textContent = salidasRegistradas.length;

    if (statPerdidas) {
        const totalUnidades = salidasRegistradas.reduce((sum, s) => sum + (Number(s.cantidad) || 0), 0);
        statPerdidas.textContent = totalUnidades + ' uds';
    }
}

// ─── FILTROS ─────────────────────────────────────────────────────────────
document.getElementById('filtroProducto')?.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#tablaSalidas tr, #tablaSalidas > div').forEach(el => {
        if (el.tagName === 'TR' && el.querySelector('td')?.colSpan > 1) return; // Ignorar fila de carga
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
});

document.getElementById('filtroTipo')?.addEventListener('change', function () {
    const tipo = this.value.toLowerCase().replace('_', ' ');
    document.querySelectorAll('#tablaSalidas tr, #tablaSalidas > div').forEach(el => {
        if (el.tagName === 'TR' && el.querySelector('td')?.colSpan > 1) return;
        el.style.display = !tipo || el.textContent.toLowerCase().includes(tipo) ? '' : 'none';
    });
});

// ─── EXPORTAR A EXCEL ────────────────────────────────────────────────────
document.getElementById('btnExportar')?.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') return window.showNotification('Librería Excel no cargada.', 'error');
    if (salidasRegistradas.length === 0) return window.showNotification('No hay salidas para exportar.', 'error');

    const datos = salidasRegistradas.map(s => {
        const data = procesarDatosSalida(s);
        return {
            'Insumo': data.nombreInsumo,
            'Tipo': data.config.label,
            'Cantidad': Number(data.cantidad),
            'Observación': data.observacion,
            'Fecha': String(data.fechaFormato)
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Salidas_Mermas');
    XLSX.writeFile(wb, `Salidas_Mermas_${new Date().toISOString().slice(0, 10)}.xlsx`);

    window.showNotification(`Se exportaron ${datos.length} registros.`, 'success');
});

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

    generarSidebar('sidebar-container', "inventario", "salidas", perfilData.rol.nombre);

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

// ─── INICIALIZACIÓN ─────────────────────────────────────────────────────
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
        await cargarSalidas();
    } catch (error) {
        console.error('Error al inicializar:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);