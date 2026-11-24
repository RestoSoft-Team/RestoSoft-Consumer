import api from '../consumo/apiClientes.js';
import { apiProfile } from "../consumo/apiProfile.js"; // <-- Importación añadida
import { generarSidebar } from './create-sidebar.js';

let listaClientes = [];
let bootstrapModal = null;

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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const modalElement = document.getElementById('modalEditarCliente');
        bootstrapModal = new bootstrap.Modal(modalElement);

        // Intentamos cargar el perfil (si falla, no rompe el resto de la página)
        try {
            const perfilData = await apiProfile.obtenerInfoMe();
            cargarPerfilUsuario(perfilData);
        } catch (profileError) {
            console.warn("No se pudo cargar el perfil:", profileError);
        }

        listaClientes = await api.obtenerClientes();
        renderizarTabla(listaClientes);
        actualizarEstadisticas();

    } catch (error) {
        console.error(error);
        document.getElementById('tabla-clientes').innerHTML = `<tr><td colspan="5" class="text-center text-danger p-4">Error al cargar los datos.</td></tr>`;
        window.showNotification('No se pudieron obtener los clientes del servidor.', 'error');
    }
});

function getEstadoBadge(estado) {
    const isActive = estado === true || String(estado).toLowerCase() === 'activo' || String(estado).toLowerCase() === 'true';
    if (isActive) {
        return `<span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill"><i class="fa-solid fa-circle-check me-1"></i>Activo</span>`;
    }
    return `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2 rounded-pill"><i class="fa-solid fa-circle-xmark me-1"></i>Inactivo</span>`;
}

function renderizarTabla(lista) {
    const tbody = document.getElementById('tabla-clientes');
    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary p-4">No se encontraron clientes.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => {
        const nombres = c.nombres || c.usuario?.nombres || '';
        const apellidos = c.apellidos || c.usuario?.apellidos || '';
        const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Cliente';
        const telefono = c.telefono || c.usuario?.telefono || '—';
        const email = c.email || c.usuario?.email || '—';
        const estado = c.estado ?? c.usuario?.estado ?? false;
        const id = c.id || c.usuario?.id || c.idusuario || 0;
        const img = c.imagenUrl || c.imagen_url || c.usuario?.imagenUrl || `https://i.pravatar.cc/120?u=${id}`;

        return `
            <tr>
                <td data-label="Cliente">
                    <div class="client-box">
                        <img src="${img}" alt="${nombreCompleto}" onerror="this.src='https://i.pravatar.cc/120?u=${id}'"/>
                        <div><h6>${nombreCompleto}</h6></div>
                    </div>
                </td>
                <td data-label="Teléfono">${telefono}</td>
                <td data-label="Correo Electrónico">${email}</td>
                <td data-label="Estado">${getEstadoBadge(estado)}</td>
                <td data-label="Acciones">
                    <div class="d-flex gap-2">
                        <button class="action-btn btn-ver-detalle" data-id="${id}" title="Ver detalle"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn btn-editar" data-id="${id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function actualizarEstadisticas() {
    const total = listaClientes.length;
    const frecuentes = listaClientes.filter(c => (c.visitas || 0) > 10).length;
    const nuevos = listaClientes.filter(c => (c.visitas || 0) <= 5).length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statFrecuentes').textContent = frecuentes;
    document.getElementById('statNuevos').textContent = nuevos;
}

// --- LÓGICA DE BOTONES (VER Y EDITAR) USANDO DELEGACIÓN DE EVENTOS ---
document.getElementById('tabla-clientes').addEventListener('click', function (e) {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;

    const id = parseInt(btn.dataset.id);
    if (!id) return;

    const cliente = listaClientes.find(c => (c.id || c.usuario?.id || c.idusuario) === id);
    if (!cliente) return;

    if (btn.classList.contains('btn-ver-detalle')) {
        mostrarDetalleCliente(cliente);
    } else if (btn.classList.contains('btn-editar')) {
        abrirModalEditar(cliente);
    }
});

// --- FUNCIONALIDAD MOSTRAR DETALLE (CARD) ---
function mostrarDetalleCliente(c) {
    const nombres = c.nombres || c.usuario?.nombres || '';
    const apellidos = c.apellidos || c.usuario?.apellidos || '';
    const nombreCompleto = `${nombres} ${apellidos}`.trim() || 'Cliente';
    const telefono = c.telefono || c.usuario?.telefono || '—';
    const email = c.email || c.usuario?.email || '—';
    const estado = c.estado ?? c.usuario?.estado ?? false;
    const id = c.id || c.usuario?.id || c.idusuario || 0;
    const img = c.imagenUrl || c.imagen_url || c.usuario?.imagenUrl || `https://i.pravatar.cc/120?u=${id}`;

    document.getElementById('detailImg').src = img;
    document.getElementById('detailNombre').textContent = nombreCompleto;
    document.getElementById('detailEstado').innerHTML = getEstadoBadge(estado);
    document.getElementById('detailTelefono').textContent = telefono;
    document.getElementById('detailEmail').textContent = email;

    const card = document.getElementById('cardDetalleCliente');
    card.classList.add('show');

    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

document.getElementById('btnCerrarDetalle').addEventListener('click', () => {
    document.getElementById('cardDetalleCliente').classList.remove('show');
});

// --- FUNCIONALIDAD EDITAR (MODAL) ---
function abrirModalEditar(c) {
    const id = c.id || c.usuario?.id || c.idusuario || 0;
    const nombres = c.nombres || c.usuario?.nombres || '';
    const apellidos = c.apellidos || c.usuario?.apellidos || '';
    const telefono = c.telefono || c.usuario?.telefono || '';
    const email = c.email || c.usuario?.email || '';
    const fechaNacimiento = c.fechaNacimiento || c.usuario?.fechaNacimiento || '';

    // Si el backend devuelve la contraseña (poco probable por seguridad, pero si lo hace, se carga)
    const password = c.password || c.usuario?.password || '';

    const estadoValor = c.estado ?? c.usuario?.estado ?? false;
    const isActive = estadoValor === true || String(estadoValor).toLowerCase() === 'activo' || String(estadoValor).toLowerCase() === 'true';

    document.getElementById('editId').value = id;
    document.getElementById('editNombres').value = nombres;
    document.getElementById('editApellidos').value = apellidos;
    document.getElementById('editTelefono').value = telefono;
    document.getElementById('editEmail').value = email;
    document.getElementById('editFechaNacimiento').value = fechaNacimiento;
    document.getElementById('editPassword').value = password; // Precargamos si existe
    document.getElementById('editEstado').checked = isActive;

    bootstrapModal.show();
}

// --- GUARDAR CAMBIOS DEL MODAL ---
document.getElementById('formEditarCliente').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;

    // Body limpio: el back resuelve el rol de cliente por nombre y la
    // empresa por token; el idRol hardcodeado ya no viaja en el body.
    const datosCliente = {
        nombres: document.getElementById('editNombres').value.trim(),
        apellidos: document.getElementById('editApellidos').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        telefono: document.getElementById('editTelefono').value.trim(),
        fechaNacimiento: document.getElementById('editFechaNacimiento').value,
        estado: document.getElementById('editEstado').checked
    };

    // Lógica de la contraseña:
    const passValue = document.getElementById('editPassword').value.trim();
    if (passValue !== "") {
        datosCliente.password = passValue;
    }

    try {
        const clienteActualizado = await api.actualizarCliente(id, datosCliente);
        const index = listaClientes.findIndex(c => (c.id || c.usuario?.id || c.idusuario) == id);

        if (index !== -1) {
            listaClientes[index] = { ...listaClientes[index], ...clienteActualizado };
        }

        bootstrapModal.hide();
        renderizarTabla(listaClientes);
        actualizarEstadisticas();

        window.showNotification('Cliente actualizado correctamente.', 'success');
    } catch (error) {
        console.error('Error al actualizar:', error);
        window.showNotification('No se pudo guardar los cambios del cliente.', 'error');
    }
});

// --- FILTROS Y EXPORTACIÓN ---
document.getElementById('filtroNombre')?.addEventListener('input', function (e) {
    const q = e.target.value.toLowerCase().trim();
    if (!q) { renderizarTabla(listaClientes); return; }

    const filtrados = listaClientes.filter(c => {
        const nombres = (c.nombres || c.usuario?.nombres || '').toLowerCase();
        const apellidos = (c.apellidos || c.usuario?.apellidos || '').toLowerCase();
        const telefono = (c.telefono || c.usuario?.telefono || '').toLowerCase();
        const email = (c.email || c.usuario?.email || '').toLowerCase();
        return `${nombres} ${apellidos}`.includes(q) || telefono.includes(q) || email.includes(q);
    });

    renderizarTabla(filtrados);
});

document.getElementById('btnExportar')?.addEventListener('click', () => {
    if (listaClientes.length === 0) {
        window.showNotification('No hay clientes para exportar.', 'warning');
        return;
    }

    const datos = listaClientes.map(c => ({
        'Nombre': `${c.nombres || c.usuario?.nombres || ''} ${c.apellidos || c.usuario?.apellidos || ''}`.trim(),
        'Teléfono': c.telefono || c.usuario?.telefono || '',
        'Email': c.email || c.usuario?.email || '',
        'Estado': (c.estado ?? c.usuario?.estado) ? 'Activo' : 'Inactivo'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);

    window.showNotification('Archivo descargado exitosamente.', 'success');
});

document.getElementById('btnNuevoCliente')?.addEventListener('click', () => {
    window.location.href = 'cliente-crear.html';
});

document.getElementById('btnNuevoClienteSidebar')?.addEventListener('click', () => {
    window.location.href = 'cliente-crear.html';
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

    generarSidebar('sidebar-container', "clientes", "clientes", perfilData.rol.nombre);
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

    // Forzamos los estilos del contenedor blanco con sombra
    const styleBox = "display: flex; align-items: center; gap: 14px; background: #ffffff; padding: 10px 14px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-decoration: none; color: inherit;";

    if (perfilData) {
        const iniciales =
            (
                (perfilData.usuario.nombres || "").substring(0, 1) +
                (perfilData.usuario.apellidos || "").substring(0, 1)
            ).toUpperCase() || "EP";

        const styleImg = "width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; text-transform: uppercase;";

        const avatarHTML = perfilData.usuario.imagenUrl
            ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" style="${styleImg}" />`
            : `<div style="${styleImg}">${iniciales}</div>`;

        const nombreCompleto =
            `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() ||
            "Usuario sin nombre";

        const rol = perfilData.rol.nombre || "Sin rol asignado";

        infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" style="${styleBox}">
          ${avatarHTML}
          <div style="display: flex; flex-direction: column;">
            <strong style="margin: 0; font-weight: 700;">${nombreCompleto}</strong>
            <span style="color: var(--gray); font-size: 14px;">${rol}</span>
          </div>
        </a>
      `;
    } else {
        infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" style="${styleBox}">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">UA</div>
          <div style="display: flex; flex-direction: column;">
            <strong style="margin: 0; font-weight: 700;">Usuario Anónimo</strong>
            <span style="color: var(--gray); font-size: 14px;">Invitado</span>
          </div>
        </a>
      `;
    }
}