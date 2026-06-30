import { apiCocina } from '../consumo/apiCocina.js';
import { connectWebSocket } from '../consumo/websocket.js'; // 👈 IMPORT

const TIEMPO_MAX_PREPARACION = 15;

const dom = {
    statActivos: document.getElementById('stat-activos'),
    statListos: document.getElementById('stat-listos'),
    statRetrasados: document.getElementById('stat-retrasados'),
    statTiempo: document.getElementById('stat-tiempo'),
    tablaPedidos: document.getElementById('tablaPedidos'),
    inputBusqueda: document.getElementById('inputBusqueda'),
    filtroEstado: document.getElementById('filtroEstado'),
    btnActualizar: document.getElementById('btnActualizar'),
    notification: document.getElementById('notification'),
    modalPlatillos: document.getElementById('modalPlatillos'),
    modalPlatillosBody: document.getElementById('modalPlatillosBody'),
    modalPlatillosCloseBtn: document.getElementById('modalPlatillosCloseBtn')
};

let pedidosData = [];
let estadoFiltro = 'TODOS';
let busquedaFiltro = '';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    await cargarDatos();

    // 2. Conexión WebSocket para tiempo real
    connectWebSocket((canal, data) => {
        if (canal === 'COCINA') {
            if (data.tipo === 'NUEVO_PEDIDO' || data.tipo === 'PRODUCTO_AGREGADO' || data.tipo === 'ESTADO_ACTUALIZADO') {
                cargarDatos();
            }
        }
    });

    dom.inputBusqueda.addEventListener('input', (e) => {
        busquedaFiltro = e.target.value.toLowerCase();
        renderTabla();
    });

    dom.filtroEstado.addEventListener('change', (e) => {
        estadoFiltro = e.target.value;
        renderTabla();
    });

    dom.btnActualizar.addEventListener('click', cargarDatos);

    dom.modalPlatillosCloseBtn.addEventListener('click', () => dom.modalPlatillos.style.display = 'none');
    dom.modalPlatillos.addEventListener('click', (e) => {
        if (e.target === dom.modalPlatillos) dom.modalPlatillos.style.display = 'none';
    });
}

async function cargarDatos() {
    try {
        pedidosData = await apiCocina.getPedidosActivos();
        pedidosData = await Promise.all(pedidosData.map(async p => {
            const detalles = await apiCocina.getDetallesPedido(p.id);
            return { ...p, detalles };
        }));
        renderStats();
        renderTabla();
    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        dom.tablaPedidos.innerHTML = '<tr><td colspan="6" class="text-center text-danger p-4">Error de conexión.</td></tr>';
    }
}

function getMinutosPreparacion(pedido) {
    let maxMinutos = 0;
    pedido.detalles.forEach(det => {
        (det.unidades || []).forEach(u => {
            if (u.estado === 'PREPARANDO' && u.fechaInicio) {
                const minutos = Math.floor((Date.now() - new Date(u.fechaInicio).getTime()) / 60000);
                if (minutos > maxMinutos) maxMinutos = minutos;
            }
        });
    });
    return maxMinutos;
}

function estaRetrasado(pedido) {
    return getMinutosPreparacion(pedido) > TIEMPO_MAX_PREPARACION && pedido.estado === 'PREPARANDO';
}

function renderStats() {
    let activos = 0;
    let listos = 0;
    let retrasados = 0;
    let sumaTiempos = 0;
    let contadorTiempos = 0;

    pedidosData.forEach(p => {
        const minutos = getMinutosPreparacion(p);
        if (minutos > 0) {
            sumaTiempos += minutos;
            contadorTiempos++;
        }

        if (p.estado === 'PREPARANDO') {
            activos++;
            if (minutos > TIEMPO_MAX_PREPARACION) retrasados++;
        } else if (p.estado === 'LISTO') {
            listos++;
        }
    });

    dom.statActivos.textContent = activos;
    dom.statListos.textContent = listos;
    dom.statRetrasados.textContent = retrasados;
    dom.statTiempo.textContent = contadorTiempos > 0 ? `${Math.round(sumaTiempos / contadorTiempos)}m` : '0m';
}

function renderTabla() {
    let pedidosFiltrados = pedidosData.filter(p => {
        const mesasTxt = (p.numerosMesas || []).join(' ').toLowerCase();
        const matchBusqueda = busquedaFiltro === '' || mesasTxt.includes(busquedaFiltro);
        
        let matchEstado = true;
        if (estadoFiltro === 'PREPARANDO') matchEstado = p.estado === 'PREPARANDO' && !estaRetrasado(p);
        else if (estadoFiltro === 'LISTO') matchEstado = p.estado === 'LISTO';
        else if (estadoFiltro === 'RETRASADO') matchEstado = estaRetrasado(p);

        return matchBusqueda && matchEstado;
    });

    if (pedidosFiltrados.length === 0) {
        dom.tablaPedidos.innerHTML = '<tr><td colspan="6" class="text-center p-4">No hay pedidos que coincidan con la búsqueda.</td></tr>';
        return;
    }

    dom.tablaPedidos.innerHTML = pedidosFiltrados.map(p => {
        const mesa = p.numerosMesas?.join(' + ') || 'N/A';
        const platillos = p.detalles.map(d => `${d.cantidad}x ${d.nombrePlato}`).join(', ');
        const minutos = getMinutosPreparacion(p);
        
        let estadoTxt = p.estado;
        let estadoClass = p.estado;
        let botonHTML = '';

        if (p.estado === 'PREPARANDO') {
            if (estaRetrasado(p)) {
                estadoTxt = 'RETRASADO';
                estadoClass = 'RETRASADO';
            }
            botonHTML = `<button class="btn-soft-success btn-marcar-listo" data-id="${p.id}">Marcar Listo</button>`;
        } else if (p.estado === 'LISTO') {
            botonHTML = `<button class="btn-soft-disabled" disabled>Listo</button>`;
        } else {
            botonHTML = `<button class="btn-soft-success btn-marcar-listo" data-id="${p.id}">Iniciar y Listo</button>`;
        }

        return `
            <tr>
                <td data-label="Pedido"><div class="pedido-id">#RS-${p.id}</div></td>
                <td data-label="Mesa"><span class="mesa-badge">${mesa}</span></td>
                <td data-label="Platillos">
                    <div class="platillos-list" data-id="${p.id}" title="Click para ver detalle">
                        ${platillos}
                    </div>
                </td>
                <td data-label="Tiempo"><strong>${minutos} min</strong></td>
                <td data-label="Estado"><span class="status ${estadoClass}">${estadoTxt}</span></td>
                <td data-label="Acción">${botonHTML}</td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.btn-marcar-listo').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            const idPedido = parseInt(e.currentTarget.dataset.id);
            await marcarPedidoListo(idPedido);
        });
    });

    document.querySelectorAll('.platillos-list').forEach(div => {
        div.addEventListener('click', (e) => {
            const idPedido = parseInt(e.currentTarget.dataset.id);
            abrirModalPlatillos(idPedido);
        });
    });
}

function abrirModalPlatillos(idPedido) {
    const pedido = pedidosData.find(p => p.id === idPedido);
    if (!pedido) return;

    const itemsHTML = pedido.detalles.map(d => `
        <div class="platillo-item-modal">
            <span><strong>${d.cantidad}x</strong> ${d.nombrePlato}</span>
            <span style="color: var(--gray); font-size: 13px;">${d.categoriaPlato || ''}</span>
        </div>
    `).join('');

    dom.modalPlatillosBody.innerHTML = `
        <p style="color: var(--gray); margin-bottom: 15px;">Pedido #RS-${pedido.id} - Mesa: ${pedido.numerosMesas?.join(' + ') || 'N/A'}</p>
        ${itemsHTML}
    `;
    dom.modalPlatillos.style.display = 'flex';
}

async function marcarPedidoListo(idPedido) {
    const pedido = pedidosData.find(p => p.id === idPedido);
    if (!pedido) return;

    let unidadesActualizar = [];
    pedido.detalles.forEach(det => {
        (det.unidades || []).forEach(u => {
            if (u.estado === 'PREPARANDO' || u.estado === 'PENDIENTE') {
                unidadesActualizar.push(u.id);
            }
        });
    });

    if (unidadesActualizar.length === 0) return;

    try {
        const btn = document.querySelector(`.btn-marcar-listo[data-id="${idPedido}"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        }

        const promesas = unidadesActualizar.map(id => apiCocina.actualizarUnidad(id, 'LISTO'));
        await Promise.all(promesas);

        showNotification("Pedido Listo", `El pedido #RS-${idPedido} fue marcado como listo para entregar.`, "success");
        // El WebSocket se encargará de recargar, pero forzamos por optimismo:
        await cargarDatos();
    } catch (error) {
        showNotification("Error", "No se pudo actualizar el pedido.", "danger");
        if (btn) btn.disabled = false;
    }
}

function showNotification(titulo, mensaje, tipo = 'success') {
    const notification = dom.notification;
    const iconDiv = notification.querySelector('.notification-icon');
    const strong = notification.querySelector('h5');
    const textDiv = notification.querySelector('p');

    notification.style.borderLeftColor = '';
    iconDiv.style.background = '';
    iconDiv.style.color = '';
    iconDiv.innerHTML = '';

    if (tipo === 'success') {
        notification.style.borderLeftColor = 'var(--success)';
        iconDiv.style.background = 'rgba(61, 139, 92, 0.12)';
        iconDiv.style.color = 'var(--success)';
        iconDiv.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else if (tipo === 'danger') {
        notification.style.borderLeftColor = 'var(--danger)';
        iconDiv.style.background = 'rgba(187, 58, 75, 0.12)';
        iconDiv.style.color = 'var(--danger)';
        iconDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    }

    strong.textContent = titulo;
    textDiv.textContent = mensaje;

    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3500);
}