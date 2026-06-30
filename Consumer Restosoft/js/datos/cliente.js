/* ============================================
   CLIENTE — Manejo de datos y renderizado
   No sabe nada de fetch ni endpoints.
   Recibe datos (del apiCliente) y hace todo.
   ============================================ */

const ClienteApp = (function () {
    'use strict';

    /* ── DOM ── */
    let $loading, $app, $sections, $header;

    /* ── Estado ── */
    let iniciado = false;

    /* ============================================
       INICIALIZACIÓN
       ============================================ */

    /**
     * Punto de entrada.
     * Extrae slug de URL, pide datos a la API,
     * y renderiza o redirige.
     */
    async function iniciar() {
        if (iniciado) return;
        iniciado = true;

        // Cachear referencias al DOM
        $loading = document.getElementById('loading-screen');
        $app = document.getElementById('app');
        $sections = document.getElementById('sections-container');
        $header = document.getElementById('site-header');

        const slug = obtenerSlug();

        // Sin slug → redirigir al inicio
        if (!slug) {
            redirigir('/');
            return;
        }

        try {
            // Llamar a la API (a través del otro archivo)
            const data = await ApiCliente.obtenerEmpresa(slug);

            // No existe → redirect a 404
            if (!data) {
                redirigir('/no-encontrado');
                return;
            }

            // Existe → renderizar todo
            aplicarBranding(data);
            renderizarHeader(data);
            renderizarSecciones(data);
            renderizarFooter(data);
            iniciarEfectoScroll();

            mostrarApp();

        } catch (error) {
            console.error('Error cargando empresa:', error);
            redirigir('/no-encontrado');
        }
    }

    /* ============================================
       UTILIDADES
       ============================================ */

    /** Extrae el primer segmento de la URL después de / */
    function obtenerSlug() {
        const partes = window.location.pathname.split('/').filter(Boolean);
        return partes[0] || null;
    }

    /** Redirect sin dejar historial */
    function redirigir(ruta) {
        window.location.replace(ruta);
    }

    /** Muestra la app y oculta el loading */
    function mostrarApp() {
        $app.style.display = 'block';
        $loading.classList.add('out');
        setTimeout(function () { $loading.style.display = 'none'; }, 500);
    }

    /** Convierte camelCase a --kebab-case con prefijo */
    function camelToDash(prefijo, str) {
        return prefijo + str.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    /* ============================================
       BRANDING — Sobreescribir variables CSS
       ============================================ */

    function aplicarBranding(config) {
        var root = document.documentElement;
        var e = config.estilos;
        if (!e) return;

        // Colores
        if (e.colores) {
            var colorMap = {
                'primario': '--c-primary',
                'primarioHover': '--c-primary-hover',
                'primarioRgb': '--c-primary-rgb',
                'secundario': '--c-secondary',
                'secundarioHover': '--c-secondary-hover',
                'oscuro': '--c-dark',
                'darkMid': '--c-dark-mid',
                'bg': '--c-bg',
                'bgAlt': '--c-bg-alt',
                'card': '--c-card',
                'texto': '--c-text',
                'textoSec': '--c-text-sec',
                'textoTer': '--c-text-ter',
                'borde': '--c-border',
                'exito': '--c-success',
                'warning': '--c-warning',
                'peligro': '--c-danger'
            };
            Object.keys(e.colores).forEach(function (key) {
                if (colorMap[key]) {
                    root.style.setProperty(colorMap[key], e.colores[key]);
                }
            });
        }

        // Tipografía
        if (e.tipografia) {
            if (e.tipografia.fuente) root.style.setProperty('--font-main', e.tipografia.fuente);
            if (e.tipografia.fuenteHeading) root.style.setProperty('--font-heading', e.tipografia.fuenteHeading);

            if (e.tipografia.tamanios) {
                var sizeMap = {
                    hero: '--fs-hero', h2: '--fs-h2', h3: '--fs-h3',
                    h4: '--fs-h4', body: '--fs-body', small: '--fs-small', mini: '--fs-mini'
                };
                Object.keys(e.tipografia.tamanios).forEach(function (k) {
                    if (sizeMap[k]) root.style.setProperty(sizeMap[k], e.tipografia.tamanios[k]);
                });
            }

            if (e.tipografia.pesos) {
                var weightMap = {
                    hero: '--fw-hero', h2: '--fw-h2', h3: '--fw-h3',
                    h4: '--fw-h4', body: '--fw-body', bold: '--fw-bold', small: '--fw-small'
                };
                Object.keys(e.tipografia.pesos).forEach(function (k) {
                    if (weightMap[k]) root.style.setProperty(weightMap[k], String(e.tipografia.pesos[k]));
                });
            }
        }

        // Bordes
        if (e.bordes) {
            var radiusMap = {
                tarjeta: '--r-card', boton: '--r-btn', input: '--r-input',
                badge: '--r-badge', imagen: '--r-img', tooltip: '--r-tooltip'
            };
            Object.keys(e.bordes).forEach(function (k) {
                if (radiusMap[k]) root.style.setProperty(radiusMap[k], e.bordes[k]);
            });
        }

        // Sombras
        if (e.sombras) {
            var shadowMap = {
                suave: '--sh-soft', media: '--sh-mid', fuerte: '--sh-strong',
                boton: '--sh-btn', ninguna: '--sh-none'
            };
            Object.keys(e.sombras).forEach(function (k) {
                if (shadowMap[k]) root.style.setProperty(shadowMap[k], e.sombras[k]);
            });
        }

        // Espaciados
        if (e.espaciados) {
            if (e.espaciados.seccionPadding) root.style.setProperty('--section-py', e.espaciados.seccionPadding);
            if (e.espaciados.tarjetaPadding) root.style.setProperty('--card-p', e.espaciados.tarjetaPadding);
            if (e.espaciados.elementoGap) root.style.setProperty('--gap', e.espaciados.elementoGap);
            if (e.espaciados.anchoMaximo) root.style.setProperty('--max-w', e.espaciados.anchoMaximo);
        }

        // Animaciones
        if (e.animaciones) {
            if (e.animaciones.activas === false) {
                root.style.setProperty('--hover-lift', '0px');
                root.style.setProperty('--hover-lift-btn', '0px');
            }
            if (e.animaciones.velocidad) root.style.setProperty('--anim-speed', e.animaciones.velocidad);
            if (e.animaciones.curva) root.style.setProperty('--anim-curve', e.animaciones.curva);
            if (e.animaciones.hoverElevacion) root.style.setProperty('--hover-lift', e.animaciones.hoverElevacion);
            if (e.animaciones.hoverElevacionBoton) root.style.setProperty('--hover-lift-btn', e.animaciones.hoverElevacionBoton);
        }
    }

    /* ============================================
       HEADER
       ============================================ */

    function renderizarHeader(data) {
        document.getElementById('h-logo').src = data.branding.logo;
        document.getElementById('h-logo').alt = data.branding.nombre;
        document.getElementById('h-nombre').textContent = data.branding.nombre;
        document.getElementById('h-slogan').textContent = data.branding.slogan;

        var loginCfg = data.secciones.login;
        if (loginCfg) {
            document.getElementById('h-login-text').textContent = loginCfg.textoBoton;
            document.getElementById('h-login-btn').href = loginCfg.enlace;
        }

        // Favicon
        if (data.branding.favicon) {
            var link = document.createElement('link');
            link.rel = 'icon';
            link.href = data.branding.favicon;
            document.head.appendChild(link);
        }

        // Title
        document.title = data.branding.nombre + ' \u2014 ' + data.branding.slogan;
    }

    /* ============================================
       SECCIONES — Orquestador
       ============================================ */

    function renderizarSecciones(data) {
        $sections.innerHTML = '';
        var orden = data.secciones.orden;

        var renderers = {
            hero: function () { return construirHero(data); },
            acerca: function () { return construirAcerca(data); },
            horarios: function () { return construirHorarios(data); },
            galeria: function () { return construirGaleria(data); },
            contacto: function () { return construirContacto(data); },
            redes: function () { return construirRedes(data); },
            login: function () { return construirLoginCTA(data); }
        };

        orden.forEach(function (key, i) {
            var cfg = data.secciones[key];
            if (!cfg || cfg.activa === false) return;

            var renderer = renderers[key];
            if (!renderer) return;

            var section = renderer();
            if (section) {
                if (key !== 'hero' && i % 2 === 1) {
                    section.classList.add('alt-bg');
                }
                $sections.appendChild(section);
            }
        });
    }

    /* ---------- HERO ---------- */

    function construirHero(data) {
        var h = data.hero;
        if (!h || h.activa === false) return null;

        var section = document.createElement('section');
        section.className = 'hero-section';

        var tagsHTML = '';

        if (h.mostrarDireccion && data.secciones.contacto && data.secciones.contacto.direccion) {
            tagsHTML += '<span class="hero-tag">' +
                '<i class="fa-solid fa-location-dot"></i> ' +
                data.secciones.contacto.direccion +
                '</span>';
        }

        if (h.mostrarHorario && data.secciones.horarios && data.secciones.horarios.items && data.secciones.horarios.items.length > 0) {
            var first = data.secciones.horarios.items[0];
            tagsHTML += '<span class="hero-tag">' +
                '<i class="fa-regular fa-clock"></i> ' +
                first.dia + ': ' + first.hora +
                '</span>';
        }

        section.innerHTML =
            '<img class="hero-bg" src="' + h.imagen + '" alt="' + data.branding.nombre + '">' +
            '<div class="hero-overlay" style="background:' + h.overlay + '"></div>' +
            '<div class="hero-content">' +
            '<h1>' + data.branding.nombre + '</h1>' +
            '<p>' + data.branding.descripcion + '</p>' +
            (tagsHTML ? '<div class="hero-tags">' + tagsHTML + '</div>' : '') +
            '</div>';

        return section;
    }

    /* ---------- ACERCA ---------- */

    function construirAcerca(data) {
        var a = data.secciones.acerca;
        if (!a || a.activa === false) return null;

        var section = document.createElement('section');
        section.className = 'site-section';

        var tieneImagen = a.imagen && a.imagen.trim();
        var contentHTML;

        if (tieneImagen) {
            contentHTML =
                '<div class="acerca-grid">' +
                '<div class="acerca-text">' +
                '<h2 class="section-title">' + a.titulo + '</h2>' +
                '<p>' + a.texto + '</p>' +
                '</div>' +
                '<div class="acerca-image">' +
                '<img src="' + a.imagen + '" alt="' + a.titulo + '" loading="lazy">' +
                '</div>' +
                '</div>';
        } else {
            contentHTML =
                '<div style="text-align:center; max-width:680px; margin:0 auto;">' +
                '<h2 class="section-title">' + a.titulo + '</h2>' +
                '<p class="section-subtitle" style="margin:0 auto;">' + a.texto + '</p>' +
                '</div>';
        }

        section.innerHTML = '<div class="section-inner">' + contentHTML + '</div>';
        return section;
    }

    /* ---------- HORARIOS ---------- */

    function construirHorarios(data) {
        var h = data.secciones.horarios;
        if (!h || h.activa === false || !h.items || h.items.length === 0) return null;

        var section = document.createElement('section');
        section.className = 'site-section';

        var rowsHTML = h.items.map(function (item) {
            return '<div class="horario-row">' +
                '<span class="dia">' + item.dia + '</span>' +
                '<span class="hora">' + item.hora + '</span>' +
                '</div>';
        }).join('');

        section.innerHTML =
            '<div class="section-inner">' +
            '<h2 class="section-title">' + h.titulo + '</h2>' +
            '<div class="horarios-grid">' +
            '<div class="horario-card">' +
            '<div class="horario-card-icon"><i class="fa-regular fa-clock"></i></div>' +
            '<h4>Nuestros Horarios</h4>' +
            rowsHTML +
            '</div>' +
            '</div>' +
            '</div>';

        return section;
    }

    /* ---------- GALERÍA ---------- */

    function construirGaleria(data) {
        var g = data.secciones.galeria;
        if (!g || g.activa === false || !g.imagenes || g.imagenes.length === 0) return null;

        var section = document.createElement('section');
        section.className = 'site-section';

        var itemsHTML = g.imagenes.map(function (img) {
            return '<div class="galeria-item">' +
                '<img src="' + img.url + '" alt="' + (img.alt || '') + '" loading="lazy">' +
                (img.alt ? '<span class="galeria-caption">' + img.alt + '</span>' : '') +
                '</div>';
        }).join('');

        section.innerHTML =
            '<div class="section-inner">' +
            '<h2 class="section-title">' + g.titulo + '</h2>' +
            '<div class="galeria-grid">' + itemsHTML + '</div>' +
            '</div>';

        return section;
    }

    /* ---------- CONTACTO ---------- */

    function construirContacto(data) {
        var c = data.secciones.contacto;
        if (!c || c.activa === false) return null;

        var section = document.createElement('section');
        section.className = 'site-section';

        var cardsHTML = '';

        if (c.mostrarDireccion && c.direccion) {
            cardsHTML +=
                '<div class="contacto-card">' +
                '<div class="contacto-icon"><i class="fa-solid fa-location-dot"></i></div>' +
                '<h4>Ubicación</h4>' +
                '<p>' + c.direccion + '</p>' +
                '</div>';
        }

        if (c.mostrarTelefono && c.telefono) {
            cardsHTML +=
                '<div class="contacto-card">' +
                '<div class="contacto-icon"><i class="fa-solid fa-phone"></i></div>' +
                '<h4>Teléfono</h4>' +
                '<p><a href="tel:' + c.telefono.replace(/\s/g, '') + '">' + c.telefono + '</a></p>' +
                '</div>';
        }

        if (c.mostrarEmail && c.email) {
            cardsHTML +=
                '<div class="contacto-card">' +
                '<div class="contacto-icon"><i class="fa-solid fa-envelope"></i></div>' +
                '<h4>Email</h4>' +
                '<p><a href="mailto:' + c.email + '">' + c.email + '</a></p>' +
                '</div>';
        }

        if (c.mostrarWhatsapp && c.whatsapp) {
            cardsHTML +=
                '<div class="contacto-card">' +
                '<div class="contacto-icon"><i class="fa-brands fa-whatsapp"></i></div>' +
                '<h4>WhatsApp</h4>' +
                '<p><a href="https://wa.me/' + c.whatsapp + '" target="_blank" rel="noopener">Enviar mensaje</a></p>' +
                '</div>';
        }

        section.innerHTML =
            '<div class="section-inner">' +
            '<h2 class="section-title">' + c.titulo + '</h2>' +
            '<div class="contacto-grid">' + cardsHTML + '</div>' +
            '</div>';

        return section;
    }

    /* ---------- REDES SOCIALES ---------- */

    function construirRedes(data) {
        var r = data.secciones.redes;
        if (!r || r.activa === false || !r.items || r.items.length === 0) return null;

        var section = document.createElement('section');
        section.className = 'site-section';

        var btnsHTML = r.items.map(function (item) {
            return '<a href="' + item.url + '" target="_blank" rel="noopener" class="red-btn">' +
                '<i class="' + item.icono + '"></i> ' +
                item.plataforma +
                '</a>';
        }).join('');

        section.innerHTML =
            '<div class="section-inner" style="text-align:center;">' +
            '<h2 class="section-title" style="text-align:center;">' + r.titulo + '</h2>' +
            '<div class="redes-grid" style="justify-content:center;">' + btnsHTML + '</div>' +
            '</div>';

        return section;
    }

    /* ---------- LOGIN CTA ---------- */

    function construirLoginCTA(data) {
        var l = data.secciones.login;
        if (!l || l.activa === false) return null;

        var section = document.createElement('section');
        section.className = 'site-section';

        section.innerHTML =
            '<div class="section-inner">' +
            '<div class="login-cta-wrap">' +
            '<div class="login-cta-icon"><i class="fa-solid fa-user-lock"></i></div>' +
            '<h3>' + l.titulo + '</h3>' +
            '<p>' + l.texto + '</p>' +
            '<a href="' + l.enlace + '" class="btn-cta-login">' +
            '<i class="fa-solid fa-arrow-right-to-bracket"></i> ' +
            l.textoBoton +
            '</a>' +
            '</div>' +
            '</div>';

        return section;
    }

    /* ============================================
       FOOTER
       ============================================ */

    function renderizarFooter(data) {
        document.getElementById('f-logo').src = data.branding.logo;
        document.getElementById('f-logo').alt = data.branding.nombre;
        document.getElementById('f-nombre').textContent = data.branding.nombre;
        document.getElementById('f-texto').textContent = data.footer.texto;
        document.getElementById('f-powered').style.display =
            data.footer.mostrarPowered !== false ? 'block' : 'none';
    }

    /* ============================================
       SCROLL EFFECT
       ============================================ */

    function iniciarEfectoScroll() {
        window.addEventListener('scroll', function () {
            $header.classList.toggle('scrolled', window.scrollY > 30);
        }, { passive: true });
    }

    /* ── Pública ── */
    return {
        iniciar: iniciar
    };

})();