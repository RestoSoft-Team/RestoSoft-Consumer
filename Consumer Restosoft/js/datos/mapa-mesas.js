import { api } from '../consumo/apiMesas.js';

// 1. DIMENSIONES BASE Y ESTADO GLOBAL
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const GRID_SIZE = 20;

const state = {
    mesas: [],
    zonas: [],
    idZonaActual: null,
    scale: 1 // Factor de escala dinámico
};

// 2. REFERENCIAS DOM
const dom = {
    canvas: document.getElementById("restaurantCanvas"),
    ctx: document.getElementById("restaurantCanvas").getContext("2d"),
    canvasWrapper: document.getElementById("canvasWrapper"),
    zonaSelector: document.getElementById("zonaSelector"),
    btnRecargar: document.getElementById("btnRecargarMapa"),
    
    statDisponibles: document.getElementById("stat-disponibles"),
    statOcupadas: document.getElementById("stat-ocupadas"),
    statReservadas: document.getElementById("stat-reservadas"),
    statFueraServicio: document.getElementById("stat-fuera-servicio"),
    statCapacidad: document.getElementById("stat-capacidad"),
    statPorcentaje: document.getElementById("stat-porcentaje"),
    statTotales: document.getElementById("stat-totales")
};

// 3. INICIALIZACIÓN Y RESPONSIVIDAD
document.addEventListener('DOMContentLoaded', cargarDatos);
// Escuchar cuando la ventana cambie de tamaño
window.addEventListener('resize', ajustarResolucionCanvas);

async function cargarDatos() {
    const ID_EMPRESA = 1; 
    
    try {
        const [mesasData, zonasData] = await Promise.all([
            api.obtenerMesas(ID_EMPRESA),
            api.obtenerZonas(ID_EMPRESA)
        ]);

        state.mesas = mesasData;
        state.zonas = zonasData;

        renderZonasSelect();
        
        if (state.zonas.length > 0 && !state.idZonaActual) {
            state.idZonaActual = state.zonas[0].id;
            dom.zonaSelector.value = state.idZonaActual;
        }

        actualizarEstadisticas();
        ajustarResolucionCanvas(); // Calcula el tamaño la primera vez

    } catch (error) {
        console.error("Error al cargar el mapa:", error);
    }
}

// 4. FUNCIÓN CRÍTICA: ESCALA DINÁMICA
function ajustarResolucionCanvas() {
    if (!dom.canvasWrapper || !dom.canvas) return;

    const contenedorAncho = dom.canvasWrapper.clientWidth;
    let nuevoAncho = contenedorAncho;
    
    if (nuevoAncho > BASE_WIDTH) nuevoAncho = BASE_WIDTH;
    const nuevoAlto = nuevoAncho * (BASE_HEIGHT / BASE_WIDTH);

    dom.canvas.width = nuevoAncho;
    dom.canvas.height = nuevoAlto;
    state.scale = nuevoAncho / BASE_WIDTH;

    renderCanvas();
}

// 5. EVENTOS
dom.zonaSelector.addEventListener("change", (e) => {
    state.idZonaActual = parseInt(e.target.value);
    actualizarEstadisticas();
    renderCanvas();
});

dom.btnRecargar.addEventListener("click", cargarDatos);

// HITBOX CON CONVERSIÓN DE ESCALA
dom.canvas.addEventListener("mousemove", (e) => {
    const rect = dom.canvas.getBoundingClientRect();
    
    // Convertir clics reales a la cuadrícula de 800x600
    const mouseXVirtual = (e.clientX - rect.left) / state.scale;
    const mouseYVirtual = (e.clientY - rect.top) / state.scale;

    const hoverMesa = state.mesas.find(m => {
        if (m.idZona !== state.idZonaActual) return false;
        
        if (m.disponibilidadPersonas > 6) {
            // Hitbox ampliado para la mesa rectangular XL
            return Math.abs(m.posicionX - mouseXVirtual) <= 55 && Math.abs(m.posicionY - mouseYVirtual) <= 32;
        }
        // Hitbox ampliado para la mesa redonda/cuadrada XL
        return Math.sqrt(Math.pow(m.posicionX - mouseXVirtual, 2) + Math.pow(m.posicionY - mouseYVirtual, 2)) <= 38;
    });

    dom.canvas.style.cursor = hoverMesa ? "pointer" : "default";
});

// 6. LÓGICA DE INTERFAZ
function renderZonasSelect() {
    dom.zonaSelector.innerHTML = '<option value="">Selecciona una Zona...</option>' +
        state.zonas.map(z => `<option value="${z.id}" ${state.idZonaActual === z.id ? 'selected' : ''}>${z.nombreZona}</option>`).join('');
}

function actualizarEstadisticas() {
    const mesasZona = state.mesas.filter(m => m.idZona === state.idZonaActual);

    const disponibles = mesasZona.filter(m => m.estado === 'LIBRE').length;
    const ocupadas = mesasZona.filter(m => m.estado === 'OCUPADA').length;
    const reservadas = mesasZona.filter(m => m.estado === 'RESERVADA').length;
    const fueraServicio = mesasZona.filter(m => m.estado === 'FUERA_SERVICIO').length;
    const totales = mesasZona.length;

    const capacidadTotal = mesasZona.reduce((sum, m) => sum + (parseInt(m.disponibilidadPersonas) || 0), 0);
    const capacidadOcupada = mesasZona.filter(m => m.estado === 'OCUPADA').reduce((sum, m) => sum + (parseInt(m.disponibilidadPersonas) || 0), 0);
    const porcentaje = capacidadTotal > 0 ? Math.round((capacidadOcupada / capacidadTotal) * 100) : 0;

    dom.statDisponibles.textContent = `${disponibles} Mesas`;
    dom.statOcupadas.textContent = `${ocupadas} Mesas`;
    dom.statReservadas.textContent = `${reservadas} Mesas`;
    dom.statFueraServicio.textContent = `${fueraServicio} Mesas`;
    dom.statCapacidad.textContent = `${capacidadTotal} Personas`;
    dom.statTotales.textContent = totales;
    dom.statPorcentaje.textContent = `${porcentaje}%`;
}

// 7. MOTOR VECTORIAL (DIBUJO ESCALADO)
function renderCanvas() {
    const { ctx, canvas } = dom;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    // APLICAR ESCALA
    ctx.scale(state.scale, state.scale);

    ctx.fillStyle = "#fafafa"; 
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.strokeStyle = "#eef0f2"; 
    ctx.lineWidth = 1;
    for (let i = 0; i < BASE_WIDTH; i += GRID_SIZE) { 
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, BASE_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < BASE_HEIGHT; i += GRID_SIZE) { 
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(BASE_WIDTH, i); ctx.stroke(); 
    }

    if (!state.idZonaActual) {
        ctx.restore();
        return;
    }

    const mesasAMostrar = state.mesas.filter(m => m.idZona === state.idZonaActual);
    mesasAMostrar.forEach((mesa) => drawGourmetTable(ctx, mesa));

    ctx.restore();
}

function drawGourmetTable(ctx, mesa) {
    const C = parseInt(mesa.disponibilidadPersonas) || 4;
    ctx.save();

    let mainColor = "#22521b"; 
    let strokeColor = "#4a121a";

    if (mesa.estado === 'OCUPADA') { 
        mainColor = "#d32f2f"; strokeColor = "#7f0000";
    } else if (mesa.estado === 'RESERVADA') { 
        mainColor = "#ff9800"; strokeColor = "#e65100";
    } else if (mesa.estado === 'FUERA_SERVICIO' || mesa.estado === 'INACTIVA') { 
        mainColor = "#757575"; strokeColor = "#424242";
    }

    if (C > 6) {
        const width = 96; const height = 54;
        const xPos = mesa.posicionX - width / 2; 
        const yPos = mesa.posicionY - height / 2;

        ctx.fillStyle = "#333333"; 
        let sillasPorLado = Math.ceil((C - 2) / 2);
        let gapX = width / (sillasPorLado + 1);

        for (let i = 1; i <= sillasPorLado; i++) {
            ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos - 6, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos + height + 6, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(xPos - 6, mesa.posicionY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(xPos + width + 6, mesa.posicionY, 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = mainColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(xPos, yPos, width, height, 8); ctx.fill(); ctx.stroke();
    } else {
        const radius = 27;
        ctx.fillStyle = "#333333"; 
        for (let i = 0; i < C; i++) {
            const angle = (i * 2 * Math.PI) / C;
            const chairX = mesa.posicionX + (radius + 8) * Math.cos(angle);
            const chairY = mesa.posicionY + (radius + 8) * Math.sin(angle);
            ctx.beginPath(); ctx.arc(chairX, chairY, 6, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = mainColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = 2;
        ctx.beginPath();
        if (mesa.tipoMesa === 'redonda') {
            ctx.arc(mesa.posicionX, mesa.posicionY, radius, 0, Math.PI * 2);
        } else {
            ctx.roundRect(mesa.posicionX - radius, mesa.posicionY - radius, radius * 2, radius * 2, 6);
        }
        ctx.fill(); ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Inter, Arial"; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mesa.numeroMesa, mesa.posicionX, mesa.posicionY);
    ctx.restore();
}