import { api } from '../consumo/ApiInventario.js'; 

const $ = id => document.getElementById(id);

// Obtener el ID del insumo desde la URL (ejemplo: editarInsumo.html?id=5)
const params = new URLSearchParams(window.location.search);
const insumoId = params.get('id');

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

function showToast(titulo, mensaje, esError = false) {
    const el = $('notification');
    $('notificationTitle').textContent = titulo;
    $('notificationText').textContent = mensaje;
    const icon = $('notificationIcon');

    if (esError) {
        el.classList.add('is-error');
        icon.className = 'fa-solid fa-xmark text-danger';
    } else {
        el.classList.remove('is-error');
        icon.className = 'fa-solid fa-check text-success';
    }

    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3500);
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
        showToast('Campos incompletos', 'Revisa los campos obligatorios marcados en rojo.', true);
        return;
    }

    const btn = $('btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';

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
        idEmpresa: 1, // Asegúrate de que este ID sea dinámico si manejas múltiples empresas
        idProveedor: $('idProveedor').value ? parseInt($('idProveedor').value) : null
    };

    try {
        // Usamos el método de actualizar de tu API
        await api.actualizarInsumo(insumoId, payload);
        
        showToast('¡Actualización Exitosa!', 'El insumo fue actualizado en el inventario correctamente.');
        
        setTimeout(() => { window.location.href = 'inventario.html'; }, 1800);
    } catch (err) {
        console.error(err);
        showToast('Error al actualizar', 'Ocurrió un problema. Verifica la conexión con la base de datos.', true);
        
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
        showToast('Error', 'No se proporcionó un ID de insumo válido.', true);
        setTimeout(() => { window.location.href = 'inventario.html'; }, 2000);
        return;
    }

    try {
        // Suponiendo que en tu API Spring tienes un endpoint para obtener 1 insumo por ID
        // Si no existe, tendrías que traer todos con api.obtenerInsumos(1) y buscarlo
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
        showToast('Error', 'No se pudieron cargar los datos del insumo.', true);
    }
}

async function inicializar() {
    try {
        // Primero precargamos los datos (esto también cargará los selects con el valor seleccionado correcto)
        await precargarDatosInsumo();
    } catch (err) {
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', inicializar);