// Asegúrate de que apiMesas.js exporte: obtenerMesas(id) y obtenerZonas(id)
import { api } from '../consumo/apiMesas.js';

// 1. ESTADO GLOBAL
const state = {
    mesas: [],
    zonas: [],
    idZonaActual: null
};

// 2. REFERENCIAS DOM
const dom = {
    canvas: document.getElementById("restaurantCanvas"),
    ctx: document.getElementById("restaurantCanvas").getContext("2d"),
    zonaSelector: document.getElementById("zonaSelector"),
    btnRecargar: document.getElementById("btnRecargarMapa"),
    
    // Estadísticas
    statDisponibles: document.getElementById("stat-disponibles"),
    statOcupadas: document.getElementById("stat-ocupadas"),
    statReservadas: document.getElementById("stat-reservadas"),
    statFueraServicio: document.getElementById("stat-fuera-servicio"),
    statCapacidad: document.getElementById("stat-capacidad"),
    statPorcentaje: document.getElementById("stat-porcentaje"),
    statTotales: document.getElementById("stat-totales")
};

const GRID_SIZE = 20;

// 3. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', cargarDatos);

async function cargarDatos() {
    const ID_EMPRESA = 1; // Ajustar según lógica de sesión en producción
    
    try {
        // Obtenemos los datos en paralelo
        const [mesasData, zonasData] = await Promise.all([
            api.obtenerMesas(ID_EMPRESA),
            api.obtenerZonas(ID_EMPRESA)
        ]);

        state.mesas = mesasData;
        state.zonas = zonasData;

        renderZonasSelect();
        
        // Autoseleccionar la primera zona al entrar si no hay una seleccionada
        if (state.zonas.length > 0 && !state.idZonaActual) {
            state.idZonaActual = state.zonas[0].id;
            dom.zonaSelector.value = state.idZonaActual;
        }

        actualizarEstadisticas();
        renderCanvas();

    } catch (error) {
        console.error("Error al cargar el mapa:", error);
    }
}

// 4. EVENTOS
dom.zonaSelector.addEventListener("change", (e) => {
    state.idZonaActual = parseInt(e.target.value);
    actualizarEstadisticas();
    renderCanvas();
});

dom.btnRecargar.addEventListener("click", cargarDatos);

// Hitbox simple para detectar el cursor sobre la mesa
dom.canvas.addEventListener("mousemove", (e) => {
    const rect = dom.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hoverMesa = state.mesas.find(m => {
        if (m.idZona !== state.idZonaActual) return false;
        
        // Las mesas imperiales (> 6) son rectangulares y más anchas
        if (m.disponibilidadPersonas > 6) {
            return Math.abs(m.posicionX - mouseX) <= 35 && Math.abs(m.posicionY - mouseY) <= 20;
        }
        // Las mesas redondas/cuadradas
        return Math.sqrt(Math.pow(m.posicionX - mouseX, 2) + Math.pow(m.posicionY - mouseY, 2)) <= 25;
    });

    dom.canvas.style.cursor = hoverMesa ? "pointer" : "crosshair";
});

// 5. LÓGICA DE DIBUJO E INTERFAZ
function renderZonasSelect() {
    // Si state.idZonaActual existe, mantenemos esa selección al recargar
    dom.zonaSelector.innerHTML = '<option value="">Selecciona una Zona...</option>' +
        state.zonas.map(z => `<option value="${z.id}" ${state.idZonaActual === z.id ? 'selected' : ''}>${z.nombreZona}</option>`).join('');
}

function actualizarEstadisticas() {
    // Filtramos las mesas únicamente por la zona que se está viendo
    const mesasZona = state.mesas.filter(m => m.idZona === state.idZonaActual);

    const disponibles = mesasZona.filter(m => m.estado === 'LIBRE').length;
    const ocupadas = mesasZona.filter(m => m.estado === 'OCUPADA').length;
    const reservadas = mesasZona.filter(m => m.estado === 'RESERVADA').length;
    const fueraServicio = mesasZona.filter(m => m.estado === 'FUERA_SERVICIO').length;
    const totales = mesasZona.length;

    const capacidadTotal = mesasZona.reduce((sum, m) => sum + (parseInt(m.disponibilidadPersonas) || 0), 0);
    
    const capacidadOcupada = mesasZona
        .filter(m => m.estado === 'OCUPADA')
        .reduce((sum, m) => sum + (parseInt(m.disponibilidadPersonas) || 0), 0);
        
    const porcentaje = capacidadTotal > 0 ? Math.round((capacidadOcupada / capacidadTotal) * 100) : 0;

    dom.statDisponibles.textContent = `${disponibles} Mesas`;
    dom.statOcupadas.textContent = `${ocupadas} Mesas`;
    dom.statReservadas.textContent = `${reservadas} Mesas`;
    dom.statFueraServicio.textContent = `${fueraServicio} Mesas`;
    dom.statCapacidad.textContent = `${capacidadTotal} Personas`;
    dom.statTotales.textContent = totales;
    dom.statPorcentaje.textContent = `${porcentaje}%`;
}

function renderCanvas() {
    const { ctx, canvas } = dom;
    
    // Limpiar y fondo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fafafa"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid sutil
    ctx.strokeStyle = "#eef0f2"; 
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += GRID_SIZE) { 
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += GRID_SIZE) { 
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); 
    }

    if (!state.idZonaActual) return;

    const mesasAMostrar = state.mesas.filter(m => m.idZona === state.idZonaActual);
    mesasAMostrar.forEach((mesa) => drawGourmetTable(ctx, mesa));
}

function drawGourmetTable(ctx, mesa) {
    const C = parseInt(mesa.disponibilidadPersonas) || 4;
    ctx.save();

    let mainColor = "#6b1e28"; 
    let strokeColor = "#4a121a";

    if (mesa.estado === 'OCUPADA') { 
        mainColor = "#d32f2f"; strokeColor = "#7f0000";
    } else if (mesa.estado === 'RESERVADA') { 
        mainColor = "#ff9800"; strokeColor = "#e65100";
    } else if (mesa.estado === 'FUERA_SERVICIO' || mesa.estado === 'INACTIVA') { 
        mainColor = "#757575"; strokeColor = "#424242";
    }

    if (C > 6) {
        // TAMAÑOS AUMENTADOS PARA MESA RECTANGULAR
        const width = 96;  // Antes 64
        const height = 54; // Antes 36
        const xPos = mesa.posicionX - width / 2; 
        const yPos = mesa.posicionY - height / 2;

        ctx.fillStyle = "#333333"; 
        let sillasPorLado = Math.ceil((C - 2) / 2);
        let gapX = width / (sillasPorLado + 1);

        for (let i = 1; i <= sillasPorLado; i++) {
            // Sillas un poco más grandes (radio 6 en vez de 4)
            ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos - 6, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos + height + 6, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(xPos - 6, mesa.posicionY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(xPos + width + 6, mesa.posicionY, 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = mainColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(xPos, yPos, width, height, 8); ctx.fill(); ctx.stroke();
    } else {
        // TAMAÑOS AUMENTADOS PARA MESA REDONDA/CUADRADA
        const radius = 27; // Antes 18
        ctx.fillStyle = "#333333"; 
        
        for (let i = 0; i < C; i++) {
            const angle = (i * 2 * Math.PI) / C;
            // Separación de sillas aumentada para coincidir con el nuevo radio
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

    // Texto de la mesa un poco más grande
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Inter, Arial"; // Antes 11px
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mesa.numeroMesa, mesa.posicionX, mesa.posicionY);
    ctx.restore();
}