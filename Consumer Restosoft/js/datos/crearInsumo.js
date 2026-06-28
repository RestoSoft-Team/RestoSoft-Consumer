import api from '../consumo/apiCrearInsumo.js';

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════════════════════
// SEARCHABLE SELECT - Componente reutilizable
// ══════════════════════════════════════════════════════════════
const dropdowns = {};

function crearSearchableSelect(containerId, placeholder) {
    const container = $(containerId);
    container.innerHTML = `
        <div class="ss-wrapper">
            <div class="ss-input-wrap">
                <input type="text" class="ss-input" placeholder="${placeholder}" autocomplete="off" />
                <i class="fa-solid fa-chevron-down ss-arrow"></i>
            </div>
            <div class="ss-list">
                <div class="ss-options"></div>
            </div>
        </div>
    `;

    const wrapper = container.querySelector('.ss-wrapper');
    const input = container.querySelector('.ss-input');
    const list = container.querySelector('.ss-list');
    const optionsEl = container.querySelector('.ss-options');
    const arrow = container.querySelector('.ss-arrow');

    const state = { value: '', text: '', data: {}, allOptions: [], hlIndex: -1 };
    dropdowns[containerId] = state;

    // ── Renderizar opciones filtradas ──
    function render(opts, resetHl = true) {
        if (resetHl) state.hlIndex = -1;
        if (opts.length === 0) {
            optionsEl.innerHTML = '<div class="ss-no-results"><i class="fa-solid fa-search me-2" style="opacity:.4"></i>Sin resultados</div>';
            return;
        }
        optionsEl.innerHTML = opts.map((o, i) =>
            `<div class="ss-option${o.value === state.value ? ' selected' : ''}${i === state.hlIndex ? ' hl' : ''}" data-value="${o.value}">${o.text}${o.sub ? '<div class="ss-opt-sub">' + o.sub + '</div>' : ''}</div>`
        ).join('');
    }

    // ── Abrir / cerrar ──
    function open() {
        render(state.allOptions);
        list.classList.add('open');
        arrow.classList.add('open');
    }

    function close() {
        list.classList.remove('open');
        arrow.classList.remove('open');
        state.hlIndex = -1;
        // Si no hay valor seleccionado y el usuario escribió algo, limpiar al cerrar
        if (!state.value) input.value = '';
    }

    // ── Seleccionar ──
    function selectOption(value) {
        const opt = state.allOptions.find(o => o.value === value);
        if (!opt) return;
        state.value = opt.value;
        state.text = opt.text;
        state.data = opt.data || {};
        input.value = opt.text;
        wrapper.classList.remove('is-invalid');
        close();
        container.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ── API pública del state ──
    state.setOptions = function (opts) {
        state.allOptions = opts;
        state.value = '';
        state.text = '';
        state.data = {};
        input.value = '';
        render(opts);
    };

    state.reset = function () {
        state.value = '';
        state.text = '';
        state.data = {};
        input.value = '';
        render(state.allOptions);
    };

    // ── Eventos ──
    input.addEventListener('focus', () => {
        const q = input.value.toLowerCase().trim();
        const filtered = q
            ? state.allOptions.filter(o => o.text.toLowerCase().includes(q))
            : state.allOptions;
        render(filtered);
        list.classList.add('open');
        arrow.classList.add('open');
    });

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        const filtered = q
            ? state.allOptions.filter(o => o.text.toLowerCase().includes(q))
            : state.allOptions;
        render(filtered);
        if (!list.classList.contains('open')) {
            list.classList.add('open');
            arrow.classList.add('open');
        }
        // Si el usuario está escribiendo, ya no hay selección válida
        const exactMatch = state.allOptions.find(o => o.text.toLowerCase() === q);
        if (!exactMatch) {
            state.value = '';
            state.text = '';
            state.data = {};
        }
    });

    optionsEl.addEventListener('click', (e) => {
        const opt = e.target.closest('.ss-option');
        if (opt) selectOption(opt.dataset.value);
    });

    arrow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (list.classList.contains('open')) close();
        else { input.focus(); }
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) close();
    });

    // Navegación con teclado
    input.addEventListener('keydown', (e) => {
        const visibleOpts = optionsEl.querySelectorAll('.ss-option');
        if (visibleOpts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.hlIndex = Math.min(state.hlIndex + 1, visibleOpts.length - 1);
            renderFromHl(visibleOpts);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.hlIndex = Math.max(state.hlIndex - 1, 0);
            renderFromHl(visibleOpts);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (state.hlIndex >= 0 && visibleOpts[state.hlIndex]) {
                selectOption(visibleOpts[state.hlIndex].dataset.value);
            }
        } else if (e.key === 'Escape') {
            close();
            input.blur();
        }
    });

    function renderFromHl(visibleOpts) {
        visibleOpts.forEach((o, i) => {
            o.classList.toggle('hl', i === state.hlIndex);
            if (i === state.hlIndex) o.scrollIntoView({ block: 'nearest' });
        });
    }

    return state;
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
// RESUMEN EN VIVO
// ══════════════════════════════════════════════════════════════
function actualizarResumen() {
    const nombre = $('nombre').value.trim();

    const catDd = dropdowns['productoCategoria'];
    const categoria = catDd?.text || '';

    const provDd = dropdowns['idProveedor'];
    const proveedor = provDd?.text || '';

    const unidad = $('unidadMedida').value.trim();
    const stock = $('stockActual').value;
    const stockMin = $('stockMinimo').value;
    const costo = $('costoUnitario').value;
    const estado = $('estado').value;
    const vence = $('fechaVencimiento').value;

    setSummaryField('sumNombre', nombre);
    setSummaryField('sumCategoria', categoria);
    setSummaryField('sumProveedor', proveedor);
    setSummaryField('sumUnidad', unidad);

    if (stock !== '') {
        const el = $('sumStock');
        el.textContent = `${stock} ${unidad || 'uds'}`;
        el.classList.remove('placeholder-val');
    } else {
        setSummaryField('sumStock', '');
    }

    if (stockMin !== '' && !isNaN(parseFloat(stockMin))) {
        const el = $('sumStockMin');
        el.textContent = unidad ? `${stockMin} ${unidad}` : stockMin;
        el.classList.remove('placeholder-val');
    } else {
        setSummaryField('sumStockMin', '');
    }

    const costoFmt = fmtCOP(costo);
    if (costoFmt) {
        const el = $('sumCosto');
        el.textContent = costoFmt;
        el.classList.remove('placeholder-val');
    } else {
        setSummaryField('sumCosto', '');
    }

    if (vence) {
        const d = new Date(vence + 'T00:00:00');
        const el = $('sumVence');
        el.textContent = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
        el.classList.remove('placeholder-val');
    } else {
        setSummaryField('sumVence', '');
    }

    const badge = $('sumEstadoBadge');
    badge.textContent = estado === 'ACTIVO' ? 'Activo' : 'Inactivo';
    badge.className = `badge-status ${estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'} mb-3`;
}

function setSummaryField(id, value) {
    const el = $(id);
    if (value) {
        el.textContent = value;
        el.classList.remove('placeholder-val');
    } else {
        el.textContent = '—';
        el.classList.add('placeholder-val');
    }
}

// Escuchar cambios en inputs normales (sin los dropdowns)
['nombre', 'unidadMedida', 'stockActual', 'stockMinimo', 'costoUnitario', 'estado', 'fechaVencimiento'].forEach(id => {
    const el = $(id);
    el?.addEventListener('input', actualizarResumen);
    el?.addEventListener('change', actualizarResumen);
});

// Escuchar cambios en dropdowns (se disparan al seleccionar)
['productoCategoria', 'idProveedor'].forEach(id => {
    $(id)?.addEventListener('change', actualizarResumen);
});

// ══════════════════════════════════════════════════════════════
// VALIDACIONES
// ══════════════════════════════════════════════════════════════
function validar() {
    let ok = true;

    const textos = {
        nombre: 'Ingresa el nombre del insumo.',
        unidadMedida: 'Ingresa la unidad de medida.',
        stockActual: 'Ingresa el stock inicial.',
        costoUnitario: 'Ingresa el costo unitario.'
    };

    Object.entries(textos).forEach(([id, msg]) => {
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

    // Validar dropdowns
    const dropdownValidations = {
        'productoCategoria': 'Selecciona una categoría.',
        'idProveedor': 'Selecciona un proveedor.'
    };

    Object.entries(dropdownValidations).forEach(([id, msg]) => {
        const dd = dropdowns[id];
        const wrapper = $(id)?.querySelector('.ss-wrapper');
        if (!dd || !dd.value) {
            wrapper?.classList.add('is-invalid');
            ok = false;
        } else {
            wrapper?.classList.remove('is-invalid');
        }
    });

    return ok;
}

// ══════════════════════════════════════════════════════════════
// GUARDAR
// ══════════════════════════════════════════════════════════════
 $('btnGuardar').addEventListener('click', async () => {
    if (!validar()) {
        showToast('Campos incompletos', 'Revisa los campos obligatorios marcados en rojo.', true);
        return;
    }

    const btn = $('btnGuardar');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

    const catDd = dropdowns['productoCategoria'];
    const provDd = dropdowns['idProveedor'];

    const payload = {
        nombre: $('nombre').value.trim(),
        idCategoria: catDd.value ? parseInt(catDd.value) : null,
        unidadMedida: $('unidadMedida').value.trim(),
        stockActual: fmt($('stockActual').value),
        stockMinimo: fmt($('stockMinimo').value) ?? 0,
        costoUnitario: fmt($('costoUnitario').value),
        estado: $('estado').value,
        fechaVencimiento: $('fechaVencimiento').value || null,
        descripcion: $('descripcion').value.trim() || null,
        idEmpresa: provDd.data?.idEmpresa ? parseInt(provDd.data.idEmpresa) : null,
        idProveedor: provDd.value ? parseInt(provDd.value) : null
    };

    try {
        await api.crearInsumo(payload);
        showToast('¡Guardado Exitoso!', 'El insumo fue registrado en el inventario correctamente.');
        setTimeout(() => { window.location.href = 'inventario.html'; }, 1800);
    } catch (err) {
        console.error(err);
        showToast('Error al guardar', 'Ocurrió un problema. Verifica la conexión con la base de datos.', true);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Insumo';
    }
});

 $('btnCancelar').addEventListener('click', () => {
    window.location.href = 'inventario.html';
});

// ══════════════════════════════════════════════════════════════
// CARGA DE DATOS
// ══════════════════════════════════════════════════════════════
async function cargarProveedores() {
    const dd = dropdowns['idProveedor'];
    if (!dd) return;
    try {
        const lista = await api.obtenerProveedores();
        dd.setOptions(lista.map(p => ({
            value: String(p.id),
            text: p.nombre,
            sub: p.email || '',
            data: { idEmpresa: p.idEmpresa }
        })));
    } catch {
        dd.setOptions([]);
    }
}

async function cargarCategoriasDropdown() {
    const dd = dropdowns['productoCategoria'];
    if (!dd) return;

    try {
        const categorias = await api.obtenerCategorias();

        const validadas = categorias.filter(cat => {
            if (!cat.estado) return true;
            const e = cat.estado.trim().toLowerCase();
            return e === 'activa' || e === 'activo' || e === 'disponible';
        });

        if (validadas.length === 0) {
            dd.setOptions([]);
            return;
        }

        dd.setOptions(validadas.map(cat => ({
            value: String(cat.idcategoria || cat.id),
            text: cat.nombre,
            data: {}
        })));
    } catch (error) {
        console.error("Error al cargar categorías:", error);
        dd.setOptions([]);
    }
}

// ══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════
async function inicializar() {
    // Crear los dropdowns de búsqueda
    crearSearchableSelect('productoCategoria', 'Buscar categoría...');
    crearSearchableSelect('idProveedor', 'Buscar proveedor...');

    // Cargar datos desde la API
    await Promise.allSettled([cargarProveedores(), cargarCategoriasDropdown()]);
}

window.addEventListener('DOMContentLoaded', inicializar);