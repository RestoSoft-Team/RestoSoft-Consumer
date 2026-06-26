import { apiPedidoDetalle as api } from '../consumo/apiDetallePedido.js';

const ID_EMPRESA = 1;
const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    selectMesaPedido: document.getElementById('selectMesaPedido'),
    txtPedidoId: document.getElementById('txtPedidoId'),
    txtPedidoFecha: document.getElementById('txtPedidoFecha'),
    txtEstadoPedido: document.getElementById('txtEstadoPedido'),
    txtMesero: document.getElementById('txtMesero'),
    txtMesasUnidas: document.getElementById('txtMesasUnidas'),
    listaProductos: document.getElementById('listaProductosPedido'),
    statSubtotal: document.getElementById('stat-subtotal'),
    statImpuestos: document.getElementById('stat-impuestos'),
    statServicio: document.getElementById('stat-servicio'),
    statTotal: document.getElementById('stat-total'),
    btnMarcarListo: document.getElementById('btnMarcarListo'),
    // Modal
    btnAbrirModal: document.getElementById('btnAbrirModalProductos'),
    modalProductos: document.getElementById('modalProductos'),
    modalCloseBtn: document.getElementById('modalProductosCloseBtn'),
    categoriasContainer: document.getElementById('categoriasContainer'),
    platosContainer: document.getElementById('platosContainer'),
    // Notificación
    notification: document.getElementById('notification')
};

let todasLasMesas = [];
let pedidosActivos = [];
let pedidoActual = null;
let todosLosPlatos = [];
let categorias = [];
let categoriaActiva = 'todas';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDetallePage);
} else {
    initDetallePage();
}

async function initDetallePage() {
    try {
        const [mesas, pedidos, cats, platos] = await Promise.all([
            api.getMesas(ID_EMPRESA),
            api.getPedidosActivos(ID_EMPRESA),
            api.getCategorias(ID_EMPRESA),
            api.getPlatos(ID_EMPRESA)
        ]);

        todasLasMesas = mesas;
        pedidosActivos = pedidos;
        categorias = cats;
        todosLosPlatos = platos;

        // Cargar selector de mesas ocupadas
        cargarMesasOcupadas();

        // Verificar si venimos de la pantalla de mesas con un ID específico
        const idMesaSeleccionada = sessionStorage.getItem('mesaDetalleId');
        if (idMesaSeleccionada) {
            dom.selectMesaPedido.value = idMesaSeleccionada;
            sessionStorage.removeItem('mesaDetalleId'); // Limpiar
        }
        
        // Cargar pedido inicial
        cargarPedidoDeMesa();

        // Listeners
        dom.selectMesaPedido.addEventListener('change', cargarPedidoDeMesa);
        dom.btnAbrirModal.addEventListener('click', abrirModalProductos);
        dom.modalCloseBtn.addEventListener('click', () => dom.modalProductos.classList.remove('show'));
        dom.modalProductos.addEventListener('click', (e) => { if (e.target === dom.modalProductos) dom.modalProductos.classList.remove('show'); });
        dom.btnMarcarListo.addEventListener('click', () => showNotification("Pedido Actualizado", "El pedido fue marcado como listo.", "success"));
        
        dom.categoriasContainer.addEventListener('click', handleCategoriasClick);
        dom.platosContainer.addEventListener('click', handlePlatosClick);

    } catch (error) {
        console.error("Error inicial:", error);
    }
}

function cargarMesasOcupadas() {
    const mesasOcupadas = todasLasMesas.filter(m => m.estado === 'OCUPADA');
    if (mesasOcupadas.length === 0) {
        dom.selectMesaPedido.innerHTML = '<option value="">No hay mesas ocupadas</option>';
        return;
    }
    dom.selectMesaPedido.innerHTML = '<option value="">Seleccione una mesa...</option>' + 
        mesasOcupadas.map(m => `<option value="${m.id}">Mesa ${m.numeroMesa}</option>`).join('');
}

async function cargarPedidoDeMesa() {
    const idMesa = parseInt(dom.selectMesaPedido.value);
    if (!idMesa) {
        limpiarVistaPedido();
        return;
    }

    try {
        pedidoActual = await api.getPedidoActivoByMesa(idMesa);
    } catch (error) {
        pedidoActual = null;
    }

    if (!pedidoActual) {
        showNotification("Sin pedido", "Esta mesa no tiene un pedido activo registrado.", "warning");
        limpiarVistaPedido();
        return;
    }

    dom.txtPedidoId.textContent = `Pedido #RS-${pedidoActual.id}`;
    dom.txtPedidoFecha.textContent = `Orden creada el ${new Date(pedidoActual.fecha).toLocaleString('es-CO')}`;
    dom.txtEstadoPedido.innerHTML = `<i class="fa-solid fa-clock"></i> ${pedidoActual.estado}`;
    
    dom.txtMesero.textContent = pedidoActual.nombresMeseros?.join(', ') || 'Sin asignar';
    dom.txtMesasUnidas.textContent = pedidoActual.mesasUnidasInfo || 'Mesa Principal';

    const detalles = await api.getDetallesPedido(pedidoActual.id);
    renderProductosPedido(detalles);
}
function limpiarVistaPedido() {
    dom.txtPedidoId.textContent = 'Pedido #RS-0000';
    dom.txtPedidoFecha.textContent = 'Seleccione una mesa para ver el pedido';
    dom.listaProductos.innerHTML = '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay productos en este pedido.</p></div>';
    actualizarEstadisticas([]);
}

function renderProductosPedido(detalles) {
    if (detalles.length === 0) {
        dom.listaProductos.innerHTML = '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay productos en este pedido.</p></div>';
    } else {
        dom.listaProductos.innerHTML = detalles.map(item => {
            const total = item.cantidad;
            const listos = item.cantidadPreparada || 0;
            const estadoTxt = item.estado || 'PENDIENTE';
            
            const nombrePlato = item.nombrePlato || 'Producto';
            const tipoPlato = item.categoriaPlato || 'General';
            
            let estadoClass = 'state-pending';
            if (estadoTxt === 'PREPARANDO') estadoClass = 'state-preparing';
            if (estadoTxt === 'LISTO') estadoClass = 'state-ready';

            return `
                <div class="product-item">
                    <div class="product-left">
                        <div class="product-icon"><i class="fa-solid fa-burger"></i></div>
                        <div>
                            <div class="product-name">${nombrePlato}</div>
                            <div class="product-desc">
                                <span style="color: var(--primary); font-weight: 600;">${tipoPlato}</span> | 
                                Total: ${total} • Listos: <strong>${listos}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="product-right">
                        <div class="qty">Cantidad: ${total}</div>
                        <span class="item-status ${estadoClass}">${estadoTxt}</span>
                        <div class="price">${fmtCOP.format(item.precioUnitario * total)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    actualizarEstadisticas(detalles);
}

function actualizarEstadisticas(detalles) {
    const subtotal = detalles.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
    const impuestos = subtotal * 0.19;
    const servicio = subtotal * 0.10;
    const total = subtotal + impuestos + servicio;

    dom.statSubtotal.textContent = fmtCOP.format(subtotal);
    dom.statImpuestos.textContent = fmtCOP.format(impuestos);
    dom.statServicio.textContent = fmtCOP.format(servicio);
    dom.statTotal.textContent = fmtCOP.format(total);
}

// --- LÓGICA MODAL PRODUCTOS ---
function abrirModalProductos() {
    if (!pedidoActual) { showNotification("Atención", "Selecciona una mesa con pedido activo primero.", "warning"); return; }
    renderCategorias();
    renderPlatos();
    dom.modalProductos.classList.add('show');
}

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
        dom.platosContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay platos.</p></div>`;
        return;
    }

    dom.platosContainer.innerHTML = platosFiltrados.map(plato => `
        <div class="plato-card">
            <div class="plato-header">
                <div class="plato-icon"><i class="fa-solid fa-bowl-food"></i></div>
                <div class="plato-info">
                    <h5>${plato.nombre}</h5>
                    <p>${(plato.descripcion || '').substring(0, 30)}...</p>
                </div>
            </div>
            <div class="plato-precio">${fmtCOP.format(plato.precio)}</div>
            <div class="plato-actions">
                <div class="qty-selector">
                    <button class="qty-btn" data-action="minus">-</button>
                    <input type="number" class="qty-input" value="1" min="1">
                    <button class="qty-btn" data-action="plus">+</button>
                </div>
                <button class="btn-add-cart" data-id="${plato.id}" data-precio="${plato.precio}">
                    <i class="fa-solid fa-plus"></i> Agregar
                </button>
            </div>
        </div>
    `).join('');
}

async function handlePlatosClick(e) {
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
        const idPlato = parseInt(addBtn.dataset.id);
        const precio = parseFloat(addBtn.dataset.precio);

        try {
            // Guardar en backend
            await api.addDetallePedido({
                idpedido: pedidoActual.id,
                idplato: idPlato,
                cantidad: cantidad,
                precioUnitario: precio
            });

            showNotification("Producto Agregado", `Se agregaron ${cantidad} unidades al pedido #RS-${pedidoActual.id}.`, "success");
            
            // Recargar la vista del pedido para mostrar el nuevo producto
            cargarPedidoDeMesa();
        } catch (error) {
            showNotification("Error", "No se pudo agregar el producto.", "danger");
        }
    }
}

function showNotification(titulo, mensaje, tipo = 'success') {
    const notification = dom.notification;
    const iconDiv = notification.querySelector('.notification-icon');
    const strong = notification.querySelector('strong');
    const textDiv = notification.querySelector('#notifMensaje');

    notification.style.borderLeftColor = '';
    iconDiv.style.background = '';
    iconDiv.style.color = '';
    iconDiv.innerHTML = '';

    if (tipo === 'success') {
        notification.style.borderLeftColor = 'var(--success)';
        iconDiv.style.background = '#edf7f1';
        iconDiv.style.color = 'var(--success)';
        iconDiv.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
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
    setTimeout(() => notification.classList.remove('show'), 3500);
}