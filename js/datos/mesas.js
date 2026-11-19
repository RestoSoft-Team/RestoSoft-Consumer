import { api } from '../consumo/apiMesas.js';
import { apiPedido } from '../consumo/apiCrearPedido.js';
import { connectWebSocket } from '../consumo/websocket.js'; 
import { apiProfile } from '../consumo/apiProfile.js';
import { generarSidebar } from './create-sidebar.js';

// =========================================
// 1. ESTADO Y CONFIGURACIÓN GLOBAL
// =========================================
const state = {
    mesas: [],
    zonas: [],
    filtroActivo: 'todas',
    busqueda: '',
    intervalId: null
};

const cache = {
    datos: null,
    ultimaVez: 0,
    TTL: 60000 // 60 segundos
};

const dom = {
    dashboardContent: document.getElementById('dashboard-content'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    statDisponibles: document.getElementById('stat-disponibles'),
    statOcupadas: document.getElementById('stat-ocupadas'),
    statReservadas: document.getElementById('stat-reservadas'),
    statFueraServicio: document.getElementById('stat-fuera-servicio'),
    filtersContainer: document.getElementById('filtersContainer'),
    tablesGrid: document.getElementById('tablesGrid'),
    searchInput: document.getElementById('searchInput'),
    // Modales
    modalOverlay: document.getElementById('modalGenerico'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalCloseBtn: document.getElementById('modalCloseBtn')
};

// =========================================
// 2. UTILIDADES
// =========================================
const escapeHTML = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const ESTADOS_MESA = {
    LIBRE: { text: 'Disponible', color: 'table-free', status: 'status-success' },
    OCUPADA: { text: 'Ocupada', color: 'table-busy', status: 'status-danger' },
    RESERVADA: { text: 'Reservada', color: 'table-reserved', status: 'status-warning' },
    FUERA_SERVICIO: { text: 'Fuera de Servicio', color: 'table-fuera-servicio', status: 'status-gray' }
};

// =========================================
// 3. CAPA DE DATOS
// =========================================
async function fetchConBackoff(intento = 0) {
    const MAX_INTENTOS = 5;
    const DELAY_BASE = 1000;
    
    try {
        const [mesas, zonas] = await Promise.all([
            api.obtenerMesas(),
            api.obtenerZonas()
        ]);
        if (mesas && mesas.length > 0) return { mesas, zonas };
        throw new Error("EMPTY_DATA");
    } catch (error) {
        if (intento < MAX_INTENTOS) {
            await sleep(DELAY_BASE * Math.pow(2, intento));
            return fetchConBackoff(intento + 1);
        }
        throw new Error("SERVICE_UNAVAILABLE");
    }
}

async function obtenerDatosOptimizados() {
    const agora = Date.now();
    if (cache.datos && (agora - cache.ultimaVez < cache.TTL)) {
        return cache.datos;
    }
    const data = await fetchConBackoff();
    cache.datos = data;
    cache.ultimaVez = agora;
    return data;
}

// =========================================
// 4. INICIALIZACIÓN Y WEBSOCKET
// =========================================
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    renderSkeletonCards();
    setupEventListeners();
    cargarPerfilUsuario();

    try {
        await cargarYRenderizarDatos();
        
        connectWebSocket((canal, data) => {
            if (canal === 'COCINA') {
                if (data.tipo === 'NUEVO_PEDIDO' || data.tipo === 'ESTADO_ACTUALIZADO' || data.tipo === 'MESA_RESERVADA' || data.tipo === 'MESA_LIBERADA') {
                    
                    cache.datos = null; 
                    
                    cargarYRenderizarDatos(true);
                }
            }
        });

    } catch (error) {
        mostrarError("El servicio no está disponible tras varios intentos. Contacta con el proveedor.");
    }
}

async function cargarYRenderizarDatos(isBackgroundUpdate = false) {
    try {
        if (!isBackgroundUpdate) cache.datos = null; 
        
        const { mesas, zonas } = await obtenerDatosOptimizados();
        state.mesas = mesas;
        state.zonas = zonas;

        renderStats();
        renderFilters();
        renderTables();
    } catch (error) {
        if (!isBackgroundUpdate) throw error; 
        console.error("El refresco automático falló, pero la UI se mantiene estable:", error);
    }
}

// =========================================
// 5. RENDERIZADO (DOM)
// =========================================
function renderSkeletonCards() {
    let skeletons = '';
    for(let i = 0; i < 8; i++) skeletons += `<div class="skeleton skeleton-card"></div>`;
    dom.tablesGrid.innerHTML = skeletons;
}

function renderStats() {
    const count = (estado) => state.mesas.filter(m => m.estado === estado).length;
    dom.statDisponibles.textContent = count('LIBRE');
    dom.statOcupadas.textContent = count('OCUPADA');
    dom.statReservadas.textContent = count('RESERVADA');
    dom.statFueraServicio.textContent = count('FUERA_SERVICIO');
}

function renderFilters() {
    const filtrosBase = [
        { id: 'todas', texto: 'Todas' },
        { id: 'estado-LIBRE', texto: 'Disponibles' },
        { id: 'estado-OCUPADA', texto: 'Ocupadas' },
        { id: 'estado-RESERVADA', texto: 'Reservadas' },
        { id: 'estado-FUERA_SERVICIO', texto: 'Fuera de Dienst' }
    ];

    const botonesHTML = filtrosBase.map(f => crearBotonFiltro(f.id, f.texto)).join('');
    const zonasHTML = state.zonas.map(zona => crearBotonFiltro(`zona-${zona.id}`, zona.nombreZona)).join('');
    dom.filtersContainer.innerHTML = botonesHTML + zonasHTML;
}

function crearBotonFiltro(id, texto) {
    const isActive = state.filtroActivo === id ? 'active' : '';
    return `<button class="filter-btn ${isActive}" data-filter-id="${escapeHTML(id)}">${escapeHTML(texto)}</button>`;
}

function renderTables() {
    let mesasFiltradas = state.mesas;

    if (state.filtroActivo.startsWith('estado-')) {
        mesasFiltradas = mesasFiltradas.filter(m => m.estado === state.filtroActivo.split('-')[1]);
    } else if (state.filtroActivo.startsWith('zona-')) {
        const idZona = parseInt(state.filtroActivo.split('-')[1]);
        mesasFiltradas = mesasFiltradas.filter(m => m.idZona === idZona);
    }

    if (state.busqueda) {
        const query = state.busqueda.toLowerCase();
        mesasFiltradas = mesasFiltradas.filter(m => {
            const zona = state.zonas.find(z => z.id === m.idZona);
            const nombreZona = zona ? zona.nombreZona.toLowerCase() : '';
            return m.numeroMesa.toLowerCase().includes(query) || nombreZona.includes(query);
        });
    }

    if (mesasFiltradas.length === 0) {
        dom.tablesGrid.innerHTML = '<p style="color:var(--gray); grid-column: 1/-1; text-align:center;">No hay mesas que coincidan con la búsqueda.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    const wrapper = document.createElement('div');

    wrapper.innerHTML = mesasFiltradas.map(mesa => {
        const zona = state.zonas.find(z => z.id === mesa.idZona);
        const nombreZona = zona ? zona.nombreZona : 'Sin Zona';
        const config = ESTADOS_MESA[mesa.estado] || ESTADOS_MESA.LIBRE;

        return `
            <div class="table-card">
                <div class="table-top">
                    <div class="table-number ${config.color}">${escapeHTML(mesa.numeroMesa)}</div>
                    <div class="table-status ${config.status}">${config.text}</div>
                </div>
                <h4>Mesa ${escapeHTML(mesa.tipoMesa) || 'Estándar'}</h4>
                <p>${escapeHTML(nombreZona)} • ${escapeHTML(mesa.disponibilidadPersonas)} personas</p>
                
                <div class="table-info">
                    <div class="table-info-item"><span>Capacidad</span><strong>${escapeHTML(mesa.disponibilidadPersonas)} Personas</strong></div>
                    <div class="table-info-item"><span>Ubicación</span><strong>${escapeHTML(nombreZona)}</strong></div>
                </div>
                
                <div class="table-actions">
                    <button class="btn-premium btn-primary-custom btn-gestionar" data-id="${mesa.id}">Gestionar</button>
                    <button class="btn-premium btn-outline-custom btn-ver" data-id="${mesa.id}">Ver</button>
                </div>
            </div>
        `;
    }).join('');

    while (wrapper.firstChild) {
        fragment.appendChild(wrapper.firstChild);
    }

    dom.tablesGrid.innerHTML = '';
    dom.tablesGrid.appendChild(fragment);
}

// =========================================
// 6. PERFIL DE USUARIO (ADAPTADO DE RESERVAS)
// =========================================
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

        generarSidebar('sidebar-container', "mesas", "mesas", perfilData.rol.nombre);

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

// =========================================
// 7. EVENTOS
// =========================================
function setupEventListeners() {
    dom.filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        dom.filtersContainer.querySelector('.active')?.classList.remove('active');
        btn.classList.add('active');
        state.filtroActivo = btn.dataset.filterId;
        renderTables();
    });

    dom.tablesGrid.addEventListener('click', (e) => {
        const btnVer = e.target.closest('.btn-ver');
        const btnGestionar = e.target.closest('.btn-gestionar');

        if (btnVer) handleVerMesa(parseInt(btnVer.dataset.id));
        if (btnGestionar) handleGestionarMesa(parseInt(btnGestionar.dataset.id));
    });

    let searchTimeout;
    dom.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.busqueda = e.target.value.trim();
            renderTables();
        }, 300);
    });

    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (e) => {
        if (e.target === dom.modalOverlay) closeModal();
    });
    
    // Listener para redirección segura
    dom.modalBody.addEventListener('click', async (e) => {
        const btnRedirect = e.target.closest('.btn-redirect');
        if (btnRedirect) {
            e.preventDefault();
            const url = btnRedirect.dataset.url;
            const idMesa = parseInt(btnRedirect.dataset.id);
            await navegarSeguroBackend(idMesa, url);
        }
    });
}

// =========================================
// 8. LÓGICA DE MODALES
// =========================================
function handleVerMesa(idMesa) {
    const mesa = state.mesas.find(m => m.id === idMesa);
    if (!mesa) return;

    const zona = state.zonas.find(z => z.id === mesa.idZona);
    const config = ESTADOS_MESA[mesa.estado] || ESTADOS_MESA.LIBRE;

    dom.modalTitle.innerHTML = `<i class="fa-solid fa-eye"></i> Detalles de la Mesa`;
    dom.modalBody.innerHTML = `
        <div class="detail-row"><span>Número de Mesa</span><strong>${escapeHTML(mesa.numeroMesa)}</strong></div>
        <div class="detail-row"><span>Tipo de Mesa</span><strong>${escapeHTML(mesa.tipoMesa) || 'Estándar'}</strong></div>
        <div class="detail-row"><span>Ubicación (Zona)</span><strong>${escapeHTML(zona?.nombreZona || 'Sin Zona')}</strong></div>
        <div class="detail-row"><span>Capacidad Máxima</span><strong>${escapeHTML(mesa.disponibilidadPersonas)} Personas</strong></div>
        <div class="detail-row"><span>Estado Actual</span><strong>${config.text}</strong></div>
    `;
    openModal();
}

function handleGestionarMesa(idMesa) {
    const mesa = state.mesas.find(m => m.id === idMesa);
    if (!mesa) return;

    dom.modalTitle.innerHTML = `<i class="fa-solid fa-gear"></i> Gestionar Mesa ${escapeHTML(mesa.numeroMesa)}`;
    let actionsHTML = '';

    if (mesa.estado === 'LIBRE') {
        actionsHTML = `
            <p>La mesa está <strong style="color:var(--success)">Disponible</strong>. ¿Deseas iniciar un nuevo pedido?</p>
            <div class="modal-actions">
                <button class="btn-premium btn-primary-custom btn-redirect" data-url="pedido-crear.html" data-id="${mesa.id}">
                    <i class="fa-solid fa-plus"></i> Crear Nuevo Pedido
                </button>
            </div>
        `;
    } else if (mesa.estado === 'OCUPADA') {
        actionsHTML = `
            <p>La mesa está <strong style="color:var(--danger)">Ocupada</strong>. Selecciona una acción:</p>
            <div class="modal-actions">
                <button class="btn-premium btn-outline-custom btn-redirect" data-url="pedido-detalle.html" data-id="${mesa.id}">
                    <i class="fa-solid fa-utensils"></i> Agregar Producto
                </button>
                <button class="btn-premium btn-primary-custom btn-redirect" data-url="pagos.html" data-id="${mesa.id}">
                    <i class="fa-solid fa-cash-register"></i> Cobrar Cuenta
                </button>
            </div>
        `;
    } else if (mesa.estado === 'RESERVADA') {
        actionsHTML = `
            <p>La mesa está <strong style="color:var(--warning)">Reservada</strong>. Esperando la llegada del cliente.</p>
            <div class="modal-actions">
                <button class="btn-premium btn-primary-custom btn-redirect" data-url="pedido-crear.html" data-id="${mesa.id}">
                    <i class="fa-solid fa-bell-concierge"></i> Iniciar Pedido de Reserva
                </button>
            </div>
        `;
    } else {
        actionsHTML = `<p>La mesa está <strong style="color:var(--gray)">Fuera de Servicio</strong>. No se pueden realizar acciones.</p>`;
    }

    dom.modalBody.innerHTML = actionsHTML;
    openModal();
}

async function navegarSeguroBackend(idMesa, urlDestino) {
    try {
        await apiPedido.abrirMesa(idMesa); 
        sessionStorage.setItem('vieneDeMesas', 'true');
        window.location.href = urlDestino;
    } catch (error) {
        alert("No se pudo abrir la página de pedidos.");
    }
}

function openModal() { dom.modalOverlay.classList.add('show'); }
function closeModal() { dom.modalOverlay.classList.remove('show'); }