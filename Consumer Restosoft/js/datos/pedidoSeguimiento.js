import { apiSeguimiento as api } from '../consumo/apiSeguimientoPedido.js';

const ID_EMPRESA = 1;
const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const dom = {
    tablaPedidos: document.getElementById('tablaPedidos'),
    filtersContainer: document.getElementById('filtersContainer'),
    btnActualizar: document.getElementById('btnActualizar')
};

let todosLosPedidos = [];
let filtroActivo = 'TODOS';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    await cargarPedidos();
    
    dom.filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        dom.filtersContainer.querySelector('.active')?.classList.remove('active');
        btn.classList.add('active');
        filtroActivo = btn.dataset.filter;
        renderTabla();
    });

    dom.btnActualizar.addEventListener('click', cargarPedidos);

    // Actualizar cronómetros cada segundo visualmente
    setInterval(actualizarTiemposDOM, 1000);
    
    // Auto-recargar datos cada 15 segundos para ver cambios hechos desde cocina
    setInterval(cargarPedidos, 15000);
}

async function cargarPedidos() {
    try {
        todosLosPedidos = await api.getPedidos(ID_EMPRESA);
        renderTabla();
    } catch (error) {
        console.error("Error:", error);
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

    dom.tablaPedidos.innerHTML = '';

    pedidosFiltrados.forEach(p => {
        const tr = document.createElement('tr');
        
        let productosHTML = '<div class="product-units">';
        let total = 0;
        
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
                        // 👇 EN LUGAR DE BOTONES, PONEMOS BADGES VISUALES 👇
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

        tr.innerHTML = `
            <td data-label="ID"><div class="order-id">#RS-${p.id}</div></td>
            <td data-label="Mesero"><div class="client-name">${p.nombresMeseros?.join(', ') || 'Sin asignar'}</div></td>
            <td data-label="Mesa(s)">${p.numerosMesas?.join(', ') || 'N/A'}</td>
            <td data-label="Productos">${productosHTML}</td>
            <td data-label="Total"><strong>${fmtCOP.format(total)}</strong></td>
        `;
        dom.tablaPedidos.appendChild(tr);
    });
    
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
