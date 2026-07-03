import { apiPedidos } from '../consumo/apiPedidos.js';
import { connectWebSocket } from '../consumo/websocket.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { showNotification } from './notificaciones.js'; 
import { generarSidebar } from './create-sidebar.js';

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const TIEMPO_MAX_PREPARACION = 15;

const dom = {
    statHoy: document.getElementById('stat-hoy'),
    statPreparacion: document.getElementById('stat-preparacion'),
    statListos: document.getElementById('stat-listos'),
    statRetrasados: document.getElementById('stat-retrasados'),
    tablaPedidos: document.getElementById('tablaPedidos'),
    liveOrders: document.getElementById('liveOrders'),
    modalAlerta: document.getElementById('modalAlerta'),
    modalAlertaBody: document.getElementById('modalAlertaBody'),
    modalAlertaCloseBtn: document.getElementById('modalAlertaCloseBtn')
};

let pedidosData = [];

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    cargarPerfilUsuario();
    cargarDatos();

    connectWebSocket((canal, data) => {
        if (canal === 'COCINA') {
            // 👇 Actualizamos datos silenciosamente para cualquier cambio en cocina
            if (data.tipo === 'NUEVO_PEDIDO' || data.tipo === 'PRODUCTO_AGREGADO' || data.tipo === 'ESTADO_ACTUALIZADO') {
                cargarDatos();
            }

            // 👇 Mostramos notificaciones visuales según el tipo
            if (data.tipo === 'NUEVO_PEDIDO') {
                showNotification("¡Nuevo Pedido Recibido!", `El pedido #RS-${data.idPedido} acaba de llegar a cocina.`, "success", "fa-bell-concierge");
            } 
            else if (data.tipo === 'PRODUCTO_AGREGADO') {
            }
            else if (data.tipo === 'ESTADO_ACTUALIZADO') {
                let estadoTxt = "";
                let tipoNotif = "success";
                let iconoNotif = "fa-arrows-rotate";
                
                if (data.estadoUnidad === 'PREPARANDO') {
                    estadoTxt = "empezó a prepararse en cocina";
                    tipoNotif = "warning";
                    iconoNotif = "fa-fire";
                } else if (data.estadoUnidad === 'LISTO') {
                } else if (data.estadoUnidad === 'ENTREGADO') {
                    estadoTxt = "fue entregado a la mesa";
                } else {
                    estadoTxt = "cambió de estado";
                }
            }
        } 
        else if (canal === 'NOTIFICACION') {
            if (data.tipo === 'PLATO_LISTO') {
            }
        }
    });
    
    dom.modalAlertaCloseBtn.addEventListener('click', () => dom.modalAlerta.style.display = 'none');
    dom.modalAlerta.addEventListener('click', (e) => {
        if (e.target === dom.modalAlerta) dom.modalAlerta.style.display = 'none';
    });
}

async function cargarDatos() {
    try {
        pedidosData = await apiPedidos.getPedidosActivos();
        renderStats();
        renderTabla();
        renderLiveOrders();
    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        dom.tablaPedidos.innerHTML = '<tr><td colspan="8" class="text-center text-danger p-4">Error de conexión.</td></tr>';
    }
}

function getUnidadesRetrasadas(pedido) {
    let retrasadas = [];
    pedido.detalles.forEach(det => {
        (det.unidades || []).forEach(u => {
            if (u.estado === 'PREPARANDO' && u.fechaInicio) {
                const minutos = Math.floor((Date.now() - new Date(u.fechaInicio).getTime()) / 60000);
                if (minutos > TIEMPO_MAX_PREPARACION) {
                    retrasadas.push({ nombre: det.nombrePlato, tiempo: minutos });
                }
            }
        });
    });
    return retrasadas;
}

async function cargarPerfilUsuario() {
    try {
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

        generarSidebar('sidebar-container', "pedidos", "pedidos", perfilData.rol.nombre);

        const infoPerfilContainer = document.getElementById("infoPerfilContainer");
        const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

        if (!infoPerfilContainer) return;

        const empresaData = perfilData?.empresa || perfilData?.Data?.empresa;
        const nombreRaw = empresaData?.nombre || "";

        if (nombreEmpresaContainer) {
            nombreEmpresaContainer.innerHTML = nombreRaw.trim() !== "" ? `<h6>${nombreRaw.toUpperCase()}</h6>` : `<h6>RESTOSOFT</h6>`;
        }

        const urlPerfil = "perfil.html";

        if (perfilData && perfilData.usuario) {
            const iniciales = (
                (perfilData.usuario.nombres || "").substring(0, 1) +
                (perfilData.usuario.apellidos || "").substring(0, 1)
            ).toUpperCase() || "EP";

            const avatarHTML = perfilData.usuario.imagenUrl
                ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />`
                : `<div class="profile-text-avatar">${iniciales}</div>`;

            const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario sin nombre";
            const rol = perfilData.rol?.nombre || "Sin rol asignado";

            infoPerfilContainer.innerHTML = `
                <a href="${urlPerfil}" class="profile-link">
                    ${avatarHTML}
                    <div class="profile-info">
                        <strong>${nombreCompleto}</strong>
                        <div style="font-size: 13px; color: var(--gray)">${rol}</div>
                    </div>
                </a>`;
        } else {
            infoPerfilContainer.innerHTML = `
                <a href="${urlPerfil}" class="profile-link">
                    <div class="profile-text-avatar">UA</div>
                    <div class="profile-info">
                        <strong>Usuario Anónimo</strong>
                        <div style="font-size: 13px; color: var(--gray)">Invitado</div>
                    </div>
                </a>`;
        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
        // En caso de error, intentamos pintar igualmente el contenedor de perfil
        const infoPerfilContainer = document.getElementById("infoPerfilContainer");
        if (infoPerfilContainer) {
            infoPerfilContainer.innerHTML = `
                <a href="perfil.html" class="profile-link">
                    <div class="profile-text-avatar">EP</div>
                    <div class="profile-info">
                        <strong>Error de conexión</strong>
                        <div style="font-size: 13px; color: var(--gray)">No se pudo cargar</div>
                    </div>
                </a>`;
        }
    }
}

function renderStats() {
    let enPreparacion = 0;
    let listos = 0;
    let productosRetrasados = 0;

    pedidosData.forEach(p => {
        if (p.estado === 'PREPARANDO') enPreparacion++;
        if (p.estado === 'LISTO') listos++;
        productosRetrasados += getUnidadesRetrasadas(p).length;
    });

    dom.statHoy.textContent = pedidosData.length;
    dom.statPreparacion.textContent = enPreparacion;
    dom.statListos.textContent = listos;
    dom.statRetrasados.textContent = productosRetrasados;
}

function renderTabla() {
    if (pedidosData.length === 0) {
        dom.tablaPedidos.innerHTML = '<tr><td colspan="8" class="text-center p-4">No hay pedidos activos.</td></tr>';
        return;
    }

    dom.tablaPedidos.innerHTML = pedidosData.map(p => {
        const total = p.detalles.reduce((acc, det) => acc + (det.precioUnitario * (det.unidades?.length || det.cantidad)), 0);
        const minutosMesa = Math.floor((Date.now() - new Date(p.fecha).getTime()) / 60000);
        const tiempoMesaTxt = minutosMesa === 0 ? 'Recién llegado' : `${minutosMesa} min`;
        const numProductos = p.detalles.reduce((acc, det) => acc + (det.unidades?.length || det.cantidad), 0);
        const mesero = p.nombresMeseros?.join(', ') || 'Sin asignar';
        const mesa = p.numerosMesas?.join(' + ') || 'N/A';

        const retrasadas = getUnidadesRetrasadas(p);
        let alertaHTML = '';
        if (retrasadas.length > 0) {
            alertaHTML = `<button class="action-btn btn-alerta" data-id="${p.id}"><i class="fa-solid fa-bell"></i></button>`;
        } else {
            alertaHTML = `<button class="action-btn btn-ok" disabled><i class="fa-solid fa-check"></i></button>`;
        }

        return `
            <tr>
                <td data-label="Pedido">
                    <div class="order">
                        <div class="order-icon"><i class="fa-solid fa-burger"></i></div>
                        <div>
                            <h6>#RS-${p.id}</h6>
                            <span>${numProductos} productos</span>
                        </div>
                    </div>
                </td>
                <td data-label="Mesa">${mesa}</td>
                <td data-label="Mesero">${mesero}</td>
                <td data-label="Total">${fmtCOP.format(total)}</td>
                <td data-label="Tiempo Mesa"><strong>${tiempoMesaTxt}</strong></td>
                <td data-label="Estado">
                    <span class="status status-${p.estado}">${p.estado}</span>
                </td>
                <td data-label="Alerta Cocina">${alertaHTML}</td>
                <td data-label="Acciones">
                    <div class="table-actions">
                        <button class="action-btn btn-ver-detalle" data-id="${p.id}" title="Ver Detalle">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        document.querySelectorAll('.btn-alerta').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idPedido = parseInt(e.currentTarget.dataset.id);
                abrirModalAlerta(idPedido);
            });
        });
}

function abrirModalAlerta(idPedido) {
    const pedido = pedidosData.find(p => p.id === idPedido);
    if (!pedido) return;

    const retrasadas = getUnidadesRetrasadas(pedido);
    let htmlItems = retrasadas.map(r => `
        <div class="alert-item">
            <div>
                <strong>${r.nombre}</strong>
                <div style="font-size: 13px; color: var(--gray);">En cocina desde hace</div>
            </div>
            <div style="font-size: 20px; font-weight: 800; color: var(--danger);">${r.tiempo} min</div>
        </div>
    `).join('');

    dom.modalAlertaBody.innerHTML = `
        <p class="mb-3">Pedido #RS-${pedido.id} (Mesa: ${pedido.numerosMesas?.join(' + ')})</p>
        ${htmlItems}`;
    dom.modalAlerta.style.display = 'flex';
}

function renderLiveOrders() {
    const enCocina = pedidosData.filter(p => p.estado === 'PREPARANDO' || p.estado === 'PENDIENTE' || p.estado === 'LISTO');

    if (enCocina.length === 0) {
        dom.liveOrders.innerHTML = '<p class="text-secondary">No hay pedidos en cocina ahora mismo.</p>';
        return;
    }

    dom.liveOrders.innerHTML = enCocina.map(p => {
        const mesa = p.numerosMesas?.join(' + ') || 'Sin Mesa';
        const itemsTxt = p.detalles.map(det => det.nombrePlato).join(' · ');
        
        let totalUnidades = 0;
        let puntosProgreso = 0;

        p.detalles.forEach(det => {
            const uds = det.unidades || [];
            if (uds.length > 0) {
                totalUnidades += uds.length;
                uds.forEach(u => {
                    if (u.estado === 'LISTO' || u.estado === 'ENTREGADO') {
                        puntosProgreso += 1;
                    } else if (u.estado === 'PREPARANDO') {
                        puntosProgreso += 0.5;
                    }
                });
            } else {
                totalUnidades += det.cantidad || 0;
            }
        });

        let progreso = totalUnidades > 0 ? Math.round((puntosProgreso / totalUnidades) * 100) : 0;
        
        let color = 'var(--gray)'; 
        let texto = 'En espera de preparación';

        if (p.estado === 'PENDIENTE') {
            color = 'var(--gray)'; // Gris suave para diferenciarlo de "Preparando"
            texto = `En espera — ${progreso}%`;
            if (progreso === 0) progreso = 10; 
        } else if (p.estado === 'PREPARANDO') {
            color = 'var(--warning)'; // 👈 AQUÍ USAMOS EL COLOR WARNING QUE PEDISTE
            texto = `En preparación — ${progreso}%`;
            if (progreso === 0) progreso = 20; 
        } else if (p.estado === 'LISTO') {
            progreso = 100;
            color = 'var(--success)';
            texto = 'Pedido listo para entrega — 100%';
        }

        if (progreso > 100) progreso = 100;

        return `
            <div class="card-premium live-order-card">
                <div class="live-header">
                    <div>
                        <h4>${mesa}</h4>
                        <p class="mb-0">${itemsTxt}</p>
                    </div>
                    <div class="live-badge"></div>
                </div>
                <div class="progress-premium">
                    <div class="progress-bar" style="width: ${progreso}%; background: ${color};"></div>
                </div>
                <small class="text-secondary" style="color: ${color}; font-weight: 600;">${texto}</small>
            </div>`;
    }).join('');
}

document.addEventListener('click', async (e) => {
    const btnVer = e.target.closest('.btn-ver-detalle');
    if (btnVer) {
        const idPedido = parseInt(btnVer.dataset.id);
        await navegarSeguroPedido(idPedido);
    }
});

async function navegarSeguroPedido(idPedido) {
    try {
        await apiPedidos.setPedidoActivo(idPedido);
        sessionStorage.setItem('vieneDePedidos', 'true');
        window.location.href = 'pedido-detalle.html';
    } catch (error) {
        showNotification("Error", "No se pudo abrir el detalle del pedido.", "error", "fa-triangle-exclamation");
    }
}