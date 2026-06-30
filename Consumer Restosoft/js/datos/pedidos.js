import { apiPedidos } from '../consumo/apiPedidos.js';
import { connectWebSocket } from '../consumo/websocket.js';

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const TIEMPO_MAX_PREPARACION = 15;

const dom = {
    statHoy: document.getElementById('stat-hoy'),
    statPreparacion: document.getElementById('stat-preparacion'),
    statListos: document.getElementById('stat-listos'),
    statRetrasados: document.getElementById('stat-retrasados'),
    tablaPedidos: document.getElementById('tablaPedidos'),
    liveOrders: document.getElementById('liveOrders'),
    notification: document.getElementById('notification'),
    notifTitulo: document.getElementById('notifTitulo'),
    notifMensaje: document.getElementById('notifMensaje'),
    notifIcon: document.querySelector('.notification-icon i'),
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
    await cargarDatos();

    

    connectWebSocket((canal, data) => {
        if (canal === 'COCINA') {
            if (data.tipo === 'NUEVO_PEDIDO') {
                cargarDatos();
                showNotification("¡Nuevo Pedido Recibido!", `El pedido #RS-${data.idPedido} acaba de llegar a cocina.`, "success", "fa-bell-concierge");
            } 
            else if (data.tipo === 'PRODUCTO_AGREGADO') {
                cargarDatos();
                showNotification("Producto Agregado", `Se agregaron productos al pedido #RS-${data.idPedido}.`, "warning", "fa-circle-plus");
            }
            else if (data.tipo === 'ESTADO_ACTUALIZADO') {
                cargarDatos();
                
                let estadoTxt = "";
                let tipoNotif = "primary";
                let iconoNotif = "fa-arrows-rotate";
                
                if (data.estadoUnidad === 'PREPARANDO') {
                    estadoTxt = `empezó a prepararse en cocina`;
                    tipoNotif = "warning";
                    iconoNotif = "fa-fire";
                } else if (data.estadoUnidad === 'LISTO') {
                    estadoTxt = `está listo para ser recogido`;
                    tipoNotif = "success";
                    iconoNotif = "fa-circle-check";
                } else {
                    estadoTxt = `cambió de estado`;
                }

                showNotification("Estado Actualizado", `El producto ${data.plato} de la ${data.mesa} ${estadoTxt}.`, tipoNotif, iconoNotif);
            }
        } 
        else if (canal === 'NOTIFICACION') {
            if (data.tipo === 'PLATO_LISTO') {
                playBeep();
                
                showNotification(
                    "¡Plato Listo para Recoger!", 
                    `El plato "${data.plato}" de la ${data.mesa} está listo.`, 
                    "success", 
                    "fa-utensils"
                );
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
            </tr>
        `;
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
        ${htmlItems}
    `;
    dom.modalAlerta.style.display = 'flex';
}

function renderLiveOrders() {
    const enCocina = pedidosData.filter(p => p.estado === 'PREPARANDO' || p.estado === 'PENDIENTE');

    if (enCocina.length === 0) {
        dom.liveOrders.innerHTML = '<p class="text-secondary">No hay pedidos en cocina ahora mismo.</p>';
        return;
    }

    dom.liveOrders.innerHTML = enCocina.map(p => {
        const mesa = p.numerosMesas?.join(' + ') || 'Sin Mesa';
        const itemsTxt = p.detalles.map(det => det.nombrePlato).join(' · ');
        
        let progreso = 10;
        let color = 'var(--warning)';
        let texto = 'En espera de preparación';

        if (p.estado === 'PREPARANDO') {
            const totalUnidades = p.detalles.reduce((acc, det) => acc + (det.unidades?.length || det.cantidad), 0);
            const unidadesListas = p.detalles.reduce((acc, det) => acc + (det.unidades?.filter(u => u.estado === 'LISTO').length || 0), 0);
            progreso = totalUnidades > 0 ? Math.round((unidadesListas / totalUnidades) * 100) : 0;
            
            if (progreso === 0) progreso = 20;
            color = 'var(--info)';
            texto = `En preparación — ${progreso}%`;
        } else if (p.estado === 'LISTO') {
            progreso = 100;
            color = 'var(--success)';
            texto = 'Pedido listo para entrega — 100%';
        }

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
            </div>
        `;
    }).join('');
}

function showNotification(titulo, mensaje, tipo = "primary", icono = "fa-bell") {
    dom.notifTitulo.textContent = titulo;
    dom.notifMensaje.textContent = mensaje;
    
    dom.notification.className = 'notification';
    dom.notifIcon.className = `fa-solid ${icono}`;
    
    setTimeout(() => {
        dom.notification.classList.add(tipo);
        dom.notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        dom.notification.classList.remove('show');
    }, 4500);
}

function playBeep() {
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/beep-07a.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("El navegador bloqueó el audio hasta que el usuario interactúe."));
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
        alert("No se pudo abrir el detalle del pedido.");
    }
}