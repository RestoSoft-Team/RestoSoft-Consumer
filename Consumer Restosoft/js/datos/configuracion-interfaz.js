import { estilosEmpresaApi } from "../consumo/apiConfiguracion-interfaz.js";
import { apiProfile } from "../consumo/apiProfile.js";

// ================================
// VARIABLES CSS
// ================================

const cssVarMap = {
  primary: "--primary",
  primaryLight: "--primary-light",
  primarySoft: "--primary-soft",
  background: "--background",
  surface: "--surface",
  surfaceContainer: "--surface-container",
  borderColor: "--border-color",
  dark: "--dark",
  gray: "--gray",
  soft: "--soft",
  success: "--success",
  successSoft: "--success-soft",
  warning: "--warning",
  warningSoft: "--warning-soft",
  danger: "--danger",
  dangerSoft: "--danger-soft",
};

// ================================
// DOM
// ================================

const dom = {
  infoPerfilContainer: document.getElementById("infoPerfilContainer"),
  btnGuardarTema: document.getElementById("btnGuardarTema"),
};

// ================================
// UTILIDADES
// ================================

const hexToRgb = (hex) => {
  let r = 0,
    g = 0,
    b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  return { r, g, b };
};

const rgbToHex = (r, g, b) =>
  "#" +
  ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();

const setVar = (varName, value) =>
  document.documentElement.style.setProperty(varName, value);

// ================================
// NOTIFICACIONES
// ================================

window.showNotification = (text, type = "success") => {
  const cont = document.getElementById("notificationContainer");

  if (!cont) return;

  const cfg = {
    success: {
      icon: "fa-circle-check",
      title: "Éxito",
    },
    error: {
      icon: "fa-circle-xmark",
      title: "Error",
    },
  };

  const { icon, title } = cfg[type] || cfg.success;

  const notif = document.createElement("div");

  notif.className = `notification ${type}`;

  notif.innerHTML = `
      <div class="notification-icon">
          <i class="fa-solid ${icon}"></i>
      </div>

      <div style="flex:1;">
          <div class="notification-title">${title}</div>
          <div class="notification-message">${text}</div>
      </div>

      <button class="notification-close">
          <i class="fa-solid fa-xmark"></i>
      </button>
    `;

  cont.appendChild(notif);

  setTimeout(() => notif.classList.add("show"), 10);

  notif.querySelector(".notification-close").onclick = () => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 400);
  };

  setTimeout(() => {
    notif.querySelector(".notification-close").click();
  }, 4000);
};

// ================================
// TEMA
// ================================

// ================================
// INICIALIZACIÓN
// ================================

document.addEventListener("DOMContentLoaded", async () => {
  inicializarWizard();

  inicializarControles();

  document
    .getElementById("btnRestablecerTema")
    .addEventListener("click", limpiarTema);

  await cargarDatosIniciales();

  dom.btnGuardarTema.addEventListener("click", guardarConfig);
});

// ================================
// DATOS INICIALES
// ================================

async function cargarDatosIniciales() {
  try {
    const perfilData = await apiProfile.obtenerInfoMe();

    cargarPerfilUsuario(perfilData);
  } catch (error) {
    console.error("Error al cargar datos iniciales:", error);
  }
}

function cargarPerfilUsuario(perfilData) {
 const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

  const empresaData = perfilData?.empresa || perfilData?.data?.empresa;
  const nombreRaw = empresaData?.nombre || "";

  if (nombreRaw.trim() !== "") {
    nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
  } else {
    nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
  }


  const urlPerfil = "perfil.html";

  if (perfilData) {
    const iniciales =
      (
        (perfilData.usuario.nombres || "").substring(0, 1) +
        (perfilData.usuario.apellidos || "").substring(0, 1)
      ).toUpperCase() || "EP";

    const avatarHTML = perfilData.usuario.imagenUrl
      ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil"/>`
      : `<div class="profile-text-avatar">${iniciales}</div>`;

    const nombreCompleto =
      `${perfilData.usuario.nombres || ""} ${
        perfilData.usuario.apellidos || ""
      }`.trim() || "Usuario";

    const rol = perfilData.rol.nombre || "Sin rol";

    dom.infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" class="profile-link">

            ${avatarHTML}

            <div class="profile-info">
                <strong>${nombreCompleto}</strong>

                <div style="font-size:13px;color:var(--gray)">
                    ${rol}
                </div>
            </div>

        </a>
    `;
  } else {
    dom.infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" class="profile-link">

            <div class="profile-text-avatar">UA</div>

            <div class="profile-info">
                <strong>Usuario Anónimo</strong>

                <div style="font-size:13px;color:var(--gray)">
                    Invitado
                </div>
            </div>

        </a>
    `;
  }
}

// ================================
// CONTROLES DE COLORES
// ================================

function inicializarControles() {
  const filas = document.querySelectorAll(".color-row");

  const temaGuardado = JSON.parse(
    localStorage.getItem("restsoft_theme") || "{}",
  );

  filas.forEach((fila) => {
    const key = fila.dataset.key;
    const type = fila.dataset.type;
    const cssVar = cssVarMap[key];

    const picker = fila.querySelector(".color-picker");
    const text = fila.querySelector(".color-text");
    const range = fila.querySelector(".color-range");

    // Valor inicial (LocalStorage o CSS)
    let valorInicial =
      temaGuardado[key] ||
      getComputedStyle(document.documentElement)
        .getPropertyValue(cssVar)
        .trim();

    setVar(cssVar, valorInicial);

    // ==========================
    // COLORES HEX
    // ==========================

    if (type === "hex") {
      valorInicial = valorInicial.toUpperCase();

      picker.value = valorInicial;
      text.value = valorInicial;
    }

    // ==========================
    // COLORES RGBA
    // ==========================
    else if (type === "rgba") {
      const match = valorInicial.match(
        /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/,
      );

      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;

        picker.value = rgbToHex(r, g, b);
        text.value = `rgba(${r}, ${g}, ${b}, ${a})`;

        if (range) {
          range.value = a;
        }
      }
    }

    // ==========================
    // EVENTOS HEX
    // ==========================

    if (type === "hex") {
      picker.addEventListener("input", (e) => {
        const color = e.target.value.toUpperCase();

        text.value = color;

        setVar(cssVar, color);
      });

      text.addEventListener("input", (e) => {
        const valor = e.target.value.toUpperCase();

        if (/^#[0-9A-F]{6}$/i.test(valor)) {
          picker.value = valor;

          setVar(cssVar, valor);
        }
      });
    }

    // ==========================
    // EVENTOS RGBA
    // ==========================
    else if (type === "rgba") {
      const actualizarRgba = () => {
        const hex = picker.value;

        const { r, g, b } = hexToRgb(hex);

        const alpha = range.value;

        const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        text.value = rgba;

        setVar(cssVar, rgba);
      };

      picker.addEventListener("input", actualizarRgba);

      if (range) {
        range.addEventListener("input", actualizarRgba);
      }

      text.addEventListener("input", (e) => {
        const valor = e.target.value;

        const match = valor.match(
          /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/,
        );

        if (!match) return;

        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;

        picker.value = rgbToHex(r, g, b);

        if (range) {
          range.value = a;
        }

        setVar(cssVar, valor);
      });
    }
  });
}

// ================================
// GUARDAR CONFIGURACIÓN
// ================================

async function guardarConfig() {
  const filas = document.querySelectorAll(".color-row");

  const newTheme = {};

  filas.forEach((fila) => {
    const key = fila.dataset.key;
    const text = fila.querySelector(".color-text");

    newTheme[key] = text.value;
  });

  try {
    // ¿Ya existe configuración en la BD?
    let existe = false;

    try {
      const temaActual = await estilosEmpresaApi.obtener();
      existe = temaActual != null;
    } catch {
      existe = false;
    }

    // Crear o actualizar
    if (existe) {
      await estilosEmpresaApi.actualizar(newTheme);
    } else {
      await estilosEmpresaApi.guardar(newTheme);
    }

    // Guardar localmente
    localStorage.setItem("restsoft_theme", JSON.stringify(newTheme));

    // Aplicar inmediatamente

    showNotification(
      "Interfaz actualizada y guardada correctamente.",
      "success",
    );
  } catch (error) {
    console.error("Error al guardar configuración:", error);

    showNotification("No fue posible guardar la configuración.", "error");
  }
}

async function limpiarTema() {
  if (
    !confirm("¿Desea eliminar toda la configuración de estilos de la empresa?")
  ) {
    return;
  }

  try {
    await estilosEmpresaApi.eliminar();

    localStorage.removeItem("restsoft_theme");

    location.reload();
  } catch (error) {
    console.error(error);

    showNotification("No fue posible eliminar la configuración.", "error");
  }
}

function inicializarWizard() {
  const tabs = document.querySelectorAll(".wizard-tab");
  const pages = document.querySelectorAll(".wizard-page");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const step = tab.dataset.step;

      tabs.forEach((t) => t.classList.remove("active"));
      pages.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");

      document
        .querySelector(`.wizard-page[data-step="${step}"]`)
        .classList.add("active");
    });
  });
}
