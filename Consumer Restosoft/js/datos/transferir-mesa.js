import { api } from '../consumo/apiMesas.js';
import { showNotification } from './notificaciones.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { generarSidebar } from './create-sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById("canvasOrigen")) {
        iniciarModuloTransferencia();
    }
});

function iniciarModuloTransferencia() {
    const BASE_WIDTH = 800;
    const BASE_HEIGHT = 600;
    const GRID_SIZE = 20;

    const state = {
        step: 1,
        mesas: [],
        zonas: [],
        origen: { idZona: null, idMesa: null, scale: 1 },
        destino: { idZona: null, idMesa: null, scale: 1 }
    };

    const dom = {
        canvasOrig: document.getElementById("canvasOrigen"),
        ctxOrig: document.getElementById("canvasOrigen").getContext("2d"),
        zonaSelectorOrig: document.getElementById("zonaOrigenSelector"),
        statusOrig: document.getElementById("statusOrigen"),

        canvasDest: document.getElementById("canvasDestino"),
        ctxDest: document.getElementById("canvasDestino").getContext("2d"),
        zonaSelectorDest: document.getElementById("zonaDestinoSelector"),
        statusDest: document.getElementById("statusDestino"),

        btnContinuar: document.getElementById("btnContinuar"),
        btnConfirmar: document.getElementById("btnConfirmarTransferencia"),
        btnVolver: document.getElementById("btnVolverA1")
    };

    window.addEventListener('resize', ajustarAmbasResoluciones);

    async function iniciarCarga() {
        cargarPerfilUsuario();
        try {
            const [mesasData, zonasData] = await Promise.all([
                api.obtenerMesas(),
                api.obtenerZonas()
            ]);

            state.mesas = mesasData;
            state.zonas = zonasData;

            llenarSelectores();

            if (state.zonas.length > 0) {
                const primeraZonaId = state.zonas[0].id || state.zonas[0].idZona;
                state.origen.idZona = primeraZonaId;
                state.destino.idZona = primeraZonaId;
                dom.zonaSelectorOrig.value = primeraZonaId;
                dom.zonaSelectorDest.value = primeraZonaId;
            }

            ajustarAmbasResoluciones();
        } catch (error) {
            mostrarNotificacion("Error al cargar los datos del restaurante.", "error");
        }
    }

    function goToStep(step) {
        state.step = step;
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active-step'));
        document.getElementById(`step${step}`).classList.add('active-step');

        document.querySelectorAll('.step').forEach((item, index) => {
            item.classList.remove('active');
            if (index + 1 === step) item.classList.add('active');
        });

        if (step === 2) {
            const mesaOrig = state.mesas.find(m => (m.id || m.idMesa) === state.origen.idMesa);
            const mesaDest = state.mesas.find(m => (m.id || m.idMesa) === state.destino.idMesa);
            const zonaOrig = state.zonas.find(z => (z.id || z.idZona) === state.origen.idZona);
            const zonaDest = state.zonas.find(z => (z.id || z.idZona) === state.destino.idZona);

            document.getElementById("resumenMesaOrigen").textContent = mesaOrig?.numeroMesa || "--";
            document.getElementById("resumenZonaOrigen").textContent = zonaOrig?.nombreZona || "Zona --";
            document.getElementById("resumenMesaDestino").textContent = mesaDest?.numeroMesa || "--";
            document.getElementById("resumenZonaDestino").textContent = zonaDest?.nombreZona || "Zona --";
        }
    }

    dom.btnContinuar.addEventListener("click", () => goToStep(2));
    dom.btnVolver.addEventListener("click", () => goToStep(1));

    function ajustarAmbasResoluciones() {
        ajustarResolucion(dom.canvasOrig, state.origen);
        ajustarResolucion(dom.canvasDest, state.destino);
        renderizarTodo();
    }

    function ajustarResolucion(canvasHTML, stateTarget) {
        if (!canvasHTML || !canvasHTML.parentElement) return;
        const contenedorAncho = canvasHTML.parentElement.clientWidth;
        let nuevoAncho = contenedorAncho;
        if (nuevoAncho > BASE_WIDTH) nuevoAncho = BASE_WIDTH;
        const nuevoAlto = nuevoAncho * (BASE_HEIGHT / BASE_WIDTH);

        canvasHTML.width = nuevoAncho;
        canvasHTML.height = nuevoAlto;
        stateTarget.scale = nuevoAncho / BASE_WIDTH;
    }

    function llenarSelectores() {
        const opcionesHTML = '<option value="">Selecciona Zona...</option>' +
            state.zonas.map(z => `<option value="${z.id || z.idZona}">${z.nombreZona}</option>`).join('');
        dom.zonaSelectorOrig.innerHTML = opcionesHTML;
        dom.zonaSelectorDest.innerHTML = opcionesHTML;
    }

    dom.zonaSelectorOrig.addEventListener("change", (e) => {
        state.origen.idZona = parseInt(e.target.value);
        state.origen.idMesa = null;
        verificarEstadoBoton();
        renderizarTodo();
    });

    dom.zonaSelectorDest.addEventListener("change", (e) => {
        state.destino.idZona = parseInt(e.target.value);
        state.destino.idMesa = null;
        verificarEstadoBoton();
        renderizarTodo();
    });

    function procesarClicCanvas(e, canvasHTML, stateTarget, canvasRole) {
        if (!stateTarget.idZona) return;

        const rect = canvasHTML.getBoundingClientRect();
        const clickXVirtual = (e.clientX - rect.left) / stateTarget.scale;
        const clickYVirtual = (e.clientY - rect.top) / stateTarget.scale;

        const mesaClickeada = state.mesas.find(m => {
            const zonaIdMesa = m.idZona || m.zona?.id;
            if (zonaIdMesa !== stateTarget.idZona) return false;

            if (m.disponibilidadPersonas > 6) {
                return Math.abs(m.posicionX - clickXVirtual) <= 55 && Math.abs(m.posicionY - clickYVirtual) <= 32;
            }
            return Math.sqrt(Math.pow(m.posicionX - clickXVirtual, 2) + Math.pow(m.posicionY - clickYVirtual, 2)) <= 38;
        });

        if (mesaClickeada) {
            const idMesaReal = mesaClickeada.id || mesaClickeada.idMesa;

            if (!idMesaReal) {
                mostrarNotificacion("Error: Java no está enviando el ID de la mesa. Revisa la limpieza de Maven.", "error");
                return;
            }

            stateTarget.idMesa = idMesaReal;

            const statusElement = canvasRole === 'origen' ? dom.statusOrig : dom.statusDest;
            statusElement.className = `selection-status selected-${canvasRole === 'origen' ? 'source' : 'dest'}`;
            statusElement.innerHTML = `<i class="fa-solid fa-check-circle"></i> Mesa ${mesaClickeada.numeroMesa} seleccionada`;
        }

        verificarEstadoBoton();
        renderizarTodo();
    }

    dom.canvasOrig.addEventListener("mousedown", (e) => procesarClicCanvas(e, dom.canvasOrig, state.origen, 'origen'));
    dom.canvasDest.addEventListener("mousedown", (e) => procesarClicCanvas(e, dom.canvasDest, state.destino, 'destino'));

    function verificarEstadoBoton() {
        const origenValido = state.origen.idMesa !== null && state.origen.idMesa !== undefined;
        const destinoValido = state.destino.idMesa !== null && state.destino.idMesa !== undefined;

        if (origenValido && destinoValido) {
            if (state.origen.idMesa === state.destino.idMesa) {
                dom.btnContinuar.disabled = true;
                mostrarNotificacion("No puedes transferir la mesa sobre sí misma.", "warning");
            } else {
                dom.btnContinuar.disabled = false;
            }
        } else {
            dom.btnContinuar.disabled = true;
        }
    }

    function renderizarTodo() {
        dibujarPlano(dom.canvasOrig, dom.ctxOrig, state.origen, "origen");
        dibujarPlano(dom.canvasDest, dom.ctxDest, state.destino, "destino");
    }

    function dibujarPlano(canvasHTML, ctx, stateTarget, role) {
        // 👇 LEER VARIABLES CSS DE :ROOT PARA USARLAS EN EL CANVAS
        const rootStyles = getComputedStyle(document.documentElement);
        const colors = {
            bg: rootStyles.getPropertyValue('--surface-container').trim() || '#f1f3f6',
            grid: rootStyles.getPropertyValue('--border-color').trim() || '#e8ebf0',
            libre: rootStyles.getPropertyValue('--success').trim() || '#059669',
            ocupada: rootStyles.getPropertyValue('--danger').trim() || '#dc2626',
            reservada: rootStyles.getPropertyValue('--warning').trim() || '#d97706',
            inactiva: rootStyles.getPropertyValue('--soft').trim() || '#9ca3af',
            dark: rootStyles.getPropertyValue('--dark').trim() || '#111827',
            surface: rootStyles.getPropertyValue('--surface').trim() || '#ffffff',
            info: rootStyles.getPropertyValue('--info').trim() || '#4a7aff',
            primary: rootStyles.getPropertyValue('--primary').trim() || '#6b1e28'
        };

        ctx.clearRect(0, 0, canvasHTML.width, canvasHTML.height);

        ctx.save();
        ctx.scale(stateTarget.scale, stateTarget.scale);

        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i < BASE_WIDTH; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, BASE_HEIGHT); ctx.stroke(); }
        for (let i = 0; i < BASE_HEIGHT; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(BASE_WIDTH, i); ctx.stroke(); }

        if (!stateTarget.idZona) { ctx.restore(); return; }

        const mesasAMostrar = state.mesas.filter(m => (m.idZona || m.zona?.id) === stateTarget.idZona);

        mesasAMostrar.forEach((mesa) => {
            const idMesaReal = mesa.id || mesa.idMesa;
            const isSelected = (idMesaReal !== undefined && idMesaReal !== null) && (idMesaReal === stateTarget.idMesa);
            drawGourmetTable(ctx, mesa, isSelected, role, colors);
        });

        ctx.restore();
    }

    function drawGourmetTable(ctx, mesa, isSelected, role, colors) {
        const C = parseInt(mesa.disponibilidadPersonas) || 4;
        ctx.save();

        let mainColor = colors.libre;
        let strokeColor = colors.dark;

        if (mesa.estado === 'OCUPADA') { mainColor = colors.ocupada; }
        else if (mesa.estado === 'RESERVADA') { mainColor = colors.reservada; }
        else if (mesa.estado === 'FUERA_SERVICIO' || mesa.estado === 'INACTIVA') { mainColor = colors.inactiva; }

        if (isSelected) {
            ctx.shadowBlur = 15;
            if (role === 'origen') {
                ctx.shadowColor = colors.info;
                strokeColor = colors.info;
            } else {
                ctx.shadowColor = colors.primary;
                strokeColor = colors.primary;
            }
        } else {
            ctx.shadowBlur = 0;
        }

        if (C > 6) {
            const width = 96;
            const height = 54;
            const xPos = mesa.posicionX - width / 2;
            const yPos = mesa.posicionY - height / 2;

            ctx.fillStyle = colors.dark; ctx.shadowBlur = 0;
            let sillasPorLado = Math.ceil((C - 2) / 2);
            let gapX = width / (sillasPorLado + 1);

            for (let i = 1; i <= sillasPorLado; i++) {
                ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos - 6, 6, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos + height + 6, 6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.beginPath(); ctx.arc(xPos - 6, mesa.posicionY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(xPos + width + 6, mesa.posicionY, 6, 0, Math.PI * 2); ctx.fill();

            if (isSelected) ctx.shadowBlur = 15;
            ctx.fillStyle = mainColor; ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.beginPath(); ctx.roundRect(xPos, yPos, width, height, 8); ctx.fill(); ctx.stroke();
        } else {
            const radius = 27;
            ctx.fillStyle = colors.dark; ctx.shadowBlur = 0;
            for (let i = 0; i < C; i++) {
                const angle = (i * 2 * Math.PI) / C;
                const chairX = mesa.posicionX + (radius + 8) * Math.cos(angle);
                const chairY = mesa.posicionY + (radius + 8) * Math.sin(angle);
                ctx.beginPath(); ctx.arc(chairX, chairY, 6, 0, Math.PI * 2); ctx.fill();
            }

            if (isSelected) ctx.shadowBlur = 15;
            ctx.fillStyle = mainColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = isSelected ? 3 : 2;
            ctx.beginPath();
            if (mesa.tipoMesa === 'redonda') ctx.arc(mesa.posicionX, mesa.posicionY, radius, 0, Math.PI * 2);
            else ctx.roundRect(mesa.posicionX - radius, mesa.posicionY - radius, radius * 2, radius * 2, 6);
            ctx.fill(); ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = colors.surface;
        ctx.font = "bold 14px Inter, Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(mesa.numeroMesa, mesa.posicionX, mesa.posicionY);
        ctx.restore();
    }
    async function cargarPerfilUsuario() {

         const perfilData = await apiProfile.obtenerInfoMe();

        const rolesPermitidos = ["MESERO", "ADMINISTRADOR"];

        if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
            console.error("Acceso no autorizado");

            const codigo = "403";
            const mensaje = encodeURIComponent(
                "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
            );

            window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
        }

        generarSidebar('sidebar-container', "mesas", "transferir_mesa", perfilData.rol.nombre);

        const infoPerfilContainer = document.getElementById("infoPerfilContainer");
        const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

        if (!infoPerfilContainer) return;

        try {
            const perfilData = await apiProfile.obtenerInfoMe();

            const empresaData = perfilData?.empresa || perfilData?.Data?.empresa;
            const nombreRaw = empresaData?.nombre || "";

            if (nombreRaw.trim() !== "" && nombreEmpresaContainer) {
                nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
            } else if (nombreEmpresaContainer) {
                nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
            }

            const urlPerfil = "perfil.html";

            if (perfilData && perfilData.usuario) {
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

                const rol = perfilData.rol?.nombre || "Sin rol asignado";

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
        } catch (error) {
            console.error("Error al cargar el perfil:", error);
            infoPerfilContainer.innerHTML = `
            <a href="perfil.html" class="profile-link">
                <div class="profile-text-avatar">EP</div>
                <div class="profile-info">
                    <strong>Error de conexión</strong>
                    <div style="font-size: 13px; color: var(--gray)">No se pudo cargar</div>
                </div>
            </a>
        `;
        }
    }

    dom.btnConfirmar.addEventListener("click", async () => {
        dom.btnConfirmar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
        dom.btnConfirmar.disabled = true;

        try {
            const exito = await api.intercambiarMesas(state.origen.idMesa, state.destino.idMesa);

            if (!exito) throw new Error("Error en la transferencia");

            mostrarNotificacion("¡Mesas transferidas con éxito!", "success");

            setTimeout(() => {
                iniciarCarga();
                goToStep(1);
                dom.btnConfirmar.innerHTML = '<i class="fa-solid fa-check"></i> Ejecutar Transferencia';
                dom.btnConfirmar.disabled = false;

                state.origen.idMesa = null;
                state.destino.idMesa = null;
                dom.statusOrig.className = "selection-status";
                dom.statusOrig.innerHTML = `<i class="fa-solid fa-arrow-pointer"></i> Selecciona una mesa en el plano`;
                dom.statusDest.className = "selection-status";
                dom.statusDest.innerHTML = `<i class="fa-solid fa-arrow-pointer"></i> Selecciona una mesa en el plano`;
                verificarEstadoBoton();
            }, 2000);
        } catch (error) {
            mostrarNotificacion("Ocurrió un error al intentar transferir las mesas.", "error");
            dom.btnConfirmar.innerHTML = '<i class="fa-solid fa-check"></i> Ejecutar Transferencia';
            dom.btnConfirmar.disabled = false;
        }
    });

    function mostrarNotificacion(texto, tipo) {
        let titulo = "Operación Exitosa";
        let icono = "fa-circle-check";

        if (tipo === "error" || tipo === "warning") {
            titulo = "Atención";
            icono = "fa-triangle-exclamation";
        }

        showNotification(titulo, texto, tipo === "error" ? "error" : (tipo === "warning" ? "warning" : "success"), icono);
    }

    iniciarCarga();
}