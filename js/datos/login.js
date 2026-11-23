import { apiAuthAdmin } from "../consumo/apiAuthAdmin.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  const emailInput = document.getElementById("email");

  const REDIRECT_URL = "dashboard.html";

  if (!loginForm) return;


  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
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
    setTimeout(() => hideNotification(notif), 4000);
  };

  window.hideNotification = function (notifElement) {
    if (!notifElement) return;
    notifElement.classList.add("hide");
    setTimeout(() => notifElement.remove(), 400);
  };

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

  function limpiarSesionAnterior() {
    localStorage.removeItem("token");
    localStorage.removeItem("restsoft_user");
    localStorage.removeItem("restsoft_empresa");
    localStorage.removeItem("restsoft_rol");
    localStorage.removeItem("restsoft_menu");
    localStorage.removeItem("restsoft_cart");
  }

 
  function guardarSiExiste(key, value) {
    if (value !== null && value !== undefined) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    let isValid = true;

    if (emailInput.value.trim() === "") {
      setError(emailInput, "El correo electrónico es requerido.");
      isValid = false;
    } else if (!validateEmail(emailInput.value.trim())) {
      setError(emailInput, "Ingresa un formato de correo válido.");
      isValid = false;
    }

    if (passwordInput.value === "") {
      setError(passwordInput, "La contraseña es requerida.");
      isValid = false;
    }

    if (!isValid) {
      showNotification(
        "Error de validación",
        "Por favor revisa los campos marcados.",
        "error",
      );
      return;
    }

    if (loginBtn) loginBtn.classList.add("loading");

    const payload = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    };

    try {
      let data = await apiAuthAdmin.login(payload);

      if (!data) {
        let errorMessage = "Ocurrió un error inesperado al iniciar sesión.";
        if (data.message) {
          errorMessage = data.message;
        } else if (data.errors && data.errors.length > 0) {
          errorMessage =
            data.errors[0].defaultMessage ||
            "Error de validación en el servidor.";
        }
        throw new Error(errorMessage);
      }

      // ÉXITO: limpiar sesión previa antes de guardar la nueva
      limpiarSesionAnterior();

      // Guardar nueva sesión de forma segura
      localStorage.setItem("token", data.token);
      guardarSiExiste("restsoft_user", data.usuario);
      guardarSiExiste("restsoft_empresa", data.empresa);
      guardarSiExiste("restsoft_rol", data.rol);

      showNotification(
        "Acceso concedido",
        `Bienvenido al panel de ${data.empresa?.nombre || "RestSoft"}.`,
        "success",
      );

      setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 1000);
    } catch (error) {
      if (loginBtn) loginBtn.classList.remove("loading");

      let displayMessage = error.message || "Credenciales incorrectas.";
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        displayMessage =
          "No se pudo conectar con el servidor. Verifica tu conexión.";
      }

      showNotification("Error de autenticación", displayMessage, "error");
      setError(emailInput, " ");
      setError(passwordInput, "Verifica tus credenciales.");
    }
  });
});
