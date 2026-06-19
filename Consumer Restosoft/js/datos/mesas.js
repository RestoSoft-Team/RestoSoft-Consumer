import { api } from './apiMesas.js';

const state = {
    mesas: [],
    zonas: [],
    filtroActivo: 'todas' 
};

// Referencias al DOM
const dom = {
    statDisponibles: document.getElementById('stat-disponibles'),
    statOcupadas: document.getElementById('stat-ocupadas'),
    statReservadas: document.getElementById('stat-reservadas'),
    statFueraServicio: document.getElementById('stat-fuera-servicio'),
    filtersContainer: document.getElementById('filtersContainer'),
    tablesGrid: document.getElementById('tablesGrid')
};

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    const ID_EMPRESA = 1; 

    dom.tablesGrid.innerHTML = '<p>Cargando información del restaurante...</p>';

    const [mesasData, zonasData] = await Promise.all([
        api.obtenerMesas(ID_EMPRESA),
        api.obtenerZonas(ID_EMPRESA)
    ]);

    state.mesas = mesasData;
    state.zonas = zonasData;

    renderStats();
    renderFilters();
    renderTables();
});

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

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            state.filtroActivo = e.target.dataset.filterId;
            renderTables();
        });
    });
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
        dom.tablesGrid.innerHTML = '<p style="color:var(--gray);">No hay mesas en esta categoría.</p>';
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

    dom.tablesGrid.innerHTML = htmlTarjetas.join('');
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