import {apiAuthCliente } from "../consumo/apiAuthCliente.js";
import estilosInicio from "../consumo/apiEstilos.js";

const AuthApp = (function () {
  function iniciar() {
    validarSesion()
    initLogin();
    initRegistro();
  }

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

 function validarSesion() {
   if (
     !localStorage.getItem("idEmpresaActual") ||
     !localStorage.getItem("slugEmpresaActual")
   ) {
     window.location.href = "/";
   }
 }


  function initLogin() {
    const loginForm = document.getElementById("login-form");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector(".btn-login");
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
      btn.disabled = true;

      try {
        const res = await apiAuthCliente.login(email, password);

        if (res.token) {
          localStorage.setItem("token_cliente", res.token);
        }

        estilosInicio();

        showNotification(
          "Inicio de sesión exitoso. Redirigiendo...",
          "success",
        );

        btn.innerHTML = '<i class="fa-solid fa-check"></i> Éxito';
        setTimeout(() => {
          window.location.href = "/panel-cliente.html";
        }, 1000);
      } catch (error) {
        showNotification(error.message || "Error al iniciar sesión.", "error");

        btn.innerHTML =
          'Iniciar Sesión <i class="fa-solid fa-arrow-right-to-bracket"></i>';
        btn.disabled = false;
      }
    });
  }

  function initRegistro() {
    const registerForm = document.getElementById("register-form");
    if (!registerForm) return;

    let imagenSeleccionada = null;

    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    const previewImg = document.getElementById("preview-img");

    if (dropzone) {
      dropzone.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          imagenSeleccionada = file;
          const reader = new FileReader();
          reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewImg.style.display = "block";
            dropzone.querySelector(".dropzone-text").style.display = "none";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector(".btn-register");

      const idEmpresa = localStorage.getItem("idEmpresaActual");

      const clienteData = {
        nombres: document.getElementById("reg-nombres").value,
        apellidos: document.getElementById("reg-apellidos").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
        telefono: document.getElementById("reg-telefono").value,
        fechaNacimiento: document.getElementById("reg-fecha-nacimiento").value,
      };

      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...';
      btn.disabled = true;

      try {
        await apiAuthCliente.registrarCliente(
          idEmpresa,
          clienteData,
          imagenSeleccionada,
        );

        showNotification(
          "Cuenta creada exitosamente. Redirigiendo...",
          "success",
        );

        btn.innerHTML = '<i class="fa-solid fa-check"></i> Cuenta Creada';
        setTimeout(() => {
          window.location.href = "/login-cliente.html";
        }, 1500);
      } catch (error) {
        showNotification(
          error.message || "Error al registrar la cuenta.",
          "error",
        );

        btn.innerHTML = 'Crear Cuenta <i class="fa-solid fa-user-plus"></i>';
        btn.disabled = false;
      }
    });
  }

  return { iniciar };
})();

document.addEventListener("DOMContentLoaded", AuthApp.iniciar);
