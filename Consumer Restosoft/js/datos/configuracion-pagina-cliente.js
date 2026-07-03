import { apiConfig } from "../consumo/apiConfiguracion-pagina-cliente.js";
import { apiProfile } from "../consumo/apiProfile.js";
import { generarSidebar } from "./create-sidebar.js";

const AdminConfig = (function () {
  "use strict";

  let state = {};
  let pendingFiles = {};
  let iframe = null;
  let debounceTimer = null;

  const fuentesPermitidas = [
    { nombre: "Inter", familia: "'Inter', sans-serif" },
    { nombre: "Poppins", familia: "'Poppins', sans-serif" },
    { nombre: "Roboto", familia: "'Roboto', sans-serif" },
    { nombre: "Montserrat", familia: "'Montserrat', sans-serif" },
    { nombre: "Playfair Display", familia: "'Playfair Display', serif" },
    { nombre: "Lato", familia: "'Lato', sans-serif" },
    { nombre: "Oswald", familia: "'Oswald', sans-serif" },
  ];

  function iniciar() {
    iframe = document.getElementById("preview-frame");
    configurarEstadoPorDefecto();
    bindEvents();
    cargarDatosBackend();
  }

  function configurarEstadoPorDefecto() {
    state = {
      id: null,
      brandingNombre: "Mi Restaurante",
      brandingSlogan: "Slogan",
      brandingDescripcion: "Descripción",
      heroActiva: true,
      heroMostrarDireccion: true,
      heroMostrarHorario: true,
      colorPrimario: "#6b1e28",
      colorPrimarioHover: "#8a3b47",
      colorPrimarioRgb: "107, 30, 40",
      colorSecundario: "#d9a441",
      colorSecundarioHover: "#c4942f",
      colorOscuro: "#0a0a0a",
      colorDarkMid: "#1a1a1a",
      colorBg: "#ffffff",
      colorBgAlt: "#f5f5f7",
      colorCard: "#ffffff",
      colorTexto: "#0a0a0a",
      colorTextoSec: "#5e5e5e",
      colorTextoTer: "#9e9e9e",
      colorBorde: "#e6e6e8",
      tipografiaFuente: "'Inter', sans-serif",
      tipografiaFuenteHeading: "'Inter', sans-serif",
      tipografiaFuenteGoogle: "Inter",
      bordeTarjeta: "32px",
      bordeBoton: "100px",
      sombraSuave: "0 2px 8px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.02)",
      espacioSeccionPy: "100px",
      acercaActiva: true,
      acercaTitulo: "Nuestra Historia",
      acercaTexto: "Texto...",
      horariosActiva: true,
      horariosTitulo: "Horarios",
      horariosItemsJson: "[]",
      galeriaActiva: true,
      galeriaTitulo: "Galería",
      galeriaImagen1: "",
      galeriaImagen2: "",
      galeriaImagen3: "",
      galeriaImagen4: "",
      galeriaImagen5: "",
      galeriaImagen6: "",
      contactoActiva: true,
      contactoTitulo: "Contacto",
      contactoMostrarDireccion: true,
      contactoDireccion: "Calle 123",
      contactoMostrarTelefono: true,
      contactoTelefono: "+34 600",
      contactoMostrarEmail: true,
      contactoEmail: "test@test.com",
      contactoMostrarWhatsapp: true,
      contactoWhatsapp: "346000000",
      redesActiva: true,
      redesTitulo: "Redes",
      redesItemsJson: "[]",
      loginActiva: true,
      loginTitulo: "Login",
      loginTexto: "Accede",
      loginTextoBoton: "Entrar",
      footerTexto: "© 2024",
      footerMostrarPowered: true,
      horariosItems: [],
      redesConfig: [
        {
          plataforma: "Instagram",
          url: "",
          icono: "fa-brands fa-instagram",
          activo: false,
        },
        {
          plataforma: "Facebook",
          url: "",
          icono: "fa-brands fa-facebook-f",
          activo: false,
        },
        {
          plataforma: "WhatsApp",
          url: "",
          icono: "fa-brands fa-whatsapp",
          activo: false,
        },
        {
          plataforma: "TikTok",
          url: "",
          icono: "fa-brands fa-tiktok",
          activo: false,
        },
        {
          plataforma: "X (Twitter)",
          url: "",
          icono: "fa-brands fa-x-twitter",
          activo: false,
        },
        {
          plataforma: "YouTube",
          url: "",
          icono: "fa-brands fa-youtube",
          activo: false,
        },
      ],
    };
  }

  async function cargarDatosBackend() {
    try {
      const data = await apiConfig.cargar();
      const perfilData = await apiProfile.obtenerInfoMe();

      const rolesPermitidos = ["ADMINISTRADOR"];

      if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
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
        "pagina_cliente",
        perfilData.rol.nombre,
      );

      if (data) {
        state.id = data.id;
        Object.keys(data).forEach((k) => {
          if (data[k] !== null && data[k] !== undefined) state[k] = data[k];
        });
        try {
          state.horariosItems = JSON.parse(state.horariosItemsJson || "[]");
        } catch (e) {
          state.horariosItems = [];
        }
        try {
          const redesParseadas = JSON.parse(state.redesItemsJson || "[]");
          state.redesConfig.forEach((r) => {
            const found = redesParseadas.find(
              (rr) => rr.plataforma === r.plataforma,
            );
            if (found) {
              r.activo = true;
              r.url = found.url;
            }
          });
        } catch (e) {}
      }
      rellenarFormulario();
      renderDynamicLists();
      actualizarPreview();
      cargarPerfilUsuario(perfilData);
    } catch (error) {
      console.error("Error crítico al cargar la aplicación:", error);
      showNotification("Error al cargar datos.", "danger");
    }
  }

  function cargarPerfilUsuario(perfilData) {
    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
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
        ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />`
        : `<div class="profile-text-avatar">${iniciales}</div>`;

      const nombreCompleto =
        `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() ||
        "Usuario sin nombre";

      const rol = perfilData.rol.nombre || "Sin rol asignado";

      infoPerfilContainer.innerHTML = `
    <a href="${urlPerfil}" class="profile-link">
      ${avatarHTML}
      <div class="profile-info">
        <strong>${nombreCompleto}</strong>
        <div style="font-size: 13px; color: var(--gray)">
          ${rol}
        </div>
      </div>
    </a>
  `;
    } else {
      // Estado de Fallback si no hay datos
      infoPerfilContainer.innerHTML = `
    <a href="${urlPerfil}" class="profile-link">
      <div class="profile-text-avatar">UA</div>
      <div class="profile-info">
        <strong>Usuario Anónimo</strong>
        <div style="font-size: 13px; color: var(--gray)">Invitado</div>
      </div>
    </a>
  `;
    }
  }

  function rellenarFormulario() {
    document.querySelectorAll("[data-model]").forEach((input) => {
      const model = input.getAttribute("data-model");
      if (state[model] !== undefined) {
        if (input.type === "checkbox") input.checked = state[model];
        else input.value = state[model];
      }
    });
    document.querySelectorAll("[data-img-preview]").forEach((img) => {
      const key = img.getAttribute("data-img-preview");
      if (state[key]) img.src = state[key];
    });
  }

  function bindEvents() {
    document.querySelectorAll("[data-model]").forEach((input) => {
      input.addEventListener("input", (e) => {
        const model = e.target.getAttribute("data-model");
        state[model] =
          e.target.type === "checkbox" ? e.target.checked : e.target.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(actualizarPreview, 400);
      });
    });

    const selectFuente = document.getElementById("select-fuente");
    if (selectFuente) {
      selectFuente.value = state.tipografiaFuenteGoogle;
      selectFuente.addEventListener("change", (e) => {
        const seleccion = fuentesPermitidas.find(
          (f) => f.nombre === e.target.value,
        );
        if (seleccion) {
          state.tipografiaFuenteGoogle = seleccion.nombre;
          state.tipografiaFuente = seleccion.familia;
          state.tipografiaFuenteHeading = seleccion.familia;
          actualizarPreview();
        }
      });
    }

    document.querySelectorAll("[data-rgb-model]").forEach((input) => {
      const model = input.getAttribute("data-rgb-model");
      if (state[model]) {
        const rgb = state[model].split(",").map((s) => parseInt(s.trim()));
        input.value = rgbToHex(rgb[0], rgb[1], rgb[2]);
      }
      input.addEventListener("input", (e) => {
        const rgb = hexToRgb(e.target.value);
        state[model] = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(actualizarPreview, 400);
      });
    });

    document.querySelectorAll("[data-img-btn]").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        document
          .querySelector(
            `[data-img-input="${e.currentTarget.getAttribute("data-img-btn")}"]`,
          )
          .click(),
      );
    });
    document.querySelectorAll("[data-img-input]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const target = e.target.getAttribute("data-img-input");
        pendingFiles[target] = file;
        const localUrl = URL.createObjectURL(file);
        state[target] = localUrl;
        const preview = document.querySelector(
          `[data-img-preview="${target}"]`,
        );
        if (preview) preview.src = localUrl;
        actualizarPreview();
      });
    });

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.currentTarget.getAttribute("data-tab");
        document
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => c.classList.remove("active"));
        e.currentTarget.classList.add("active");
        document.getElementById("tab-" + tab).classList.add("active");
      });
    });

    document.querySelectorAll(".device-toggle button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".device-toggle button")
          .forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const wrapper = document.querySelector(".iframe-wrapper");
        wrapper.classList.toggle(
          "mobile",
          e.currentTarget.querySelector(".fa-mobile-screen"),
        );
      });
    });

    document.getElementById("btn-save").addEventListener("click", guardar);
    document.getElementById("btn-delete").addEventListener("click", eliminar);
  }

  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function renderDynamicLists() {
    const horariosContainer = document.getElementById("list-horarios");
    horariosContainer.innerHTML = "";
    state.horariosItems.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "dynamic-item";
      div.innerHTML = `
        <input type="text" class="premium-input" value="${item.dia}" data-list="horariosItems" data-index="${index}" data-field="dia" placeholder="Día">
        <input type="text" class="premium-input" value="${item.hora}" data-list="horariosItems" data-index="${index}" data-field="hora" placeholder="Hora">
        <button type="button" class="btn-remove" data-list-remove="horariosItems" data-index="${index}"><i class="fa-solid fa-xmark"></i></button>
      `;
      horariosContainer.appendChild(div);
    });

    const redesContainer = document.getElementById("list-redes");
    redesContainer.innerHTML = "";
    state.redesConfig.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "social-row";
      div.innerHTML = `
        <i class="${item.icono}"></i>
        <span class="social-name">${item.plataforma}</span>
        <input type="text" class="premium-input" value="${item.url}" data-social-index="${index}" data-field="url" placeholder="Pega el enlace..." ${!item.activo ? "disabled" : ""}>
        <label class="toggle-switch"><input type="checkbox" data-social-toggle="${index}" ${item.activo ? "checked" : ""}><span class="toggle-slider"></span></label>
      `;
      redesContainer.appendChild(div);
    });

    bindDynamicEvents();
  }

  function bindDynamicEvents() {
    document.querySelectorAll("[data-list]").forEach((input) => {
      input.addEventListener("input", (e) => {
        const list = e.target.getAttribute("data-list");
        const index = parseInt(e.target.getAttribute("data-index"));
        const field = e.target.getAttribute("data-field");
        state[list][index][field] = e.target.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(actualizarPreview, 400);
      });
    });
    document.querySelectorAll("[data-list-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        state[e.currentTarget.getAttribute("data-list-remove")].splice(
          parseInt(e.currentTarget.getAttribute("data-index")),
          1,
        );
        renderDynamicLists();
        actualizarPreview();
      });
    });
    document.getElementById("btn-add-horario").addEventListener("click", () => {
      state.horariosItems.push({ dia: "Nuevo Día", hora: "00:00" });
      renderDynamicLists();
      actualizarPreview();
    });

    document.querySelectorAll("[data-social-toggle]").forEach((toggle) => {
      toggle.addEventListener("change", (e) => {
        const i = parseInt(e.target.getAttribute("data-social-toggle"));
        state.redesConfig[i].activo = e.target.checked;
        document.querySelector(`[data-social-index="${i}"]`).disabled =
          !e.target.checked;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(actualizarPreview, 400);
      });
    });
    document.querySelectorAll("[data-social-index]").forEach((input) => {
      input.addEventListener("input", (e) => {
        state.redesConfig[
          parseInt(e.target.getAttribute("data-social-index"))
        ].url = e.target.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(actualizarPreview, 400);
      });
    });
  }

  function actualizarPreview() {
    if (!iframe.contentWindow) return;

    // Proteger constantes críticas para que el admin no rompa la página
    state.loginEnlace = "login-cliente.html";
    state.heroOverlay =
      "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)";
    state.seccionOrdenJson =
      '["hero", "acerca", "horarios", "galeria", "contacto", "redes", "login"]';

    state.horariosItemsJson = JSON.stringify(state.horariosItems);
    const activeRedes = state.redesConfig
      .filter((r) => r.activo && r.url.trim() !== "")
      .map((r) => ({ plataforma: r.plataforma, url: r.url, icono: r.icono }));
    state.redesItemsJson = JSON.stringify(activeRedes);

    // Mapear TODAS las variables CSS que usa cliente.css
    let cssVars = `
      --c-primary: ${state.colorPrimario};
      --c-primary-hover: ${state.colorPrimarioHover};
      --c-primary-rgb: ${state.colorPrimarioRgb};
      --c-secondary: ${state.colorSecundario};
      --c-secondary-hover: ${state.colorSecundarioHover};
      --c-dark: ${state.colorOscuro};
      --c-dark-mid: ${state.colorDarkMid};
      --c-bg: ${state.colorBg};
      --c-bg-alt: ${state.colorBgAlt};
      --c-card: ${state.colorCard};
      --c-text: ${state.colorTexto};
      --c-text-sec: ${state.colorTextoSec};
      --c-text-ter: ${state.colorTextoTer};
      --c-border: ${state.colorBorde};
      --font-main: ${state.tipografiaFuente};
      --font-heading: ${state.tipografiaFuenteHeading};
      --r-card: ${state.bordeTarjeta};
      --r-btn: ${state.bordeBoton};
      --sh-soft: ${state.sombraSuave};
      --section-py: ${state.espacioSeccionPy};
    `;

    let fontLink = state.tipografiaFuenteGoogle
      ? `<link href="https://fonts.googleapis.com/css2?family=${state.tipografiaFuenteGoogle.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`
      : "";

    // Construir HTML EXACTO de cliente.js
    const horariosHTML = state.horariosItems
      .map(
        (h) =>
          `<div class="horario-row"><span class="dia">${h.dia}</span><span class="hora">${h.hora}</span></div>`,
      )
      .join("");
    const redesHTML = activeRedes
      .map(
        (r) =>
          `<a href="${r.url}" class="red-btn"><i class="${r.icono}"></i> <span>${r.plataforma}</span></a>`,
      )
      .join("");

    const galeriaImgs = [
      state.galeriaImagen1,
      state.galeriaImagen2,
      state.galeriaImagen3,
      state.galeriaImagen4,
      state.galeriaImagen5,
      state.galeriaImagen6,
    ].filter((u) => u && u !== "");
    const galeriaHTML = galeriaImgs
      .map(
        (g) => `<div class="galeria-item"><img src="${g}" alt="Galería"></div>`,
      )
      .join("");

    // Generar secciones condicionalmente
    let heroSec = state.heroActiva
      ? `
    <section class="hero-section">
      <img class="hero-bg" src="${state.heroImagen}" alt="${state.brandingNombre}">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <h1>${state.brandingNombre}</h1>
        <p>${state.brandingDescripcion}</p>
      </div>
    </section>`
      : "";

    let acercaSec = state.acercaActiva
      ? `
    <section class="site-section">
      <div class="section-inner">
        <div class="acerca-grid">
          <div class="acerca-text">
            <span class="section-eyebrow">Nuestra Esencia</span>
            <h2 class="section-title">${state.acercaTitulo}</h2>
            <p>${state.acercaTexto}</p>
          </div>
          <div class="acerca-image-wrapper"><div class="acerca-image"><img src="${state.acercaImagen}" alt="Acerca"></div></div>
        </div>
      </div>
    </section>`
      : "";

    let horariosSec = state.horariosActiva
      ? `
    <section class="site-section alt-bg">
      <div class="section-inner">
        <span class="section-eyebrow">Disponibilidad</span>
        <h2 class="section-title">${state.horariosTitulo}</h2>
        <div class="horarios-container"><div class="horario-card"><div class="horario-list">${horariosHTML}</div></div></div>
      </div>
    </section>`
      : "";

    let galeriaSec = state.galeriaActiva
      ? `
    <section class="site-section">
      <div class="section-inner">
        <span class="section-eyebrow">Vive la Experiencia</span>
        <h2 class="section-title">${state.galeriaTitulo}</h2>
        <div class="galeria-grid">${galeriaHTML}</div>
      </div>
    </section>`
      : "";

    let contactoSec = state.contactoActiva
      ? `
    <section class="site-section alt-bg">
      <div class="section-inner">
        <span class="section-eyebrow">Estamos para ti</span>
        <h2 class="section-title">${state.contactoTitulo}</h2>
        <div class="contacto-grid">
          ${state.contactoMostrarDireccion ? `<div class="contacto-card"><div class="contacto-icon"><i class="fa-solid fa-location-dot"></i></div><h4>Ubicación</h4><p>${state.contactoDireccion}</p></div>` : ""}
          ${state.contactoMostrarTelefono ? `<div class="contacto-card"><div class="contacto-icon"><i class="fa-solid fa-phone"></i></div><h4>Llámanos</h4><p>${state.contactoTelefono}</p></div>` : ""}
          ${state.contactoMostrarEmail ? `<div class="contacto-card"><div class="contacto-icon"><i class="fa-solid fa-envelope"></i></div><h4>Email</h4><p>${state.contactoEmail}</p></div>` : ""}
          ${state.contactoMostrarWhatsapp ? `<div class="contacto-card"><div class="contacto-icon"><i class="fa-brands fa-whatsapp"></i></div><h4>WhatsApp</h4><p>${state.contactoWhatsapp}</p></div>` : ""}
        </div>
      </div>
    </section>`
      : "";

    let redesSec = state.redesActiva
      ? `
    <section class="site-section">
      <div class="section-inner">
        <span class="section-eyebrow">Únete a la comunidad</span>
        <h2 class="section-title">${state.redesTitulo}</h2>
        <div class="redes-grid">${redesHTML}</div>
      </div>
    </section>`
      : "";

    let loginSec = state.loginActiva
      ? `
    <section class="site-section alt-bg">
      <div class="section-inner">
        <div class="login-cta-wrap">
          <div class="login-cta-icon"><i class="fa-solid fa-user-lock"></i></div>
          <h3>${state.loginTitulo}</h3>
          <p>${state.loginTexto}</p>
          <a href="login-cliente.html" class="btn-cta-login"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${state.loginTextoBoton}</a>
        </div>
      </div>
    </section>`
      : "";

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
        <link href="css/cliente.css" rel="stylesheet">
        ${fontLink}
        <style>:root{${cssVars}}</style>
      </head>
      <body style="overflow-y: auto;">
        <header id="site-header" class="scrolled">
          <div class="header-inner">
            <a href="#" class="header-brand">
              <img src="${state.brandingLogo}" class="header-logo">
              <div class="header-text">
                <span class="header-name">${state.brandingNombre}</span>
                <span class="header-slogan">${state.brandingSlogan}</span>
              </div>
            </a>
            <a href="login-cliente.html" class="header-login-btn"><i class="fa-solid fa-user"></i> Acceder</a>
          </div>
        </header>
        <main id="sections-container">
          ${heroSec}
          ${acercaSec}
          ${horariosSec}
          ${galeriaSec}
          ${contactoSec}
          ${redesSec}
          ${loginSec}
        </main>
        <footer id="site-footer">
          <div class="footer-inner">
            <div class="footer-left">
              <img src="${state.brandingLogo}" class="footer-logo">
              <span class="footer-name">${state.brandingNombre}</span>
            </div>
            <p class="footer-copy">${state.footerTexto}</p>
          </div>
          ${state.footerMostrarPowered ? `<div class="footer-powered">Potenciado por <strong>RestSoft</strong></div>` : ""}
        </footer>
        <script>
          // Forzar visibilidad de animaciones en el preview sin necesidad de scroll
          document.querySelectorAll('.reveal, .hero-content, .site-section').forEach(el => el.classList.add('visible'));
          document.querySelectorAll('.hero-section').forEach(el => el.style.opacity = '1');
        <\/script>
      </body>
      </html>
    `);
    iframe.contentWindow.document.close();
  }

  async function guardar() {
    const btn = document.getElementById("btn-save");
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;
    try {
      // Asegurar constantes antes de enviar
      state.loginEnlace = "login-cliente.html";
      state.heroOverlay =
        "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)";
      state.seccionOrdenJson =
        '["hero", "acerca", "horarios", "galeria", "contacto", "redes", "login"]';

      state.horariosItemsJson = JSON.stringify(state.horariosItems);
      state.redesItemsJson = JSON.stringify(
        state.redesConfig
          .filter((r) => r.activo && r.url.trim() !== "")
          .map((r) => ({
            plataforma: r.plataforma,
            url: r.url,
            icono: r.icono,
          })),
      );

      const res = await apiConfig.guardar(state, pendingFiles);
      state.id = res.id;
      pendingFiles = {};
      [
        "brandingLogo",
        "heroImagen",
        "acercaImagen",
        "galeriaImagen1",
        "galeriaImagen2",
        "galeriaImagen3",
        "galeriaImagen4",
        "galeriaImagen5",
        "galeriaImagen6",
      ].forEach((k) => {
        if (res[k]) state[k] = res[k];
      });

      showNotification("Configuración guardada con éxito", "success");
    } catch (error) {
      showNotification("Hubo un error al guardar.", "danger");
    } finally {
      btn.innerHTML =
        '<i class="fa-solid fa-cloud-arrow-up"></i> Guardar Cambios';
      btn.disabled = false;
    }
  }

  function mostrarConfirmacion(
    titulo = "Eliminar configuración",
    mensaje = "¿Seguro que deseas eliminar la configuración?",
    txtCancelar = "Descartar",
    txtConfirmar = "Eliminar",
  ) {
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

  async function eliminar() {
    if (
      !(await mostrarConfirmacion(
        "Eliminar configuración",
        "¿Seguro que deseas eliminar la configuración?",
      ))
    )
      return;
    try {
      await apiConfig.eliminar();
      configurarEstadoPorDefecto();
      pendingFiles = {};
      rellenarFormulario();
      renderDynamicLists();
      actualizarPreview();
      showNotification("Configuración eliminada", "success");
    } catch (error) {
      showNotification("Error al eliminar.", "danger");
    }
  }

  window.showNotification = (message, type = "success") => {
    const contenedor = document.getElementById("notificationContainer");
    if (!contenedor) {
      console.warn("Contenedor de notificaciones no encontrado:", text);
      return;
    }

    // Mapear iconos y títulos según el tipo de alerta
    const config = {
      success: { icon: "fa-circle-check", title: "Operación Exitosa" },
      warning: { icon: "fa-triangle-exclamation", title: "Aviso" },
      error: { icon: "fa-circle-xmark", title: "Error" },
    };

    const { icon, title } = config[type] || config.success;

    // Crear el elemento de la notificación
    const notif = document.createElement("div");
    notif.className = `notification ${type}`;
    notif.innerHTML = `
    <div class="notification-icon">
      <i class="fa-solid ${icon}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

    // Agregar al DOM
    contenedor.appendChild(notif);

    // Forzar reflow para que la animación de entrada funcione
    void notif.offsetWidth;

    // Mostrar con animación
    setTimeout(() => notif.classList.add("show"), 10);

    // Función para cerrar y eliminar
    const cerrarNotif = () => {
      notif.classList.remove("show");
      setTimeout(() => notif.remove(), 400);
    };

    // Cerrar al hacer clic en la X
    notif
      .querySelector(".notification-close")
      .addEventListener("click", cerrarNotif);

    // Auto-cerrar a los 4 segundos
    setTimeout(cerrarNotif, 4000);
  };

  return { iniciar };
})();

document.addEventListener("DOMContentLoaded", AdminConfig.iniciar);
