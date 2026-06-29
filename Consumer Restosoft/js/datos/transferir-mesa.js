import { api } from '../consumo/apiMesas.js'; 

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
        btnVolver: document.getElementById("btnVolverA1"),
        notification: document.getElementById("notification")
    };

    window.addEventListener('resize', ajustarAmbasResoluciones);

    async function iniciarCarga() {
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
            
            // Log de control para verificar si el backend envió el ID correctamente
            console.log("Mesa clickeada:", mesaClickeada);
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
        ctx.clearRect(0, 0, canvasHTML.width, canvasHTML.height);
        
        ctx.save();
        ctx.scale(stateTarget.scale, stateTarget.scale);

        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

        ctx.strokeStyle = "#eef0f2"; ctx.lineWidth = 1;
        for (let i = 0; i < BASE_WIDTH; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, BASE_HEIGHT); ctx.stroke(); }
        for (let i = 0; i < BASE_HEIGHT; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(BASE_WIDTH, i); ctx.stroke(); }

        if (!stateTarget.idZona) { ctx.restore(); return; }

        const mesasAMostrar = state.mesas.filter(m => (m.idZona || m.zona?.id) === stateTarget.idZona);
        
        mesasAMostrar.forEach((mesa) => {
            const idMesaReal = mesa.id || mesa.idMesa;
            const isSelected = (idMesaReal !== undefined && idMesaReal !== null) && (idMesaReal === stateTarget.idMesa);
            drawGourmetTable(ctx, mesa, isSelected, role);
        });
        
        ctx.restore();
    }

    function drawGourmetTable(ctx, mesa, isSelected, role) {
        const C = parseInt(mesa.disponibilidadPersonas) || 4;
        ctx.save();
        
        let mainColor = "#6b1e28"; 
        let strokeColor = "#4a121a";

        if (mesa.estado === 'OCUPADA') { mainColor = "#d32f2f"; strokeColor = "#7f0000"; }
        else if (mesa.estado === 'RESERVADA') { mainColor = "#ff9800"; strokeColor = "#e65100"; }
        else if (mesa.estado === 'FUERA_SERVICIO' || mesa.estado === 'INACTIVA') { mainColor = "#757575"; strokeColor = "#424242"; }

        if (isSelected) {
            ctx.shadowBlur = 15;
            if (role === 'origen') {
                ctx.shadowColor = "#0288d1";
                strokeColor = "#01579b";
            } else {
                ctx.shadowColor = "#3d8b5c";
                strokeColor = "#1b5e20";
            }
        } else {
            ctx.shadowBlur = 0;
        }

        if (C > 6) {
            const width = 96;
            const height = 54;
            const xPos = mesa.posicionX - width / 2; 
            const yPos = mesa.posicionY - height / 2;
            
            ctx.fillStyle = "#333333"; ctx.shadowBlur = 0;
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
            ctx.fillStyle = "#333333"; ctx.shadowBlur = 0;
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
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Inter, Arial"; 
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(mesa.numeroMesa, mesa.posicionX, mesa.posicionY);
        ctx.restore();
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
        const icon = document.getElementById("notificationIcon");
        const title = document.getElementById("notificationTitle");
        dom.notification.className = "notification"; 
        
        if (tipo === "error" || tipo === "warning") {
            dom.notification.classList.add("error");
            icon.className = "fa-solid fa-circle-xmark";
            title.textContent = "Atención";
        } else {
            icon.className = "fa-solid fa-circle-check";
            title.textContent = "Operación Exitosa";
        }

        document.getElementById("notificationText").textContent = texto;
        dom.notification.classList.add("show");
        setTimeout(() => dom.notification.classList.remove("show"), 4000);
    }

    iniciarCarga();
}