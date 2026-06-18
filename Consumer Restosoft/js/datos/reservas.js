import { api } from '../consumo/apiReservas.js';

const state = {
    mesas: [],
    zonas: [],
    filtroActivo: 'zonas',
    zonaActiva: null,
    mesasSeleccionadas: []
};

const dom = {
    statDisponibles: document.getElementById('stat-disponibles'),
    statOcupadas: document.getElementById('stat-ocupadas'),
    statReservadas: document.getElementById('stat-reservadas'),
    statFueraServicio: document.getElementById('stat-fuera-servicio'),

    filtersContainer: document.getElementById('filtersContainer'),
    tablesGrid: document.getElementById('tablesGrid'),

    // NUEVO PLANO
    zonasView: document.getElementById('zonasView'),
    mesasView: document.getElementById('mesasView'),
    layoutMesas: document.getElementById('layoutMesas'),
    zonaTitulo: document.getElementById('zonaTitulo'),
    volverBtn: document.getElementById('volverBtn')
};

document.addEventListener('DOMContentLoaded', async () => {

    const ID_EMPRESA = 1;


    const [mesasData, zonasData] = await Promise.all([
        api.obtenerMesas(ID_EMPRESA),
        api.obtenerZonas(ID_EMPRESA)
    ]);

    state.mesas = mesasData;
    state.zonas = zonasData;

    renderStats();
    renderZonas();
});

function renderStats() {

    const disponibles =
        state.mesas.filter(m => m.estado === 'LIBRE').length;

    const ocupadas =
        state.mesas.filter(m => m.estado === 'OCUPADA').length;

    const reservadas =
        state.mesas.filter(m => m.estado === 'RESERVADA').length;

    const fuera =
        state.mesas.filter(m => m.estado === 'FUERA_SERVICIO').length;

    dom.statDisponibles.textContent = disponibles;
    dom.statOcupadas.textContent = ocupadas;
    dom.statReservadas.textContent = reservadas;
    dom.statFueraServicio.textContent = fuera;
}

function renderZonas() {

    dom.tablesGrid.innerHTML = '';

    const html = state.zonas.map(zona => {

        const count = state.mesas.filter(
            m => m.idZona === zona.id
        ).length;

        return `
            <div class="zona-card"
                 onclick="abrirZona(${zona.id})">

                <div class="zona-icon">🍽</div>

                <h3>${zona.nombreZona}</h3>

                <p>${count} mesas</p>

            </div>
        `;
    });

    dom.tablesGrid.innerHTML = html.join('');
}

window.abrirZona = function(idZona) {

    state.zonaActiva = idZona;
    state.mesasSeleccionadas = [];

    const zona = state.zonas.find(z => z.id === idZona);

    dom.zonaTitulo.textContent = zona.nombreZona;

    dom.tablesGrid.style.display = 'none';
    dom.mesasView.style.display = 'block';

    renderPlanoZona(idZona);
};

function renderPlanoZona(idZona) {

    dom.layoutMesas.innerHTML = '';

    const mesasZona = state.mesas.filter(
        m => m.idZona === idZona
    );

    mesasZona.forEach(mesa => {

        const el = document.createElement('div');

        el.className =
            `mesa ${mesa.estado.toLowerCase()}`;

        el.style.left = mesa.posicionX + 'px';
        el.style.top = mesa.posicionY + 'px';

        el.innerHTML = `
            <strong>${mesa.numeroMesa}</strong>
            <small>${mesa.disponibilidadPersonas} pax</small>
        `;

        if (mesa.estado === 'LIBRE') {

            el.addEventListener('click', () => {

                el.classList.toggle('selected');

                toggleMesa(mesa.id, el);
            });
        }

        dom.layoutMesas.appendChild(el);
    });
}

function toggleMesa(idMesa, el) {

    if (el.classList.contains('selected')) {

        state.mesasSeleccionadas.push(idMesa);

    } else {

        state.mesasSeleccionadas =
            state.mesasSeleccionadas.filter(
                id => id !== idMesa
            );
    }
}

dom.volverBtn.addEventListener('click', () => {

    dom.mesasView.style.display = 'none';
    dom.tablesGrid.style.display = 'grid';

    renderZonas();
});

