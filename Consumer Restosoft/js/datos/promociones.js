import { listarPromociones, obtenerPromocion, crearPromocion, actualizarPromocion, eliminarPromocion } from '../consumo/apiPromociones.js';
import { listarPlatos } from '../consumo/apiPlatos.js';
import { apiProfile } from '../consumo/apiProfile.js';

const container = document.getElementById('promocionesContainer');
const form = document.getElementById('promoForm');
const promoIdInput = document.getElementById('promoId');
const nombreInput = document.getElementById('nombrePromo');
const descripcionInput = document.getElementById('descripcionPromo');
const valorInput = document.getElementById('valorDescuento');
const fechaInicio = document.getElementById('fechaInicio');
const fechaFin = document.getElementById('fechaFin');
const estadoSelect = document.getElementById('estadoPromo');
const platosSelect = document.getElementById('idsPlatos');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');

const EMPRESA_ID = 1;

// Cargar platos para el select múltiple
async function cargarPlatosSelect() {
    try {
        const platos = await listarPlatos(EMPRESA_ID);
        platosSelect.innerHTML = platos.map(p =>
            `<option value="${p.id}">${p.nombre}</option>`
        ).join('');
    } catch (error) {
        console.error('Error cargando platos:', error);
        platosSelect.innerHTML = '<option>Error al cargar platos</option>';
    }
}

// Cargar promociones
async function cargarPromociones() {
    try {
        const promos = await listarPromociones(EMPRESA_ID);
        if (promos.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay promociones registradas.</p>';
            return;
        }
        container.innerHTML = '';
        promos.forEach(p => {
            const div = document.createElement('div');
            div.className = 'promo';
            div.innerHTML = `
                <span class="badge-promo" style="background: ${p.estado === 'ACTIVA' ? 'rgba(61,139,92,0.15)' : 'rgba(107,30,40,0.15)'}; color: ${p.estado === 'ACTIVA' ? '#3d8b5c' : '#6b1e28'}">
                    ${p.estado === 'ACTIVA' ? 'Activa' : 'Inactiva'}
                </span>
                <h4>${p.nombre}</h4>
                <small>${p.descripcion || 'Sin descripción'}</small>
                <div class="promo-value">$${p.valorDescuento}</div>
                <div><small>${p.fechaInicio} → ${p.fechaFin}</small></div>
                <div class="promo-actions">
                    <button class="btn-small btn-edit" data-id="${p.id}">Editar</button>
                    <button class="btn-small btn-delete" data-id="${p.id}">Eliminar</button>
                </div>
            `;
            container.appendChild(div);
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => editarPromo(btn.dataset.id));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => eliminarPromo(btn.dataset.id));
        });

    } catch (error) {
        console.error('Error cargando promociones:', error);
        container.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

// Definir showNotification localmente
window.showNotification = (text, type = "success") => {
    const contenedor = document.getElementById("notificationContainer");
    if (!contenedor) return;
    const config = {
        success: { icon: "fa-circle-check", title: "Operación Exitosa" },
        warning: { icon: "fa-triangle-exclamation", title: "Aviso" },
        error: { icon: "fa-circle-xmark", title: "Error" },
    };
    const { icon, title } = config[type] || config.success;
    const notif = document.createElement("div");
    notif.className = `notification ${type}`;
    notif.innerHTML = `
        <div class="notification-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${text}</div>
        </div>
        <button class="notification-close"><i class="fa-solid fa-xmark"></i></button>
    `;
    contenedor.appendChild(notif);
    void notif.offsetWidth;
    setTimeout(() => notif.classList.add("show"), 10);
    const cerrarNotif = () => {
        notif.classList.remove("show");
        setTimeout(() => notif.remove(), 400);
    };
    notif.querySelector(".notification-close").addEventListener("click", cerrarNotif);
    setTimeout(cerrarNotif, 4000);
};

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

// Editar promoción
async function editarPromo(id) {
    try {
        const promo = await obtenerPromocion(id);
        promoIdInput.value = promo.id;
        nombreInput.value = promo.nombre;
        descripcionInput.value = promo.descripcion || '';
        valorInput.value = promo.valorDescuento;
        fechaInicio.value = promo.fechaInicio;
        fechaFin.value = promo.fechaFin;
        estadoSelect.value = promo.estado;
        // Seleccionar platos
        if (promo.idsPlatos) {
            Array.from(platosSelect.options).forEach(opt => {
                opt.selected = promo.idsPlatos.includes(parseInt(opt.value));
            });
        }
        formTitle.textContent = 'Editar promoción';
        submitBtn.textContent = 'Actualizar Promoción';
        document.querySelector('.card:last-child').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showNotification('Error al cargar la promoción: ' + error.message, 'error');
    }
}

async function eliminarPromo(id) {
    const confirmado = await mostrarConfirmacion(
        '¿Eliminar esta promoción?',
        '¿Estás seguro de que deseas eliminar esta promoción?',
        'Cancelar',
        'Eliminar'
    );
    if (confirmado) {
        try {
            await eliminarPromocion(id);
            showNotification('Promoción eliminada con éxito.', 'success');
            cargarPromociones();
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        }
    }
}

function resetForm() {
    promoIdInput.value = '';
    form.reset();
    formTitle.textContent = 'Crear promoción';
    submitBtn.textContent = 'Crear Promoción';
    Array.from(platosSelect.options).forEach(opt => opt.selected = false);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = promoIdInput.value;
    const data = {
        nombre: nombreInput.value.trim(),
        descripcion: descripcionInput.value.trim(),
        valorDescuento: parseFloat(valorInput.value),
        idEmpresa: EMPRESA_ID,
        fechaInicio: fechaInicio.value,
        fechaFin: fechaFin.value,
        estado: estadoSelect.value,
        idsPlatos: Array.from(platosSelect.selectedOptions).map(opt => parseInt(opt.value))
    };

    if (!data.nombre || !data.valorDescuento || !data.fechaInicio || !data.fechaFin) {
        showNotification('Nombre, valor descuento y fechas son obligatorios.', 'warning');
        return;
    }

    try {
        if (id) {
            await actualizarPromocion(id, data);
            showNotification('Promoción actualizada con éxito.', 'success');
        } else {
            await crearPromocion(data);
            showNotification('Promoción creada con éxito.', 'success');
        }
        resetForm();
        cargarPromociones();
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
});

cancelBtn.addEventListener('click', resetForm);

async function inicializarPromociones() {
    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        cargarPerfilUsuario(perfilData);
    } catch (e) {
        console.error('Error loading profile info:', e);
        cargarPerfilUsuario(null);
    }
    await cargarPlatosSelect();
    cargarPromociones();
}

await inicializarPromociones();
