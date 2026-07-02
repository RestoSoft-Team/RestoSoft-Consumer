import { apiPedidoDetalle as api } from '../consumo/apiDetallePedido.js';
import { showNotification } from './notificaciones.js';
import { apiProfile } from '../consumo/apiProfile.js';

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    selectPedido: document.getElementById('selectPedido'),
    itemList: document.getElementById('itemList'),
    dynamicPanel: document.getElementById('dynamicPanel')
};

let pedidoActual = null;
let detallesActuales = [];
let modoActual = 'productos';
let personas = [{ id: 1, nombre: 'Persona 1' }, { id: 2, nombre: 'Persona 2' }];
let numPersonasEquitativo = 2;
let numPersonasProductos = 2;

window.cambiarModo = function(modo) {
    modoActual = modo;
    document.querySelectorAll('.division-card').forEach(card => {
        card.classList.toggle('active', card.dataset.mode === modo);
    });
    if (pedidoActual) renderItems(detallesActuales);
    renderDynamicPanel();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    cargarPerfilUsuario(); 
    
    // 👇 MISMA VALIDACIÓN QUE EN pagos.js
    const vieneDePagos = sessionStorage.getItem('vieneDePagos') === 'true';
    if (!vieneDePagos) {
        showNotification("Atención", "No se seleccionó un pedido para dividir. Redirigiendo...", "warning", "fa-circle-exclamation");
        setTimeout(() => window.location.href = "pedidos.html", 2000);
        return;
    }
    sessionStorage.removeItem('vieneDePagos');

    try {
        const idPedidoActivo = await api.getPedidoActivo();
        if (!idPedidoActivo) {
            showNotification("Error", "No hay un pedido activo en la sesión.", "error");
            setTimeout(() => window.location.href = "pedidos.html", 2000);
            return;
        }

        // Obtenemos los datos solo para mostrar el texto en el dropdown bloqueado
        const pedidoData = await api.getPedidoById(idPedidoActivo);
        const mesasTxt = pedidoData.numerosMesas && pedidoData.numerosMesas.length > 0 ? pedidoData.numerosMesas.join(' + ') : 'Sin mesa';
        
        // Llenamos el dropdown solo con este pedido y lo DESHABILITAMOS
        dom.selectPedido.innerHTML = `<option value="${pedidoData.id}">Pedido #${pedidoData.id} (${mesasTxt})</option>`;
        dom.selectPedido.value = pedidoData.id;
        dom.selectPedido.disabled = true; // 👈 NO SE PUEDE SELECCIONAR MANUALMENTE

        // Cargamos los productos automáticamente
        pedidoActual = parseInt(idPedidoActivo);
        detallesActuales = await api.getDetallesPedido(pedidoActual);
        renderItems(detallesActuales);
        renderDynamicPanel();

    } catch (error) {
        console.error("Error inicial:", error);
        showNotification("Error de conexión", "No se pudo cargar el pedido.", "error");
    }
}

function renderItems(detalles) {
    if (!detalles || detalles.length === 0) {
        dom.itemList.innerHTML = '<p style="color: var(--gray); text-align: center;">Este pedido no tiene productos.</p>';
        return;
    }

    dom.itemList.innerHTML = detalles.map(det => {
        const total = det.precioUnitario * det.cantidad;
        const asignadoA = det.asignadoA || '0';
        const assignHTML = modoActual === 'productos' ? `
            <div class="item-actions">
                <select class="item-assign-select" data-id="${det.id}" onchange="asignarProducto(${det.id}, this.value)">
                    <option value="0" ${asignadoA === '0' ? 'selected' : ''}>Sin asignar</option>
                    ${personas.map(p => `<option value="${p.id}" ${asignadoA == p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
                    <option value="dividido" ${asignadoA === 'dividido' ? 'selected' : ''}>Dividir entre todos</option>
                </select>
            </div>
        ` : '';

        return `
            <div class="item">
                <div class="item-left">
                    <div class="item-icon"><i class="fa-solid fa-bowl-food"></i></div>
                    <div class="item-info">
                        <h5>${det.nombrePlato}</h5>
                        <span>${det.cantidad} unidades • ${det.categoriaPlato || 'General'}</span>
                    </div>
                </div>
                <div class="item-price">
                    <strong>${fmtCOP.format(total)}</strong>
                </div>
                ${assignHTML}
            </div>
        `;
    }).join('');
}

async function cargarPerfilUsuario() {
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
            infoPerfilContainer.innerHTML = `<a href="perfil.html" class="profile-link">${avatarHTML}<div class="profile-info"><strong>${nombreCompleto}</strong><div style="font-size: 13px; color: var(--gray)">${rol}</div></div></a>`;
        }
    } catch (e) { console.error("Error perfil:", e); }
}

window.asignarProducto = function(idDetalle, valor) {
    const detalle = detallesActuales.find(d => d.id === idDetalle);
    if (detalle) {
        detalle.asignadoA = valor;
        renderDynamicPanel();
    }
}

window.cambiarNumPersonas = function(delta) {
    numPersonasEquitativo = Math.max(1, numPersonasEquitativo + delta);
    renderDynamicPanel();
}
window.setNumPersonas = function(val) {
    let parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 1) parsed = 1;
    numPersonasEquitativo = parsed;
    renderDynamicPanel();
}
window.cambiarPersonasProductos = function(delta) {
    numPersonasProductos = Math.max(1, numPersonasProductos + delta);
    actualizarPersonasProductos();
}
window.setPersonasProductos = function(val) {
    let parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 1) parsed = 1;
    numPersonasProductos = parsed;
    actualizarPersonasProductos();
}

function actualizarPersonasProductos() {
    detallesActuales.forEach(det => {
        if (det.asignadoA !== '0' && det.asignadoA !== 'dividido' && parseInt(det.asignadoA) > numPersonasProductos) {
            det.asignadoA = '0';
        }
    });
    personas = [];
    for (let i = 1; i <= numPersonasProductos; i++) {
        personas.push({ id: i, nombre: `Persona ${i}` });
    }
    if (pedidoActual) renderItems(detallesActuales);
    renderDynamicPanel();
}

function renderDynamicPanel() {
    if (modoActual === 'equitativo') renderModoEquitativo();
    else renderModoProductos();
}

function renderModoEquitativo() {
    const subtotal = detallesActuales.reduce((acc, det) => acc + (det.precioUnitario * det.cantidad), 0);
    const impuestos = subtotal * 0.19;
    const servicio = subtotal * 0.10;
    const total = subtotal + impuestos + servicio;
    const totalPorPersona = total / numPersonasEquitativo;

    dom.dynamicPanel.innerHTML = `
        <div class="card-title">
            <div>
                <h3>División Equitativa</h3>
                <p>El total se divide entre los comensales.</p>
            </div>
        </div>
        <div class="split-box">
            <h5>Número de Personas</h5>
            <div class="stepper">
                <button onclick="cambiarNumPersonas(-1)">-</button>
                <input type="number" min="1" value="${numPersonasEquitativo}" onchange="setNumPersonas(this.value)">
                <button onclick="cambiarNumPersonas(1)">+</button>
            </div>
            <div class="split-item"><span>Subtotal Cuenta</span><strong>${fmtCOP.format(subtotal)}</strong></div>
            <div class="split-item"><span>Impuestos (19%)</span><strong>${fmtCOP.format(impuestos)}</strong></div>
            <div class="split-item"><span>Servicio (10%)</span><strong>${fmtCOP.format(servicio)}</strong></div>
            <div class="split-total">
                <div>
                    <span style="color:var(--gray);font-size:14px;">Total a pagar por persona</span>
                    <h3>${fmtCOP.format(totalPorPersona)}</h3>
                </div>
            </div>
        </div>
        <div style="margin-top:22px;display:flex;flex-direction:column;gap:16px;">
            <button class="btn-premium btn-primary-custom" onclick="procesarPagoDividido()">
                <i class="fa-solid fa-money-bill-wave"></i> Pagar en Efectivo y Enviar Factura
            </button>
        </div>
    `;
}

function renderModoProductos() {
    let totalesPorPersona = {};
    personas.forEach(p => totalesPorPersona[p.id] = 0);

    detallesActuales.forEach(det => {
        const monto = det.precioUnitario * det.cantidad;
        const asignadoA = det.asignadoA || '0';
        if (asignadoA === 'dividido') {
            const montoPorPersona = monto / personas.length;
            personas.forEach(p => totalesPorPersona[p.id] += montoPorPersona);
        } else if (asignadoA !== '0' && totalesPorPersona[asignadoA] !== undefined) {
            totalesPorPersona[asignadoA] += monto;
        }
    });

    let personasHTML = personas.map(p => {
        const subtotal = totalesPorPersona[p.id];
        const total = subtotal * 1.29; 
        return `
            <div class="person-tag">
                <strong>${p.nombre}</strong>
                <span>${fmtCOP.format(total)}</span>
            </div>
        `;
    }).join('');

    dom.dynamicPanel.innerHTML = `
        <div class="card-title">
            <div>
                <h3>Resumen por Persona</h3>
                <p>Asigna los productos en la lista.</p>
            </div>
        </div>
        <div class="split-box">
            <h5>Número de Personas</h5>
            <div class="stepper">
                <button onclick="cambiarPersonasProductos(-1)">-</button>
                <input type="number" min="1" value="${numPersonasProductos}" onchange="setPersonasProductos(this.value)">
                <button onclick="cambiarPersonasProductos(1)">+</button>
            </div>
            <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                ${personasHTML || '<p style="color:var(--gray); text-align:center;">Agrega personas para empezar.</p>'}
            </div>
        </div>
        <div style="margin-top:22px;display:flex;flex-direction:column;gap:16px;">
            <button class="btn-premium btn-primary-custom" onclick="procesarPagoDividido()">
                <i class="fa-solid fa-money-bill-wave"></i> Pagar en Efectivo y Enviar Factura
            </button>
        </div>
    `;
}

window.procesarPagoDividido = async function() {
    if (!pedidoActual) {
        showNotification("Atención", "Selecciona un pedido primero.", "warning", "fa-circle-exclamation");
        return;
    }

    const pedidoData = await api.getPedidoById(pedidoActual);
    if (!pedidoData.emailCliente || pedidoData.emailCliente.trim() === '') {
        showNotification("Sin Correo", "Este pedido no tiene un correo de cliente registrado para enviar la factura.", "warning", "fa-circle-exclamation");
        return;
    }

    let divisiones = [];
    if (modoActual === 'equitativo') {
        const subtotal = detallesActuales.reduce((acc, det) => acc + (det.precioUnitario * det.cantidad), 0);
        const total = subtotal * 1.29; // 19% + 10%
        const totalPorPersona = total / numPersonasEquitativo;
        
        for (let i = 1; i <= numPersonasEquitativo; i++) {
            divisiones.push({ metodo: `Efectivo (Persona ${i})`, monto: totalPorPersona });
        }
    } else {
        let totalesPorPersona = {};
        personas.forEach(p => totalesPorPersona[p.id] = 0);

        detallesActuales.forEach(det => {
            const monto = det.precioUnitario * det.cantidad;
            const asignadoA = det.asignadoA || '0';
            if (asignadoA === 'dividido') {
                const montoPorPersona = monto / personas.length;
                personas.forEach(p => totalesPorPersona[p.id] += montoPorPersona);
            } else if (asignadoA !== '0' && totalesPorPersona[asignadoA] !== undefined) {
                totalesPorPersona[asignadoA] += monto;
            }
        });

        personas.forEach(p => {
            const subtotal = totalesPorPersona[p.id];
            const total = subtotal * 1.29; 
            divisiones.push({ metodo: `Efectivo (${p.nombre})`, monto: total });
        });
    }

    const payload = {
        tipoPago: "DIVIDIDO",
        metodosPago: divisiones
    };

    try {
        await api.procesarPago(pedidoActual, payload);
        
        showNotification("Pago Dividido Exitoso", `La factura fue enviada a ${pedidoData.emailCliente}.`, "success", "fa-check");
        await api.cerrarPedidoActivo();
        setTimeout(() => window.location.href = "pedidos.html", 2500);
    } catch (error) {
        showNotification("Error", error.message || "No se pudo procesar el pago.", "error", "fa-triangle-exclamation");
    }
}