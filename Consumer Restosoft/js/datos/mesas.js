import { api } from '../consumo/apiMesas.js';

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
// 2. UTILIDADES (Seguridad y Render)
// =========================================

// Evita inyecciones XSS (Cross-Site Scripting)
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

// Mapeo limpio de estados
const ESTADOS_MESA = {
    LIBRE: { text: 'Disponible', color: 'table-free', status: 'status-success' },
    OCUPADA: { text: 'Ocupada', color: 'table-busy', status: 'status-danger' },
    RESERVADA: { text: 'Reservada', color: 'table-reserved', status: 'status-warning' },
    FUERA_SERVICIO: { text: 'Fuera de Servicio', color: 'table-fuera-servicio', status: 'status-gray' }
};

// =========================================
// 3. CAPA DE DATOS (Caché y Backoff)
// =========================================
async function fetchConBackoff(idEmpresa, intento = 0) {
    const MAX_INTENTOS = 5;
    const DELAY_BASE = 1000;
    
    try {
        const [mesas, zonas] = await Promise.all([
            api.obtenerMesas(idEmpresa),
            api.obtenerZonas(idEmpresa)
        ]);
        if (mesas && mesas.length > 0) return { mesas, zonas };
        throw new Error("EMPTY_DATA");
    } catch (error) {
        if (intento < MAX_INTENTOS) {
            await sleep(DELAY_BASE * Math.pow(2, intento));
            return fetchConBackoff(idEmpresa, intento + 1);
        }
        throw new Error("SERVICE_UNAVAILABLE");
    }
}

async function obtenerDatosOptimizados(idEmpresa) {
    const ahora = Date.now();
    if (cache.datos && (ahora - cache.ultimaVez < cache.TTL)) {
        return cache.datos;
    }
    const data = await fetchConBackoff(idEmpresa);
    cache.datos = data;
    cache.ultimaVez = ahora;
    return data;
}

// =========================================
// 4. INICIALIZACIÓN Y POLLING INTELIGENTE
// =========================================
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    const ID_EMPRESA = 1; // En producción: obtener de sesión/JWT
    renderSkeletonCards();
    setupEventListeners();

    try {
        await cargarYRenderizarDatos(ID_EMPRESA);
        
        // Iniciar actualización automática (Polling)
        state.intervalId = setInterval(() => cargarYRenderizarDatos(ID_EMPRESA, true), 60000);
        
        // Pausar polling si el usuario sale de la pestaña (Ahorro de recursos)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.intervalId) {
                clearInterval(state.intervalId);
                state.intervalId = null;
            } else if (!document.hidden && !state.intervalId) {
                state.intervalId = setInterval(() => cargarYRenderizarDatos(ID_EMPRESA, true), 60000);
            }
        });

    } catch (error) {
        mostrarError("El servicio no está disponible tras varios intentos. Contacta con el proveedor.");
    }
}

async function cargarYRenderizarDatos(idEmpresa, isBackgroundUpdate = false) {
    try {
        if (!isBackgroundUpdate) cache.datos = null; // Forzar fetch fresco en carga inicial
        
        const { mesas, zonas } = await obtenerDatosOptimizados(idEmpresa);
        state.mesas = mesas;
        state.zonas = zonas;

        renderStats();
        renderFilters();
        renderTables();
    } catch (error) {
        if (!isBackgroundUpdate) throw error; // Si es carga inicial, mostrar pantalla de error
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
        { id: 'estado-FUERA_SERVICIO', texto: 'Fuera de Servicio' }
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

    // Filtro por Estado o Zona
    if (state.filtroActivo.startsWith('estado-')) {
        mesasFiltradas = mesasFiltradas.filter(m => m.estado === state.filtroActivo.split('-')[1]);
    } else if (state.filtroActivo.startsWith('zona-')) {
        const idZona = parseInt(state.filtroActivo.split('-')[1]);
        mesasFiltradas = mesasFiltradas.filter(m => m.idZona === idZona);
    }

    // Filtro por Búsqueda (Input)
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

    // Uso de DocumentFragment para rendimiento
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
// 6. EVENTOS Y DELEGACIÓN (Patrón Empresarial)
// =========================================
function setupEventListeners() {
    // Delegación para Filtros
    dom.filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        dom.filtersContainer.querySelector('.active')?.classList.remove('active');
        btn.classList.add('active');
        state.filtroActivo = btn.dataset.filterId;
        renderTables();
    });

    // Delegación para Acciones de Mesas (Gestionar / Ver)
    dom.tablesGrid.addEventListener('click', (e) => {
        const btnVer = e.target.closest('.btn-ver');
        const btnGestionar = e.target.closest('.btn-gestionar');

        if (btnVer) handleVerMesa(parseInt(btnVer.dataset.id));
        if (btnGestionar) handleGestionarMesa(parseInt(btnGestionar.dataset.id));
    });

    // Buscador con debounce básico
    let searchTimeout;
    dom.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.busqueda = e.target.value.trim();
            renderTables();
        }, 300); // Espera 300ms después de que el usuario deja de escribir
    });

    // Cerrar Modal
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (e) => {
        if (e.target === dom.modalOverlay) closeModal();
    });
}

// =========================================
// 7. LÓGICA DE MODALES (Acciones 100% Seguras)
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

    // Usamos botones, NO enlaces con URLs. El ID no se expone.
    if (mesa.estado === 'LIBRE') {
        actionsHTML = `
            <p>La mesa está <strong style="color:var(--success)">Disponible</strong>. ¿Deseas iniciar un nuevo pedido?</p>
            <div class="modal-actions">
                <button class="btn-premium btn-primary-custom btn-redirect" data-url="../Pedidos/pedido-crear.html" data-id="${mesa.id}">
                    <i class="fa-solid fa-plus"></i> Crear Nuevo Pedido
                </button>
            </div>
        `;
    } else if (mesa.estado === 'OCUPADA') {
        actionsHTML = `
            <p>La mesa está <strong style="color:var(--danger)">Ocupada</strong>. Selecciona una acción:</p>
            <div class="modal-actions">
                <button class="btn-premium btn-outline-custom btn-redirect" data-url="../Pedidos/pedido-crear.html" data-id="${mesa.id}">
                    <i class="fa-solid fa-utensils"></i> Agregar Producto
                </button>
                <button class="btn-premium btn-primary-custom btn-redirect" data-url="../pagos.html" data-id="${mesa.id}">
                    <i class="fa-solid fa-cash-register"></i> Cobrar Cuenta
                </button>
            </div>
        `;
    } else if (mesa.estado === 'RESERVADA') {
        actionsHTML = `
            <p>La mesa está <strong style="color:var(--warning)">Reservada</strong>. Esperando la llegada del cliente.</p>
            <div class="modal-actions">
                <button class="btn-premium btn-primary-custom btn-redirect" data-url="../Pedidos/pedido-crear.html" data-id="${mesa.id}">
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

// Función para comunicarse con el backend y redirigir sin exponer el ID
async function navegarSeguroBackend(idMesa, urlDestino) {
    try {
        // 1. Avisar al backend que este usuario va a trabajar en esta mesa.
        // Usamos el header X-User-Id simulando que el usuario logueado es el ID 1.
        const response = await fetch(`http://localhost:8080/api/sesion/mesa-activa/${idMesa}`, {
            method: 'POST',
            headers: {
                'X-User-Id': 1, // En producción: 'Authorization': `Bearer ${token}`
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 423) {
            alert("Esta mesa acaba de ser bloqueada por otro mesero.");
            return;
        }

        if (!response.ok) throw new Error("Error al asignar la mesa");

        // 2. El backend confirmó. Redirigimos a la URL 100% limpia.
        window.location.href = urlDestino;

    } catch (error) {
        console.error("Error de seguridad al asignar mesa:", error);
        alert("No se pudo bloquear la mesa. Inténtalo de nuevo.");
    }
}
// Dentro de setupEventListeners() o al final de tu JS
dom.modalBody.addEventListener('click', async (e) => {
    const btnRedirect = e.target.closest('.btn-redirect');
    if (btnRedirect) {
        e.preventDefault();
        const url = btnRedirect.dataset.url;
        const idMesa = parseInt(btnRedirect.dataset.id);
        
        // Llamamos a la función segura
        await navegarSeguroBackend(idMesa, url);
    }
});

function openModal() { dom.modalOverlay.classList.add('show'); }
function closeModal() { dom.modalOverlay.classList.remove('show'); }