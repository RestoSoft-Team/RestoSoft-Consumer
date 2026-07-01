import { apiAuth } from "../consumo/apiAuth.js";

const AuthApp = (function () {
  function iniciar() {
    initLogin();
    initRegistro();
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
        const res = await apiAuth.login(email, password);

        if (res.token) {
          localStorage.setItem("token_cliente", res.token);
        }

        btn.innerHTML = '<i class="fa-solid fa-check"></i> Éxito';
        setTimeout(() => {
          window.location.href = "/panel-cliente.html";
        }, 1000);
      } catch (error) {
        alert("Error: " + error.message);
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

      // 1. Leer el idEmpresa del localStorage (guardado previamente en cliente.js)
      // Si no existe, ponemos 1 por defecto para que no rompa en pruebas locales
      const idEmpresa = localStorage.getItem("idEmpresaActual") || 1;

      // 2. Construimos el JSON SIN el idEmpresa (ya va en la URL)
      const clienteData = {
        nombre: document.getElementById("reg-nombre").value,
        apellido: document.getElementById("reg-apellido").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
        telefono: document.getElementById("reg-telefono").value,
      };

      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Creando cuenta...';
      btn.disabled = true;

      try {
        // 3. Enviamos el idEmpresa como primer parámetro
        await apiAuth.registrarCliente(
          idEmpresa,
          clienteData,
          imagenSeleccionada,
        );

        btn.innerHTML = '<i class="fa-solid fa-check"></i> Cuenta Creada';
        setTimeout(() => {
          window.location.href = "/login-cliente.html";
        }, 1500);
      } catch (error) {
        alert("Error: " + error.message);
        btn.innerHTML = 'Crear Cuenta <i class="fa-solid fa-user-plus"></i>';
        btn.disabled = false;
      }
    });
  }

  return { iniciar };
})();

document.addEventListener("DOMContentLoaded", AuthApp.iniciar);
