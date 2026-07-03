import { apiPedidoDetalle as api } from '../consumo/apiDetallePedido.js';
import { connectWebSocket } from '../consumo/websocket.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

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
    btnEnviarTicket: document.getElementById('btnEnviarTicket'),
    btnAbrirModal: document.getElementById('btnAbrirModalProductos'),
    modalProductos: document.getElementById('modalProductos'),
    modalCloseBtn: document.getElementById('modalProductosCloseBtn'),
    categoriasContainer: document.getElementById('categoriasContainer'),
    platosContainer: document.getElementById('platosContainer'),
    // Cancelación
    btnCancelarPedido: document.getElementById('btnCancelarPedido'),
    modalCancelar: document.getElementById('modalCancelar'),
    motivoCancelacion: document.getElementById('motivoCancelacion'),
    errorMotivo: document.getElementById('errorMotivo'),
    btnCerrarModalCancelar: document.getElementById('btnCerrarModalCancelar'),
    btnConfirmarCancelacion: document.getElementById('btnConfirmarCancelacion')
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
    cargarPerfilUsuario();
    setupCancelarPedidoListeners();

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

        cargarPedidosDropdown();

        const vieneDePedidos = sessionStorage.getItem('vieneDePedidos') === 'true';
        const vieneDeMesas = sessionStorage.getItem('vieneDeMesas') === 'true';

        if (vieneDePedidos) {
            sessionStorage.removeItem('vieneDePedidos');
            const idPedidoActivo = await api.getPedidoActivo();
            if (idPedidoActivo) dom.selectMesaPedido.value = idPedidoActivo;
            await api.cerrarPedidoActivo();
        }
        else if (vieneDeMesas) {
            sessionStorage.removeItem('vieneDeMesas');
            const mesaAbierta = await api.getMesaAbierta();
            if (mesaAbierta) {
                const ped = await api.getPedidoActivoByMesa(mesaAbierta.id);
                if (ped) dom.selectMesaPedido.value = ped.id;
            }
            await api.cerrarMesa();
        }
        else {
            await api.cerrarMesa();
            await api.cerrarPedidoActivo();
        }

        cargarPedidoSeleccionado();

        dom.selectMesaPedido.addEventListener('change', cargarPedidoSeleccionado);
        dom.btnAbrirModal.addEventListener('click', abrirModalProductos);
        dom.modalCloseBtn.addEventListener('click', () => dom.modalProductos.classList.remove('show'));
        dom.modalProductos.addEventListener('click', (e) => { if (e.target === dom.modalProductos) dom.modalProductos.classList.remove('show'); });

        dom.btnMarcarListo.innerHTML = '<i class="fa-solid fa-cash-register"></i> Ir a Pagar';
        dom.btnMarcarListo.addEventListener('click', async () => {
            if (!pedidoActual) return;

            await api.setPedidoActivo(pedidoActual.id);
            sessionStorage.setItem('vieneDePedidoDetalle', 'true');
            window.location.href = 'pagos.html';
        });

        dom.btnEnviarTicket.addEventListener('click', async () => {
            if (!pedidoActual) return;

            if (!pedidoActual.emailCliente || pedidoActual.emailCliente.trim() === '') {
                showNotification("Sin Correo", "Este pedido no tiene un correo de cliente registrado para enviar el ticket.", "warning", "fa-circle-exclamation");
                return;
            }

            dom.btnEnviarTicket.disabled = true;
            dom.btnEnviarTicket.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

            try {
                await api.enviarTicketCorreo(pedidoActual.id);
                showNotification("Ticket Enviado", `El ticket fue enviado correctamente a ${pedidoActual.emailCliente}.`, "success", "fa-paper-plane");
            } catch (error) {
                showNotification("Error", error.message || "No se pudo enviar el ticket.", "error", "fa-triangle-exclamation");
            } finally {
                dom.btnEnviarTicket.disabled = false;
                dom.btnEnviarTicket.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Ticket por Correo';
            }
        });

        dom.categoriasContainer.addEventListener('click', handleCategoriasClick);
        dom.platosContainer.addEventListener('click', handlePlatosClick);
        dom.listaProductos.addEventListener('click', handleAccordionClick);

        setInterval(actualizarTiemposDOM, 1000);

        connectWebSocket((canal, data) => {
            if (canal === 'COCINA' && data.idPedido && pedidoActual && parseInt(data.idPedido) === pedidoActual.id) {
                if (data.tipo === 'PRODUCTO_AGREGADO' || data.tipo === 'ESTADO_ACTUALIZADO') {
                    setTimeout(() => { cargarPedidoSeleccionado(); }, 300);
                }
            }
        });

    } catch (error) {
        console.error("Error inicial:", error);
    }
}

function setupCancelarPedidoListeners() {
    if (dom.btnCancelarPedido) {
        dom.btnCancelarPedido.addEventListener('click', () => {
            if (!pedidoActual) return;
            dom.motivoCancelacion.value = '';
            dom.errorMotivo.style.display = 'none';
            dom.modalCancelar.style.display = 'flex';
        });
    }

    if (dom.btnCerrarModalCancelar) {
        dom.btnCerrarModalCancelar.addEventListener('click', () => {
            dom.modalCancelar.style.display = 'none';
        });
    }

    if (dom.btnConfirmarCancelacion) {
        dom.btnConfirmarCancelacion.addEventListener('click', async () => {
            const motivo = dom.motivoCancelacion.value.trim();

            if (!motivo) {
                dom.errorMotivo.style.display = 'block';
                return;
            }

            dom.btnConfirmarCancelacion.disabled = true;
            dom.btnConfirmarCancelacion.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelando...';

            try {
                await api.cancelarPedido(pedidoActual.id, motivo);
                
                dom.modalCancelar.style.display = 'none';
                showNotification("Pedido Cancelado", "El pedido fue cancelado y las mesas liberadas correctamente.", "success", "fa-circle-check");
                
                setTimeout(() => {
                    window.location.href = 'pedidos.html';
                }, 2000);

            } catch (error) {
                showNotification("Error", error.message || "No se pudo cancelar el pedido.", "error", "fa-triangle-exclamation");
                dom.btnConfirmarCancelacion.disabled = false;
                dom.btnConfirmarCancelacion.innerHTML = '<i class="fa-solid fa-ban"></i> Confirmar Cancelación';
            }
        });
    }
}

function cargarPedidosDropdown() {
    if (pedidosActivos.length === 0) {
        dom.selectMesaPedido.innerHTML = '<option value="">No hay pedidos activos</option>';
        return;
    }
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

    pedidosActivos = await api.getPedidosActivos();
    pedidoActual = pedidosActivos.find(p => p.id === idPedido);

    if (!pedidoActual) {
        showNotification("Sin pedido", "No se encontró el pedido.", "warning", "fa-circle-exclamation");
        limpiarVistaPedido();
        return;
    }

    dom.txtPedidoId.textContent = `Pedido #RS-${pedidoActual.id}`;
    dom.txtPedidoFecha.textContent = `Orden creada el ${new Date(pedidoActual.fecha).toLocaleString('es-CO')}`;
    dom.txtEstadoPedido.innerHTML = `<i class="fa-solid fa-clock"></i> ${pedidoActual.estado}`;
    dom.txtMesero.textContent = pedidoActual.nombresMeseros?.join(', ') || 'Sin asignar';

    if (dom.btnCancelarPedido) {
        if (pedidoActual.estado !== 'PAGADO' && pedidoActual.estado !== 'CANCELADO') {
            dom.btnCancelarPedido.style.display = 'inline-flex';
        } else {
            dom.btnCancelarPedido.style.display = 'none';
        }
    }

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
    if (dom.btnCancelarPedido) dom.btnCancelarPedido.style.display = 'none';
}

function renderProductosPedido(detalles) {
    if (!detalles || detalles.length === 0) {
        dom.listaProductos.innerHTML = '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>No hay productos en este pedido.</p></div>';
        actualizarEstadisticas([]);
        return;
    }

    const pedidoEnProgreso = (pedidoActual.estado === 'PREPARANDO' || pedidoActual.estado === 'LISTO');

    dom.listaProductos.innerHTML = detalles.map(det => {
        const unidades = det.unidades || [];
        const totalUnidades = unidades.length || det.cantidad;
        const precioTotal = det.precioUnitario * totalUnidades;
        const nombrePlato = det.nombrePlato || 'Producto';
        const tipoPlato = det.categoriaPlato || 'General';

        // 👇 BUSCAMOS LA IMAGEN DEL PLATO EN TODOSLOSPLATOS 👇
        const platoInfo = todosLosPlatos.find(p => p.id === det.idPlato);
        const imagenUrl = platoInfo?.imagenUrl;
        const imageHtml = imagenUrl && !imagenUrl.includes('default-plate.png')
            ? `<img src="${imagenUrl}" alt="${nombrePlato}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 18px;">`
            : `<i class="fa-solid fa-burger"></i>`;

        let unidadesHTML = '';
        if (unidades.length > 0) {
            unidadesHTML = `<div class="units-accordion">`;
            unidades.forEach((u, i) => {
                const estadoTxt = u.estado || 'PENDIENTE';
                let estadoClass = 'state-pending';
                let estadoTextoBonito = 'Pendiente';
                let badgeNuevo = '';

                if (estadoTxt === 'PREPARANDO') {
                    estadoClass = 'state-preparing';
                    estadoTextoBonito = 'En Cocina';
                } else if (estadoTxt === 'LISTO') {
                    estadoClass = 'state-ready';
                    estadoTextoBonito = 'Listo';
                } else if (estadoTxt === 'ENTREGADO') {
                    estadoClass = 'state-ready';
                    estadoTextoBonito = 'Entregado';
                } else if (estadoTxt === 'PENDIENTE' && pedidoEnProgreso) {
                    badgeNuevo = '<span class="badge-new">¡NUEVO!</span>';
                    estadoTextoBonito = 'Agregado';
                }

                const start = u.fechaInicio ? new Date(u.fechaInicio).getTime() : 0;
                const end = u.fechaListo ? new Date(u.fechaListo).getTime() : 0;
                let timerHTML = `<span class="unit-time-static">En espera</span>`;
                if (start > 0) {
                    timerHTML = `<span class="unit-timer" data-start="${start}" data-end="${end}">00:00</span>`;
                } else if (end > 0) {
                    timerHTML = `<span class="unit-time-static"><i class="fa-solid fa-check"></i></span>`;
                }

                unidadesHTML += `
                    <div class="unit-row ${estadoTxt}">
                        <div class="unit-info">
                            <span class="unit-label">Unidad ${i + 1} ${badgeNuevo}</span>
                            <span class="item-status ${estadoClass}">${estadoTextoBonito}</span>
                        </div>
                        <div class="unit-time-box">${timerHTML}</div>
                    </div>
                `;
            });
            unidadesHTML += `</div>`;
        }

        const toggleIcon = unidades.length > 1 ? '<i class="fa-solid fa-chevron-down toggle-icon"></i>' : '';
        const claseDiv = unidades.length === 1 ? 'auto-open' : (unidades.length > 1 ? 'clickable' : '');

        return `
            <div class="product-accordion-item ${claseDiv}">
                <div class="product-item">
                    <div class="product-left">
                        <div class="product-icon">${imageHtml}</div>
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

async function cargarPerfilUsuario() {

    const perfilData = await apiProfile.obtenerInfoMe();

    const rolesPermitidos = ["MESERO", "ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }

    generarSidebar('sidebar-container', "pedidos", "detalle_pedido", perfilData.rol.nombre);

    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");
    if (!infoPerfilContainer) return;

    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        const nombreRaw = perfilData?.empresa?.nombre || "";
        if (nombreRaw.trim() !== "" && nombreEmpresaContainer) nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
        else if (nombreEmpresaContainer) nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;

        if (perfilData && perfilData.usuario) {
            const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
            const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />` : `<div class="profile-text-avatar">${iniciales}</div>`;
            const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario";
            const rol = perfilData.rol?.nombre || "Empleado";

            infoPerfilContainer.innerHTML = `<a href="perfil.html" class="profile-link">${avatarHTML}<div class="profile-info"><strong>${nombreCompleto}</strong><div style="font-size:13px; color:var(--gray);">${rol}</div></div></a>`;
        }
    } catch (e) { console.error("Error perfil:", e); }
}

function handleAccordionClick(e) {
    const item = e.target.closest('.product-accordion-item');
    if (!item || !item.classList.contains('clickable')) return;
    if (e.target.closest('.btn-add-cart') || e.target.closest('button')) return;
    item.classList.toggle('active');
}

function abrirModalProductos() {
    if (!pedidoActual) {
        showNotification("Atención", "Selecciona un pedido activo primero.", "warning", "fa-circle-exclamation");
        return;
    }
    renderCategorias();
    renderPlatos();
    dom.modalProductos.classList.add('show');
}

function renderCategorias() {
    dom.categoriasContainer.innerHTML = `<button class="categoria-pill active" data-cat="todas">Todos</button>`;
    categorias.forEach(cat => dom.categoriasContainer.innerHTML += `<button class="categoria-pill" data-cat="${cat.id}">${cat.nombre}</button>`);
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
    
    // 👇 ACTUALIZADO: Renderiza la imagen si existe en el modal también 👇
    dom.platosContainer.innerHTML = platosFiltrados.map(plato => {
        const imageHtml = plato.imagenUrl && !plato.imagenUrl.includes('default-plate.png')
            ? `<img src="${plato.imagenUrl}" alt="${plato.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 14px;">`
            : `<i class="fa-solid fa-bowl-food"></i>`;
            
        return `
        <div class="plato-card">
            <div class="plato-header">
                <div class="plato-icon">${imageHtml}</div>
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
        </div>`;
    }).join('');
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
        } catch (error) {
            showNotification("Error", "No se pudo agregar el producto.", "error", "fa-triangle-exclamation");
        }
    }
}

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