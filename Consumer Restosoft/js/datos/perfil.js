import { apiProfile } from "../consumo/apiProfile.js";
import { generarSidebar } from './create-sidebar.js';

let currentUsuario = null;
let selectedImageFile = null;

function loadUsuarioData(apiResponse) {
  if (!apiResponse) return;

  // IMPORTANTE: Extraer el objeto usuario del nuevo wrapper UsuarioCompletoResponse
  const usuario = apiResponse.usuario || apiResponse;
  currentUsuario = usuario;

  const iniciales = getIniciales(usuario.nombres, usuario.apellidos);

  // --- Hero Card ---
  document.getElementById("heroName").textContent =
    `${usuario.nombres} ${usuario.apellidos}`;
  document.getElementById("heroEmail").textContent = usuario.email || "—";
  document.getElementById("heroPhone").textContent = usuario.telefono || "—";

  const heroAvatarText = document.getElementById("heroAvatarText");
  const heroAvatarImg = document.getElementById("heroAvatarImg");

  if (usuario.imagenUrl) {
    heroAvatarImg.src = usuario.imagenUrl;
    heroAvatarImg.style.display = "block";
    heroAvatarText.style.display = "none";
  } else {
    heroAvatarImg.style.display = "none";
    heroAvatarText.style.display = "block";
    heroAvatarText.textContent = iniciales;
  }

  // --- Estado ---
  const heroStatus = document.getElementById("heroStatus");
  const heroStatusText = document.getElementById("heroStatusText");
  if (usuario.estado && usuario.estado.toUpperCase() === "ACTIVO") {
    heroStatus.className = "status-badge active";
    heroStatusText.textContent = "Activo";
  } else {
    heroStatus.className = "status-badge inactive";
    heroStatusText.textContent = usuario.estado || "Inactivo";
  }

  // --- Stats ---
  document.getElementById("statId").textContent = usuario.id || "—";
  document.getElementById("statRole").textContent = usuario.rol
    ? usuario.rol.nombre
    : "—";
  document.getElementById("statBirth").textContent = formatDate(
    usuario.fechaNacimiento,
  );

  // --- Info Grid ---
  document.getElementById("infoNombres").textContent = usuario.nombres || "—";
  document.getElementById("infoApellidos").textContent =
    usuario.apellidos || "—";
  document.getElementById("infoEmail").textContent = usuario.email || "—";
  document.getElementById("infoTelefono").textContent = usuario.telefono || "—";
  document.getElementById("infoFecha").textContent = formatDate(
    usuario.fechaNacimiento,
  );
  document.getElementById("infoEstado").textContent = usuario.estado || "—";
  document.getElementById("infoRol").textContent = usuario.rol
    ? usuario.rol.nombre
    : "—";
  document.getElementById("infoId").textContent = usuario.id || "—";

  // --- Poblar formulario ---
  document.getElementById("editNombres").value = usuario.nombres || "";
  document.getElementById("editApellidos").value = usuario.apellidos || "";
  document.getElementById("editEmail").value = usuario.email || "";
  document.getElementById("editTelefono").value = usuario.telefono || "";
  document.getElementById("editFecha").value = usuario.fechaNacimiento || "";
  document.getElementById("editPassword").value = "";
  if (usuario.rol)
    document.getElementById("editRol").value = usuario.rol.id || "";

  // --- Lógica de imagen en formulario ---
  const deleteImageRow = document.getElementById("deleteImageRow");
  const uploadPreview = document.getElementById("uploadPreview");
  const btnRemoveImage = document.getElementById("btnRemoveImage");
  const uploadZone = document.getElementById("uploadZone");

  // Resetear el switch de eliminar y la zona de subida al cargar datos
  document.getElementById("editEliminarImagen").checked = false;
  uploadZone.style.display = ""; // Aseguramos que la zona de subida sea visible

  if (usuario.imagenUrl) {
    deleteImageRow.style.display = "flex";
    document.getElementById("previewImg").src = usuario.imagenUrl;
    document.getElementById("previewName").textContent = "Imagen actual";
    document.getElementById("previewSize").textContent =
      "Almacenada en servidor";
    uploadPreview.classList.add("show");
    btnRemoveImage.style.display = "none"; // Ocultar papelera porque es la original
  } else {
    deleteImageRow.style.display = "none";
    uploadPreview.classList.remove("show");
  }
}

async function handleActualizarEmpleado(idEmpleado) {
  if (!currentUsuario || !idEmpleado) {
    return showNotification(
      "error",
      "Error",
      "No se ha cargado la información del empleado.",
    );
  }

  clearValidationErrors();

  const nombres = document.getElementById("editNombres").value.trim();
  const apellidos = document.getElementById("editApellidos").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const password = document.getElementById("editPassword").value;
  const telefono = document.getElementById("editTelefono").value.trim();
  const fechaNacimiento = document.getElementById("editFecha").value;
  const eliminarImagen = document.getElementById("editEliminarImagen").checked;
  const idRol = currentUsuario.rol ? currentUsuario.rol.id : null;

  let hasErrors = false;
  if (!nombres || nombres.length > 100) {
    showFieldError("editNombres", "errNombres");
    hasErrors = true;
  }
  if (!apellidos || apellidos.length > 100) {
    showFieldError("editApellidos", "errApellidos");
    hasErrors = true;
  }
  if (!email || !isValidEmail(email) || email.length > 150) {
    showFieldError("editEmail", "errEmail");
    hasErrors = true;
  }
  if (password && (password.length < 8 || password.length > 255)) {
    showFieldError("editPassword", "errPassword");
    hasErrors = true;
  }
  if (!telefono || telefono.length > 20) {
    showFieldError("editTelefono", "errTelefono");
    hasErrors = true;
  }
  if (!fechaNacimiento) {
    showFieldError("editFecha", "errFecha");
    hasErrors = true;
  }

  if (hasErrors)
    return showNotification(
      "error",
      "Error de validación",
      "Revisa los campos marcados en rojo.",
    );

  const empleadoRequest = {
    nombres,
    apellidos,
    email,
    telefono,
    fechaNacimiento,
    idRol,
    eliminarImagen,
  };
  if (password) empleadoRequest.password = password;

  showLoading(true);
  try {
    // El backend ahora devuelve UsuarioCompletoResponse, loadUsuarioData se encarga de extraer .usuario
    const usuarioActualizado = await apiProfile.actualizarEmpleado(
      idEmpleado,
      empleadoRequest,
      selectedImageFile,
    );
    loadUsuarioData(usuarioActualizado);
    selectedImageFile = null;
    switchTab("tabInfo");
    showNotification(
      "success",
      "Empleado actualizado",
      "Los cambios se guardaron correctamente.",
    );
  } catch (error) {
    console.error(error);
    showNotification(
      "error",
      "Error",
      error.message || "No se pudo actualizar el empleado.",
    );
  } finally {
    showLoading(false);
  }
}

async function initProfile() {
  showLoading(true);
  try {
    // El backend ahora devuelve UsuarioCompletoResponse
    const data = await apiProfile.obtenerInfoMe();

    const rolesPermitidos = ["ADMINISTRADOR", "RECEPCIONISTA", "MESERO", "COCINA"];

    if (!rolesPermitidos.includes(data?.rol?.nombre)) {
      console.error("Acceso no autorizado");

      const codigo = "403";
      const mensaje = encodeURIComponent(
        "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador.",
      );

      window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }

    generarSidebar(
      "sidebar-container",
      "configuracion",
      "mi_perfil",
      data.rol.nombre,
    );

    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

    const empresaData = data?.empresa || data?.data?.empresa;
    const nombreRaw = empresaData?.nombre || "";

    if (nombreRaw.trim() !== "") {
      nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
    } else {
      nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
    }

    loadUsuarioData(data);
  } catch (error) {
    console.error("Error crítico al cargar la aplicación:", error);
    const codigo = "503";
    const mensaje = encodeURIComponent(
      "El sistema está caído o no se pudieron cargar los datos. Por favor, consulta a los administradores.",
    );
    window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
  } finally {
    showLoading(false);
  }
}

function getIniciales(nombres, apellidos) {
  return (
    ((nombres || "").charAt(0) + (apellidos || "").charAt(0)).toUpperCase() ||
    "RS"
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
      "es-ES",
      { day: "2-digit", month: "long", year: "numeric" },
    );
  } catch (e) {
    return dateStr;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(inputId, errorId) {
  document.getElementById(inputId).classList.add("is-invalid");
  document.getElementById(errorId).classList.add("show");
}

function clearValidationErrors() {
  document
    .querySelectorAll(
      ".form-input-premium.is-invalid, .form-select-premium.is-invalid",
    )
    .forEach((el) => el.classList.remove("is-invalid"));
  document
    .querySelectorAll(".invalid-feedback-premium.show")
    .forEach((el) => el.classList.remove("show"));
}

function showNotification(type, title, message, duration = 4500) {
  const container = document.getElementById("notificationContainer");
  const id = "notif-" + Date.now();
  const iconMap = {
    success: "fa-check",
    error: "fa-xmark",
    warning: "fa-exclamation",
  };
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.id = id;
  notif.innerHTML = `
    <div class="notification-icon"><i class="fas ${iconMap[type] || "fa-info"}"></i></div>
    <div class="notification-content"><div class="notification-title">${title}</div><div class="notification-message">${message}</div></div>
    <button class="notification-close" onclick="document.getElementById('${id}').classList.remove('show'); setTimeout(() => document.getElementById('${id}')?.remove(), 400);"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(notif);
  requestAnimationFrame(() => notif.classList.add("show"));
  if (duration > 0)
    setTimeout(() => {
      notif.classList.remove("show");
      setTimeout(() => notif.remove(), 400);
    }, duration);
}

function showLoading(show) {
  document.getElementById("loadingOverlay").classList.toggle("show", show);
}

function switchTab(tabId) {
  document
    .querySelectorAll(".tab-premium")
    .forEach((tab) =>
      tab.classList.toggle("active", tab.dataset.tab === tabId),
    );
  document
    .querySelectorAll(".tab-content-premium")
    .forEach((content) =>
      content.classList.toggle("active", content.id === tabId),
    );
}

function handleFileSelect(file) {
  if (!file) return;
  if (!file.type.startsWith("image/"))
    return showNotification(
      "error",
      "Archivo inválido",
      "Solo se permiten imágenes (PNG, JPG, WEBP).",
    );
  if (file.size > 5 * 1024 * 1024)
    return showNotification(
      "error",
      "Archivo muy grande",
      "La imagen no debe superar los 5MB.",
    );

  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("previewImg").src = e.target.result;
    document.getElementById("previewName").textContent = file.name;
    document.getElementById("previewSize").textContent = formatFileSize(
      file.size,
    );
    document.getElementById("uploadPreview").classList.add("show");
    document.getElementById("btnRemoveImage").style.display = "flex"; // Mostramos papelera
  };
  reader.readAsDataURL(file);

  // Si subo foto nueva, desactivo el interruptor de eliminar y restauramos la zona por si acaso
  const deleteToggle = document.getElementById("editEliminarImagen");
  deleteToggle.checked = false;
  document.getElementById("uploadZone").style.display = "";
}

function clearImagePreview() {
  selectedImageFile = null;
  document.getElementById("editImagen").value = "";

  if (currentUsuario && currentUsuario.imagenUrl) {
    document.getElementById("previewImg").src = currentUsuario.imagenUrl;
    document.getElementById("previewName").textContent = "Imagen actual";
    document.getElementById("previewSize").textContent =
      "Almacenada en servidor";
    document.getElementById("uploadPreview").classList.add("show");
    document.getElementById("btnRemoveImage").style.display = "none";
  } else {
    document.getElementById("uploadPreview").classList.remove("show");
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024,
    sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  document
    .querySelectorAll(".tab-premium")
    .forEach((tab) =>
      tab.addEventListener("click", () => switchTab(tab.dataset.tab)),
    );

  // Cancelar
  document.getElementById("btnCancelEdit").addEventListener("click", () => {
    clearValidationErrors();
    if (currentUsuario) loadUsuarioData(currentUsuario);
    selectedImageFile = null;
    switchTab("tabInfo");
  });

  // Password
  document.getElementById("togglePassword").addEventListener("click", () => {
    const input = document.getElementById("editPassword");
    const icon = document.querySelector("#togglePassword i");
    if (input.type === "password") {
      input.type = "text";
      icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  });

  // Uploads
  const uploadZone = document.getElementById("uploadZone");
  const fileInput = document.getElementById("editImagen");

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });
  uploadZone.addEventListener("dragleave", () =>
    uploadZone.classList.remove("dragover"),
  );
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFileSelect(fileInput.files[0]);
  });

  // Papelera (eliminar selección nueva)
  document
    .getElementById("btnRemoveImage")
    .addEventListener("click", clearImagePreview);

  // Switch Eliminar Imagen Actual (FIX DEFINITIVO CON LABEL)
  document
    .getElementById("editEliminarImagen")
    .addEventListener("change", (e) => {
      const preview = document.getElementById("uploadPreview");
      const uploadZone = document.getElementById("uploadZone");

      if (e.target.checked) {
        uploadZone.style.display = "none";
        preview.classList.remove("show");
        selectedImageFile = null;
        document.getElementById("editImagen").value = "";
        showNotification(
          "warning",
          "Foto marcada para eliminar",
          "Se eliminará al guardar los cambios.",
        );
      } else {
        uploadZone.style.display = "";
        if (currentUsuario && currentUsuario.imagenUrl) {
          document.getElementById("previewImg").src = currentUsuario.imagenUrl;
          document.getElementById("previewName").textContent = "Imagen actual";
          document.getElementById("previewSize").textContent =
            "Almacenada en servidor";
          preview.classList.add("show");
          document.getElementById("btnRemoveImage").style.display = "none";
        }
      }
    });

  // Submit
  document
    .getElementById("formEditEmpleado")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      if (currentUsuario && currentUsuario.id)
        handleActualizarEmpleado(currentUsuario.id);
      else
        showNotification(
          "error",
          "Error",
          "No se pudo determinar el ID del empleado.",
        );
    });

  // Limpiar errores al escribir
  document
    .querySelectorAll(".form-input-premium, .form-select-premium")
    .forEach((input) => {
      const removeError = () => {
        input.classList.remove("is-invalid");
        const group = input.closest(".form-group-premium");
        if (group) {
          const fb = group.querySelector(".invalid-feedback-premium");
          if (fb) fb.classList.remove("show");
        }
      };
      input.addEventListener("input", removeError);
      input.addEventListener("change", removeError);
    });

  initProfile();
});
