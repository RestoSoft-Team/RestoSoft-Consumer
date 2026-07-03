import { listarVentas } from 'js/datos/ventas.js';
import { apiProfile } from 'js/consumo/apiProfile.js';

const TEST_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6MUByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMywiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI5OTM2NzAsImV4cCI6NDkzNjU5MzY3MH0.EjunkOXij49O2GtJCAGDqEePuaPA09BO2VeaMs4KNL4";
const EMPRESA_ID = 1;
const tbody = document.getElementById('tbodyPropinas');
const resumenEfectivo = document.getElementById('resumenEfectivo');
const resumenTarjeta = document.getElementById('resumenTarjeta');
const resumenTotal = document.getElementById('resumenTotal');

// Elementos del modal
const repartirModal = document.getElementById('repartirModal');
const modalMontoTotal = document.getElementById('modalMontoTotal');
const modalMetodoReparto = document.getElementById('modalMetodoReparto');
const meserosCheckboxList = document.getElementById('meserosCheckboxList');
const modalResultadoCalculo = document.getElementById('modalResultadoCalculo');

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

async function cargarPropinas() {
    try {
        const ventas = await listarVentas(EMPRESA_ID);
        window.ventasDelDia = ventas; // Guardar ventas para cálculo por desempeño
        
        let totalEfectivo = 0;
        let totalTarjeta = 0;
        let totalGeneral = 0;

        const ventasConPropina = [];

        ventas.forEach(v => {
            let propina = v.propina || 0; // 👇 LEER DIRECTO DE LA VENTA

            if (propina > 0) {
                ventasConPropina.push({
                    venta: v,
                    monto: propina
                });

                const metodo = (v.metodosPago && v.metodosPago[0]) ? v.metodosPago[0].toLowerCase() : '';
                if (metodo.includes('efectivo')) {
                    totalEfectivo += propina;
                } else {
                    totalTarjeta += propina;
                }
            }
        });

        totalGeneral = totalEfectivo + totalTarjeta;
        window.totalPropinasAcumulado = totalGeneral;

        if (ventasConPropina.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay propinas acumuladas el día de hoy.</td></tr>';
        } else {
            tbody.innerHTML = '';
            ventasConPropina.forEach(item => {
                const v = item.venta;
                const montoPropina = item.monto;
                const tr = document.createElement('tr');
                tr.className = 'row-hover';

                const metodo = v.metodosPago && v.metodosPago[0] ? v.metodosPago[0] : 'Efectivo';
                const metodoClass = metodo.toLowerCase().includes('efectivo') ? 'cash' : 'card-pay';

                tr.innerHTML = `
                    <td data-label="Empleado">${v.nombreUsuario || 'Mesero'}</td>
                    <td data-label="Origen">Pedido #${v.idPedido}</td>
                    <td data-label="Método"><span class="tag ${metodoClass}">${metodo}</span></td>
                    <td data-label="Monto">$${montoPropina.toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Actualizar resumen
        resumenEfectivo.textContent = `$${totalEfectivo.toLocaleString()}`;
        resumenTarjeta.textContent = `$${totalTarjeta.toLocaleString()}`;
        resumenTotal.textContent = `$${totalGeneral.toLocaleString()}`;

    } catch (error) {
        console.error('Error cargando propinas:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center">Error al cargar propinas: ${error.message}</td></tr>`;
    }
}

// Obtener empleados del backend
async function getEmpleados() {
    try {
        const token = localStorage.getItem('token') || TEST_TOKEN;
        const response = await fetch('http://localhost:8080/api/usuarios?rol=MESERO', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'idempresa': EMPRESA_ID.toString()
            }
        });
        return response.ok ? await response.json() : [];
    } catch (e) {
        console.error("Error al cargar empleados:", e);
        return [];
    }
}

// Calcular distribución
function calcularDistribucion() {
    const selectedCheckboxes = document.querySelectorAll('.mesero-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    const metodo = modalMetodoReparto.value;
    const totalPropinas = window.totalPropinasAcumulado || 0;

    if (selectedIds.length === 0) {
        modalResultadoCalculo.innerHTML = '<span class="text-danger">Por favor selecciona al menos un mesero para calcular.</span>';
        return;
    }

    if (totalPropinas === 0) {
        modalResultadoCalculo.innerHTML = '<span class="text-warning">No hay saldo de propinas para repartir hoy.</span>';
        return;
    }

    if (metodo === 'equitativo') {
        const porPersona = totalPropinas / selectedIds.length;
        let html = `<p style="margin-bottom: 8px;"><strong>Monto por persona:</strong> $${porPersona.toLocaleString()}</p><ul style="padding-left: 20px; font-size: 13px;">`;
        selectedCheckboxes.forEach(cb => {
            html += `<li>${cb.dataset.nombre}: $${porPersona.toLocaleString()}</li>`;
        });
        html += '</ul>';
        modalResultadoCalculo.innerHTML = html;
    } else {
        // Porcentaje por Desempeño de Ventas
        const ventas = window.ventasDelDia || [];
        const salesByWaiter = {};
        selectedCheckboxes.forEach(cb => {
            salesByWaiter[cb.dataset.nombre.toLowerCase()] = {
                nombre: cb.dataset.nombre,
                ventas: 0
            };
        });

        let totalSalesSelected = 0;
        ventas.forEach(v => {
            if (v.nombreUsuario) {
                const nameKey = v.nombreUsuario.toLowerCase();
                if (salesByWaiter[nameKey]) {
                    salesByWaiter[nameKey].ventas += v.valorTotal;
                    totalSalesSelected += v.valorTotal;
                }
            }
        });

        let html = `<p style="margin-bottom: 8px;"><strong>Distribución por porcentaje de ventas:</strong></p><ul style="padding-left: 20px; font-size: 13px;">`;
        selectedCheckboxes.forEach(cb => {
            const mesero = salesByWaiter[cb.dataset.nombre.toLowerCase()];
            const pct = totalSalesSelected > 0 ? (mesero.ventas / totalSalesSelected) : (1 / selectedIds.length);
            const individualAmount = totalPropinas * pct;
            html += `<li>${mesero.nombre}: $${individualAmount.toLocaleString()} <span class="text-muted" style="font-size: 11px;">(Ventas: $${mesero.ventas.toLocaleString()} - ${(pct * 100).toFixed(1)}%)</span></li>`;
        });
        html += '</ul>';
        modalResultadoCalculo.innerHTML = html;
    }
}

// Modal Events
document.getElementById('btnRepartir').addEventListener('click', async () => {
    const totalPropinas = window.totalPropinasAcumulado || 0;
    modalMontoTotal.textContent = `$${totalPropinas.toLocaleString()}`;

    repartirModal.classList.add('show');

    // Cargar y listar empleados meseros
    meserosCheckboxList.innerHTML = '<p class="text-muted">Cargando meseros...</p>';
    const empleados = await getEmpleados();
    
    // Filtrar meseros y administradores
    const meseros = empleados.filter(emp => emp.rol && (emp.rol.nombre.toLowerCase().includes('mesero') || emp.rol.nombre.toLowerCase().includes('administrador') || emp.rol.nombre.toLowerCase().includes('recepcionista')));

    if (meseros.length === 0) {
        meserosCheckboxList.innerHTML = '<p class="text-muted">No se encontraron empleados con rol de Mesero.</p>';
        modalResultadoCalculo.innerHTML = 'Sin participantes.';
        return;
    }

    meserosCheckboxList.innerHTML = '';
    meseros.forEach(emp => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        const name = `${emp.usuario.nombres} ${emp.usuario.apellidos}`;
        label.innerHTML = `
            <input type="checkbox" class="mesero-checkbox" value="${emp.usuario.id}" data-nombre="${name}" checked>
            <span>${name}</span>
        `;
        meserosCheckboxList.appendChild(label);
    });

    // Escuchar cambios en los checkboxes y método
    document.querySelectorAll('.mesero-checkbox').forEach(cb => {
        cb.addEventListener('change', calcularDistribucion);
    });
    modalMetodoReparto.addEventListener('change', calcularDistribucion);

    calcularDistribucion();
});

const cerrarModal = () => {
    repartirModal.classList.remove('show');
};

document.getElementById('closeModal').addEventListener('click', cerrarModal);
document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);

document.getElementById('btnConfirmarReparto').addEventListener('click', () => {
    const selectedCheckboxes = document.querySelectorAll('.mesero-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        mostrarNotificacion('Por favor selecciona al menos un mesero.', 'error');
        return;
    }
    if (window.totalPropinasAcumulado === 0) {
        mostrarNotificacion('No hay propinas acumuladas para repartir el día de hoy.', 'error');
        return;
    }
    
    mostrarNotificacion(`Propinas distribuidas exitosamente entre los ${selectedCheckboxes.length} meseros seleccionados.`, 'success');
    cerrarModal();
});

function mostrarNotificacion(texto, tipo) {
    const notification = document.getElementById("notification");
    const icon = document.getElementById("notificationIcon");
    const title = document.getElementById("notificationTitle");
    
    notification.className = "notification"; 
    
    if (tipo === "error" || tipo === "warning") {
        notification.classList.add("error");
        icon.className = "fa-solid fa-circle-xmark";
        title.textContent = "Atención";
    } else {
        icon.className = "fa-solid fa-circle-check";
        title.textContent = "Operación Exitosa";
    }

    document.getElementById("notificationText").textContent = texto;
    notification.classList.add("show");
    setTimeout(() => notification.classList.remove("show"), 3500);
}

async function inicializarPropinas() {
    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        cargarPerfilUsuario(perfilData);
    } catch (e) {
        console.error('Error loading profile info:', e);
        cargarPerfilUsuario(null);
    }
    await cargarPropinas();
}

inicializarPropinas();
