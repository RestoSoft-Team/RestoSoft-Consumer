import { apiCierre } from '../consumo/apiCierre.js';
import { obtenerPerfilSesion } from '../consumo/sesionContext.js';
import { generarSidebar } from './create-sidebar.js';

// Perfil de sesión validado (se asigna en inicializarCierreCaja).
let perfilSesion = null;

const today = new Date().toISOString().split('T')[0];
document.getElementById('fechaCierre').value = today;

const aperturaEl = document.getElementById('apertura');
const ingresosEfectivoEl = document.getElementById('ingresosEfectivo');
const ingresosTarjetaEl = document.getElementById('ingresosTarjeta');
const propinasEl = document.getElementById('propinas');
const gastosEl = document.getElementById('gastos');
const balanceFinalEl = document.getElementById('balanceFinal');
const diferenciaEl = document.getElementById('diferencia');
const validacionEl = document.getElementById('validacion');
const riesgoEl = document.getElementById('riesgo');
const observacionesEl = document.getElementById('observaciones');
const estadoCajaSelect = document.getElementById('estadoCaja');
const efectivoContadoInput = document.getElementById('efectivoContado');
const btnCerrarCaja = document.getElementById('btnCerrarCaja');
const btnGuardarBorrador = document.getElementById('btnGuardarBorrador');

let balanceFinalValor = 0;
let resumenDatos = null;

function actualizarDiferencia() {
    const contado = parseFloat(efectivoContadoInput.value) || 0;
    const dif = contado - balanceFinalValor;
    diferenciaEl.textContent = dif >= 0 ? `$${dif.toLocaleString()}` : `-$${Math.abs(dif).toLocaleString()}`;

    if (dif === 0) {
        validacionEl.textContent = 'Correcto';
        validacionEl.className = 'badge open';
        riesgoEl.textContent = 'Bajo';
        riesgoEl.className = 'badge closed';
    } else if (dif > 0) {
        validacionEl.textContent = 'Sobrante';
        validacionEl.className = 'badge open';
        riesgoEl.textContent = 'Bajo';
        riesgoEl.className = 'badge closed';
    } else {
        validacionEl.textContent = 'Faltante';
        validacionEl.className = 'badge closed';
        riesgoEl.textContent = 'Alto';
        riesgoEl.className = 'badge closed';
    }
}

async function cargarCierre() {
    try {
        const resumen = await apiCierre.obtenerResumenDiario(today);
        resumenDatos = resumen;
        balanceFinalValor = resumen.balanceFinal;

        aperturaEl.textContent = `$${resumen.apertura.toLocaleString()}`;
        ingresosEfectivoEl.textContent = `$${resumen.ingresosEfectivo.toLocaleString()}`;
        ingresosTarjetaEl.textContent = `$${resumen.ingresosTarjeta.toLocaleString()}`;
        propinasEl.textContent = `$${resumen.propinas.toLocaleString()}`;
        gastosEl.textContent = `-$${resumen.gastos.toLocaleString()}`;
        balanceFinalEl.textContent = `$${resumen.balanceFinal.toLocaleString()}`;
        
        observacionesEl.value = resumen.observaciones || '';
        estadoCajaSelect.value = resumen.estado || 'ABIERTA';

        efectivoContadoInput.value = Math.round(resumen.balanceFinal);
        actualizarDiferencia();

        if (resumen.estado === 'CERRADA') {
            observacionesEl.disabled = true;
            estadoCajaSelect.disabled = true;
            efectivoContadoInput.disabled = true;
            btnCerrarCaja.disabled = true;
            btnGuardarBorrador.disabled = true;
            btnCerrarCaja.textContent = 'Caja Cerrada';
            btnCerrarCaja.style.opacity = '0.6';
            btnGuardarBorrador.style.opacity = '0.6';
        } else {
            observacionesEl.disabled = false;
            estadoCajaSelect.disabled = false;
            efectivoContadoInput.disabled = false;
            btnCerrarCaja.disabled = false;
            btnGuardarBorrador.disabled = false;
            btnCerrarCaja.textContent = 'Cerrar Caja';
            btnCerrarCaja.style.opacity = '1';
            btnGuardarBorrador.style.opacity = '1';
        }

    } catch (error) {
        console.error('Error cargando cierre:', error);
        balanceFinalEl.textContent = 'Error';
    }
}

async function guardarCierre(estado) {
    if (!resumenDatos) return;

    const data = {
        fecha: today,
        apertura: resumenDatos.apertura,
        ingresosEfectivo: resumenDatos.ingresosEfectivo,
        ingresosTarjeta: resumenDatos.ingresosTarjeta,
        propinas: resumenDatos.propinas,
        gastos: resumenDatos.gastos,
        balanceFinal: resumenDatos.balanceFinal,
        observaciones: observacionesEl.value.trim(),
        estado: estado,
        // Usuario que cierra la caja: el de la sesión (transicional hasta
        // que el back lo resuelva con el token; hoy lo lee del body).
        idUsuario: perfilSesion ? perfilSesion.usuario.id : null
    };

    try {
        await apiCierre.guardarCierreCaja(data);
        mostrarNotificacion(`Cierre de caja guardado exitosamente con estado: ${estado}`, "success");
        await cargarCierre();
    } catch (error) {
        mostrarNotificacion('Error al guardar cierre de caja: ' + error.message, "error");
    }
}

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

function injectConfirmStyles() {
    if (document.getElementById('modal-confirmacion-styles')) return;
    const styles = `
    .modal-confirmacion {
      position: fixed;
      inset: 0;
      background: rgba(38, 47, 60, 0.55);
      backdrop-filter: blur(6px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }
    .modal-confirmacion-card {
      width: 90%;
      max-width: 450px;
      background: #ffffff;
      border-radius: 28px;
      padding: 30px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      animation: scaleIn 0.25s ease;
    }
    .modal-confirmacion-icon {
      width: 70px;
      height: 70px;
      margin: 0 auto 20px;
      border-radius: 20px;
      background: rgba(217, 164, 65, 0.15);
      color: #f59e0b;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-confirmacion-icon i {
      font-size: 32px;
    }
    .modal-confirmacion h3 {
      text-align: center;
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 10px;
      color: #111827;
    }
    .modal-confirmacion p {
      text-align: center;
      color: #6b7280;
      line-height: 1.5;
      margin-bottom: 25px;
    }
    .modal-confirmacion-actions {
      display: flex;
      gap: 12px;
    }
    .modal-confirmacion-actions button {
      flex: 1;
      padding: 14px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      font-weight: 700;
      transition: 0.25s;
    }
    .modal-confirmacion-cancelar {
      background: #f5f5f5;
      color: #1b1b1b;
    }
    .modal-confirmacion-cancelar:hover {
      background: #ececec;
    }
    .modal-confirmacion-confirmar {
      background: #6b1e28;
      color: white;
    }
    .modal-confirmacion-confirmar:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(107, 30, 40, 0.25);
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = 'modal-confirmacion-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
}

function mostrarConfirmacion(
  titulo = "¿Descartar cambios?",
  mensaje = "Tienes información sin guardar. Si continúas perderás todos los cambios realizados.",
  txtCancelar = "Seguir editando",
  txtConfirmar = "Descartar",
) {
  injectConfirmStyles();
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "modal-confirmacion";
    modal.innerHTML = `
      <div class="modal-confirmacion-card">
         <div class="modal-confirmacion-icon">
               <i class="fa-solid fa-triangle-exclamation"></i>
          </div> 
          <h3>${titulo}</h3>
          <p>${mensaje}</p>
          <div class="modal-confirmacion-actions">
              <button class="modal-confirmacion-cancelar">${txtCancelar}</button>
              <button class="modal-confirmacion-confirmar">${txtConfirmar}</button>
          </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".modal-confirmacion-cancelar").onclick = () => {
      modal.remove();
      resolve(false);
    };
    modal.querySelector(".modal-confirmacion-confirmar").onclick = () => {
      modal.remove();
      resolve(true);
    };
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };
  });
}

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

efectivoContadoInput.addEventListener('input', actualizarDiferencia);

btnCerrarCaja.addEventListener('click', async () => {
    const confirmado = await mostrarConfirmacion(
        '¿Cerrar caja definitivamente?',
        'No se podrán realizar más cambios en este turno.',
        'Cancelar',
        'Cerrar Caja'
    );
    if (confirmado) {
        guardarCierre('CERRADA');
    }
});

btnGuardarBorrador.addEventListener('click', () => {
    guardarCierre('ABIERTA');
});

// Cargar datos del perfil y luego iniciar carga de caja
async function inicializarCierreCaja() {
    try {
        // Perfil con validación de sesión (único origen: sesionContext).
        const perfilData = await obtenerPerfilSesion();
        if (!perfilData) return;
        perfilSesion = perfilData;

        const rolesPermitidos = ["ADMINISTRADOR", "RECEPCIONISTA"];
        if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
            const mensaje = encodeURIComponent(
                "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
            );
            window.location.href = `error.html?code=403&msg=${mensaje}`;
            return;
        }
        
        generarSidebar('sidebar-container', "facturacion", "cierre_caja", perfilData.rol.nombre);

        cargarPerfilUsuario(perfilData);
    } catch (e) {
        console.error('Error loading profile info:', e);
        cargarPerfilUsuario(null);
    }
    await cargarCierre();
}

inicializarCierreCaja();

const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
menuToggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar?.classList.contains('open') &&
        !sidebar.contains(e.target) && e.target !== menuToggle) {
        sidebar.classList.remove('open');
    }
});
