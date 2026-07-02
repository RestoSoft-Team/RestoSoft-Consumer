import { api } from '../consumo/apiMesas.js';
import { apiProfile } from '../consumo/apiProfile.js';


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
window.addEventListener('resize', ajustarResolucionCanvas);

async function cargarDatos() {
    cargarPerfilUsuario(); 
    try {
        const [mesasData, zonasData] = await Promise.all([
            api.obtenerMesas(),
            api.obtenerZonas()
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

dom.zonaSelector.addEventListener("change", (e) => {
    state.idZonaActual = parseInt(e.target.value);
    actualizarEstadisticas();
    renderCanvas();
});

dom.btnRecargar.addEventListener("click", cargarDatos);

dom.canvas.addEventListener("mousemove", (e) => {
    const rect = dom.canvas.getBoundingClientRect();
    const mouseXVirtual = (e.clientX - rect.left) / state.scale;
    const mouseYVirtual = (e.clientY - rect.top) / state.scale;

    const hoverMesa = state.mesas.find(m => {
        if (m.idZona !== state.idZonaActual) return false;
        if (m.disponibilidadPersonas > 6) {
            return Math.abs(m.posicionX - mouseXVirtual) <= 55 && Math.abs(m.posicionY - mouseYVirtual) <= 32;
        }
        return Math.sqrt(Math.pow(m.posicionX - mouseXVirtual, 2) + Math.pow(m.posicionY - mouseYVirtual, 2)) <= 38;
    });

    dom.canvas.style.cursor = hoverMesa ? "pointer" : "default";
});

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
async function cargarPerfilUsuario() {
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

// 7. MOTOR VECTORIAL (DIBUJO ESCALADO)
function renderCanvas() {
    const { ctx, canvas } = dom;
    
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
        surface: rootStyles.getPropertyValue('--surface').trim() || '#ffffff'
    };
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(state.scale, state.scale);

    // Fondo
    ctx.fillStyle = colors.bg; 
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    // Cuadrícula
    ctx.strokeStyle = colors.grid; 
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
    mesasAMostrar.forEach((mesa) => drawGourmetTable(ctx, mesa, colors));

    ctx.restore();
}


function drawGourmetTable(ctx, mesa, colors) {
    const C = parseInt(mesa.disponibilidadPersonas) || 4;
    ctx.save();

    // 👇 ASIGNAR COLORES DESDE LAS VARIABLES CSS
    let mainColor = colors.libre; 
    let strokeColor = colors.dark;
    let sillaColor = colors.dark;

    if (mesa.estado === 'OCUPADA') { 
        mainColor = colors.ocupada; 
    } else if (mesa.estado === 'RESERVADA') { 
        mainColor = colors.reservada; 
    } else if (mesa.estado === 'FUERA_SERVICIO' || mesa.estado === 'INACTIVA') { 
        mainColor = colors.inactiva; 
    }

    if (C > 6) {
        const width = 96; const height = 54;
        const xPos = mesa.posicionX - width / 2; 
        const yPos = mesa.posicionY - height / 2;

        ctx.fillStyle = sillaColor; 
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
        ctx.fillStyle = sillaColor; 
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

    // Texto
    ctx.fillStyle = colors.surface;
    ctx.font = "bold 14px Inter, Arial"; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mesa.numeroMesa, mesa.posicionX, mesa.posicionY);
    ctx.restore();
}