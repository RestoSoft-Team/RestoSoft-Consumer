import { apiCocina } from '../consumo/apiCocina.js';
import { connectWebSocket } from '../consumo/websocket.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { showNotification } from './notificaciones.js'; 
import { generarSidebar } from './create-sidebar.js';
import { API_BASE, TOKEN } from "../consumo/config.js";

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
    modalPlatillos: document.getElementById('modalPlatillos'),
    modalPlatillosBody: document.getElementById('modalPlatillosBody'),
    modalPlatillosCloseBtn: document.getElementById('modalPlatillosCloseBtn')
};

let pedidosData = []; 
let todosLosPedidosHoy = []; 
let estadoFiltro = 'TODOS';
let busquedaFiltro = '';
let isLoading = false;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    cargarPerfilUsuario();
    await cargarDatos();

    setInterval(actualizarTiemposEnVivo, 1000);

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
    if (isLoading) return;
    isLoading = true;
    
    try {
        const response = await fetch(`${API_BASE}/pedido`, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
        const todosLosPedidos = response.ok ? await response.json() : [];
        
        const hoy = new Date().setHours(0, 0, 0, 0);
        todosLosPedidosHoy = await Promise.all(
            todosLosPedidos
                .filter(p => new Date(p.fecha).setHours(0, 0, 0, 0) === hoy)
                .map(async p => {
                    if (!p.detalles || p.detalles.length === 0) {
                        const detalles = await apiCocina.getDetallesPedido(p.id);
                        return { ...p, detalles };
                    }
                    return p;
                })
        );

        pedidosData = todosLosPedidosHoy.filter(p => 
            p.estado === 'PENDIENTE' || p.estado === 'PREPARANDO' || p.estado === 'LISTO'
        );

        renderStats();
        renderTabla();
    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        dom.tablaPedidos.innerHTML = '<tr><td colspan="6" class="text-center text-danger p-4">Error de conexión.</td></tr>';
    } finally {
        setTimeout(() => { isLoading = false; }, 300);
    }
}

function getMinutosPreparacion(pedido) {
    let maxMinutos = 0;
    pedido.detalles?.forEach(det => {
        (det.unidades || []).forEach(u => {
            if (u.estado === 'PREPARANDO' && u.fechaInicio) {
                const minutos = Math.floor((Date.now() - new Date(u.fechaInicio).getTime()) / 60000);
                if (minutos > maxMinutos) maxMinutos = minutos;
            }
        });
    });
    return maxMinutos;
}

function getTiempoTotalPedido(pedido) {
    let primeraFechaInicio = null;
    let ultimaFechaListo = null;

    pedido.detalles?.forEach(det => {
        (det.unidades || []).forEach(u => {
            if (u.fechaInicio) {
                const inicio = new Date(u.fechaInicio).getTime();
                if (!primeraFechaInicio || inicio < primeraFechaInicio) primeraFechaInicio = inicio;
            }
            if (u.fechaListo) {
                const listo = new Date(u.fechaListo).getTime();
                if (!ultimaFechaListo || listo > ultimaFechaListo) ultimaFechaListo = listo;
            }
        });
    });

    if (primeraFechaInicio && ultimaFechaListo) {
        return Math.floor((ultimaFechaListo - primeraFechaInicio) / 60000);
    }
    return 0;
}

function estaRetrasado(pedido) {
    return getMinutosPreparacion(pedido) > TIEMPO_MAX_PREPARACION && pedido.estado === 'PREPARANDO';
}

function renderStats() {
    let activos = 0, listosHoy = 0, retrasados = 0, sumaTiempos = 0, contadorTiempos = 0;

    todosLosPedidosHoy.forEach(p => {
        if (p.estado === 'PENDIENTE' || p.estado === 'PREPARANDO') {
            activos++;
            if (p.estado === 'PREPARANDO' && getMinutosPreparacion(p) > TIEMPO_MAX_PREPARACION) {
                retrasados++;
            }
        } else if (p.estado === 'LISTO' || p.estado === 'ENTREGADO' || p.estado === 'PAGADO') {
            listosHoy++;
            const tiempo = getTiempoTotalPedido(p);
            if (tiempo > 0) {
                sumaTiempos += tiempo;
                contadorTiempos++;
            }
        }
    });

    dom.statActivos.textContent = activos;
    dom.statListos.textContent = listosHoy;
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
        const minutos = getMinutosPreparacion(p);
        
        const platosAgrupados = {};
        p.detalles.forEach(d => {
            const nombre = d.nombrePlato;
            if (!platosAgrupados[nombre]) platosAgrupados[nombre] = 0;
            platosAgrupados[nombre] += d.cantidad || (d.unidades ? d.unidades.length : 0);
        });
        const platillos = Object.keys(platosAgrupados).map(n => `${platosAgrupados[n]}x ${n}`).join(', ');
        
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
                <td data-label="Tiempo"><strong class="tiempo-celda" data-id="${p.id}">${minutos} min</strong></td>
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

function actualizarTiemposEnVivo() {
    document.querySelectorAll('.tiempo-celda').forEach(el => {
        const idPedido = parseInt(el.dataset.id);
        const pedido = pedidosData.find(p => p.id === idPedido);
        if (pedido && pedido.estado === 'PREPARANDO') {
            const minutos = getMinutosPreparacion(pedido);
            el.textContent = `${minutos} min`;
        }
    });
}

async function cargarPerfilUsuario() {



    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");
    if (!infoPerfilContainer) return;

    try {
        const perfilData = await apiProfile.obtenerInfoMe();


        const rolesPermitidos = ["COCINA", "ADMINISTRADOR"];

        if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
            console.error("Acceso no autorizado");

            const codigo = "403";
            const mensaje = encodeURIComponent(
                "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
            );

            window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
        }

        generarSidebar('sidebar-container', "cocina", "preparacion", perfilData.rol.nombre);

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

function abrirModalPlatillos(idPedido) {
    const pedido = pedidosData.find(p => p.id === idPedido);
    if (!pedido) return;

    const platosAgrupados = {};
    pedido.detalles.forEach(d => {
        const nombre = d.nombrePlato;
        if (!platosAgrupados[nombre]) {
            platosAgrupados[nombre] = { cantidad: 0, categoria: d.categoriaPlato || '' };
        }
        platosAgrupados[nombre].cantidad += d.cantidad || (d.unidades ? d.unidades.length : 0);
    });

    const itemsHTML = Object.keys(platosAgrupados).map(nombre => {
        const data = platosAgrupados[nombre];
        return `
            <div class="platillo-item-modal">
                <span><strong>${data.cantidad}x</strong> ${nombre}</span>
                <span style="color: var(--gray); font-size: 13px;">${data.categoria}</span>
            </div>
        `;
    }).join('');

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

        showNotification("Pedido Listo", `El pedido #RS-${idPedido} fue marcado como listo para entregar.`, "success", "fa-circle-check");
        await cargarDatos();
    } catch (error) {
        showNotification("Error", "No se pudo actualizar el pedido.", "error", "fa-triangle-exclamation");
        if (btn) btn.disabled = false;
    }
}