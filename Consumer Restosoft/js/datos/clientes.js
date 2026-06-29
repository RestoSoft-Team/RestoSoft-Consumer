import api from '../consumo/apiClientes.js';

let listaClientes = [];
let bootstrapModal = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const modalElement = document.getElementById('modalEditarCliente');
        bootstrapModal = new bootstrap.Modal(modalElement);

        listaClientes = await api.obtenerClientes();
        renderizarTabla(listaClientes);
        actualizarEstadisticas();

    } catch (error) {
        console.error(error);
        document.getElementById('tabla-clientes').innerHTML = `<tr><td colspan="5" class="text-center text-danger p-4">Error al cargar los datos.</td></tr>`;
        mostrarNotificacion('Error de carga', 'No se pudieron obtener los clientes del servidor.', 'error');
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

    const estadoValor = c.estado ?? c.usuario?.estado ?? false;
    const isActive = estadoValor === true || String(estadoValor).toLowerCase() === 'activo' || String(estadoValor).toLowerCase() === 'true';

    document.getElementById('editId').value = id;
    document.getElementById('editNombres').value = nombres;
    document.getElementById('editApellidos').value = apellidos;
    document.getElementById('editTelefono').value = telefono;
    document.getElementById('editEmail').value = email;
    document.getElementById('editFechaNacimiento').value = fechaNacimiento;
    document.getElementById('editEstado').checked = isActive;

    bootstrapModal.show();
}

// --- GUARDAR CAMBIOS DEL MODAL ---
document.getElementById('formEditarCliente').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;

    const datosCliente = {
        nombres: document.getElementById('editNombres').value.trim(),
        apellidos: document.getElementById('editApellidos').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        telefono: document.getElementById('editTelefono').value.trim(),
        fechaNacimiento: document.getElementById('editFechaNacimiento').value,
        estado: document.getElementById('editEstado').checked
    };

    try {
        const clienteActualizado = await api.actualizarCliente(id, datosCliente);
        const index = listaClientes.findIndex(c => (c.id || c.usuario?.id || c.idusuario) == id);

        if (index !== -1) {
            listaClientes[index] = { ...listaClientes[index], ...clienteActualizado };
        }

        bootstrapModal.hide();
        renderizarTabla(listaClientes);
        actualizarEstadisticas();

        mostrarNotificacion('¡Éxito!', 'Cliente actualizado correctamente.', 'success');
    } catch (error) {
        console.error('Error al actualizar:', error);
        mostrarNotificacion('Error al actualizar', 'No se pudo guardar los cambios del cliente.', 'error');
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
        mostrarNotificacion('Sin datos', 'No hay clientes para exportar.', 'warning');
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

    mostrarNotificacion('¡Exportado!', 'Archivo descargado exitosamente.', 'success');
});

document.getElementById('btnNuevoCliente')?.addEventListener('click', () => {
    window.location.href = 'cliente-crear.html';
});

document.getElementById('btnNuevoClienteSidebar')?.addEventListener('click', () => {
    window.location.href = 'cliente-crear.html';
});

// --- SISTEMA DE NOTIFICACIONES ---
const TOAST_ICONOS = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
};

function mostrarNotificacion(titulo, mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastId = 'toast-' + Date.now();
    const icono = TOAST_ICONOS[tipo] || TOAST_ICONOS.info;

    const html = `
        <div id="${toastId}" class="toast-item toast-${tipo}">
            <div class="toast-icon">
                <i class="fa-solid ${icono}"></i>
            </div>
            <div class="toast-body">
                <strong>${titulo}</strong>
                <span>${mensaje}</span>
            </div>
            <button class="toast-close" aria-label="Cerrar notificación">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);

    const toastEl = document.getElementById(toastId);
    toastEl.querySelector('.toast-close').addEventListener('click', () => cerrarToast(toastId));

    setTimeout(() => cerrarToast(toastId), 4000);
}

function cerrarToast(id) {
    const el = document.getElementById(id);
    if (!el || el.classList.contains('toast-out')) return;
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
}