import { apiPedidoDetalle as api } from '../consumo/apiDetallePedido.js';

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
    btnAbrirModal: document.getElementById('btnAbrirModalProductos'),
    modalProductos: document.getElementById('modalProductos'),
    modalCloseBtn: document.getElementById('modalProductosCloseBtn'),
    categoriasContainer: document.getElementById('categoriasContainer'),
    platosContainer: document.getElementById('platosContainer'),
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
            api.getMesas(),
            api.getPedidosActivos(),
            api.getCategorias(),
            api.getPlatos()
        ]);

        todasLasMesas = mesas;
        pedidosActivos = pedidos;
        categorias = cats;
        todosLosPlatos = platos;

        // Cargar dropdown de pedidos (agrupando mesas)
        cargarPedidosDropdown();

        // Verificar si venimos de la pantalla de mesas
        const idMesaSeleccionada = sessionStorage.getItem('mesaDetalleId');
        if (idMesaSeleccionada) {
            const ped = await api.getPedidoActivoByMesa(idMesaSeleccionada);
            if (ped) dom.selectMesaPedido.value = ped.id;
            sessionStorage.removeItem('mesaDetalleId');
        }

        cargarPedidoSeleccionado();

        dom.selectMesaPedido.addEventListener('change', cargarPedidoSeleccionado);
        dom.btnAbrirModal.addEventListener('click', abrirModalProductos);
        dom.modalCloseBtn.addEventListener('click', () => dom.modalProductos.classList.remove('show'));
        dom.modalProductos.addEventListener('click', (e) => { if (e.target === dom.modalProductos) dom.modalProductos.classList.remove('show'); });
        dom.btnMarcarListo.addEventListener('click', () => showNotification("Pedido Actualizado", "El pedido fue marcado como listo.", "success"));

        dom.categoriasContainer.addEventListener('click', handleCategoriasClick);
        dom.platosContainer.addEventListener('click', handlePlatosClick);
        dom.listaProductos.addEventListener('click', handleAccordionClick); // Acordeón

        // Cronómetros en vivo
        setInterval(actualizarTiemposDOM, 1000);

    } catch (error) {
        console.error("Error inicial:", error);
    }
}

function cargarPedidosDropdown() {
    if (pedidosActivos.length === 0) {
        dom.selectMesaPedido.innerHTML = '<option value="">No hay pedidos activos</option>';
        return;
    }
    // Agrupamos las mesas unidas en una sola opción por pedido
    dom.selectMesaPedido.innerHTML = '<option value="">Seleccione un pedido...</option>' +
        pedidosActivos.map(p => {
            const mesasTxt = p.numerosMesas && p.numerosMesas.length > 0 ? p.numerosMesas.join(' + ') : 'Sin mesa';
            return `<option value="${p.id}">Pedido #${p.id} (${mesasTxt})</option>`;
        }).join('');
}

async function cargarPedidoSeleccionado() {
    const idPedido = parseInt(dom.selectMesaPedido.value);
    if (!idPedido) {
        limpiarVistaPedido();
        return;
    }

    // Buscamos el pedido en el array que ya tenemos cargado
    pedidoActual = pedidosActivos.find(p => p.id === idPedido);

    if (!pedidoActual) {
        showNotification("Sin pedido", "No se encontró el pedido.", "warning");
        limpiarVistaPedido();
        return;
    }

    dom.txtPedidoId.textContent = `Pedido #RS-${pedidoActual.id}`;
    dom.txtPedidoFecha.textContent = `Orden creada el ${new Date(pedidoActual.fecha).toLocaleString('es-CO')}`;
    dom.txtEstadoPedido.innerHTML = `<i class="fa-solid fa-clock"></i> ${pedidoActual.estado}`;
    dom.txtMesero.textContent = pedidoActual.nombresMeseros?.join(', ') || 'Sin asignar';

    if (pedidoActual.numerosMesas && pedidoActual.numerosMesas.length > 0) {
        dom.txtMesasUnidas.innerHTML = pedidoActual.numerosMesas.map(n =>
            `<span class="tag-badge mesa" style="display:inline-block; margin: 2px;">${n}</span>`
        ).join('');
    } else {
        dom.txtMesasUnidas.textContent = 'Ninguna';
    }

    const detalles = await api.getDetallesPedido(pedidoActual.id);
    renderProductosPedido(detalles);
}

function limpiarVistaPedido() {
    dom.txtPedidoId.textContent = 'Pedido #RS-0000';
    dom.txtPedidoFecha.textContent = 'Seleccione un pedido para ver el detalle';
    dom.listaProductos.innerHTML = '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay productos para mostrar.</p></div>';
    actualizarEstadisticas([]);
}

function renderProductosPedido(detalles) {
    if (!detalles || detalles.length === 0) {
        dom.listaProductos.innerHTML = '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay productos en este pedido.</p></div>';
        actualizarEstadisticas([]);
        return;
    }

    dom.listaProductos.innerHTML = detalles.map(det => {
        const unidades = det.unidades || [];
        const totalUnidades = unidades.length || det.cantidad;
        const precioTotal = det.precioUnitario * totalUnidades;
        const nombrePlato = det.nombrePlato || 'Producto';
        const tipoPlato = det.categoriaPlato || 'General';

        // Construir el HTML de las unidades (Acordeón)
        let unidadesHTML = '';
        if (unidades.length > 0) {
            unidadesHTML = `
                <div class="units-accordion">
                    ${unidades.map((u, i) => {
                        const estadoTxt = u.estado || 'PENDIENTE';
                        let estadoClass = 'state-pending';
                        if (estadoTxt === 'PREPARANDO') estadoClass = 'state-preparing';
                        if (estadoTxt === 'LISTO') estadoClass = 'state-ready';

                        const start = u.fechaInicio ? new Date(u.fechaInicio).getTime() : 0;
                        const end = u.fechaListo ? new Date(u.fechaListo).getTime() : 0;
                        let timerHTML = `<span class="unit-time-static">--:--</span>`;
                        if (start > 0) {
                            timerHTML = `<span class="unit-timer" data-start="${start}" data-end="${end}">00:00</span>`;
                        }

                        return `
                            <div class="unit-row ${estadoTxt}">
                                <div class="unit-info">
                                    <span class="unit-label">Unidad ${i + 1}</span>
                                    <span class="item-status ${estadoClass}">${estadoTxt}</span>
                                </div>
                                <div class="unit-time-box">${timerHTML}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Si hay 1 sola unidad, no mostramos el icono de desplegar
        const toggleIcon = unidades.length > 1 ? '<i class="fa-solid fa-chevron-down toggle-icon"></i>' : '';

        return `
            <div class="product-accordion-item ${unidades.length > 1 ? 'clickable' : ''}">
                <div class="product-item">
                    <div class="product-left">
                        <div class="product-icon"><i class="fa-solid fa-burger"></i></div>
                        <div>
                            <div class="product-name">
                                ${nombrePlato} 
                                ${unidades.length > 1 ? `<span class="qty-badge">x${unidades.length}</span>` : ''}
                            </div>
                            <div class="product-desc">
                                <span style="color: var(--primary); font-weight: 600;">${tipoPlato}</span>
                            </div>
                        </div>
                    </div>
                    <div class="product-right">
                        <div class="price">${fmtCOP.format(precioTotal)}</div>
                        ${toggleIcon}
                    </div>
                </div>
                ${unidadesHTML}
            </div>
        `;
    }).join('');

    actualizarEstadisticas(detalles);
    actualizarTiemposDOM();
}

function actualizarEstadisticas(detalles) {
    const subtotal = detalles.reduce((acc, item) => {
        const cant = item.unidades ? item.unidades.length : item.cantidad;
        return acc + (item.precioUnitario * cant);
    }, 0);
    
    const impuestos = subtotal * 0.19;
    const servicio = subtotal * 0.10;
    const total = subtotal + impuestos + servicio;

    dom.statSubtotal.textContent = fmtCOP.format(subtotal);
    dom.statImpuestos.textContent = fmtCOP.format(impuestos);
    dom.statServicio.textContent = fmtCOP.format(servicio);
    dom.statTotal.textContent = fmtCOP.format(total);
}

// Lógica para abrir/cerrar el acordeón al hacer clic
function handleAccordionClick(e) {
    const item = e.target.closest('.product-accordion-item');
    if (!item || !item.classList.contains('clickable')) return;

    // Evitar que se cierre si seleccionan texto
    if (e.target.closest('.btn-add-cart') || e.target.closest('button')) return;

    item.classList.toggle('active');
}

// --- LÓGICA MODAL PRODUCTOS ---
function abrirModalProductos() {
    if (!pedidoActual) { showNotification("Atención", "Selecciona un pedido activo primero.", "warning"); return; }
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
            await api.addDetallePedido({
                idpedido: pedidoActual.id,
                idplato: idPlato,
                cantidad: cantidad,
                precioUnitario: precio
            });

            showNotification("Producto Agregado", `Se agregaron ${cantidad} unidades al pedido #RS-${pedidoActual.id}.`, "success");
            
            // Recargamos los detalles del pedido
            // También actualizamos el array de pedidosActivos por si cambió el estado
            pedidosActivos = await api.getPedidosActivos(ID_EMPRESA);
            cargarPedidoSeleccionado();
        } catch (error) {
            showNotification("Error", "No se pudo agregar el producto.", "danger");
        }
    }
}

// Cronómetro en tiempo real para las unidades desplegadas
function actualizarTiemposDOM() {
    document.querySelectorAll('.unit-timer').forEach(el => {
        const start = parseInt(el.dataset.start);
        const end = parseInt(el.dataset.end);
        if (start === 0) return;

        const endTime = end !== 0 ? end : Date.now();
        const diff = Math.floor((endTime - start) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        el.textContent = `${m}:${s}`;

        if (end === 0) {
            el.className = 'unit-timer running';
        } else {
            el.className = 'unit-timer finished';
        }
    });
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