import { apiPedido } from '../consumo/apiCrearPedido.js';
import { obtenerIdUsuarioDeToken } from '../consumo/auth.js';

const ID_USUARIO_LOGUEADO = obtenerIdUsuarioDeToken(); 
const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    selectZona: document.getElementById('selectZona'),
    selectMesa: document.getElementById('selectMesa'),
    txtObservaciones: document.getElementById('txtObservaciones'),
    btnConfirmar: document.getElementById('btnConfirmarPedido'),
    notification: document.getElementById('notification'),
    statSubtotal: document.getElementById('stat-subtotal'),
    statImpuestos: document.getElementById('stat-impuestos'),
    statServicio: document.getElementById('stat-servicio'),
    statTotal: document.getElementById('stat-total'),
    btnAbrirModal: document.getElementById('btnAbrirModalProductos'),
    listaProductos: document.getElementById('listaProductosPedido'),
    // Modales Productos
    modalProductos: document.getElementById('modalProductos'),
    modalCloseBtn: document.getElementById('modalProductosCloseBtn'),
    categoriasContainer: document.getElementById('categoriasContainer'),
    platosContainer: document.getElementById('platosContainer'),
    // Mesas y Meseros
    btnUnirMesa: document.getElementById('btnUnirMesa'),
    tagsMesasUnidas: document.getElementById('tagsMesasUnidas'),
    btnAgregarMesero: document.getElementById('btnAgregarMesero'),
    tagsMeseros: document.getElementById('tagsMeseros'),
    // Modal Unir
    modalUnir: document.getElementById('modalUnirMesas'),
    modalUnirCloseBtn: document.getElementById('modalUnirCloseBtn'),
    listaMesasUnir: document.getElementById('listaMesasUnir'),
    btnConfirmarUnion: document.getElementById('btnConfirmarUnion'),
    // Modal Meseros
    modalMeseros: document.getElementById('modalMeseros'),
    modalMeserosCloseBtn: document.getElementById('modalMeserosCloseBtn'),
    listaMeserosAsignar: document.getElementById('listaMeserosAsignar'),
    btnConfirmarMeseros: document.getElementById('btnConfirmarMeseros')
};

let todasLasMesas = [];
let todasLasZonas = [];
let todosLosPlatos = [];
let categorias = [];
let todosLosUsuarios = [];

let categoriaActiva = 'todas';
let carrito = []; 
let mesasUnidas = []; 
let meserosSeleccionados = [ID_USUARIO_LOGUEADO]; 
let notifTimeout = null; // Para controlar el tiempo de la notificación

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPedidoPage);
} else {
    initPedidoPage();
}

async function initPedidoPage() {
      try {
        const [zonas, mesas, mesaAbierta, cats, platos, usuarios] = await Promise.all([
            apiPedido.getZonas(),
            apiPedido.getMesas(),
            apiPedido.getMesaAbierta(), 
            apiPedido.getCategorias(),
            apiPedido.getPlatos(),
            apiPedido.getUsuarios()
        ]);
        
        todasLasMesas = mesas;
        todasLasZonas = zonas;
        categorias = cats;
        todosLosPlatos = platos;
        todosLosUsuarios = usuarios;

        cargarZonas();
        if (mesaAbierta) seleccionarMesaAutomaticamente(mesaAbierta);
        dom.selectZona.addEventListener('change', () => filtrarMesasPorZona());

        renderCategorias();
        renderPlatos();
        actualizarEstadisticas();
        renderTagsMeseros();

        // Listeners Modales
        dom.btnAbrirModal.addEventListener('click', () => dom.modalProductos.classList.add('show'));
        dom.modalCloseBtn.addEventListener('click', () => dom.modalProductos.classList.remove('show'));
        dom.modalProductos.addEventListener('click', (e) => { if (e.target === dom.modalProductos) dom.modalProductos.classList.remove('show'); });

        dom.btnUnirMesa.addEventListener('click', abrirModalUnirMesas);
        dom.modalUnirCloseBtn.addEventListener('click', () => dom.modalUnir.classList.remove('show'));
        dom.modalUnir.addEventListener('click', (e) => { if (e.target === dom.modalUnir) dom.modalUnir.classList.remove('show'); });
        dom.btnConfirmarUnion.addEventListener('click', confirmarUnionMesas);

        dom.btnAgregarMesero.addEventListener('click', abrirModalMeseros);
        dom.modalMeserosCloseBtn.addEventListener('click', () => dom.modalMeseros.classList.remove('show'));
        dom.modalMeseros.addEventListener('click', (e) => { if (e.target === dom.modalMeseros) dom.modalMeseros.classList.remove('show'); });
        dom.btnConfirmarMeseros.addEventListener('click', confirmarAsignacionMeseros);

        dom.platosContainer.addEventListener('click', handlePlatosClick);
        dom.listaProductos.addEventListener('click', handleCarritoClick);
        dom.categoriasContainer.addEventListener('click', handleCategoriasClick);

        dom.btnConfirmar.addEventListener('click', confirmarPedido);

    } catch (error) {
        console.error("Error inicial:", error);
        showNotification("Error de conexión", "No se pudieron cargar los datos del restaurante.", "danger");
    }
}

// --- LÓGICA MESAS PRINCIPAL ---
function cargarZonas() {
    dom.selectZona.innerHTML = '<option value="">Seleccione una Zona...</option>';
    todasLasZonas.forEach(zona => {
        dom.selectZona.innerHTML += `<option value="${zona.id}">${zona.nombreZona}</option>`;
    });
}

function seleccionarMesaAutomaticamente(mesa) {
    dom.selectZona.value = mesa.idZona;
    filtrarMesasPorZona(mesa.id);
}

function filtrarMesasPorZona(idMesaPreseleccionada = null) {
    const idZona = parseInt(dom.selectZona.value);
    if (!idZona) { dom.selectMesa.innerHTML = '<option value="">Primero seleccione zona</option>'; return; }

    const mesasDisponibles = todasLasMesas.filter(m => 
        m.idZona === idZona && (m.estado === 'LIBRE' || m.id === idMesaPreseleccionada)
    );

    dom.selectMesa.innerHTML = '<option value="">Seleccione Mesa...</option>' + 
        mesasDisponibles.map(m => `<option value="${m.id}" ${m.id === idMesaPreseleccionada ? 'selected' : ''}>Mesa ${m.numeroMesa}</option>`).join('');
}

// --- LÓGICA UNIR MESAS ---
function abrirModalUnirMesas() {
    const idMesaPrincipal = parseInt(dom.selectMesa.value);
    if (!idMesaPrincipal) { 
        showNotification("Atención", "Primero selecciona una mesa principal.", "warning"); 
        return; 
    }

    dom.listaMesasUnir.innerHTML = '';
    const mesasDisponibles = todasLasMesas.filter(m => m.estado === 'LIBRE' && m.id !== idMesaPrincipal);

    if (mesasDisponibles.length === 0) {
        dom.listaMesasUnir.innerHTML = '<p class="empty-state">No hay otras mesas disponibles.</p>';
    } else {
        mesasDisponibles.forEach(m => {
            const isSelected = mesasUnidas.includes(m.id);
            dom.listaMesasUnir.innerHTML += `
                <div class="lista-item ${isSelected ? 'selected' : ''}" data-id="${m.id}">
                    <div>
                        <div class="info">Mesa ${m.numeroMesa}</div>
                        <div class="sub-info">Zona: ${todasLasZonas.find(z => z.id === m.idZona)?.nombreZona || 'N/A'}</div>
                    </div>
                    <i class="fa-solid fa-check check-icon"></i>
                </div>
            `;
        });

        dom.listaMesasUnir.querySelectorAll('.lista-item').forEach(item => {
            item.addEventListener('click', () => item.classList.toggle('selected'));
        });
    }
    dom.modalUnir.classList.add('show');
}

function confirmarUnionMesas() {
    const seleccionadas = dom.listaMesasUnir.querySelectorAll('.lista-item.selected');
    mesasUnidas = Array.from(seleccionadas).map(el => parseInt(el.dataset.id));
    renderTagsMesasUnidas();
    dom.modalUnir.classList.remove('show');
}

function renderTagsMesasUnidas() {
    if (mesasUnidas.length === 0) {
        dom.tagsMesasUnidas.innerHTML = '<span class="empty-tags">No hay mesas unidas</span>';
        return;
    }
    dom.tagsMesasUnidas.innerHTML = mesasUnidas.map(id => {
        const m = todasLasMesas.find(x => x.id === id);
        return m ? `<div class="tag-badge mesa">Mesa ${m.numeroMesa} <i class="fa-solid fa-times remove-tag" data-id="${id}"></i></div>` : '';
    }).join('');
    
    dom.tagsMesasUnidas.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            mesasUnidas = mesasUnidas.filter(m => m !== id);
            renderTagsMesasUnidas();
        });
    });
}

// --- LÓGICA AGREGAR MESERO ---
function abrirModalMeseros() {
    dom.listaMeserosAsignar.innerHTML = '';
    if (todosLosUsuarios.length === 0) {
        dom.listaMeserosAsignar.innerHTML = '<p class="empty-state">No hay usuarios registrados.</p>';
    } else {
        todosLosUsuarios.forEach(u => {
            const isSelected = meserosSeleccionados.includes(u.id);
            dom.listaMeserosAsignar.innerHTML += `
                <div class="lista-item ${isSelected ? 'selected' : ''}" data-id="${u.id}">
                    <div>
                        <div class="info">${u.nombres} ${u.apellidos}</div>
                        <div class="sub-info">${u.rol?.nombre || 'Empleado'}</div>
                    </div>
                    <i class="fa-solid fa-check check-icon"></i>
                </div>
            `;
        });

        dom.listaMeserosAsignar.querySelectorAll('.lista-item').forEach(item => {
            item.addEventListener('click', () => item.classList.toggle('selected'));
        });
    }
    dom.modalMeseros.classList.add('show');
}

function confirmarAsignacionMeseros() {
    const seleccionados = dom.listaMeserosAsignar.querySelectorAll('.lista-item.selected');
    meserosSeleccionados = Array.from(seleccionados).map(el => parseInt(el.dataset.id));
    
    if (!meserosSeleccionados.includes(ID_USUARIO_LOGUEADO)) {
        meserosSeleccionados.push(ID_USUARIO_LOGUEADO);
    }
    renderTagsMeseros();
    dom.modalMeseros.classList.remove('show');
}

function renderTagsMeseros() {
    if (meserosSeleccionados.length === 0) {
        dom.tagsMeseros.innerHTML = '<span class="empty-tags">Asigna los meseros...</span>';
        return;
    }
    dom.tagsMeseros.innerHTML = meserosSeleccionados.map(id => {
        const u = todosLosUsuarios.find(x => x.id === id);
        if (!u && id === ID_USUARIO_LOGUEADO) return `<div class="tag-badge mesero">Daniel Mora (Tú) <i class="fa-solid fa-lock remove-tag" style="cursor:not-allowed; opacity:0.3;"></i></div>`;
        return u ? `<div class="tag-badge mesero">${u.nombres} ${u.apellidos} <i class="fa-solid fa-times remove-tag" data-id="${id}"></i></div>` : '';
    }).join('');
    
    dom.tagsMeseros.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (id !== ID_USUARIO_LOGUEADO) {
                meserosSeleccionados = meserosSeleccionados.filter(m => m !== id);
                renderTagsMeseros();
            }
        });
    });
}

// --- LÓGICA MODAL PRODUCTOS ---
function renderCategorias() {
    dom.categoriasContainer.innerHTML = `<button class="categoria-pill active" data-cat="todas">Todos</button>`;
    categorias.forEach(cat => {
        dom.categoriasContainer.innerHTML += `<button class="categoria-pill" data-cat="${cat.id}">${cat.nombre}</button>`;
    });
}

function handleCategoriasClick(e) {
    const btn = e.target.closest('.categoria-pill');
    if (!btn) return;
    dom.categoriasContainer.querySelector('.active')?.classList.remove('active');
    btn.classList.add('active');
    categoriaActiva = btn.dataset.cat;
    renderPlatos();
}

function renderPlatos() {
    let platosFiltrados = todosLosPlatos;
    if (categoriaActiva !== 'todas') {
        platosFiltrados = todosLosPlatos.filter(p => {
            let catId = p.idcategoria?.id ?? p.idcategoria ?? p.categoria?.id;
            return String(catId) === String(categoriaActiva);
        });
    }

    if (platosFiltrados.length === 0) {
        dom.platosContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay platos en esta categoría.</p></div>`;
        return;
    }

    dom.platosContainer.innerHTML = platosFiltrados.map(plato => `
        <div class="plato-card">
            <div class="plato-header">
                <div class="plato-icon"><i class="fa-solid fa-bowl-food"></i></div>
                <div class="plato-info">
                    <h5>${plato.nombre}</h5>
                    <p>${(plato.descripcion || '').substring(0, 40)}...</p>
                </div>
            </div>
            <div class="plato-precio">${fmtCOP.format(plato.precio)}</div>
            <div class="plato-actions">
                <div class="qty-selector">
                    <button class="qty-btn" data-action="minus">-</button>
                    <input type="number" class="qty-input" value="1" min="1">
                    <button class="qty-btn" data-action="plus">+</button>
                </div>
                <button class="btn-add-cart" data-id="${plato.id}" data-nombre="${plato.nombre}" data-precio="${plato.precio}">
                    <i class="fa-solid fa-plus"></i> Agregar
                </button>
            </div>
        </div>
    `).join('');
}

function handlePlatosClick(e) {
    const qtyBtn = e.target.closest('.qty-btn');
    const addBtn = e.target.closest('.btn-add-cart');

    if (qtyBtn) {
        const input = qtyBtn.parentElement.querySelector('.qty-input');
        let val = parseInt(input.value);
        if (qtyBtn.dataset.action === 'minus' && val > 1) input.value = val - 1;
        if (qtyBtn.dataset.action === 'plus') input.value = val + 1;
    }

    if (addBtn) {
        const input = addBtn.parentElement.querySelector('.qty-input');
        const cantidad = parseInt(input.value);
        agregarAlCarrito(addBtn.dataset.id, addBtn.dataset.nombre, parseFloat(addBtn.dataset.precio), cantidad);
        
        const originalHTML = addBtn.innerHTML;
        addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Agregado';
        addBtn.style.background = 'var(--success)';
        setTimeout(() => { addBtn.innerHTML = originalHTML; addBtn.style.background = ''; }, 800);
    }
}

// --- LÓGICA CARRITO Y ESTADÍSTICAS ---
function agregarAlCarrito(id, nombre, precio, cantidad) {
    const existente = carrito.find(item => item.id === id);
    if (existente) existente.cantidad += cantidad;
    else carrito.push({ id, nombre, precio, cantidad });
    renderCarrito();
}

function handleCarritoClick(e) {
    const delBtn = e.target.closest('.btn-eliminar-carrito');
    if (delBtn) {
        const itemDiv = delBtn.closest('.product-item');
        itemDiv.classList.add('removing');
        setTimeout(() => {
            carrito = carrito.filter(item => item.id !== delBtn.dataset.id);
            renderCarrito();
        }, 300);
    }
}

function renderCarrito() {
    if (carrito.length === 0) {
        dom.listaProductos.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fa-solid fa-cart-shopping"></i><p>No hay productos. Haz clic en "Agregar Producto".</p></div>';
    } else {
        dom.listaProductos.innerHTML = carrito.map(item => {
            const subtotal = item.precio * item.cantidad;
            return `
                <div class="product-item" data-id="${item.id}">
                    <div class="product-info">
                        <div class="product-icon"><i class="fa-solid fa-burger"></i></div>
                        <div>
                            <h5>${item.nombre}</h5>
                            <span>Cant: ${item.cantidad} x ${fmtCOP.format(item.precio)}</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <strong>${fmtCOP.format(subtotal)}</strong>
                        <button class="btn-outline-custom btn-eliminar-carrito" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }
    actualizarEstadisticas();
}

function actualizarEstadisticas() {
    const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const impuestos = subtotal * 0.19;
    const servicio = subtotal * 0.10;
    const total = subtotal + impuestos + servicio;

    dom.statSubtotal.textContent = fmtCOP.format(subtotal);
    dom.statImpuestos.textContent = fmtCOP.format(impuestos);
    dom.statServicio.textContent = fmtCOP.format(servicio);
    dom.statTotal.textContent = fmtCOP.format(total);
}

// --- CONFIRMAR PEDIDO ---
async function confirmarPedido() {
    const idMesaPrincipal = parseInt(dom.selectMesa.value);
    if (!idMesaPrincipal) { 
        showNotification("Falta información", "Por favor selecciona una mesa principal.", "warning"); 
        return; 
    }
    if (carrito.length === 0) { 
        showNotification("Carrito vacío", "Agrega al menos un producto al pedido.", "warning"); 
        return; 
    }

    const idMesas = [idMesaPrincipal, ...mesasUnidas];

    const pedidoData = {
        observaciones: dom.txtObservaciones.value || "Sin observaciones",
        idMesas: idMesas,
        idUsuarios: meserosSeleccionados,
        estado: "PENDIENTE",
        fecha: new Date().toISOString(),
        detalles: carrito.map(item => ({
            idplato: parseInt(item.id),
            cantidad: item.cantidad,
            precioUnitario: item.precio
        }))
    };

    try {
         await apiPedido.createPedido(pedidoData);
        await apiPedido.cerrarMesa(); 
        
        showNotification("Pedido creado", "El pedido fue enviado correctamente a cocina.", "success");
        setTimeout(() => window.location.href = "mesas.html", 2000);
        
    } catch (error) {
        showNotification("Error al crear", error.message || "Ocurrió un error desconocido.", "danger");
        setTimeout(() => window.location.reload(), 4000);
    }
}

// =========================================
// FUNCIÓN GLOBAL DE NOTIFICACIONES PREMIUM
// =========================================
function showNotification(titulo, mensaje, tipo = 'success') {
    const notification = dom.notification;
    const iconDiv = notification.querySelector('.notification-icon');
    const strong = notification.querySelector('strong');
    const textDiv = notification.querySelector('.notification-content > div:last-child > div:last-child');

    // Limpiar clases y estilos anteriores
    notification.style.borderLeftColor = '';
    iconDiv.style.background = '';
    iconDiv.style.color = '';
    iconDiv.innerHTML = '';

    // Aplicar estilos según el tipo de error/mensaje
    if (tipo === 'success') {
        notification.style.borderLeftColor = 'var(--success)';
        iconDiv.style.background = '#edf7f1';
        iconDiv.style.color = 'var(--success)';
        iconDiv.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (tipo === 'danger') {
        notification.style.borderLeftColor = 'var(--danger)';
        iconDiv.style.background = '#fde8e8';
        iconDiv.style.color = 'var(--danger)';
        iconDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else if (tipo === 'warning') {
        notification.style.borderLeftColor = 'var(--warning)';
        iconDiv.style.background = '#fdf3e2';
        iconDiv.style.color = 'var(--warning)';
        iconDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
    }

    strong.textContent = titulo;
    textDiv.textContent = mensaje;

    notification.classList.add('show');
    
    // Limpiar timeout anterior si existe para evitar que se cierre antes de tiempo
    if (notifTimeout) clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => notification.classList.remove('show'), 3500);
}