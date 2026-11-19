import { apiPedidoDetalle as api } from '../consumo/apiDetallePedido.js';
import { showNotification } from './notificaciones.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { API_BASE, TOKEN } from '../consumo/config.js';
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    txtPedidoId: document.getElementById('txtPedidoId'),
    txtTotal: document.getElementById('txtTotal'),
    statSubtotal: document.getElementById('stat-subtotal'),
    statImpuestos: document.getElementById('stat-impuestos'),
    statServicio: document.getElementById('stat-servicio'),
    tablaTransacciones: document.getElementById('tablaTransacciones'),
    btnEfectivo: document.getElementById('btnEfectivo'),
    btnDividir: document.getElementById('btnDividir'),
    btnOnline: document.getElementById('btnOnline'),
    btnImprimir: document.getElementById('btnImprimir'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

let pedidoActual = null;
let detallesActuales = [];
let totalCalculado = 0;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    cargarPerfilUsuario();
    cargarTransaccionesHoy();

    const vieneDeDetalle = sessionStorage.getItem('vieneDePedidoDetalle') === 'true';
    const vieneDeMesas = sessionStorage.getItem('vieneDeMesas') === 'true';
    let idPedido = null;

    if (!vieneDeDetalle && !vieneDeMesas) {
        showNotification("Atención", "No se seleccionó un pedido para cobrar. Redirigiendo...", "warning");
        setTimeout(() => window.location.href = "pedidos.html", 2000);
        return;
    }

    try {
        if (vieneDeDetalle) {
            sessionStorage.removeItem('vieneDePedidoDetalle');
            idPedido = await api.getPedidoActivo();
            // 🔴 ELIMINAMOS: await api.cerrarPedidoActivo(); 
            // Ya no cerramos la sesión aquí para que no se pierda si el usuario va a dividir cuenta
        } else if (vieneDeMesas) {
            sessionStorage.removeItem('vieneDeMesas');
            const mesaAbierta = await api.getMesaAbierta();
            if (mesaAbierta) {
                const ped = await api.getPedidoActivoByMesa(mesaAbierta.id);
                if (ped) {
                    idPedido = ped.id;
                    await api.setPedidoActivo(ped.id);
                }
            }
            await api.cerrarMesa();
        }

        if (!idPedido) {
            showNotification("Error", "No se pudo obtener el pedido activo en la sesión.", "error");
            setTimeout(() => window.location.href = "pedidos.html", 2000);
            return;
        }

        const pedidoData = await api.getPedidoById(idPedido);
        pedidoActual = pedidoData;
        dom.txtPedidoId.textContent = pedidoData.id;

        detallesActuales = await api.getDetallesPedido(idPedido);

        const subtotal = detallesActuales.reduce((acc, det) => {
            const cant = det.unidades ? det.unidades.length : det.cantidad;
            return acc + (det.precioUnitario * cant);
        }, 0);

        const impuestos = subtotal * 0.19;
        const servicio = subtotal * 0.10;
        totalCalculado = subtotal + impuestos + servicio;

        dom.statSubtotal.textContent = fmtCOP.format(subtotal);
        dom.statImpuestos.textContent = fmtCOP.format(impuestos);
        dom.statServicio.textContent = fmtCOP.format(servicio);
        dom.txtTotal.textContent = fmtCOP.format(totalCalculado);

    } catch (error) {
        showNotification("Error", "No se pudo cargar el pedido a cobrar.", "error");
    }

    dom.btnEfectivo.addEventListener('click', () => procesarPagoUnico('EFECTIVO'));
    dom.btnOnline.addEventListener('click', pagarConEpayco);

    async function pagarConEpayco() {
    if (!pedidoActual) { 
        showNotification("Error", "No hay un pedido seleccionado.", "error"); 
        return; 
    }

    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        const idEmpresa = perfilData.empresa.id;
        const idUsuario = perfilData.usuario.id;

        const configRes = await fetch(`${API_BASE}/pagos/configuracion`, { headers: authHeader });
        if (!configRes.ok) throw new Error("No se pudo cargar la configuración de pago.");
        const config = await configRes.json();

        if (!config.publicKey) {
            throw new Error("No hay llave pública configurada para ePayco.");
        }

        const handler = ePayco.checkout.configure({
            key: config.publicKey,
            test: config.environment === 'sandbox'
        });

        const total = totalCalculado || 0;
        const idPedido = pedidoActual.id; 

        const data = {
            name: "Pago Pedido RestSoft",
            description: "Pedido #" + idPedido,
            invoice: idPedido.toString(),
            currency: "cop",
            amount: Math.round(total).toString(),
            tax_base: "0",
            tax: "0",
            country: "co",
            lang: "es",
            external: "false",
            extra1: idEmpresa.toString(), 
            extra2: idUsuario.toString(),
            response: `${window.location.origin}/pagos.html?pedidoId=${idPedido}`,
            confirmation: `${API_BASE}/pagos/confirmacion`
        };

        handler.open(data);

    } catch (error) {
        showNotification("Error de Pago", error.message, "error");
    }
}

    // Añade esto al final de tu archivo pagos.js para manejar el regreso de ePayco
    window.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const refPayco = urlParams.get('x_ref_payco');

        if (refPayco) {
            const state = urlParams.get('x_transaction_state');
            const pedidoId = urlParams.get('x_id_invoice');

            if (state === "Aceptada") {
                showNotification("Pago Aprobado", `El pago online del pedido #${pedidoId} fue aprobado. La mesa se liberará en un momento.`, "success");
            } else {
                showNotification("Pago Rechazado", `El pago online fue rechazado o cancelado.`, "error");
            }

            // Limpiar la URL para que no se vuelva a ejecutar al recargar
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    });

    // 🟢 MODIFICACIÓN CLAVE AQUÍ:
    dom.btnDividir.addEventListener('click', async () => {
        // Nos aseguramos de que el pedido actual quede guardado en la sesión del backend
        // antes de ir a la pantalla de dividir cuenta.
        if (pedidoActual) {
            await api.setPedidoActivo(pedidoActual.id);
        }
        sessionStorage.setItem('vieneDePagos', 'true');
        window.location.href = 'dividir-cuenta.html';
    });

    dom.btnImprimir.addEventListener('click', imprimirRecibo);
}

async function cargarTransaccionesHoy() {
    try {
        const todosLosPedidos = await api.getTodosLosPedidos();

        const hoy = new Date().setHours(0, 0, 0, 0);
        const pagadosHoy = todosLosPedidos.filter(p => {
            if (p.estado !== 'PAGADO') return false;
            const fechaPedido = new Date(p.fecha).setHours(0, 0, 0, 0);
            return fechaPedido === hoy;
        });

        if (pagadosHoy.length === 0) {
            dom.tablaTransacciones.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray);">No hay transacciones hoy.</td></tr>';
            return;
        }

        dom.tablaTransacciones.innerHTML = pagadosHoy.map(p => {
            const mesa = p.numerosMesas?.join(', ') || 'N/A';
            const mesero = p.nombresMeseros?.join(', ') || 'N/A';

            let subtotal = 0;
            p.detalles?.forEach(det => {
                const cant = det.unidades?.length || det.cantidad;
                subtotal += (det.precioUnitario * cant);
            });
            const total = subtotal * 1.29;

            return `
                <tr class="row-hover">
                    <td data-label="Pedido">#RS-${p.id}</td>
                    <td data-label="Mesa">${mesa}</td>
                    <td data-label="Mesero">${mesero}</td>
                    <td data-label="Total">${fmtCOP.format(total)}</td>
                    <td data-label="Estado"><span class="badge paid">Pagado</span></td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Error al cargar transacciones:", error);
    }
}

async function procesarPagoUnico(tipoPago) {
    dom.loadingOverlay.style.display = 'block';
    dom.btnEfectivo.disabled = true;
    dom.btnOnline.disabled = true;
    dom.btnDividir.disabled = true;

    const payload = {
        tipoPago: tipoPago,
        metodosPago: [{ idMetodoPago: tipoPago === 'EFECTIVO' ? 1 : 2, metodo: tipoPago, monto: totalCalculado }]
    };

    try {
        await api.procesarPago(pedidoActual.id, payload);

        showNotification("Pago Exitoso", "El pedido ha sido pagado y el comprobante enviado.", "success");

        // Recién aquí, cuando el pago único se completa, cerramos el pedido en sesión
        await api.cerrarPedidoActivo();

        dom.loadingOverlay.style.display = 'none';
        dom.btnImprimir.style.display = 'block';

        cargarTransaccionesHoy();
    } catch (error) {
        showNotification("Error", error.message || "No se pudo procesar el pago.", "error");
        resetButtons();
    }
}

function imprimirRecibo() {
    const ventana = window.open('', '_blank', 'width=400,height=600');

    let itemsHtml = detallesActuales.map(det => {
        const cant = det.unidades ? det.unidades.length : det.cantidad;
        const sub = det.precioUnitario * cant;
        return `<tr><td>${cant}x ${det.nombrePlato}</td><td style="text-align:right;">${fmtCOP.format(sub)}</td></tr>`;
    }).join('');

    ventana.document.write(`
        <html>
        <head>
            <title>Recibo #RS-${pedidoActual.id}</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; color: #000; }
                h1 { text-align: center; margin: 0; font-size: 24px; }
                h2 { text-align: center; margin: 5px 0 20px 0; font-size: 14px; }
                hr { border: 1px dashed #000; margin: 15px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                td { padding: 3px 0; }
                .total { font-size: 16px; font-weight: bold; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <h1>RestSoft</h1>
            <h2>Comprobante de Pago</h2>
            <p><strong>Pedido:</strong> #RS-${pedidoActual.id}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
            <hr>
            <table>
                ${itemsHtml}
            </table>
            <hr>
            <table>
                <tr><td>Subtotal:</td><td class="text-right">${dom.statSubtotal.textContent}</td></tr>
                <tr><td>Impuestos (19%):</td><td class="text-right">${dom.statImpuestos.textContent}</td></tr>
                <tr><td>Servicio (10%):</td><td class="text-right">${dom.statServicio.textContent}</td></tr>
                <tr class="total"><td>TOTAL:</td><td class="text-right">${dom.txtTotal.textContent}</td></tr>
            </table>
            <hr>
            <p class="text-center">¡Gracias por su visita!</p>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    ventana.document.close();
}

function resetButtons() {
    dom.loadingOverlay.style.display = 'none';
    dom.btnEfectivo.disabled = false;
    dom.btnOnline.disabled = false;
    dom.btnDividir.disabled = false;
}

async function cargarPerfilUsuario() {
    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    if (!infoPerfilContainer) return;
    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
        const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : `<div style="width:40px;height:40px;border-radius:50%;background:#6b1e28;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;">${iniciales}</div>`;
        const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario";
        const rol = perfilData.rol?.nombre || "Empleado";
        infoPerfilContainer.innerHTML = `${avatarHTML}<div><strong style="display:block;font-size:14px;">${nombreCompleto}</strong><div style="font-size:12px;color:var(--gray);">${rol}</div></div>`;
    } catch (e) { }
}