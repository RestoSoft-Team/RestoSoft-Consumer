import { api } from '../consumo/apiMesas.js';

const state = {
    mesas: [],
    zonas: [],
    filtroActivo: 'todas' 
};
const cache = {
    datos: null,
    ultimaVez: 0,
    TTL: 60000 // 60 segundos de validez
};

// Referencias al DOM
const dom = {
    dashboardContent: document.getElementById('dashboard-content'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),

    statDisponibles: document.getElementById('stat-disponibles'),
    statOcupadas: document.getElementById('stat-ocupadas'),
    statReservadas: document.getElementById('stat-reservadas'),
    statFueraServicio: document.getElementById('stat-fuera-servicio'),
    filtersContainer: document.getElementById('filtersContainer'),
    tablesGrid: document.getElementById('tablesGrid')
};

// 1. Función única y robusta de reintento
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchConBackoff(idEmpresa, intento = 0) {
    const MAX_INTENTOS = 5;
    const DELAY_BASE = 1000; // 1 segundo base
    
    try {
        console.log(`Intento de conexión: ${intento + 1}`);
        
        const [mesas, zonas] = await Promise.all([
            api.obtenerMesas(idEmpresa),
            api.obtenerZonas(idEmpresa)
        ]);

        // Si recibimos datos, terminamos
        if (mesas && mesas.length > 0) return { mesas, zonas };

        // Si están vacíos, forzamos el catch para reintentar
        throw new Error("EMPTY_DATA");

    } catch (error) {
        if (intento < MAX_INTENTOS) {
            // Crecimiento exponencial: 1s, 2s, 4s, 8s...
            const tiempoEspera = DELAY_BASE * Math.pow(2, intento);
            
            console.warn(`Intento ${intento + 1} fallido. Reintentando en ${tiempoEspera}ms...`);
            
            await sleep(tiempoEspera);
            return fetchConBackoff(idEmpresa, intento + 1);
        }
        
        // Si agotamos todos los intentos, lanzamos error final
        throw new Error("SERVICE_UNAVAILABLE");
    }
}


async function obtenerDatosOptimizados(idEmpresa) {
    const ahora = Date.now();
    
    // Si tenemos datos y no han pasado 60 segundos
    if (cache.datos && (ahora - cache.ultimaVez < cache.TTL)) {
        console.log("Datos cargados desde memoria (Caché)");
        return cache.datos;
    }

    // Llamamos al fetch, y esperamos la respuesta
    const data = await fetchConBackoff(idEmpresa);
    
    // Guardamos en caché
    cache.datos = data;
    cache.ultimaVez = ahora;
    
    return data;
}


document.addEventListener('DOMContentLoaded', async () => {
    const ID_EMPRESA = 1;
    renderSkeletonCards();

    try {
        const { mesas, zonas } = await obtenerDatosOptimizados(ID_EMPRESA);

        state.mesas = mesas;
        state.zonas = zonas;

        renderStats();
        renderFilters();
        renderTables();

        setInterval(async () => {
            console.log("Iniciando actualización en segundo plano...");
            
            cache.datos = null; 
            cache.ultimaVez = 0; 
            
            try {
                const { mesas, zonas } = await obtenerDatosOptimizados(ID_EMPRESA);
                
                state.mesas = mesas;
                state.zonas = zonas;

                renderStats();
                renderTables(); 
                
                console.log("Actualización exitosa.");
            } catch (error) {
                console.error("El refresco automático falló, pero la UI se mantiene estable:", error);
            }
        }, 60000); 

    } catch (error) {
        console.error("Error final:", error);
        mostrarError("El servicio no está disponible tras varios intentos. Contacta con el proveedor.");
    }
});



// Función de Esqueletos
function renderSkeletonCards() {
    let skeletons = '';
    for(let i = 0; i < 8; i++) { // Mostramos 8 tarjetas base para que se vea lleno
        skeletons += `<div class="skeleton skeleton-card"></div>`;
    }
    dom.tablesGrid.innerHTML = skeletons;
}

// Función de Estado de Error
function mostrarError(mensaje) {
    dom.dashboardContent.style.display = 'none';
    dom.errorState.style.display = 'flex';
    dom.errorMessage.textContent = mensaje;
}

// 2. RENDERIZAR ESTADÍSTICAS
function renderStats() {
    const disponibles = state.mesas.filter(m => m.estado === 'LIBRE').length;
    const ocupadas = state.mesas.filter(m => m.estado === 'OCUPADA').length;
    const reservadas = state.mesas.filter(m => m.estado === 'RESERVADA').length;
    const fueraServicio = state.mesas.filter(m => m.estado === 'FUERA_SERVICIO').length;

    dom.statDisponibles.textContent = disponibles;
    dom.statOcupadas.textContent = ocupadas;
    dom.statReservadas.textContent = reservadas;
    dom.statFueraServicio.textContent = fueraServicio;
}

// 3. RENDERIZAR FILTROS DINÁMICOS
function renderFilters() {
    dom.filtersContainer.innerHTML = '';
    const filtrosBase = [
        { id: 'todas', texto: 'Todas' },
        { id: 'estado-LIBRE', texto: 'Disponibles' },
        { id: 'estado-OCUPADA', texto: 'Ocupadas' },
        { id: 'estado-RESERVADA', texto: 'Reservadas' },
        { id: 'estado-FUERA_SERVICIO', texto: 'Fuera de Servicio' }
    ];

    const botonesHTML = filtrosBase.map(f => crearBotonFiltro(f.id, f.texto));
    state.zonas.forEach(zona => {
        botonesHTML.push(crearBotonFiltro(`zona-${zona.id}`, zona.nombreZona));
    });

    dom.filtersContainer.innerHTML = botonesHTML.join('');
}

function crearBotonFiltro(id, texto) {
    const isActive = state.filtroActivo === id ? 'active' : '';
    return `<button class="filter-btn ${isActive}" data-filter-id="${id}">${texto}</button>`;
}

// 4. RENDERIZAR MESAS
function renderTables() {
    let mesasFiltradas = state.mesas;

    if (state.filtroActivo.startsWith('estado-')) {
        const estadoDeseado = state.filtroActivo.split('-')[1];
        mesasFiltradas = state.mesas.filter(m => m.estado === estadoDeseado);
    } else if (state.filtroActivo.startsWith('zona-')) {
        const idZonaDeseada = parseInt(state.filtroActivo.split('-')[1]);
        mesasFiltradas = state.mesas.filter(m => m.idZona === idZonaDeseada);
    }

    if (mesasFiltradas.length === 0) {
        dom.tablesGrid.innerHTML = '<p style="color:var(--gray); grid-column: 1/-1;">No hay mesas en esta categoría.</p>';
        return;
    }

    const htmlTarjetas = mesasFiltradas.map(mesa => {
        const zonaAsignada = state.zonas.find(z => z.id === mesa.idZona);
        const nombreZona = zonaAsignada ? zonaAsignada.nombreZona : 'Sin Zona';

        let colorClass = '';
        let statusClass = '';
        
        switch (mesa.estado) {
            case 'LIBRE':
                colorClass = 'table-free';
                statusClass = 'status-success';
                break;
            case 'OCUPADA':
                colorClass = 'table-busy';
                statusClass = 'status-danger';
                break;
            case 'RESERVADA':
                colorClass = 'table-reserved';
                statusClass = 'status-warning';
                break;
            case 'FUERA_SERVICIO':
                colorClass = 'table-fuera-servicio';
                statusClass = 'status-gray';
                break;    
            default:
                colorClass = 'table-free';
                statusClass = 'status-success';
        }

        return `
            <div class="table-card">
                <div class="table-top">
                    <div class="table-number ${colorClass}">${mesa.numeroMesa}</div>
                    <div class="table-status ${statusClass}">${mesa.estado == 'LIBRE' ? 'Disponible' : mesa.estado == 'OCUPADA' ? 'Ocupada' : mesa.estado == 'RESERVADA' ? 'Reservada' : 'Fuera de Servicio'}</div>
                </div>
                <h4>Mesa ${mesa.tipoMesa || 'Estándar'}</h4>
                <p>${nombreZona} • ${mesa.disponibilidadPersonas} personas</p>
                
                <div class="table-info">
                    <div class="table-info-item">
                        <span>Capacidad</span>
                        <strong>${mesa.disponibilidadPersonas} Personas</strong>
                    </div>
                    <div class="table-info-item">
                        <span>Ubicación</span> 
                        <strong>${nombreZona}</strong>
                    </div>
                </div>
                
                <div class="table-actions">
                    <button class="btn-premium btn-primary-custom" onclick="window.showNotification()">
                        Gestionar
                    </button>
                    <button class="btn-premium btn-outline-custom">
                        Ver
                    </button>
                </div>
            </div>
        `;
    });
    const divTemporal = document.createElement('div');
    divTemporal.innerHTML = htmlTarjetas.join('');
    const fragment = document.createDocumentFragment();
    while (divTemporal.firstChild) {
        fragment.appendChild(divTemporal.firstChild);
    }
    dom.tablesGrid.innerHTML = '';
    dom.tablesGrid.appendChild(fragment);
}

window.showNotification = function() {
    const notification = document.getElementById('notification');
    if(notification) {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
};
dom.filtersContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    dom.filtersContainer.querySelector('.active')?.classList.remove('active');
    btn.classList.add('active');

    state.filtroActivo = btn.dataset.filterId;
    renderTables();
});