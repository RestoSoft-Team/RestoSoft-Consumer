import { ApiCliente } from "../consumo/apiCliente.js";

const ClienteApp = (function () {
  "use strict";
  let $loading, $app, $sections, $header;
  let iniciado = false;

  async function iniciar() {
    if (iniciado) return;
    iniciado = true;
    $loading = document.getElementById("loading-screen");
    $app = document.getElementById("app");
    $sections = document.getElementById("sections-container");
    $header = document.getElementById("site-header");

    const slug = obtenerSlug();
    if (!slug) {
      redirigir("/");
      return;
    }

    try {
      const data = await ApiCliente.obtenerEmpresa(slug);
      if (!data) {
        redirigir("/no-encontrado");
        return;
      }

      if (data.idEmpresa) {
        localStorage.setItem("idEmpresaActual", data.idEmpresa);
        localStorage.setItem("slugEmpresaActual", slug);
      }

      // Parsear los campos JSON que vienen como String desde Java
      data.seccionOrden = safeParse(data.seccionOrdenJson, [
        "hero",
        "acerca",
        "horarios",
        "galeria",
        "contacto",
        "redes",
        "login",
      ]);
      data.horariosItems = safeParse(data.horariosItemsJson, []);
      data.redesItems = safeParse(data.redesItemsJson, []);

      // === LA MAGIA PARA LA GALERÍA AQUÍ ===
      // Agrupamos las 6 imágenes individuales del DTO en un solo Array
      data.galeriaImagenes = [];
      for (let i = 1; i <= 6; i++) {
        const img = data["galeriaImagen" + i];
        if (img && img.trim() !== "") {
          data.galeriaImagenes.push({ url: img, alt: "Imagen " + i });
        }
      }

      aplicarBranding(data);
      renderizarHeader(data);
      renderizarSecciones(data);
      renderizarFooter(data);
      iniciarEfectoScroll();
      iniciarAnimacionesEntrada();
      mostrarApp();
    } catch (error) {
      console.error("Error cargando empresa:", error);
      redirigir("/no-encontrado");
    }
  }

  function safeParse(jsonStr, fallback) {
    try {
      return jsonStr ? JSON.parse(jsonStr) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function obtenerSlug() {
    const partes = window.location.pathname.split("/").filter(Boolean);
    return partes[0] || null;
  }
  function redirigir(ruta) {
    window.location.replace(ruta);
  }
  function mostrarApp() {
    $app.style.display = "block";
    $loading.classList.add("out");
    setTimeout(function () {
      $loading.style.display = "none";
    }, 800);
  }
  function setCssVar(varName, value) {
    if (value !== null && value !== undefined && value !== "")
      document.documentElement.style.setProperty(varName, value);
  }

  function aplicarBranding(data) {
    if (data.tipografiaFuenteGoogle) {
      var fontName = data.tipografiaFuenteGoogle.replace(/ /g, "+");
      var fontLink = document.createElement("link");
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=" +
        fontName +
        ":wght@300;400;500;600;700;800;900&display=swap";
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }

    // Aplicar TODAS las variables CSS que vienen en tu DTO
    setCssVar("--c-primary", data.colorPrimario);
    setCssVar("--c-primary-hover", data.colorPrimarioHover);
    setCssVar("--c-primary-rgb", data.colorPrimarioRgb);
    setCssVar("--c-secondary", data.colorSecundario);
    setCssVar("--c-secondary-hover", data.colorSecundarioHover);
    setCssVar("--c-dark", data.colorOscuro);
    setCssVar("--c-dark-mid", data.colorDarkMid);
    setCssVar("--c-bg", data.colorBg);
    setCssVar("--c-bg-alt", data.colorBgAlt);
    setCssVar("--c-card", data.colorCard);
    setCssVar("--c-text", data.colorTexto);
    setCssVar("--c-text-sec", data.colorTextoSec);
    setCssVar("--c-text-ter", data.colorTextoTer);
    setCssVar("--c-border", data.colorBorde);
    setCssVar("--c-success", data.colorExito);
    setCssVar("--c-warning", data.colorWarning);
    setCssVar("--c-danger", data.colorPeligro);

    setCssVar("--font-main", data.tipografiaFuente);
    setCssVar("--font-heading", data.tipografiaFuenteHeading);
    setCssVar("--fs-hero", data.tipografiaFsHero);
    setCssVar("--fs-h2", data.tipografiaFsH2);
    setCssVar("--fs-h3", data.tipografiaFsH3);
    setCssVar("--fs-h4", data.tipografiaFsH4);
    setCssVar("--fs-body", data.tipografiaFsBody);
    setCssVar("--fs-small", data.tipografiaFsSmall);
    setCssVar("--fs-mini", data.tipografiaFsMini);
    setCssVar("--fw-hero", data.tipografiaFwHero);
    setCssVar("--fw-h2", data.tipografiaFwH2);
    setCssVar("--fw-h3", data.tipografiaFwH3);
    setCssVar("--fw-h4", data.tipografiaFwH4);
    setCssVar("--fw-body", data.tipografiaFwBody);
    setCssVar("--fw-bold", data.tipografiaFwBold);
    setCssVar("--fw-small", data.tipografiaFwSmall);

    setCssVar("--r-card", data.bordeTarjeta);
    setCssVar("--r-btn", data.bordeBoton);
    setCssVar("--r-input", data.bordeInput);
    setCssVar("--r-badge", data.bordeBadge);
    setCssVar("--r-img", data.bordeImagen);
    setCssVar("--r-tooltip", data.bordeTooltip);

    setCssVar("--sh-soft", data.sombraSuave);
    setCssVar("--sh-mid", data.sombraMedia);
    setCssVar("--sh-strong", data.sombraFuerte);
    setCssVar("--sh-btn", data.sombraBoton);

    setCssVar("--section-py", data.espacioSeccionPy);
    setCssVar("--card-p", data.espacioCardP);
    setCssVar("--gap", data.espacioGap);
    setCssVar("--max-w", data.espacioMaxW);

    if (data.animActiva === false) {
      setCssVar("--hover-lift", "0px");
      setCssVar("--hover-lift-btn", "0px");
    }
    setCssVar("--anim-speed", data.animVelocidad);
    setCssVar("--anim-curve", data.animCurva);
    setCssVar("--hover-lift", data.animHoverLift);
    setCssVar("--hover-lift-btn", data.animHoverLiftBtn);
  }

  function renderizarHeader(data) {
    document.getElementById("h-logo").src = data.brandingLogo || "";
    document.getElementById("h-logo").alt = data.brandingNombre || "";
    document.getElementById("h-nombre").textContent = data.brandingNombre || "";
    document.getElementById("h-slogan").textContent = data.brandingSlogan || "";
    if (data.loginEnlace) {
      document.getElementById("h-login-text").textContent =
        data.loginTextoBoton || "Acceder";
      document.getElementById("h-login-btn").href = data.loginEnlace;
    }
    if (data.brandingFavicon) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.href = data.brandingFavicon;
      document.head.appendChild(link);
    }
    document.title =
      (data.brandingNombre || "") + " \u2014 " + (data.brandingSlogan || "");
  }

  function renderizarSecciones(data) {
    $sections.innerHTML = "";
    var orden = data.seccionOrden;
    var renderers = {
      hero: function () {
        return construirHero(data);
      },
      acerca: function () {
        return construirAcerca(data);
      },
      horarios: function () {
        return construirHorarios(data);
      },
      galeria: function () {
        return construirGaleria(data);
      },
      contacto: function () {
        return construirContacto(data);
      },
      redes: function () {
        return construirRedes(data);
      },
      login: function () {
        return construirLoginCTA(data);
      },
    };
    orden.forEach(function (key, i) {
      var renderer = renderers[key];
      if (!renderer) return;
      var activaKey = key + "Activa";
      if (data[activaKey] === false) return;
      var section = renderer();
      if (section) {
        if (key !== "hero" && i % 2 === 1) section.classList.add("alt-bg");
        $sections.appendChild(section);
      }
    });
  }

  function construirHero(data) {
    if (data.heroActiva === false) return null;
    var section = document.createElement("section");
    section.className = "hero-section";
    var tagsHTML = "";
    if (data.heroMostrarDireccion && data.contactoDireccion)
      tagsHTML +=
        '<span class="hero-tag"><i class="fa-solid fa-location-dot"></i> ' +
        data.contactoDireccion +
        "</span>";
    if (
      data.heroMostrarHorario &&
      data.horariosItems &&
      data.horariosItems.length > 0
    ) {
      var first = data.horariosItems[0];
      tagsHTML +=
        '<span class="hero-tag"><i class="fa-regular fa-clock"></i> ' +
        first.dia +
        ": " +
        first.hora +
        "</span>";
    }
    var nombre = data.brandingNombre || "";
    var nombreParts = nombre.split(" ");
    var nombreStyled =
      nombreParts.length > 1
        ? nombreParts.slice(0, -1).join(" ") +
          " <span>" +
          nombreParts.slice(-1) +
          "</span>"
        : nombre;

    section.innerHTML =
      '<img class="hero-bg" src="' +
      data.heroImagen +
      '" alt="' +
      nombre +
      '">' +
      '<div class="hero-overlay" style="background:' +
      (data.heroOverlay ||
        "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)") +
      '"></div>' +
      '<div class="hero-content">' +
      "<h1>" +
      nombreStyled +
      "</h1>" +
      "<p>" +
      (data.brandingDescripcion || "") +
      "</p>" +
      (tagsHTML ? '<div class="hero-tags">' + tagsHTML + "</div>" : "") +
      "</div>" +
      '<div class="hero-scroll-indicator">Scroll <i class="fa-solid fa-arrow-down"></i></div>';
    return section;
  }

  function construirAcerca(data) {
    if (data.acercaActiva === false) return null;
    var section = document.createElement("section");
    section.className = "site-section";
    var contentHTML;
    if (data.acercaImagen && data.acercaImagen.trim()) {
      contentHTML =
        '<div class="acerca-grid">' +
        '<div class="acerca-text">' +
        '<span class="section-eyebrow">Nuestra Esencia</span>' +
        '<h2 class="section-title">' +
        (data.acercaTitulo || "") +
        "</h2>" +
        "<p>" +
        (data.acercaTexto || "") +
        "</p>" +
        "</div>" +
        '<div class="acerca-image-wrapper">' +
        '<img src="' +
        data.acercaImagen +
        '" alt="' +
        (data.acercaTitulo || "") +
        '" loading="lazy">' +
        "</div></div>";
    } else {
      contentHTML =
        '<div class="text-center max-w-680 mx-auto">' +
        '<span class="section-eyebrow">Nuestra Esencia</span>' +
        '<h2 class="section-title">' +
        (data.acercaTitulo || "") +
        "</h2>" +
        '<p class="section-subtitle mx-auto">' +
        (data.acercaTexto || "") +
        "</p></div>";
    }
    section.innerHTML = '<div class="section-inner">' + contentHTML + "</div>";
    return section;
  }

  function construirHorarios(data) {
    if (
      data.horariosActiva === false ||
      !data.horariosItems ||
      data.horariosItems.length === 0
    )
      return null;
    var section = document.createElement("section");
    section.className = "site-section alt-bg";
    var rowsHTML = data.horariosItems
      .map(function (item) {
        return (
          '<div class="horario-row"><span class="dia">' +
          item.dia +
          '</span><span class="hora">' +
          item.hora +
          "</span></div>"
        );
      })
      .join("");
    section.innerHTML =
      '<div class="section-inner text-center">' +
      '<span class="section-eyebrow" style="justify-content: center;">Disponibilidad</span>' +
      '<h2 class="section-title">' +
      (data.horariosTitulo || "") +
      "</h2>" +
      '<div class="horarios-container" style="margin-top: 48px;">' +
      '<div class="horario-card">' +
      '<div class="horario-header">' +
      '<div><span class="horario-status"><span class="dot"></span> Abierto Ahora</span></div>' +
      '<div class="horario-icon"><i class="fa-regular fa-clock"></i></div>' +
      "</div>" +
      '<div class="horario-list">' +
      rowsHTML +
      "</div>" +
      "</div></div></div>";
    return section;
  }

  function construirGaleria(data) {
    if (
      data.galeriaActiva === false ||
      !data.galeriaImagenes ||
      data.galeriaImagenes.length === 0
    )
      return null;
    var section = document.createElement("section");
    section.className = "site-section";
    var itemsHTML = data.galeriaImagenes
      .map(function (img) {
        return (
          '<div class="galeria-item" onclick="ClienteApp.abrirLightbox(\'' +
          img.url +
          "', '" +
          (img.alt || "").replace(/'/g, "\\'") +
          "')\">" +
          '<img src="' +
          img.url +
          '" alt="' +
          (img.alt || "") +
          '" loading="lazy">' +
          (img.alt
            ? '<span class="galeria-caption">' + img.alt + "</span>"
            : "") +
          "</div>"
        );
      })
      .join("");
    section.innerHTML =
      '<div class="section-inner">' +
      '<span class="section-eyebrow">Vive la Experiencia</span>' +
      '<h2 class="section-title">' +
      (data.galeriaTitulo || "Galería") +
      "</h2>" +
      '<div class="galeria-grid" style="margin-top: 48px;">' +
      itemsHTML +
      "</div></div>";
    return section;
  }

  function construirContacto(data) {
    if (data.contactoActiva === false) return null;
    var section = document.createElement("section");
    section.className = "site-section alt-bg";
    var cardsHTML = "";
    if (data.contactoMostrarDireccion && data.contactoDireccion)
      cardsHTML +=
        '<a href="#" class="contacto-card"><div class="contacto-icon"><i class="fa-solid fa-location-dot"></i></div><div class="contacto-info"><h4>Ubicación</h4><p>' +
        data.contactoDireccion +
        "</p></div></a>";
    if (data.contactoMostrarTelefono && data.contactoTelefono)
      cardsHTML +=
        '<a href="tel:' +
        data.contactoTelefono.replace(/\s/g, "") +
        '" class="contacto-card"><div class="contacto-icon"><i class="fa-solid fa-phone"></i></div><div class="contacto-info"><h4>Llámanos</h4><p>' +
        data.contactoTelefono +
        "</p></div></a>";
    if (data.contactoMostrarEmail && data.contactoEmail)
      cardsHTML +=
        '<a href="mailto:' +
        data.contactoEmail +
        '" class="contacto-card"><div class="contacto-icon"><i class="fa-solid fa-envelope"></i></div><div class="contacto-info"><h4>Email</h4><p>' +
        data.contactoEmail +
        "</p></div></a>";
    if (data.contactoMostrarWhatsapp && data.contactoWhatsapp)
      cardsHTML +=
        '<a href="https://wa.me/' +
        data.contactoWhatsapp +
        '" target="_blank" rel="noopener" class="contacto-card"><div class="contacto-icon"><i class="fa-brands fa-whatsapp"></i></div><div class="contacto-info"><h4>WhatsApp</h4><p>Escríbenos directamente</p></div></a>"';
    section.innerHTML =
      '<div class="section-inner"><span class="section-eyebrow">Estamos para ti</span><h2 class="section-title">' +
      (data.contactoTitulo || "Contacto") +
      '</h2><div class="contacto-grid" style="margin-top: 48px;">' +
      cardsHTML +
      "</div></div>";
    return section;
  }

  function construirRedes(data) {
    if (
      data.redesActiva === false ||
      !data.redesItems ||
      data.redesItems.length === 0
    )
      return null;
    var section = document.createElement("section");
    section.className = "site-section";
    var btnsHTML = data.redesItems
      .map(function (item) {
        return (
          '<a href="' +
          item.url +
          '" target="_blank" rel="noopener" class="red-btn">' +
          '<i class="' +
          item.icono +
          '"></i>' +
          "<span>" +
          item.plataforma +
          "</span>" +
          '<i class="fa-solid fa-arrow-right arrow"></i>' +
          "</a>"
        );
      })
      .join("");
    section.innerHTML =
      '<div class="section-inner"><span class="section-eyebrow">Únete a la comunidad</span><h2 class="section-title">' +
      (data.redesTitulo || "Redes") +
      '</h2><div class="redes-grid" style="margin-top: 48px;">' +
      btnsHTML +
      "</div></div>";
    return section;
  }

  function construirLoginCTA(data) {
    if (data.loginActiva === false) return null;
    var section = document.createElement("section");
    section.className = "site-section alt-bg";
    section.innerHTML =
      '<div class="section-inner"><div class="login-cta-wrap">' +
      '<div class="login-cta-icon"><i class="fa-solid fa-user-lock"></i></div>' +
      "<h3>" +
      (data.loginTitulo || "Acceso Exclusivo") +
      "</h3>" +
      "<p>" +
      (data.loginTexto || "") +
      "</p>" +
      '<a href="' +
      (data.loginEnlace || "#") +
      '" class="btn-cta-login"><i class="fa-solid fa-arrow-right-to-bracket"></i> ' +
      (data.loginTextoBoton || "Acceder") +
      "</a>" +
      "</div></div>";
    return section;
  }

  function renderizarFooter(data) {
    document.getElementById("f-logo").src = data.brandingLogo || "";
    document.getElementById("f-logo").alt = data.brandingNombre || "";
    document.getElementById("f-nombre").textContent = data.brandingNombre || "";
    document.getElementById("f-texto").textContent = data.footerTexto || "";
    document.getElementById("f-powered").style.display =
      data.footerMostrarPowered !== false ? "block" : "none";

    if (!document.querySelector(".footer-massive")) {
      var massiveDiv = document.createElement("div");
      massiveDiv.className = "footer-massive";
      massiveDiv.textContent = (data.brandingNombre || "").toUpperCase();
      document
        .getElementById("site-footer")
        .insertBefore(massiveDiv, document.querySelector(".footer-powered"));
    }
  }

  function iniciarEfectoScroll() {
    window.addEventListener(
      "scroll",
      function () {
        $header.classList.toggle("scrolled", window.scrollY > 50);
      },
      { passive: true },
    );
  }
  function iniciarAnimacionesEntrada() {
    var reveals = document.querySelectorAll(".site-section, .hero-content");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1 },
    );
    reveals.forEach(function (el) {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }
  function abrirLightbox(url, alt) {
    var modal = document.createElement("div");
    modal.className = "lightbox-modal active";
    modal.innerHTML =
      '<span class="lightbox-close" onclick="this.parentElement.remove()">&times;</span><img src="' +
      url +
      '" alt="' +
      alt +
      '">';
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
  }

  return { iniciar: iniciar, abrirLightbox: abrirLightbox };
})();

// El módulo se inicia a sí mismo cuando el DOM está listo
document.addEventListener("DOMContentLoaded", function () {
  ClienteApp.iniciar();
});
