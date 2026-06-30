import api from '../consumo/apiProveedores.js';
import { apiProfile } from "../consumo/apiProfile.js";

// ── Estado en memoria ──────────────────────────────────────────
let listaProveedores = [];
let idParaEliminar = null;
let perfilData = null; // ← Perfil del usuario logueado (nivel módulo)
let infoPerfilContainer = document.getElementById("infoPerfilContainer");

// ══════════════════════════════════════════════════════════════
// NOTIFICACIÓN NATIVA
// ══════════════════════════════════════════════════════════════
window.showNotification = (text, type = "success") => {
    const contenedor = document.getElementById("notificationContainer");
    if (!contenedor) {
        console.warn("Contenedor de notificaciones no encontrado:", text);
        return;
    }

    // Mapear iconos y títulos según el tipo de alerta
    const config = {
        success: { icon: "fa-circle-check", title: "Operación Exitosa" },
        warning: { icon: "fa-triangle-exclamation", title: "Aviso" },
        error: { icon: "fa-circle-xmark", title: "Error" },
        delete: { icon: "fa-trash-can", title: "Eliminado" } // Agregado para coincidir con tus llamadas
    };

    const { icon, title } = config[type] || config.success;

    // Crear el elemento de la notificación
    const notif = document.createElement("div");
    notif.className = `notification ${type === 'delete' ? 'error' : type}`; // 'delete' usa estilos de error
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

    // Agregar al DOM
    contenedor.appendChild(notif);

    // Forzar reflow para que la animación de entrada funcione
    void notif.offsetWidth;

    // Mostrar con animación
    setTimeout(() => notif.classList.add("show"), 10);

    // Función para cerrar y eliminar
    const cerrarNotif = () => {
        notif.classList.remove("show");
        setTimeout(() => notif.remove(), 400);
    };

    // Cerrar al hacer clic en la X
    notif
        .querySelector(".notification-close")
        .addEventListener("click", cerrarNotif);

    // Auto-cerrar a los 4 segundos
    setTimeout(cerrarNotif, 4000);
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function getEstadoBadge(estado) {
    if (estado === true || String(estado) === 'true') {
        return `<span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill"><i class="fa-solid fa-circle-check me-1"></i>Disponible</span>`;
    }
    return `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2 rounded-pill"><i class="fa-solid fa-circle-xmark me-1"></i>No Disponible</span>`;
}

// ══════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════════════════════════
function actualizarEstadisticas() {
    const elProv = document.getElementById('stat-total-proveedores');
    const elEmp = document.getElementById('stat-total-empresas');
    if (elProv) elProv.innerText = listaProveedores.length;
    // Como ya no hay lista de empresas, asignamos 1 si hay perfil, 0 si no
    if (elEmp) elEmp.innerText = perfilData?.empresa ? 1 : 0;
}

// ══════════════════════════════════════════════════════════════
// PROCESAR DATOS DEL PROVEEDOR
// ══════════════════════════════════════════════════════════════
function procesarDatosProv(prov) {
    return {
        id: prov.id,
        nombre: prov.nombre,
        email: prov.email || '—',
        telefono: prov.telefono || '—',
        direccion: prov.direccion || '—',
        nombreEmpresa: prov.nombreEmpresa || 'Sin Empresa',
        estadoBadge: getEstadoBadge(prov.estado)
    };
}

// ══════════════════════════════════════════════════════════════
// GENERADORES DE HTML
// ══════════════════════════════════════════════════════════════
function generarFilaHTML(prov) {
    const d = procesarDatosProv(prov);
    return `
        <tr>
            <td>
                <div class="supplier">
                    <div class="supplier-logo"><i class="fa-solid fa-user-tie"></i></div>
                    <div><h6>${d.nombre}</h6></div>
                </div>
            </td>
            <td>${d.email}</td>
            <td>${d.telefono}</td>
            <td>${d.direccion}</td>
            <td>
                <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
                    <i class="fa-solid fa-building me-1"></i> ${d.nombreEmpresa}
                </span>
            </td>
            <td>${d.estadoBadge}</td>
            <td style="display:flex;gap:8px;align-items:center;">
                <button class="action-btn edit" data-id="${d.id}" title="Editar">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="action-btn delete" data-id="${d.id}" data-nombre="${d.nombre}" title="Eliminar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `;
}

function generarCardHTML(prov) {
    const d = procesarDatosProv(prov);
    return `
    <div style="background:white; border-radius:18px; margin-bottom:18px; box-shadow:0 6px 18px rgba(38, 47, 60, 0.05); border:1px solid #eef0f4; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #f0f2f5;">
            <h6 style="margin:0; font-weight:700; font-size:16px; color:#262f3c; display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:10px; background:#f5f6f8; display:flex; align-items:center; justify-content:center; color:#6b1e28;">
                    <i class="fa-solid fa-user-tie" style="font-size:14px;"></i>
                </div>
                ${d.nombre}
            </h6>
            ${d.estadoBadge}
        </div>
        <div style="padding:18px 20px;">
            <div style="display:flex; gap:12px; margin-bottom:14px; align-items:center;">
                <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="fa-solid fa-building me-1"></i> ${d.nombreEmpresa}</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                <div>
                    <label style="display:block; font-size:11px; color:#6f7782; font-weight:700; margin-bottom:4px;">EMAIL</label>
                    <span style="font-weight:600; font-size:14px; color:#262f3c; word-break:break-all;">${d.email}</span>
                </div>
                <div>
                    <label style="display:block; font-size:11px; color:#6f7782; font-weight:700; margin-bottom:4px;">TELÉFONO</label>
                    <span style="font-weight:600; font-size:14px; color:#262f3c;">${d.telefono}</span>
                </div>
                <div style="grid-column:1 / -1;">
                    <label style="display:block; font-size:11px; color:#6f7782; font-weight:700; margin-bottom:4px;">DIRECCIÓN</label>
                    <span style="font-weight:600; font-size:14px; color:#262f3c;">${d.direccion}</span>
                </div>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #f0f2f5; padding-top:14px;">
                <button class="action-btn edit" data-id="${d.id}" title="Editar" style="background:#edf0f4; color:#262f3c; padding:0 16px; width:auto; font-weight:600;">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>
                <button class="action-btn delete" data-id="${d.id}" data-nombre="${d.nombre}" title="Eliminar" style="background:rgba(187, 58, 75, .1); color:#bb3a4b; padding:0 16px; width:auto; font-weight:600;">
                    <i class="fa-solid fa-trash-can"></i> Eliminar
                </button>
            </div>
        </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// RENDERIZADO DINÁMICO
// ══════════════════════════════════════════════════════════════
function renderizarVista(lista = listaProveedores) {
    const tbody = document.getElementById('tabla-proveedores');
    const thead = document.getElementById('theadProveedores');

    if (!lista || lista.length === 0) {
        if (thead) thead.style.display = 'none';
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray);"><i class="fa-solid fa-truck-fast" style="font-size:28px;margin-bottom:10px;display:block;opacity:.3"></i>No se encontraron proveedores</td></tr>`;
        actualizarEstadisticas();
        return;
    }

    if (window.innerWidth <= 768) {
        if (thead) thead.style.display = 'none';
        tbody.innerHTML = lista.map(p => generarCardHTML(p)).join('');
    } else {
        if (thead) thead.style.display = 'table-header-group';
        tbody.innerHTML = lista.map(p => generarFilaHTML(p)).join('');
    }

    actualizarEstadisticas();
    attachTableEvents();
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        renderizarVista(listaProveedores);
    }, 250);
});

function attachTableEvents() {
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEditar(Number(btn.dataset.id)));
    });
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => abrirModalEliminar(Number(btn.dataset.id), btn.dataset.nombre));
    });
}

// ══════════════════════════════════════════════════════════════
// BUSCADOR EN TIEMPO REAL
// ══════════════════════════════════════════════════════════════
document.getElementById('input-busqueda')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) { renderizarVista(); return; }
    const filtrados = listaProveedores.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.telefono.toLowerCase().includes(q) ||
        (p.nombreEmpresa || '').toLowerCase().includes(q) ||
        String(p.estado).toLowerCase().includes(q)
    );
    renderizarVista(filtrados);
});

// ══════════════════════════════════════════════════════════════
// MODAL EDITAR
// ══════════════════════════════════════════════════════════════
function abrirModalEditar(id) {
    const prov = listaProveedores.find(p => p.id === id);
    if (!prov) return;

    document.getElementById('edit-id').value = prov.id;
    document.getElementById('edit-nombre').value = prov.nombre;
    document.getElementById('edit-email').value = prov.email;
    document.getElementById('edit-telefono').value = prov.telefono;
    document.getElementById('edit-direccion').value = prov.direccion;
    document.getElementById('edit-estado').value = String(prov.estado);

    document.getElementById('editOverlay').classList.add('show');
}

function cerrarModalEditar() {
    document.getElementById('editOverlay').classList.remove('show');
    document.getElementById('form-editar').reset();
}

document.getElementById('btnCloseEdit')?.addEventListener('click', cerrarModalEditar);
document.getElementById('btnCancelEdit')?.addEventListener('click', cerrarModalEditar);

document.getElementById('editOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalEditar();
});

document.getElementById('form-editar')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = Number(document.getElementById('edit-id').value);
    const nombre = document.getElementById('edit-nombre').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const telefono = document.getElementById('edit-telefono').value.trim();
    const direccion = document.getElementById('edit-direccion').value.trim();
    const estadoStr = document.getElementById('edit-estado').value;
    const estado = estadoStr === 'true';

    // Ya NO enviamos idEmpresa, el backend lo saca del token
    const datos = { nombre, email, telefono, direccion, estado };

    try {
        const response = await api.actualizarProveedor(id, datos);
        if (response.ok) {
            cerrarModalEditar();
            showNotification(`"${nombre}" fue modificado correctamente.`, 'success');
            listaProveedores = await api.obtenerProveedores();
            renderizarVista();
        } else {
            const msg = await response.text();
            showNotification(msg || 'Verifica los datos e inténtalo de nuevo.', 'error');
        }
    } catch (error) {
        console.error('Error actualizando proveedor:', error);
        showNotification('No fue posible conectar con el servidor.', 'error');
    }
});

// ══════════════════════════════════════════════════════════════
// MODAL ELIMINAR
// ══════════════════════════════════════════════════════════════
function abrirModalEliminar(id, nombre) {
    idParaEliminar = id;
    document.getElementById('confirmNombre').textContent = nombre;
    document.getElementById('confirmOverlay').classList.add('show');
}

function cerrarModalEliminar() {
    idParaEliminar = null;
    document.getElementById('confirmOverlay').classList.remove('show');
}

document.getElementById('btnCancelDelete')?.addEventListener('click', cerrarModalEliminar);

document.getElementById('confirmOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalEliminar();
});

document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
    if (!idParaEliminar) return;
    const nombreEl = document.getElementById('confirmNombre').textContent;

    try {
        const response = await api.eliminarProveedor(idParaEliminar);
        cerrarModalEliminar();

        if (response.ok || response.status === 204) {
            showNotification(`"${nombreEl}" fue removido del sistema correctamente.`, 'delete');
            listaProveedores = await api.obtenerProveedores();
            renderizarVista();
        } else {
            showNotification('Ocurrió un error al intentar eliminar el proveedor.', 'error');
        }
    } catch (error) {
        cerrarModalEliminar();
        console.error('Error eliminando proveedor:', error);
        showNotification('No fue posible conectar con el servidor.', 'error');
    }
});

// ══════════════════════════════════════════════════════════════
// EXPORTAR A EXCEL
// ══════════════════════════════════════════════════════════════
document.getElementById('btn-exportar')?.addEventListener('click', () => {
    if (!listaProveedores.length) {
        showNotification('No hay proveedores para exportar.', 'error');
        return;
    }

    const datos = listaProveedores.map(p => ({
        'ID': p.id,
        'Nombre': p.nombre,
        'Email': p.email,
        'Teléfono': p.telefono,
        'Dirección': p.direccion,
        'Empresa': p.nombreEmpresa || 'Sin Empresa',
        'Estado': p.estado ? 'Disponible' : 'No Disponible'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `proveedores_${fecha}.xlsx`);

    showNotification(`Se exportaron ${datos.length} proveedores correctamente.`, 'success');
});

// ══════════════════════════════════════════════════════════════
// FORMULARIO CREAR
// ══════════════════════════════════════════════════════════════
document.getElementById('form-proveedor')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('input-nombre').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const telefono = document.getElementById('input-telefono').value.trim();
    const direccion = document.getElementById('input-direccion').value.trim();
    const estadoStr = document.getElementById('select-estado').value;
    const estado = estadoStr === 'true';

    // Ya NO enviamos idEmpresa, el backend lo saca del token
    const proveedorData = { nombre, email, telefono, direccion, estado };

    try {
        const response = await api.crearProveedor(proveedorData);
        if (response.ok) {
            showNotification(`"${nombre}" fue agregado correctamente al sistema.`, 'success');
            listaProveedores = await api.obtenerProveedores();
            renderizarVista();
            document.getElementById('form-proveedor').reset();
        } else {
            const msg = await response.text();
            showNotification(msg || 'Verifica que los datos no estén duplicados.', 'error');
        }
    } catch (error) {
        console.error('Error guardando proveedor:', error);
        showNotification('No fue posible conectar con el servidor.', 'error');
    }
});

// ══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════
async function inicializarModulo() {
    try {
        // Cargar perfil primero (opcional, solo para mostrar info en la barra superior)
        try {
            perfilData = await apiProfile.obtenerInfoMe();
            cargarPerfilUsuario(perfilData);
        } catch (profileError) {
            console.warn("No se pudo cargar el perfil:", profileError);
        }

        listaProveedores = await api.obtenerProveedores();
        renderizarVista();
    } catch (error) {
        console.error('Error al inicializar el módulo:', error);
        showNotification('No fue posible conectar con el servidor.', 'error');
    }
}

function cargarPerfilUsuario(perfilData) {
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

window.limpiarFormulario = () => document.getElementById('form-proveedor')?.reset();
document.addEventListener('DOMContentLoaded', inicializarModulo);