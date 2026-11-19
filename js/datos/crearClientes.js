import api from '../consumo/apiClientes.js';
import { apiProfile } from "../consumo/apiProfile.js";
import { generarSidebar } from './create-sidebar.js';

let selectedFile = null;

console.log("Script crearCliente cargado correctamente");

// ══════════════════════════════════════════════════════════════
// NOTIFICACIÓN MODERNA
// ══════════════════════════════════════════════════════════════
window.showNotification = (text, type = "success") => {
    const contenedor = document.getElementById("notificationContainer");
    if (!contenedor) {
        console.warn("Contenedor de notificaciones no encontrado:", text);
        return;
    }

    const config = {
        success: { icon: "fa-circle-check", title: "Operación Exitosa" },
        warning: { icon: "fa-triangle-exclamation", title: "Aviso" },
        error: { icon: "fa-circle-xmark", title: "Error" },
    };

    const { icon, title } = config[type] || config.success;

    const notif = document.createElement("div");
    notif.className = `notification ${type}`;
    notif.innerHTML = `
    <div class="notification-icon">
      <i class="fa-solid ${icon}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${text}</div>
    </div>
    <button class="notification-close">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

    contenedor.appendChild(notif);
    void notif.offsetWidth;

    setTimeout(() => notif.classList.add("show"), 10);

    const cerrarNotif = () => {
        notif.classList.remove("show");
        setTimeout(() => notif.remove(), 400);
    };

    notif
        .querySelector(".notification-close")
        .addEventListener("click", cerrarNotif);

    setTimeout(cerrarNotif, 4000);
};

// --- Lógica de Subida de Imagen ---
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('imagen');
const uploadText = document.getElementById('uploadText');
const uploadTitle = document.getElementById('uploadTitle');

if (uploadBox) {
    uploadBox.addEventListener('click', () => {
        fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            uploadTitle.textContent = "Imagen Cargada";
            uploadText.textContent = selectedFile.name;
        }
    });
}

// --- Lógica del Interruptor de Estado ---
const estadoSwitch = document.getElementById('estadoCliente');
const estadoTexto = document.getElementById('estadoTexto');

if (estadoSwitch) {
    estadoSwitch.addEventListener('change', () => {
        if (estadoSwitch.checked) {
            estadoTexto.textContent = 'Cliente Activo';
            estadoTexto.classList.remove('inactive');
            estadoTexto.classList.add('active');
        } else {
            estadoTexto.textContent = 'Cliente Inactivo';
            estadoTexto.classList.remove('active');
            estadoTexto.classList.add('inactive');
        }
    });
}

// --- Lógica del Botón Guardar ---
document.getElementById('btnGuardar')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnGuardar');

    // 1. Capturar datos del formulario
    const nombres = document.getElementById('nombres').value.trim();
    const apellidos = document.getElementById('apellidos').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;
    const password = document.getElementById('password').value.trim(); // Capturamos la contraseña
    const estado = document.getElementById('estadoCliente').checked;

    // 2. Validaciones básicas estrictas
    if (!nombres || !apellidos || !email || !telefono || !fechaNacimiento || !password) {
        window.showNotification('Todos los campos son obligatorios. Por favor completa el formulario.', 'error');
        return;
    }

    if (password.length < 8) {
        window.showNotification('La contraseña debe tener al menos 8 caracteres.', 'error');
        return;
    }

    // 3. Construir el objeto de datos
    const clienteData = {
        nombres,
        apellidos,
        email,
        telefono,
        fechaNacimiento,
        password: password, // Se envía la contraseña que escribió el usuario
        estado: estado,
        idRol: 3, // Asegúrate de que 3 sea el ID del rol "Cliente" en tu BD
        eliminarImagen: false
    };

    // 4. Crear FormData
    const formData = new FormData();
    formData.append("cliente", new Blob([JSON.stringify(clienteData)], { type: "application/json" }));

    if (selectedFile) {
        formData.append("imagen", selectedFile);
    }

    // 5. Enviar a la API usando el consumer
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...';

    try {
        await api.crearCliente(formData);

        window.showNotification('El nuevo cliente fue creado correctamente en el sistema.', 'success');

        // Redirigir después de 2 segundos
        setTimeout(() => {
            window.location.href = 'clientes.html';
        }, 2000);

    } catch (error) {
        console.error('Error al crear cliente:', error);
        window.showNotification(error.message || 'Ocurrió un problema al guardar el cliente.', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Guardar Cliente';
    }
});

// ══════════════════════════════════════════════════════════════
// PERFIL DE USUARIO (BARRA SUPERIOR)
// ══════════════════════════════════════════════════════════════
function cargarPerfilUsuario(perfilData) {

    const rolesPermitidos = ["ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }
    generarSidebar('sidebar-container', "clientes", "crear_cliente", perfilData.rol.nombre);
    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

    const empresaData = perfilData?.empresa || perfilData?.data?.empresa;
    const nombreRaw = empresaData?.nombre || "";

    if (nombreEmpresaContainer) {
        if (nombreRaw.trim() !== "") {
            nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
        } else {
            nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
        }
    }

    if (!infoPerfilContainer) return;

    // Limpiamos clases y estilos previos para evitar "cajas dobles"
    infoPerfilContainer.className = "";
    infoPerfilContainer.style.background = "transparent";
    infoPerfilContainer.style.boxShadow = "none";
    infoPerfilContainer.style.padding = "0";
    infoPerfilContainer.style.borderRadius = "0";

    const urlPerfil = "perfil.html";

    const styleBox = "display: flex; align-items: center; gap: 14px; background: #ffffff; padding: 8px 16px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-decoration: none; color: inherit; height: 100%;";

    if (perfilData) {
        const iniciales =
            (
                (perfilData.usuario.nombres || "").substring(0, 1) +
                (perfilData.usuario.apellidos || "").substring(0, 1)
            ).toUpperCase() || "EP";

        const styleImg = "width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; text-transform: uppercase;";

        const avatarHTML = perfilData.usuario.imagenUrl
            ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" style="${styleImg}" />`
            : `<div style="${styleImg}">${iniciales}</div>`;

        const nombreCompleto =
            `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() ||
            "Usuario sin nombre";

        const rol = perfilData.rol.nombre || "Sin rol asignado";

        infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" style="${styleBox}">
          ${avatarHTML}
          <div style="display: flex; flex-direction: column;">
            <strong style="margin: 0; font-weight: 700; font-size: 14px;">${nombreCompleto}</strong>
            <span style="color: #6b7280; font-size: 12px;">${rol}</span>
          </div>
        </a>
      `;
    } else {
        infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" style="${styleBox}">
          <div style="width: 42px; height: 42px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">UA</div>
          <div style="display: flex; flex-direction: column;">
            <strong style="margin: 0; font-weight: 700; font-size: 14px;">Usuario Anónimo</strong>
            <span style="color: #6b7280; font-size: 12px;">Invitado</span>
          </div>
        </a>
      `;
    }
}

// ── INICIALIZACIÓN ────────────────────────────────────────
async function init() {
    try {
        const perfilData = await apiProfile.obtenerInfoMe();
        cargarPerfilUsuario(perfilData);
    } catch (profileError) {
        console.warn("No se pudo cargar el perfil:", profileError);
    }
}

document.addEventListener('DOMContentLoaded', init);