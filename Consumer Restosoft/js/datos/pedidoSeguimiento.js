import { apiSeguimiento as api } from '../consumo/apiSeguimientoPedido.js';
import { connectWebSocket } from '../consumo/websocket.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { generarSidebar } from './create-sidebar.js';

const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    tablaPedidos: document.getElementById('tablaPedidos'),
    filtersContainer: document.getElementById('filtersContainer')
};

let todosLosPedidos = [];
let filtroActivo = 'TODOS';
let isLoading = false; 

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    cargarPerfilUsuario();
    await cargarPedidos();
    
    dom.filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        dom.filtersContainer.querySelector('.active')?.classList.remove('active');
        btn.classList.add('active');
        filtroActivo = btn.dataset.filter;
        renderTabla();
    });

    setInterval(actualizarTiemposDOM, 1000);
    
    // 👇 WEBSOCKET EN TIEMPO REAL
    connectWebSocket((canal, data) => {
        if (canal === 'COCINA') {
            cargarPedidos(); // Recarga silenciosa y animada
        }
    });
}

async function cargarPedidos() {
    if (isLoading) return; // Si ya está cargando, ignora las peticiones duplicadas
    isLoading = true;
    
    try {
        todosLosPedidos = await api.getPedidos();
        renderTabla();
    } catch (error) {
        console.error("Error:", error);
    } finally {
        // 👇 Pequeño delay (debounce) para evitar que 3 websockets seguidos saturen el servidor
        setTimeout(() => { isLoading = false; }, 500);
    }
}

function renderTabla() {
    let pedidosFiltrados = todosLosPedidos;
    if (filtroActivo !== 'TODOS') {
        pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === filtroActivo);
    }

    if (pedidosFiltrados.length === 0) {
        dom.tablaPedidos.innerHTML = '<tr><td colspan="5" class="empty-state">No hay pedidos en este estado.</td></tr>';
        return;
    }

    // 👇 Inyectamos todo el HTML de una sola vez para evitar parpadeos (Reflow)
    let htmlFinal = pedidosFiltrados.map(p => {
        let total = 0;
        let productosHTML = '<div class="product-units">';
        
        if (p.detalles && p.detalles.length > 0) {
            p.detalles.forEach(det => {
                total += det.precioUnitario * det.cantidad;
                const unidades = det.unidades || [];
                
                if (unidades.length === 0) {
                    productosHTML += `
                        <div class="unit-card PENDIENTE">
                            <div class="unit-info">
                                <span class="unit-name">${det.nombrePlato}</span>
                                <span class="unit-type">${det.categoriaPlato}</span>
                            </div>
                            <div class="unit-actions">
                                <span class="unit-timer">00:00</span>
                                <span class="unit-badge PENDIENTE">Pendiente</span>
                            </div>
                        </div>`;
                } else {
                    unidades.forEach(u => {
                        let badge = `<span class="unit-badge ${u.estado}">${u.estado}</span>`;

                        productosHTML += `
                            <div class="unit-card ${u.estado}">
                                <div class="unit-info">
                                    <span class="unit-name">${det.nombrePlato}</span>
                                    <span class="unit-type">${det.categoriaPlato}</span>
                                </div>
                                <div class="unit-actions">
                                    <span class="unit-timer" 
                                          data-start="${u.fechaInicio ? new Date(u.fechaInicio).getTime() : 0}" 
                                          data-end="${u.fechaListo ? new Date(u.fechaListo).getTime() : 0}">
                                        00:00
                                    </span>
                                    ${badge}
                                </div>
                            </div>`;
                    });
                }
            });
        } else {
            productosHTML += '<span style="color:var(--gray); font-size:13px;">Sin productos</span>';
        }
        productosHTML += '</div>';

        return `
            <tr>
                <td data-label="ID"><div class="order-id">#RS-${p.id}</div></td>
                <td data-label="Mesero"><div class="client-name">${p.nombresMeseros?.join(', ') || 'Sin asignar'}</div></td>
                <td data-label="Mesa(s)">${p.numerosMesas?.join(', ') || 'N/A'}</td>
                <td data-label="Productos">${productosHTML}</td>
                <td data-label="Total"><strong>${fmtCOP.format(total)}</strong></td>
            </tr>`;
    }).join('');

    dom.tablaPedidos.innerHTML = htmlFinal;
    actualizarTiemposDOM();
}

function actualizarTiemposDOM() {
    document.querySelectorAll('.unit-timer').forEach(el => {
        const start = parseInt(el.dataset.start);
        const end = parseInt(el.dataset.end);
        
        if (start === 0) {
            el.textContent = '00:00';
            el.className = 'unit-timer';
            return;
        }

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

    generarSidebar('sidebar-container', "pedidos", "seguimiento", perfilData.rol.nombre);

    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");
    if (!infoPerfilContainer) return;

    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        const nombreRaw = perfilData?.empresa?.nombre || "";
        if (nombreRaw.trim() !== "" && nombreEmpresaContainer) nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
        else if (nombreEmpresaContainer) nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;

        const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
        const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />` : `<div class="profile-text-avatar">${iniciales}</div>`;
        const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario";
        const rol = perfilData.rol?.nombre || "Empleado";

        infoPerfilContainer.innerHTML = `<a href="perfil.html" class="profile-link" style="display:flex; align-items:center; gap:14px; text-decoration:none; color:inherit;">${avatarHTML}<div><strong>${nombreCompleto}</strong><div style="font-size:13px; color:var(--gray);">${rol}</div></div></a>`;
    } catch (e) {
        console.error("Error perfil:", e);
    }
}