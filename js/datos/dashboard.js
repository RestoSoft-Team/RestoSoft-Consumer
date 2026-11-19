import { api as apiMesas } from '../consumo/apiMesas.js';
import { apiPedidoDetalle } from '../consumo/apiDetallePedido.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { connectWebSocket } from '../consumo/websocket.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

const dom = {
    statVentas: document.getElementById('stat-ventas'),
    statPedidos: document.getElementById('stat-pedidos'),
    statMesas: document.getElementById('stat-mesas'),
    tablaPedidosBody: document.getElementById('tablaPedidosBody'),
    listaActividad: document.getElementById('listaActividad'),
    btnNuevoPedido: document.getElementById('btnNuevoPedido'),
    infoPerfilContainer: document.getElementById("infoPerfilContainer"),
    nombreEmpresaContainer: document.getElementById("nombreEmpresa")
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    cargarPerfilUsuario();
    
    if (dom.btnNuevoPedido) {
        dom.btnNuevoPedido.addEventListener("click", () => {
            window.location.href = "pedido-crear.html";
        });
    }

    await cargarDatosDashboard();

    // WebSocket: Solo actualizamos los datos silenciosamente, la alerta visual ya la maneja notificaciones.js
    connectWebSocket((canal, data) => {
        if (canal === 'COCINA') {
            if (data.tipo === 'NUEVO_PEDIDO' || data.tipo === 'ESTADO_ACTUALIZADO' || data.tipo === 'MESA_LIBERADA') {
                cargarDatosDashboard(true); 
            }
        }
    });
}

function esDeHoy(fechaISO) {
    if (!fechaISO) return false;
    const fechaPedido = new Date(fechaISO);
    const hoy = new Date();
    return fechaPedido.getDate() === hoy.getDate() &&
           fechaPedido.getMonth() === hoy.getMonth() &&
           fechaPedido.getFullYear() === hoy.getFullYear();
}

function calcularTotalPedido(pedido) {
    if (!pedido.detalles || pedido.detalles.length === 0) return 0;
    return pedido.detalles.reduce((total, det) => {
        const cant = det.unidades ? det.unidades.length : det.cantidad;
        return total + (parseFloat(det.precioUnitario) * cant);
    }, 0);
}

function actualizarNumero(elemento, valor) {
    if (!elemento) return;
    if (elemento.textContent !== valor) {
        elemento.textContent = valor;
        elemento.classList.remove('pulse-animation');
        void elemento.offsetWidth; 
        elemento.classList.add('pulse-animation');
    }
}

function renderStats(mesas, pedidos) {
    const pedidosHoy = pedidos.filter(p => esDeHoy(p.fecha));

    const ventasHoy = pedidosHoy
        .filter(p => p.estado === 'PAGADO')
        .reduce((acc, p) => acc + calcularTotalPedido(p), 0);
    actualizarNumero(dom.statVentas, `$${ventasHoy.toLocaleString('es-CO')}`);

    const activos = pedidosHoy.filter(p => p.estado !== 'PAGADO' && p.estado !== 'CANCELADO').length;
    actualizarNumero(dom.statPedidos, activos);

    const ocupadas = mesas.filter(m => m.estado === 'OCUPADA').length;
    actualizarNumero(dom.statMesas, `${ocupadas} / ${mesas.length}`);
}

function renderTablaPedidos(pedidos) {
    if (!dom.tablaPedidosBody) return;
    dom.tablaPedidosBody.innerHTML = '';

    const recientes = pedidos
        .filter(p => esDeHoy(p.fecha))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5);

    if (recientes.length === 0) {
        dom.tablaPedidosBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No hay pedidos hoy todavía.</td></tr>`;
        return;
    }

    recientes.forEach((p, index) => {
        const total = calcularTotalPedido(p);
        const mesa = p.numerosMesas?.join(', ') || 'N/A';
        const cliente = p.emailCliente || 'Cliente Mostrador';

        let estadoClass = 'pending';
        if (p.estado === 'PREPARANDO') estadoClass = 'preparing';
        if (p.estado === 'PAGADO' || p.estado === 'COMPLETADO') estadoClass = 'completed';

        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.1}s`;
        row.classList.add('fade-in-row');
        row.innerHTML = `
            <td data-label="Mesa">${mesa}</td>
            <td data-label="Cliente">${cliente}</td>
            <td data-label="Estado"><span class="status ${estadoClass}">${p.estado}</span></td>
            <td data-label="Total">$${total.toLocaleString('es-CO')}</td>
        `;
        dom.tablaPedidosBody.appendChild(row);
    });
}

function renderActividad(pedidos) {
    if (!dom.listaActividad) return;
    dom.listaActividad.innerHTML = '';
    const recientes = pedidos
        .filter(p => esDeHoy(p.fecha))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 4);

    if (recientes.length === 0) {
        dom.listaActividad.innerHTML = `<p class="text-muted">Sin actividad hoy.</p>`;
        return;
    }

    recientes.forEach((p, index) => {
        const mesa = p.numerosMesas?.join(', ') || 'N/A';
        const tiempo = new Date(p.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        
        const div = document.createElement('div');
        div.classList.add('activity-item', 'fade-in-row');
        div.style.animationDelay = `${index * 0.1}s`;
        div.innerHTML = `
            <div class="activity-icon">
                <i class="fa-solid fa-receipt"></i>
            </div>
            <div>
                <h6>Pedido #${p.id} registrado</h6>
                <p>Asignado a ${mesa} · ${tiempo}</p>
            </div>
        `;
        dom.listaActividad.appendChild(div);
    });
}

async function cargarDatosDashboard() {
    try {
        const [mesas, pedidos] = await Promise.all([
            apiMesas.obtenerMesas(),
            apiPedidoDetalle.getTodosLosPedidos()
        ]);

        renderStats(mesas, pedidos);
        renderTablaPedidos(pedidos);
        renderActividad(pedidos);

    } catch (error) {
        console.error("Error al cargar los datos del dashboard:", error);
        showNotification("Error de Conexión", "No se pudieron cargar las estadísticas.", "error", "fa-triangle-exclamation");
    }
}

async function cargarPerfilUsuario() {
    if (!dom.infoPerfilContainer) return;
    try {

        const perfilData = await apiProfile.obtenerInfoMe();

        const rolesPermitidos = ["ADMINISTRADOR"];

        if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
            console.error("Acceso no autorizado");

            const codigo = "403";
            const mensaje = encodeURIComponent(
                "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
            );

            window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
        }

        generarSidebar('sidebar-container', "dashboard", "dashboard_inicio", perfilData.rol.nombre);


        const empresaData = perfilData?.empresa || perfilData?.Data?.empresa;
        const nombreRaw = empresaData?.nombre || "";

        if (nombreRaw.trim() !== "" && dom.nombreEmpresaContainer) {
            dom.nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
        } else if (dom.nombreEmpresaContainer) {
            dom.nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
        }

        if (perfilData && perfilData.usuario) {
            const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
            const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />` : `<div class="profile-text-avatar">${iniciales}</div>`;
            const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario sin nombre";
            const rol = perfilData.rol?.nombre || "Sin rol asignado";

            dom.infoPerfilContainer.innerHTML = `
                <a href="perfil.html" class="profile-link">
                    ${avatarHTML}
                    <div class="profile-info">
                        <strong>${nombreCompleto}</strong>
                        <div style="font-size: 13px; color: var(--gray)">${rol}</div>
                    </div>
                </a>`;
        }
    } catch (e) { 
        console.error("Error perfil:", e); 
    }
}