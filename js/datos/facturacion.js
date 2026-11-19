import { apiVentas } from '../consumo/apiVentas.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { apiPedidoDetalle } from '../consumo/apiDetallePedido.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd

const tbody = document.getElementById('tbodyFacturas');
const totalVentasEl = document.getElementById('totalVentas');
const totalPagadasEl = document.getElementById('totalPagadas');
const totalPendientesEl = document.getElementById('totalPendientes');
const balanceEl = document.getElementById('balance');

function injectModalDetalleStyles() {
    if (document.getElementById('modal-detalle-styles')) return;
    const styles = `
    .modal-detail { position: fixed; inset: 0; background: rgba(38, 47, 60, 0.55); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; z-index: 9999; animation: fadeIn 0.2s ease; }
    .modal-detail-card { width: 90%; max-width: 550px; background: #ffffff; border-radius: 28px; padding: 30px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); animation: scaleIn 0.25s ease; }
    .modal-detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f3f4f6; padding-bottom: 15px; }
    .modal-detail-header h3 { margin: 0; font-size: 22px; font-weight: 800; color: #111827; }
    .modal-detail-close { background: none; border: none; font-size: 28px; cursor: pointer; color: #9ca3af; line-height: 1; }
    .modal-detail-close:hover { color: #374151; }
    .modal-detail-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: 14px; color: #4b5563; }
    .modal-detail-info-grid strong { color: #111827; }
    .modal-detail-items-container { max-height: 200px; overflow-y: auto; margin-bottom: 20px; border: 1px solid #f3f4f6; border-radius: 12px; padding: 10px; }
    .modal-detail-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 800; color: #111827; padding-top: 15px; border-top: 1px solid #f3f4f6; }
    .modal-detail-items-table { width: 100%; border-collapse: collapse; }
    .modal-detail-items-table th { font-size: 13px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #eee; padding-bottom: 8px; }
    .modal-detail-items-table td { font-size: 13px; color: #374151; padding: 8px 0; border-bottom: 1px solid #f9fafb; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = 'modal-detalle-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
}

async function mostrarModalDetalle(idVenta, idPedido, cliente, valorTotal, observaciones, metodos, estado) {
    injectModalDetalleStyles();
    
    const modal = document.createElement('div');
    modal.className = 'modal-detail';
    modal.innerHTML = `
        <div class="modal-detail-card">
            <div class="modal-detail-header">
                <h3>Detalle de Factura #F-${idVenta}</h3>
                <button class="modal-detail-close">&times;</button>
            </div>
            <div class="modal-detail-body">
                <div class="modal-detail-info-grid">
                    <div><strong>Cliente:</strong> ${cliente}</div>
                    <div><strong>Mesa:</strong> Mesa ${idPedido || 'N/A'}</div>
                    <div><strong>Estado:</strong> ${estado}</div>
                    <div><strong>Método de Pago:</strong> ${metodos}</div>
                </div>
                <div style="font-size: 13px; color: #6b7280; margin-bottom: 15px; background: #f9fafb; padding: 10px; border-radius: 8px;">
                    <strong>Observaciones:</strong> ${observaciones || 'Ninguna'}
                </div>
                <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 10px;">Productos Consumidos</h4>
                <div class="modal-detail-items-container">
                    <p class="text-muted text-center" style="font-size: 13px; padding: 15px;">Cargando ítems...</p>
                </div>
                <div class="modal-detail-total-row">
                    <span>Total Facturado:</span>
                    <span style="color: #6b1e28;">$${valorTotal.toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const cerrarModal = () => { modal.remove(); };
    modal.querySelector('.modal-detail-close').onclick = cerrarModal;
    modal.onclick = (e) => { if (e.target === modal) cerrarModal(); };

    try {
        const items = await apiPedidoDetalle.getDetallesPedido(idPedido);
        const container = modal.querySelector('.modal-detail-items-container');
        if (items && items.length > 0) {
            container.innerHTML = `
                <table class="modal-detail-items-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Producto</th>
                            <th style="text-align: center;">Cant.</th>
                            <th style="text-align: right;">Precio</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td style="text-align: left;">${item.nombrePlato || 'Plato'}</td>
                                <td style="text-align: center;">${item.cantidad}</td>
                                <td style="text-align: right;">$${item.precioUnitario.toLocaleString()}</td>
                                <td style="text-align: right;">$${(item.cantidad * item.precioUnitario).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<p class="text-muted text-center" style="font-size: 13px; padding: 15px;">No se encontraron detalles de consumo para esta factura.</p>';
        }
    } catch (error) {
        console.error('Error fetching details:', error);
        const container = modal.querySelector('.modal-detail-items-container');
        container.innerHTML = '<p class="text-danger text-center" style="font-size: 13px; padding: 15px;">Error al cargar detalles de consumo.</p>';
    }
}

async function cargarDatos(EMPRESA_ID) {
    try {
        const ventas = await apiVentas.listarVentas();
        const totalDia = await apiVentas.obtenerTotalDia(today);

        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay facturas registradas.</td></tr>';
        } else {
            tbody.innerHTML = '';
            ventas.forEach(v => {
                const tr = document.createElement('tr');
                tr.className = 'table-row';
                
                const estado = v.estadoPago === 'PAGADO' ? 'Pagado' : 'Pendiente';
                const badgeClass = estado === 'Pagado' ? 'paid' : 'pending';

                let cliente = 'Consumidor Final';
                if (v.observaciones && v.observaciones.startsWith('Cliente: ')) {
                    const parts = v.observaciones.split('. ');
                    cliente = parts[0].replace('Cliente: ', '');
                } else {
                    cliente = v.nombreUsuario || 'Consumidor Final';
                }

                const metodos = v.metodosPago && v.metodosPago.length > 0 ? v.metodosPago.join(', ') : 'N/A';

                tr.innerHTML = `
                    <td data-label="Factura" class="item-name">#F-${v.idVenta}</td>
                    <td data-label="Cliente">${cliente}</td>
                    <td data-label="Mesa">Mesa ${v.idPedido || 'N/A'}</td>
                    <td data-label="Total">$${v.valorTotal.toLocaleString()}</td>
                    <td data-label="Estado"><span class="badge ${badgeClass}">${estado}</span></td>
                    <td data-label="Acciones">
                        <button class="btn btn-sm btn-outline-primary btn-ver-detalle" 
                            data-id-pedido="${v.idPedido}" 
                            data-id-venta="${v.idVenta}" 
                            data-cliente="${cliente}"
                            data-valor-total="${v.valorTotal}" 
                            data-observaciones="${v.observaciones || ''}" 
                            data-metodos="${metodos}" 
                            data-estado="${estado}"
                            style="border-radius: 12px; font-size: 12px; padding: 4px 10px; border-color: #6b1e28; color: #6b1e28; font-weight: 600; background: none; transition: 0.25s;">
                            <i class="fa-solid fa-eye"></i> Detalle
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await mostrarModalDetalle(
                        btn.dataset.idVenta, 
                        btn.dataset.idPedido, 
                        btn.dataset.cliente, 
                        parseFloat(btn.dataset.valorTotal), 
                        btn.dataset.observaciones, 
                        btn.dataset.metodos, 
                        btn.dataset.estado
                    );
                });
            });
        }

        const ventasPagadas = ventas.filter(v => v.estadoPago === 'PAGADO');
        const ventasPendientes = ventas.filter(v => v.estadoPago !== 'PAGADO');
        const totalPagado = ventasPagadas.reduce((sum, v) => sum + v.valorTotal, 0);

        totalVentasEl.textContent = `$${totalPagado.toLocaleString()}`;
        totalPagadasEl.textContent = ventasPagadas.length;
        totalPendientesEl.textContent = ventasPendientes.length;
        balanceEl.textContent = `$${totalPagado.toLocaleString()}`;

    } catch (error) {
        console.error('Error cargando datos:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error: ${error.message}</td></tr>`;
    }
}

function cargarPerfilUsuario(perfilData) {

    const rolesPermitidos = ["MESERO","ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }


    generarSidebar('sidebar-container', "facturacion", "facturacion", perfilData.rol.nombre);

    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");
    if (!infoPerfilContainer) return;

    const empresaData = perfilData?.empresa || perfilData?.Data?.empresa;
    const nombreRaw = empresaData?.nombre || "";
    if (nombreEmpresaContainer) {
        nombreEmpresaContainer.innerHTML = nombreRaw.trim() !== "" ? `<h6>${nombreRaw.toUpperCase()}</h6>` : `<h6>RESTOSOFT</h6>`;
    }

    if (perfilData && perfilData.usuario) {
        const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
        const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />` : `<div class="profile-text-avatar" style="width:40px; height:40px; border-radius:50%; background:var(--primary-soft); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700;">${iniciales}</div>`;
        const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario sin nombre";
        const rol = perfilData.rol?.nombre || "Sin rol asignado";

        infoPerfilContainer.innerHTML = `
        <a href="perfil.html" class="profile-link" style="text-decoration:none; display:flex; align-items:center; gap:10px;">
            ${avatarHTML}
            <div class="profile-info">
                <strong style="color:var(--dark); display:block;">${nombreCompleto}</strong>
                <div style="font-size: 13px; color: var(--gray)">${rol}</div>
            </div>
        </a>`;
    }
}

async function inicializarFacturacion() {
    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        cargarPerfilUsuario(perfilData);
        
        // Obtenemos el ID de la empresa dinámicamente del TOKEN
        const EMPRESA_ID = perfilData.empresa.id;
        await cargarDatos(EMPRESA_ID);
        
    } catch (e) {
        console.error('Error loading profile info:', e);
    }
}

document.getElementById('btnExportarPDF').addEventListener('click', () => {
    alert('Funcionalidad de exportación PDF en desarrollo.');
});

inicializarFacturacion();