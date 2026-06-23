
import api from '../consumo/apiCrearInsumo.js';

const $ = id => document.getElementById(id);

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

function showToast(msg, esError = false) {
    const el = $('notification');
    $('notifMsg').textContent = msg;
    el.classList.toggle('error', esError);
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

    const elNombre = $('sumNombre');
    if (nombre) { elNombre.textContent = nombre; elNombre.classList.remove('placeholder-val'); }
    else { elNombre.textContent = '—'; elNombre.classList.add('placeholder-val'); }

    const elCat = $('sumCategoria');
    if (categoria && categoria !== 'Cargando categorías...' && categoria !== 'Seleccione una categoría' && categoria !== 'Error al cargar categorías') {
        elCat.textContent = categoria;
        elCat.classList.remove('placeholder-val');
    } else { elCat.textContent = '—'; elCat.classList.add('placeholder-val'); }

    const elProv = $('sumProveedor');
    if (proveedor && proveedor !== 'Cargando proveedores...' && proveedor !== 'Seleccionar proveedor...' && proveedor !== 'Error al cargar proveedores') {
        elProv.textContent = proveedor;
        elProv.classList.remove('placeholder-val');
    } else { elProv.textContent = '—'; elProv.classList.add('placeholder-val'); }

    const elUnidad = $('sumUnidad');
    if (unidad) { elUnidad.textContent = unidad; elUnidad.classList.remove('placeholder-val'); }
    else { elUnidad.textContent = '—'; elUnidad.classList.add('placeholder-val'); }

    const elStock = $('sumStock');
    if (stock !== '') { elStock.textContent = `${stock} ${unidad || 'uds'}`; elStock.classList.remove('placeholder-val'); }
    else { elStock.textContent = '—'; elStock.classList.add('placeholder-val'); }

    const elStockMin = $('sumStockMin');
    if (stockMin !== '' && !isNaN(parseFloat(stockMin))) {
        elStockMin.textContent = unidad ? `${stockMin} ${unidad}` : stockMin;
        elStockMin.classList.remove('placeholder-val');
    } else {
        elStockMin.textContent = '—'; elStockMin.classList.add('placeholder-val');
    }

    const elCosto = $('sumCosto');
    const costoFmt = fmtCOP(costo);
    if (costoFmt) { elCosto.textContent = costoFmt; elCosto.classList.remove('placeholder-val'); }
    else { elCosto.textContent = '—'; elCosto.classList.add('placeholder-val'); }

    const elVence = $('sumVence');
    if (vence) {
        const d = new Date(vence + 'T00:00:00');
        elVence.textContent = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
        elVence.classList.remove('placeholder-val');
    } else {
        elVence.textContent = '—'; elVence.classList.add('placeholder-val');
    }

    const badge = $('sumEstadoBadge');
    badge.textContent = estado === 'ACTIVO' ? 'Activo' : 'Inactivo';
    badge.className = `badge-status ${estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'} mb-3`;
}

// Escuchar cambios en los inputs para el resumen en vivo
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
        showToast('Revisa los campos obligatorios.', true);
        return;
    }

    const btn = $('btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

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
        idEmpresa: 1,
        idProveedor: $('idProveedor').value ? parseInt($('idProveedor').value) : null
    };

    try {
        await api.crearInsumo(payload);
        showToast('Insumo registrado correctamente ✓');
        setTimeout(() => { window.location.href = 'inventario.html'; }, 1800);
    } catch (err) {
        console.error(err);
        showToast('Error al guardar el insumo. Verifica la conexión.', true);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Insumo';
    }
});

$('btnCancelar').addEventListener('click', () => {
    window.location.href = 'inventario.html';
});

// ─── CARGA DE DATOS INICIALES DESDE LA API ────────────────────────────
async function cargarProveedores() {
    const sel = $('idProveedor');
    if (!sel) return;
    try {
        const lista = await api.obtenerProveedores();
        sel.innerHTML = '<option value="">Seleccionar proveedor...</option>' +
            lista.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    } catch {
        sel.innerHTML = '<option value="">Error al cargar proveedores</option>';
    }
}

async function cargarCategoriasDropdown() {
    const selectCategoria = document.getElementById('productoCategoria');
    if (!selectCategoria) return;

    try {
        const categorias = await api.obtenerCategorias();

        // FILTRO INTELIGENTE
        const categoriasValidadas = categorias.filter(cat => {
            if (!cat.estado) return true; // Evita que se rompa si Hibernate no trae la columna estado

            const estadoLimpio = cat.estado.trim().toLowerCase();
            return estadoLimpio === 'activa' || estadoLimpio === 'activo' || estadoLimpio === 'disponible';
        });

        if (categoriasValidadas.length === 0) {
            selectCategoria.innerHTML = '<option value="">No hay categorías disponibles</option>';
            return;
        }

        // MAPEADO EXACTO
        selectCategoria.innerHTML = '<option value="">Seleccione una categoría</option>' +
            categoriasValidadas.map(cat => {
                const idReal = cat.idcategoria || cat.id;
                return `<option value="${idReal}">${cat.nombre}</option>`;
            }).join('');
    } catch (error) {
        console.error("Error al cargar categorías en el formulario:", error);
        selectCategoria.innerHTML = '<option value="">Error al cargar categorías</option>';
    }
}

async function inicializar() {
    try {
        await api.obtenerProveedores();
        
        await cargarProveedores();
        await cargarCategoriasDropdown();
    } catch (err) {
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', inicializar);