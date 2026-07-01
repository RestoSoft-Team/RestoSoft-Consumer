// ====================================================
// RESTSOFT - LÓGICA DE LOGIN (INTEGRACIÓN SPRING BOOT)
// ====================================================

document.addEventListener("DOMContentLoaded", () => {
  // Referencias del DOM
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  const emailInput = document.getElementById("email");

  // URL base de tu API
  const API_BASE_URL = "http://localhost:8080";
  const REDIRECT_URL = "dashboard.html"; 

  // Si el formulario no existe, detenemos el script
  if (!loginForm) return;

  // ====================================================
  // MICROINTERACCIÓN: Mostrar/Ocultar Contraseña
  // ====================================================
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      const icon = togglePassword.querySelector("i");
      if (icon) {
        if (type === "password") {
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        } else {
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        }
      }
    });
  }

  // ====================================================
  // SISTEMA DE NOTIFICACIONES
  // ====================================================
  window.showNotification = function (title, message, type = "success") {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const notif = document.createElement("div");
    notif.className = `notification ${type}`;

    const iconClass = type === "success" ? "fa-check" : "fa-exclamation";

    notif.innerHTML = `
      <div class="notif-icon"><i class="fa-solid ${iconClass}"></i></div>
      <div class="notif-content">
        <div class="notif-title">${title}</div>
        <div class="notif-msg">${message}</div>
      </div>
    `;

    container.appendChild(notif);

    setTimeout(() => {
      hideNotification(notif);
    }, 4000);
  };

  window.hideNotification = function (notifElement) {
    if (!notifElement) return;
    notifElement.classList.add("hide");
    setTimeout(() => {
      notifElement.remove();
    }, 400);
  };

  // ====================================================
  // VALIDACIONES FRONTEND
  // ====================================================
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  function setError(input, message) {
    if (!input) return;
    const wrapper = input.closest(".input-wrapper");
    const errorDiv = document.getElementById(`error-${input.id}`);
    if (wrapper) wrapper.classList.add("error");
    if (errorDiv) errorDiv.textContent = message;
  }

  function clearError(input) {
    if (!input) return;
    const wrapper = input.closest(".input-wrapper");
    const errorDiv = document.getElementById(`error-${input.id}`);
    if (wrapper) wrapper.classList.remove("error");
    if (errorDiv) errorDiv.textContent = "";
  }

  if (emailInput && passwordInput) {
    [emailInput, passwordInput].forEach((input) => {
      input.addEventListener("input", () => clearError(input));
    });
  }

  // ====================================================
  // MANEJO DEL SUBMIT (FETCH A SPRING BOOT)
  // ====================================================
  loginForm.addEventListener("submit", async (e) => {
    // ¡CRÍTICO! Prevenimos el envío nativo del formulario.
    e.preventDefault();

    let isValid = true;

    // Validar Email
    if (emailInput.value.trim() === "") {
      setError(emailInput, "El correo electrónico es requerido.");
      isValid = false;
    } else if (!validateEmail(emailInput.value.trim())) {
      setError(emailInput, "Ingresa un formato de correo válido.");
      isValid = false;
    }

    // Validar Contraseña
    if (passwordInput.value === "") {
      setError(passwordInput, "La contraseña es requerida.");
      isValid = false;
    }

    if (!isValid) {
      showNotification("Error de validación", "Por favor revisa los campos marcados.", "error");
      return;
    }

    // Iniciar estado de carga en el botón
    if (loginBtn) loginBtn.classList.add("loading");

    const payload = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Parseo seguro del JSON
      const contentType = response.headers.get("content-type");
      let data = null;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Error del servidor. Intenta nuevamente más tarde.");
      }

      if (!response.ok) {
        let errorMessage = "Ocurrió un error inesperado al iniciar sesión.";

        if (data.message) {
          errorMessage = data.message;
        } else if (data.errors && data.errors.length > 0) {
          errorMessage = data.errors[0].defaultMessage || "Error de validación en el servidor.";
        }
        throw new Error(errorMessage);
      }

      // ÉXITO: Limpiar sesión anterior
      localStorage.removeItem("token");
      localStorage.removeItem("restsoft_user");
      localStorage.removeItem("restsoft_empresa");
      localStorage.removeItem("restsoft_rol");

      // Guardar nueva sesión
      localStorage.setItem("token", data.token);
      localStorage.setItem("restsoft_user", JSON.stringify(data.usuario));
      localStorage.setItem("restsoft_empresa", JSON.stringify(data.empresa));
      localStorage.setItem("restsoft_rol", JSON.stringify(data.rol));

      showNotification(
        "Acceso concedido",
        `Bienvenido al panel de ${data.empresa?.nombre || "RestSoft"}.`,
        "success"
      );

      // Redirección fluida a dashboard.html
      setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 1000);

    } catch (error) {
      if (loginBtn) loginBtn.classList.remove("loading");

      let displayMessage = error.message || "Credenciales incorrectas.";

      // Capturar errores de red comunes (ej. backend apagado, CORS)
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        displayMessage = "No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté activo.";
      }

      showNotification("Error de autenticación", displayMessage, "error");

      // Marcamos los inputs como error
      setError(emailInput, " ");
      setError(passwordInput, "Verifica tus credenciales.");
    }
  });
});