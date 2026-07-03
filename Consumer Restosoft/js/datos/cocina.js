import { apiCocina } from '../consumo/apiCocina.js';
import { connectWebSocket } from '../consumo/websocket.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { generarSidebar } from './create-sidebar.js';


const dom = {
    colPendientes: document.getElementById('col-pendientes'),
    colPreparando: document.getElementById('col-preparando'),
    colListos: document.getElementById('col-listos'),
    countPendientes: document.getElementById('count-pendientes'),
    countPreparando: document.getElementById('count-preparando'),
    countListos: document.getElementById('count-listos'),
    statPendientes: document.getElementById('stat-pendientes'),
    statPreparando: document.getElementById('stat-preparando'),
    statListos: document.getElementById('stat-listos'),
    notification: document.getElementById('notification')
};

let pedidosData = [];

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    cargarPerfilUsuario();
    await cargarDatos();
    connectWebSocket((canal, data) => {
        if (canal === 'COCINA') {
            if (data.tipo === 'NUEVO_PEDIDO' || data.tipo === 'PRODUCTO_AGREGADO' || data.tipo === 'ESTADO_ACTUALIZADO') {
                cargarDatos();
            }
        }
    });
}

async function cargarDatos() {
    try {
        const pedidos = await apiCocina.getPedidosActivos();
        pedidosData = await Promise.all(pedidos.map(async p => {
            const detalles = await apiCocina.getDetallesPedido(p.id);
            return { ...p, detalles };
        }));
        renderizarTablero();
    } catch (error) {
        console.error("Error al cargar pedidos de cocina:", error);
    }
}

function renderizarTablero() {
    let pendientes = 0, preparando = 0, listos = 0;

    [dom.colPendientes, dom.colPreparando, dom.colListos].forEach(col => {
        const emptyText = col.querySelector('.empty-text');
        if (emptyText && pedidosData.length > 0) emptyText.remove();
    });

    const currentIds = new Set();

    pedidosData.forEach(p => {
        currentIds.add(String(p.id));

        if (p.estado === 'PENDIENTE') pendientes++;
        else if (p.estado === 'PREPARANDO') preparando++;
        else if (p.estado === 'LISTO') listos++;

        let card = document.querySelector(`[data-pedido-id="${p.id}"]`);
        const isNew = !card;

        if (isNew) {
            card = document.createElement('div');
            card.dataset.pedidoId = p.id;
        }

        card.className = `order-card estado-${p.estado}`;
        if (isNew) card.classList.add('card-entering');

        card.innerHTML = obtenerInnerHTMLTarjeta(p);

        let columnaDestino;
        if (p.estado === 'PENDIENTE') columnaDestino = dom.colPendientes;
        else if (p.estado === 'PREPARANDO') columnaDestino = dom.colPreparando;
        else if (p.estado === 'LISTO') columnaDestino = dom.colListos;

        if (card.parentNode !== columnaDestino) {
            columnaDestino.appendChild(card);
        }
    });

    document.querySelectorAll('.order-card').forEach(card => {
        if (!currentIds.has(String(card.dataset.pedidoId))) {
            card.remove();
        }
    });

    if (pendientes === 0) dom.colPendientes.innerHTML = '<p class="empty-text">No hay pedidos activos.</p>';
    if (preparando === 0) dom.colPreparando.innerHTML = '<p class="empty-text">No hay pedidos en preparación.</p>';
    if (listos === 0) dom.colListos.innerHTML = '<p class="empty-text">No hay pedidos listos.</p>';

    dom.countPendientes.textContent = pendientes;
    dom.countPreparando.textContent = preparando;
    dom.countListos.textContent = listos;
    dom.statPendientes.textContent = pendientes;
    dom.statPreparando.textContent = preparando;
    dom.statListos.textContent = listos;

    document.querySelectorAll('.btn-accion').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idPedido = parseInt(e.currentTarget.dataset.id);
            const idUnidad = e.currentTarget.dataset.unidad ? parseInt(e.currentTarget.dataset.unidad) : null;
            const accion = e.currentTarget.dataset.accion;
            await procesarAccion(idPedido, accion, idUnidad);
        });
    });
}

function obtenerInnerHTMLTarjeta(pedido) {
    const fechaPedido = new Date(pedido.fecha);
    const minutosPasados = Math.floor((Date.now() - fechaPedido.getTime()) / 60000);
    const esTardio = minutosPasados > 15;
    const tiempoTxt = minutosPasados === 0 ? 'Justo ahora' : `Hace ${minutosPasados} min`;

    let obsHTML = '';
    if (pedido.observaciones && pedido.observaciones.trim() !== '' && pedido.observaciones.trim().toLowerCase() !== 'sin observaciones') {
        obsHTML = `
            <div class="order-obs">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>${pedido.observaciones}</span>
            </div>
        `;
    }

    let itemsHTML = '';
    let botonHTML = '';

    if (pedido.estado === 'LISTO') {
        itemsHTML = pedido.detalles.map(det => {
            const total = det.unidades?.length || det.cantidad;
            return `<li class="item-done"><strong>${total}x</strong> ${det.nombrePlato} <i class="fa-solid fa-circle-check"></i></li>`;
        }).join('');
        botonHTML = `<button class="btn-kds btn-delivered" disabled><i class="fa-solid fa-hand-holding-heart"></i> Listo para entregar</button>`;
    } else {
        let unidadesPendientesHTML = '';
        let unidadesListasHTML = '';
        let contadorUnidad = 1;

        // Aplanar y ordenar unidades (Nuevos arriba, Preparando medio, Listos abajo)
        let allUnits = [];
        pedido.detalles.forEach(det => {
            (det.unidades || []).forEach(u => {
                allUnits.push({ ...u, nombrePlato: det.nombrePlato });
            });
        });

        allUnits.sort((a, b) => {
            const order = { 'PENDIENTE': 1, 'PREPARANDO': 2, 'LISTO': 3 };
            return order[a.estado] - order[b.estado];
        });

                allUnits.forEach(u => {
            const textoPlato = `<strong>${u.nombrePlato}</strong> <span class="unit-num">(U.${contadorUnidad})</span>`;
            
            if (u.estado === 'LISTO' || u.estado === 'ENTREGADO') {
                unidadesListasHTML += `<li class="item-row item-done"><span>${textoPlato}</span> <i class="fa-solid fa-circle-check"></i></li>`;
            }
            else if (u.estado === 'PREPARANDO') {
                unidadesPendientesHTML += `
                    <li class="item-row">
                        <span>${textoPlato} <span class="badge-cooking">Preparando</span></span>
                        <button class="btn-item-listo btn-accion" data-id="${pedido.id}" data-unidad="${u.id}" data-accion="UNIDAD_LISTA">
                            <i class="fa-solid fa-check"></i> Listo
                        </button>
                    </li>
                `;
            }
            else {
                unidadesPendientesHTML += `
                    <li class="item-row">
                        <span>${textoPlato} <span class="badge-pending">Nuevo</span></span>
                        ${pedido.estado === 'PREPARANDO' ? `<span class="info-mini">En cola</span>` : ''}
                    </li>
                `;
            }
            contadorUnidad++;
        });

        itemsHTML = unidadesPendientesHTML;
        if (unidadesListasHTML !== '') {
            itemsHTML += `<li class="separator">Completados</li>${unidadesListasHTML}`;
        }

        if (pedido.estado === 'PENDIENTE') {
            botonHTML = `<button class="btn-kds btn-start btn-accion" data-id="${pedido.id}" data-accion="PREPARANDO"><i class="fa-solid fa-fire"></i> Iniciar Preparación</button>`;
        } else {
            botonHTML = `<div class="info-preparando">Marca las unidades conforme las terminas</div>`;
        }
    }

    return `
        <div class="order-top">
            <div class="order-id">#RS-${pedido.id}</div>
            <div class="table-badge">${pedido.numerosMesas?.join(' + ') || 'Sin Mesa'}</div>
        </div>
        ${obsHTML}
        <ul class="order-items">
            ${itemsHTML}
        </ul>
        <div class="order-footer">
            <div class="time ${esTardio ? 'late' : ''}">
                <i class="fa-solid fa-clock"></i> ${tiempoTxt} ${esTardio ? '<i class="fa-solid fa-exclamation-triangle"></i>' : ''}
            </div>
        </div>
        <div style="margin-top: 15px;">
            ${botonHTML}
        </div>
    `;
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

        generarSidebar('sidebar-container', "cocina", "pedidos_cocina", perfilData.rol.nombre);


        const empresaData = perfilData?.empresa || perfilData?.Data?.empresa;
        const nombreRaw = empresaData?.nombre || "";

        if (nombreRaw.trim() !== "" && nombreEmpresaContainer) {
            nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
        } else if (nombreEmpresaContainer) {
            nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
        }

        const urlPerfil = "perfil.html";

        if (perfilData && perfilData.usuario) {
            const iniciales =
                (
                    (perfilData.usuario.nombres || "").substring(0, 1) +
                    (perfilData.usuario.apellidos || "").substring(0, 1)
                ).toUpperCase() || "EP";

            const avatarHTML = perfilData.usuario.imagenUrl
                ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />`
                : `<div class="profile-text-avatar">${iniciales}</div>`;

            const nombreCompleto =
                `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() ||
                "Usuario sin nombre";

            const rol = perfilData.rol?.nombre || "Sin rol asignado";

            infoPerfilContainer.innerHTML = `
                <a href="${urlPerfil}" class="profile-link">
                    ${avatarHTML}
                    <div class="profile-info">
                        <strong>${nombreCompleto}</strong>
                        <div style="font-size: 13px; color: var(--gray)">
                            ${rol}
                        </div>
                    </div>
                </a>
            `;
        } else {
            infoPerfilContainer.innerHTML = `
                <a href="${urlPerfil}" class="profile-link">
                    <div class="profile-text-avatar">UA</div>
                    <div class="profile-info">
                        <strong>Usuario Anónimo</strong>
                        <div style="font-size: 13px; color: var(--gray)">Invitado</div>
                    </div>
                </a>
            `;
        }
    } catch (error) {
        console.error("Error al cargar el perfil:", error);
        infoPerfilContainer.innerHTML = `
            <a href="perfil.html" class="profile-link">
                <div class="profile-text-avatar">EP</div>
                <div class="profile-info">
                    <strong>Error de conexión</strong>
                    <div style="font-size: 13px; color: var(--gray)">No se pudo cargar</div>
                </div>
            </a>
        `;
    }
}

async function procesarAccion(idPedido, estadoDestino, idUnidad = null) {
    const pedido = pedidosData.find(p => p.id === idPedido);
    if (!pedido) return;

    let unidadesActualizar = [];
    let nuevoEstadoUnidad = '';

    if (estadoDestino === 'PREPARANDO') {
        nuevoEstadoUnidad = 'PREPARANDO';
        pedido.detalles.forEach(det => {
            (det.unidades || []).forEach(u => {
                if (u.estado === 'PENDIENTE') unidadesActualizar.push(u.id);
            });
        });
    } else if (estadoDestino === 'UNIDAD_LISTA' && idUnidad) {
        nuevoEstadoUnidad = 'LISTO';
        unidadesActualizar.push(idUnidad);
    }

    if (unidadesActualizar.length === 0) return;

    const btn = document.querySelector(`.btn-accion[data-unidad="${idUnidad}"]`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        const promesas = unidadesActualizar.map(id => apiCocina.actualizarUnidad(id, nuevoEstadoUnidad));
        await Promise.all(promesas);
        showNotification("Unidad Actualizada", `El estado ha cambiado.`, "success");
        await cargarDatos();
    } catch (error) {
        showNotification("Error", "No se pudo actualizar el estado.", "danger");
        if (btn) btn.disabled = false;
    }
}
