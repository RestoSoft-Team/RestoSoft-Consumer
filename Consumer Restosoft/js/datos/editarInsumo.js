import { api } from '../consumo/ApiInventario.js';
import { apiProfile } from "../consumo/apiProfile.js"; // Importación para el perfil
import { generarSidebar } from './create-sidebar.js';

const $ = id => document.getElementById(id);

// Obtener el ID del insumo desde la URL (ejemplo: editarInsumo.html?id=5)
const params = new URLSearchParams(window.location.search);
const insumoId = params.get('id');

// ══════════════════════════════════════════════════════════════
// NOTIFICACIÓN MODERNA
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
    };

    const { icon, title } = config[type] || config.success;

    // Crear el elemento de la notificación
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

// ─── HELPERS FORMATO Y UI ──────────────────────────────────────────────
function fmt(valor) {
    const n = parseFloat(valor);
    return isNaN(n) ? null : n;
}

function fmtCOP(valor) {
    const n = parseFloat(valor);
    if (isNaN(n) || valor === '') return null;
    return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

// ─── LÓGICA DE INTERFAZ ────────────────────────────────────────────────
function actualizarResumen() {
    const nombre = $('nombre').value.trim();
    const selCat = $('productoCategoria');
    const categoria = selCat ? (selCat.options[selCat.selectedIndex]?.text ?? '') : '';

    const selProv = $('idProveedor');
    const proveedor = selProv ? (selProv.options[selProv.selectedIndex]?.text ?? '') : '';

    const unidad = $('unidadMedida').value.trim();
    const stock = $('stockActual').value;
    const stockMin = $('stockMinimo').value;
    const costo = $('costoUnitario').value;
    const estado = $('estado').value;
    const vence = $('fechaVencimiento').value;

    const setVal = (elId, val, suffix = '') => {
        const el = $(elId);
        if (val) { el.textContent = val + suffix; el.classList.remove('placeholder-val'); }
        else { el.textContent = '—'; el.classList.add('placeholder-val'); }
    };

    setVal('sumNombre', nombre);
    setVal('sumCategoria', categoria !== 'Cargando categorías...' && categoria !== 'Seleccione una categoría' ? categoria : '');
    setVal('sumProveedor', proveedor !== 'Cargando proveedores...' && proveedor !== 'Seleccionar proveedor...' ? proveedor : '');
    setVal('sumUnidad', unidad);
    setVal('sumStock', stock !== '' ? stock : '', unidad ? ` ${unidad}` : ' uds');
    setVal('sumStockMin', stockMin !== '' && !isNaN(parseFloat(stockMin)) ? stockMin : '', unidad ? ` ${unidad}` : '');

    const costoFmt = fmtCOP(costo);
    setVal('sumCosto', costoFmt ? costoFmt : '');

    if (vence) {
        const d = new Date(vence + 'T00:00:00');
        $('sumVence').textContent = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
        $('sumVence').classList.remove('placeholder-val');
    } else {
        $('sumVence').textContent = '—'; $('sumVence').classList.add('placeholder-val');
    }

    const badge = $('sumEstadoBadge');
    badge.textContent = estado === 'ACTIVO' ? 'Activo' : 'Inactivo';
    badge.className = `badge-status ${estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'} mb-3`;
}

const campos = ['nombre', 'productoCategoria', 'idProveedor', 'unidadMedida', 'stockActual', 'stockMinimo', 'costoUnitario', 'estado', 'fechaVencimiento'];
campos.forEach(id => {
    const el = $(id);
    el?.addEventListener('input', actualizarResumen);
    el?.addEventListener('change', actualizarResumen);
});

// ─── VALIDACIONES ──────────────────────────────────────────────────────
function validar() {
    let ok = true;
    const obligatorios = {
        nombre: 'Ingresa el nombre del insumo.',
        productoCategoria: 'Selecciona una categoría.',
        idProveedor: 'Selecciona un proveedor.',
        unidadMedida: 'Ingresa la unidad de medida.',
        stockActual: 'Ingresa el stock inicial.',
        costoUnitario: 'Ingresa el costo unitario.'
    };

    Object.entries(obligatorios).forEach(([id, msg]) => {
        const el = $(id);
        if (!el.value.trim()) {
            el.classList.add('is-invalid');
            const fb = el.nextElementSibling;
            if (fb?.classList.contains('invalid-feedback')) fb.textContent = msg;
            ok = false;
        } else {
            el.classList.remove('is-invalid');
        }
    });
    return ok;
}

// ─── EVENTOS BOTONES ───────────────────────────────────────────────────
$('btnGuardar').addEventListener('click', async () => {
    if (!validar()) {
        window.showNotification('Revisa los campos obligatorios marcados en rojo.', 'error');
        return;
    }

    const btn = $('btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';

    // El idEmpresa NO se envía en el payload, el backend lo extrae del token JWT
    const payload = {
        nombre: $('nombre').value.trim(),
        idCategoria: $('productoCategoria').value ? parseInt($('productoCategoria').value) : null,
        unidadMedida: $('unidadMedida').value.trim(),
        stockActual: fmt($('stockActual').value),
        stockMinimo: fmt($('stockMinimo').value) ?? 0,
        costoUnitario: fmt($('costoUnitario').value),
        estado: $('estado').value,
        fechaVencimiento: $('fechaVencimiento').value || null,
        descripcion: $('descripcion').value.trim() || null,
        idProveedor: $('idProveedor').value ? parseInt($('idProveedor').value) : null
    };

    try {
        // Usamos el método de actualizar de tu API
        await api.actualizarInsumo(insumoId, payload);

        window.showNotification('El insumo fue actualizado en el inventario correctamente.', 'success');

        setTimeout(() => { window.location.href = 'inventario.html'; }, 1800);
    } catch (err) {
        console.error(err);
        window.showNotification('Ocurrió un problema. Verifica la conexión con la base de datos.', 'error');

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Actualizar Insumo';
    }
});

$('btnCancelar').addEventListener('click', () => {
    window.location.href = 'inventario.html';
});

// ─── CARGA DE DATOS INICIALES DESDE LA API ────────────────────────────
async function cargarProveedores(idSeleccionado = null) {
    const sel = $('idProveedor');
    if (!sel) return;
    try {
        const lista = await api.obtenerProveedores();
        sel.innerHTML = '<option value="">Seleccionar proveedor...</option>' +
            lista.map(p => `<option value="${p.id}" ${idSeleccionado == p.id ? 'selected' : ''}>${p.nombre}</option>`).join('');
    } catch {
        sel.innerHTML = '<option value="">Error al cargar proveedores</option>';
    }
}

async function cargarCategoriasDropdown(idSeleccionado = null) {
    const selectCategoria = document.getElementById('productoCategoria');
    if (!selectCategoria) return;

    try {
        const categorias = await api.obtenerCategorias();

        const categoriasValidadas = categorias.filter(cat => {
            if (!cat.estado) return true;
            const estadoLimpio = cat.estado.trim().toLowerCase();
            return estadoLimpio === 'activa' || estadoLimpio === 'activo' || estadoLimpio === 'disponible';
        });

        if (categoriasValidadas.length === 0) {
            selectCategoria.innerHTML = '<option value="">No hay categorías disponibles</option>';
            return;
        }

        selectCategoria.innerHTML = '<option value="">Seleccione una categoría</option>' +
            categoriasValidadas.map(cat => {
                const idReal = cat.idcategoria || cat.id;
                return `<option value="${idReal}" ${idSeleccionado == idReal ? 'selected' : ''}>${cat.nombre}</option>`;
            }).join('');

    } catch (error) {
        console.error("Error al cargar categorías en el formulario:", error);
        selectCategoria.innerHTML = '<option value="">Error al cargar categorías</option>';
    }
}

// ─── PRECARGAR DATOS DEL INSUMO A EDITAR ────────────────────────────
async function precargarDatosInsumo() {
    if (!insumoId) {
        window.showNotification('No se proporcionó un ID de insumo válido.', 'error');
        setTimeout(() => { window.location.href = 'inventario.html'; }, 2000);
        return;
    }

    try {
        const insumo = await api.obtenerInsumoPorId(insumoId);

        // Llenar los inputs básicos
        $('nombre').value = insumo.nombre || '';
        $('unidadMedida').value = insumo.unidadMedida || '';
        $('stockActual').value = insumo.stockActual ?? '';
        $('stockMinimo').value = insumo.stockMinimo ?? '';
        $('costoUnitario').value = insumo.costoUnitario ?? '';
        $('estado').value = insumo.estado || 'ACTIVO';
        $('fechaVencimiento').value = insumo.fechaVencimiento || '';
        $('descripcion').value = insumo.descripcion || '';

        // Llamar a las cargas de selects pasándoles el ID que traía el insumo para que queden seleccionados
        await cargarProveedores(insumo.idProveedor);
        await cargarCategoriasDropdown(insumo.idCategoria);

        // Actualizar la barra lateral de resumen
        actualizarResumen();

    } catch (error) {
        console.error('Error al precargar los datos:', error);
        window.showNotification('No se pudieron cargar los datos del insumo.', 'error');
    }
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

    generarSidebar('sidebar-container', "inventario", "editar_producto", perfilData.rol.nombre);


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

// ══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════
async function inicializar() {
    try {
        // Intentamos cargar el perfil (si falla, no rompe el resto de la página)
        try {
            const perfilData = await apiProfile.obtenerInfoMe();
            cargarPerfilUsuario(perfilData);
        } catch (profileError) {
            console.warn("No se pudo cargar el perfil:", profileError);
        }

        // Primero precargamos los datos (esto también cargará los selects con el valor seleccionado correcto)
        await precargarDatosInsumo();
    } catch (err) {
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', inicializar);