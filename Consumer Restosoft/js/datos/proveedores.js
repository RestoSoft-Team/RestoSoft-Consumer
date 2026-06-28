// /js/datos/proveedores.js

import api from '../consumo/apiProveedores.js';

// ── Estado en memoria ──────────────────────────────────────────
let listaEmpresas    = [];
let listaProveedores = [];
let idParaEliminar   = null;   // guarda el id del proveedor que se va a borrar

// ══════════════════════════════════════════════════════════════
// NOTIFICACIÓN NATIVA
// ══════════════════════════════════════════════════════════════
/**
 * @param {'success'|'error'|'delete'} tipo
 * @param {string} titulo
 * @param {string} texto
 */
function showNotification(tipo, titulo, texto, duracion = 3500) {
    const notif   = document.getElementById('notification');
    const icon    = document.getElementById('notificationIcon');
    const titleEl = document.getElementById('notificationTitle');
    const textEl  = document.getElementById('notificationText');
    if (!notif) return;

    const esError = tipo === 'error' || tipo === 'delete';
    notif.classList.toggle('is-error', esError);
    icon.className = esError ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-check';
    titleEl.textContent = titulo;
    textEl.textContent  = texto;

    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), duracion);
}

// ══════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════════════════════════
function actualizarEstadisticas() {
    const elProv = document.getElementById('stat-total-proveedores');
    const elEmp  = document.getElementById('stat-total-empresas');
    if (elProv) elProv.innerText = listaProveedores.length;
    if (elEmp)  elEmp.innerText  = listaEmpresas.length;
}

// ══════════════════════════════════════════════════════════════
// DROPDOWN DE EMPRESAS  (reutilizable para crear y editar)
// ══════════════════════════════════════════════════════════════
function poblarSelectEmpresa(selectId, idSeleccionado = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Seleccione una empresa...</option>';
    listaEmpresas.forEach(emp => {
        const opt = document.createElement('option');
        opt.value       = emp.idEmpresa || emp.id;
        opt.textContent = emp.nombreEmpresa || emp.nombre;
        if (idSeleccionado && String(opt.value) === String(idSeleccionado)) opt.selected = true;
        select.appendChild(opt);
    });
}

async function cargarDropdownEmpresas() {
    try {
        listaEmpresas = await api.obtenerEmpresas();
        poblarSelectEmpresa('select-empresa');
    } catch (error) {
        console.error('Error cargando empresas:', error);
        showNotification('error', 'Error de conexión', 'No se pudieron cargar las empresas disponibles.');
    }
}

// ══════════════════════════════════════════════════════════════
// TABLA
// ══════════════════════════════════════════════════════════════
function renderizarTabla(lista = listaProveedores) {
    const tbody = document.getElementById('tabla-proveedores');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:40px;color:var(--gray);">
                    <i class="fa-solid fa-truck-fast" style="font-size:28px;margin-bottom:10px;display:block;opacity:.3"></i>
                    No se encontraron proveedores
                </td>
            </tr>`;
        actualizarEstadisticas();
        return;
    }

    lista.forEach(prov => {
        const nombreEmpresa = prov.nombreEmpresa || 'Sin Empresa';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="supplier">
                    <div class="supplier-logo"><i class="fa-solid fa-user-tie"></i></div>
                    <div>
                        <h6>${prov.nombre}</h6>
                    </div>
                </div>
            </td>
            <td>${prov.email}</td>
            <td>${prov.telefono}</td>
            <td>${prov.direccion}</td>
            <td>
                <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
                    <i class="fa-solid fa-building me-1"></i> ${nombreEmpresa}
                </span>
            </td>
            <td style="display:flex;gap:8px;align-items:center;">
                <button class="action-btn edit"   data-id="${prov.id}" title="Editar">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="action-btn delete" data-id="${prov.id}" data-nombre="${prov.nombre}" title="Eliminar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    actualizarEstadisticas();
    attachTableEvents();
}

// Delega los clicks de editar y eliminar tras cada render
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
    if (!q) { renderizarTabla(); return; }
    const filtrados = listaProveedores.filter(p =>
        p.nombre.toLowerCase().includes(q)   ||
        p.email.toLowerCase().includes(q)    ||
        p.telefono.toLowerCase().includes(q) ||
        (p.nombreEmpresa || '').toLowerCase().includes(q)
    );
    renderizarTabla(filtrados);
});

// ══════════════════════════════════════════════════════════════
// MODAL EDITAR
// ══════════════════════════════════════════════════════════════
function abrirModalEditar(id) {
    const prov = listaProveedores.find(p => p.id === id);
    if (!prov) return;

    document.getElementById('edit-id').value       = prov.id;
    document.getElementById('edit-nombre').value   = prov.nombre;
    document.getElementById('edit-email').value    = prov.email;
    document.getElementById('edit-telefono').value = prov.telefono;
    document.getElementById('edit-direccion').value= prov.direccion;

    // Buscar el id de la empresa usando el nombre que ya tenemos
    const empresa = listaEmpresas.find(e =>
        (e.nombreEmpresa || e.nombre) === prov.nombreEmpresa
    );
    poblarSelectEmpresa('edit-empresa', empresa?.idEmpresa || empresa?.id);

    document.getElementById('editOverlay').classList.add('show');
}

function cerrarModalEditar() {
    document.getElementById('editOverlay').classList.remove('show');
    document.getElementById('form-editar').reset();
}

document.getElementById('btnCloseEdit')?.addEventListener('click', cerrarModalEditar);
document.getElementById('btnCancelEdit')?.addEventListener('click', cerrarModalEditar);

// Cerrar haciendo click fuera del modal
document.getElementById('editOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalEditar();
});

// Submit del formulario de edición
document.getElementById('form-editar')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id        = Number(document.getElementById('edit-id').value);
    const nombre    = document.getElementById('edit-nombre').value.trim();
    const email     = document.getElementById('edit-email').value.trim();
    const telefono  = document.getElementById('edit-telefono').value.trim();
    const direccion = document.getElementById('edit-direccion').value.trim();
    const valorEmpresa = document.getElementById('edit-empresa').value;

    if (!valorEmpresa) {
        showNotification('error', 'Faltan datos', 'Selecciona una empresa antes de guardar.');
        return;
    }

    const datos = { nombre, email, telefono, direccion, idEmpresa: parseInt(valorEmpresa) };

    try {
        const response = await api.actualizarProveedor(id, datos);
        if (response.ok) {
            cerrarModalEditar();
            showNotification('success', 'Proveedor actualizado', `"${nombre}" fue modificado correctamente.`);
            listaProveedores = await api.obtenerProveedores();
            renderizarTabla();
        } else {
            const msg = await response.text();
            showNotification('error', 'No se pudo actualizar', msg || 'Verifica los datos e inténtalo de nuevo.');
        }
    } catch (error) {
        console.error('Error actualizando proveedor:', error);
        showNotification('error', 'Ocurrió un problema', 'No fue posible conectar con el servidor.');
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
            showNotification('delete', 'Proveedor eliminado', `"${nombreEl}" fue removido del sistema correctamente.`);
            listaProveedores = await api.obtenerProveedores();
            renderizarTabla();
        } else {
            showNotification('error', 'No se pudo eliminar', 'Ocurrió un error al intentar eliminar el proveedor.');
        }
    } catch (error) {
        cerrarModalEliminar();
        console.error('Error eliminando proveedor:', error);
        showNotification('error', 'Ocurrió un problema', 'No fue posible conectar con el servidor.');
    }
});

// ══════════════════════════════════════════════════════════════
// EXPORTAR A EXCEL  (usa SheetJS cargado en el HTML)
// ══════════════════════════════════════════════════════════════
document.getElementById('btn-exportar')?.addEventListener('click', () => {
    if (!listaProveedores.length) {
        showNotification('error', 'Sin datos', 'No hay proveedores para exportar.');
        return;
    }

    // Construir array de objetos planos con cabeceras en español
    const datos = listaProveedores.map(p => ({
        'ID':         p.id,
        'Nombre':     p.nombre,
        'Email':      p.email,
        'Teléfono':   p.telefono,
        'Dirección':  p.direccion,
        'Empresa':    p.nombreEmpresa || 'Sin Empresa'
    }));

    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.json_to_sheet(datos);

    // Ancho mínimo de columnas
    ws['!cols'] = [
        { wch: 6 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `proveedores_${fecha}.xlsx`);

    showNotification('success', 'Excel generado', `Se exportaron ${datos.length} proveedores correctamente.`, 6000);
});

// ══════════════════════════════════════════════════════════════
// FORMULARIO CREAR
// ══════════════════════════════════════════════════════════════
document.getElementById('form-proveedor')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre      = document.getElementById('input-nombre').value.trim();
    const email       = document.getElementById('input-email').value.trim();
    const telefono    = document.getElementById('input-telefono').value.trim();
    const direccion   = document.getElementById('input-direccion').value.trim();
    const valorSelect = document.getElementById('select-empresa').value;

    if (!valorSelect) {
        showNotification('error', 'Faltan datos', 'Por favor, selecciona una empresa antes de guardar.');
        return;
    }

    const proveedorData = { nombre, email, telefono, direccion, idEmpresa: parseInt(valorSelect) };

    try {
        const response = await api.crearProveedor(proveedorData);
        if (response.ok) {
            showNotification('success', 'Proveedor registrado', `"${nombre}" fue agregado correctamente al sistema.`);
            listaProveedores = await api.obtenerProveedores();
            renderizarTabla();
            document.getElementById('form-proveedor').reset();
        } else {
            const msg = await response.text();
            showNotification('error', 'No se pudo registrar', msg || 'Verifica que los datos no estén duplicados.');
        }
    } catch (error) {
        console.error('Error guardando proveedor:', error);
        showNotification('error', 'Ocurrió un problema', 'No fue posible conectar con el servidor.');
    }
});

// ══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════
async function inicializarModulo() {
    try {
        await cargarDropdownEmpresas();
        listaProveedores = await api.obtenerProveedores();
        renderizarTabla();
    } catch (error) {
        console.error('Error al inicializar el módulo:', error);
        showNotification('error', 'Error al cargar', 'No fue posible conectar con el servidor.');
    }
}

window.limpiarFormulario = () => document.getElementById('form-proveedor')?.reset();
document.addEventListener('DOMContentLoaded', inicializarModulo);