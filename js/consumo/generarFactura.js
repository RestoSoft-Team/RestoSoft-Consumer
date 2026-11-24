import { apiVentas } from '../consumo/apiVentas.js';
import { apiPedidoDetalle } from '../consumo/apiDetallePedido.js';
import { apiPromociones } from '../consumo/apiPromociones.js';
import { obtenerPerfilSesion } from '../consumo/sesionContext.js';
import { API_BASE, TOKEN } from "../consumo/config.js";

const urlParams = new URLSearchParams(window.location.search);
const queryPedidoId = urlParams.get('pedidoId');

const pedidoIdInput = document.getElementById('pedidoId');
const pedidoIdSelect = document.getElementById('pedidoIdSelect');
const clienteInput = document.getElementById('cliente');
const mesaSelect = document.getElementById('mesa');
const productosContainer = document.getElementById('productosContainer');
const subtotalBrutoEl = document.getElementById('subtotalBruto');
const rowDescuento = document.getElementById('rowDescuento');
const descuentoValEl = document.getElementById('descuentoVal');
const subtotalEl = document.getElementById('subtotal');
const impuestosEl = document.getElementById('impuestos');
const servicioEl = document.getElementById('servicio');
const totalFacturaEl = document.getElementById('totalFactura');
const pedidoInfo = document.getElementById('pedidoInfo');

const propinaSelect = document.getElementById('propinaSelect');
const propinaCustomContainer = document.getElementById('propinaCustomContainer');
const propinaCustomAmount = document.getElementById('propinaCustomAmount');

async function cargarPedido(id) {
    try {
        const pedido = await apiPedidoDetalle.getPedidoById(id);
        if (!pedido) throw new Error("El pedido no existe o no tiene datos.");
        
        const detalles = await apiPedidoDetalle.getDetallesPedido(id);
        
        window.pedidoActual = pedido;

        // Cargar todas las mesas de la empresa
        try {
            const mesas = await apiPedidoDetalle.getMesas();
            window.mesasDisponibles = mesas;
        } catch (e) {
            console.error('Error al cargar mesas:', e);
        }

        // Cargar promociones vigentes
        try {
            const promos = await apiPromociones.listarPromocionesVigentes();
            window.promocionesVigentes = promos;
        } catch (e) {
            console.error('Error al cargar promociones vigentes:', e);
            window.promocionesVigentes = [];
        }

        return {
            id: pedido.id,
            cliente: 'Consumidor Final',
            mesa: pedido.idmesa ? pedido.idmesa.numeroMesa : 'Sin Mesa',
            productos: detalles.map(d => ({
                idPlato: d.idPlato,
                nombre: d.nombrePlato || 'Plato Desconocido',
                cantidad: d.cantidad,
                precioUnitario: d.precioUnitario
            }))
        };
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        pedidoInfo.textContent = 'Error al cargar pedido: ' + error.message;
        throw error;
    }
}

function actualizarTotales() {
    if (!window.productosActuales) return;

    let subtotalBruto = 0;
    let totalDescuento = 0;
    let html = '';

    window.productosActuales.forEach(p => {
        const totalProductoOriginal = p.cantidad * p.precioUnitario;
        subtotalBruto += totalProductoOriginal;

        let descuentoPorUnidad = 0;
        let promoActiva = null;

        if (window.promocionesVigentes) {
            promoActiva = window.promocionesVigentes.find(promo => 
                promo.estado === 'ACTIVA' && promo.idsPlatos.includes(p.idPlato)
            );
            if (promoActiva) {
                descuentoPorUnidad = promoActiva.valorDescuento;
            }
        }

        const totalDescuentoProducto = descuentoPorUnidad * p.cantidad;
        totalDescuento += totalDescuentoProducto;
        const totalProductoNeto = totalProductoOriginal - totalDescuentoProducto;

        html += `
            <div class="item">
                <div>
                    <strong>${p.nombre}</strong>
                    ${promoActiva ? ` <span class="badge bg-danger" style="font-size: 10px;">PROMO -$${descuentoPorUnidad.toLocaleString()}</span>` : ''}
                    <div class="qty">${p.qty || p.cantidad} unidades x $${p.precioUnitario.toLocaleString()}</div>
                </div>
                <strong>$${totalProductoNeto.toLocaleString()}</strong>
            </div>
        `;
    });
    productosContainer.innerHTML = html;

    const subtotalNeto = subtotalBruto - totalDescuento;
    const impuestos = subtotalNeto * 0.19;

    let propina = 0;
    const tipType = propinaSelect.value;
    if (tipType === 'custom') {
        propina = parseFloat(propinaCustomAmount.value) || 0;
    } else {
        const percent = parseFloat(tipType);
        propina = subtotalNeto * (percent / 100);
    }

    const total = subtotalNeto + impuestos + propina;

    subtotalBrutoEl.textContent = `$${subtotalBruto.toLocaleString()}`;
    if (totalDescuento > 0) {
        rowDescuento.style.display = 'flex';
        descuentoValEl.textContent = `-$${totalDescuento.toLocaleString()}`;
    } else {
        rowDescuento.style.display = 'none';
    }
    subtotalEl.textContent = `$${subtotalNeto.toLocaleString()}`;
    impuestosEl.textContent = `$${impuestos.toLocaleString()}`;
    servicioEl.textContent = `$${propina.toLocaleString()}`;
    totalFacturaEl.textContent = `$${total.toLocaleString()}`;

    window.totalFactura = total;
    window.propinaCalculada = propina;
}

function renderizarPedido(pedido) {
    pedidoIdInput.value = pedido.id;
    clienteInput.value = pedido.cliente;
    
    if (window.mesasDisponibles && window.mesasDisponibles.length > 0) {
        mesaSelect.innerHTML = window.mesasDisponibles.map(m => `
            <option value="${m.id}" ${window.pedidoActual.idmesa && window.pedidoActual.idmesa.id === m.id ? 'selected' : ''}>
                Mesa ${m.numeroMesa}
            </option>
        `).join('');
    } else {
        mesaSelect.innerHTML = `<option value="">${pedido.mesa}</option>`;
    }

    window.productosActuales = pedido.productos;
    actualizarTotales();
    pedidoInfo.textContent = `Pedido #${pedido.id} - Mesa ${pedido.mesa}`;
}

async function inicializarPedidosActivos() {
    try {
        const pedidos = await apiPedidoDetalle.getPedidosActivos();
        if (pedidos.length === 0) {
            pedidoIdSelect.innerHTML = '<option value="">No hay pedidos activos</option>';
            pedidoInfo.textContent = 'No hay pedidos activos disponibles para facturar.';
            return;
        }

        pedidoIdSelect.innerHTML = pedidos.map(p => `
            <option value="${p.id}">
                Pedido #${p.id} - Mesa ${p.idmesa ? p.idmesa.numeroMesa : 'Sin Mesa'}
            </option>
        `).join('');

        // Determinar qué pedido cargar
        let targetId = queryPedidoId;
        if (targetId) {
            pedidoIdSelect.value = targetId;
        } else {
            targetId = pedidos[0].id;
            pedidoIdSelect.value = targetId;
        }

        const info = await cargarPedido(targetId);
        renderizarPedido(info);

    } catch (error) {
        console.error('Error al inicializar pedidos activos:', error);
        pedidoIdSelect.innerHTML = '<option value="">Error al cargar pedidos</option>';
    }
}

pedidoIdSelect.addEventListener('change', async (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
        try {
            pedidoInfo.textContent = 'Cargando datos del pedido...';
            const info = await cargarPedido(selectedId);
            renderizarPedido(info);
        } catch (error) {
            showNotification('Error al cambiar de pedido: ' + error.message, 'error');
        }
    }
});

propinaSelect.addEventListener('change', () => {
    if (propinaSelect.value === 'custom') {
        propinaCustomContainer.style.display = 'block';
    } else {
        propinaCustomContainer.style.display = 'none';
    }
    actualizarTotales();
});

propinaCustomAmount.addEventListener('input', actualizarTotales);

document.getElementById('btnGenerarFactura').addEventListener('click', async () => {
    const idPedido = parseInt(pedidoIdInput.value);
    if (!idPedido) {
        showNotification('Debe seleccionar un pedido activo primero.', 'warning');
        return;
    }

    // Datos funcionales del pedido que se factura. La empresa se resuelve
    // en el back a partir del token (JWT); no viaja en el body.
    const idUsuario = window.pedidoActual && window.pedidoActual.idusuario ? window.pedidoActual.idusuario.id : null;
    const idsMetodosPago = [parseInt(document.getElementById('metodoPago').value)];
    const valorTotal = window.totalFactura;

    try {
        const selectedMesaId = parseInt(mesaSelect.value);
        if (selectedMesaId && window.pedidoActual.idmesa && window.pedidoActual.idmesa.id !== selectedMesaId) {
            const updateData = {
                observaciones: window.pedidoActual.observaciones,
                idmesa: selectedMesaId,
                estado: window.pedidoActual.estado,
                idusuario: idUsuario,
                fecha: window.pedidoActual.fecha
            };
            
            await fetch(`${API_BASE}/pedido/${idPedido}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`
                },
                body: JSON.stringify(updateData)
            });
        }

        const clienteName = clienteInput.value || 'Consumidor Final';
        const data = {
            valorTotal: valorTotal,
            observaciones: `Cliente: ${clienteName}. Factura generada desde pedido ${idPedido}. Propina servicio: $${window.propinaCalculada}`,
            idPedido: idPedido,
            idUsuario: idUsuario,
            idMetodosPago: idsMetodosPago,
            fecha: new Date().toISOString()
        };

        const result = await apiVentas.crearVenta(data);
        showNotification(`Factura generada exitosamente. ID: ${result.id}`, "success");
        setTimeout(() => {
            window.location.href = 'facturacion.html?creado=true';
        }, 2000);
    } catch (error) {
        showNotification('Error al generar factura: ' + error.message, "error");
    }
});

function cargarPerfilUsuario(perfilData) {
  const infoPerfilContainer = document.getElementById("infoPerfilContainer");
  const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

  if (!infoPerfilContainer && !nombreEmpresaContainer) return;

  const empresaData = perfilData?.empresa || perfilData?.data?.empresa;
  const nombreRaw = empresaData?.nombre || "";

  if (nombreEmpresaContainer) {
    if (nombreRaw.trim() !== "") {
      nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
    } else {
      nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
    }
  }

  const urlPerfil = "perfil.html";

  if (infoPerfilContainer) {
    if (perfilData) {
      const iniciales =
        (
          (perfilData.usuario.nombres || "").substring(0, 1) +
          (perfilData.usuario.apellidos || "").substring(0, 1)
        ).toUpperCase() || "EP";

      const avatarHTML = perfilData.usuario.imagenUrl
        ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />`
        : `<div class="profile-text-avatar" style="width:40px; height:40px; border-radius:50%; background:var(--primary-soft); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700;">${iniciales}</div>`;

      const nombreCompleto =
        `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() ||
        "Usuario sin nombre";

      const rol = perfilData.rol?.nombre || "Sin rol asignado";

      infoPerfilContainer.innerHTML = `
      <a href="${urlPerfil}" class="profile-link" style="text-decoration:none; display:flex; align-items:center; gap:10px;">
        ${avatarHTML}
        <div class="profile-info">
          <strong style="color:var(--dark); display:block;">${nombreCompleto}</strong>
          <div style="font-size: 13px; color: var(--gray)">
            ${rol}
          </div>
        </div>
      </a>
    `;
    } else {
      infoPerfilContainer.innerHTML = `
      <a href="${urlPerfil}" class="profile-link" style="text-decoration:none; display:flex; align-items:center; gap:10px;">
        <div class="profile-text-avatar" style="width:40px; height:40px; border-radius:50%; background:#e5e7eb; color:#4b5563; display:flex; align-items:center; justify-content:center; font-weight:700;">UA</div>
        <div class="profile-info">
          <strong style="color:var(--dark); display:block;">Usuario Anónimo</strong>
          <div style="font-size: 13px; color: var(--gray)">Invitado</div>
        </div>
      </a>
    `;
    }
  }
}

async function inicializarGenerarFactura() {
    try {
        const perfilData = await obtenerPerfilSesion();
        if (!perfilData) return;
        cargarPerfilUsuario(perfilData);
    } catch (e) {
        console.error('Error loading profile info:', e);
        cargarPerfilUsuario(null);
    }
    await inicializarPedidosActivos();
}

document.getElementById('btnGuardarBorrador').addEventListener('click', () => {
    showNotification('Borrador guardado (funcionalidad en desarrollo).', "warning");
});

inicializarGenerarFactura();

//Marca de archivo -_-