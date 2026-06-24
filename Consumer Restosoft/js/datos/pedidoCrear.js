import { apiPedido } from '../consumo/apiCrearPedido.js';

// Simulación de sesión
const ID_USUARIO_LOGUEADO = 1;
const ID_EMPRESA = 1;

// Referencias al DOM
const dom = {
    selectZona: document.getElementById('selectZona'),
    selectMesa: document.getElementById('selectMesa'),
    selectMesero: document.getElementById('selectMesero'),
    txtObservaciones: document.getElementById('txtObservaciones'),
    btnConfirmar: document.getElementById('btnConfirmarPedido'),
    btnCancelar: document.getElementById('btnCancelarAsignacion'), // Nuevo botón
    notification: document.getElementById('notification')
};

let todasLasMesas = [];
let todasLasZonas = [];

document.addEventListener('DOMContentLoaded', initPedidoPage);

async function initPedidoPage() {
    try {
        const mesaActiva = await apiPedido.getMesaActiva(ID_USUARIO_LOGUEADO);

        const [zonas, mesas] = await Promise.all([
            apiPedido.getZonas(ID_EMPRESA),
            apiPedido.getMesas(ID_EMPRESA)
        ]);
        
        todasLasMesas = mesas;
        todasLasZonas = zonas;

        if (mesaActiva) {
            asignarMesaAutomatica(mesaActiva);
        } else {
            habilitarSeleccionManual();
        }

    } catch (error) {
        console.error("Error inicial:", error);
        alert("Error al cargar la página. Redirigiendo...");
        window.location.href = "mesas.html";
    }
}

function asignarMesaAutomatica(mesa) {
    dom.selectZona.innerHTML = `<option selected>Zona Asignada</option>`;
    dom.selectMesa.innerHTML = `<option value="${mesa.id}" selected>Mesa ${mesa.numeroMesa}</option>`;
    
    dom.selectZona.disabled = true;
    dom.selectMesa.disabled = true;
    
    // Mostrar botón de cancelar
    dom.btnCancelar.style.display = 'block';
}

function habilitarSeleccionManual() {
    // Ocultar botón de cancelar
    dom.btnCancelar.style.display = 'none';
    
    dom.selectZona.disabled = false;
    dom.selectMesa.disabled = false;
    
    dom.selectZona.innerHTML = '<option value="">Seleccione una Zona...</option>';
    todasLasZonas.forEach(zona => {
        const option = document.createElement('option');
        option.value = zona.id;
        option.textContent = zona.nombreZona;
        dom.selectZona.appendChild(option);
    });
    
    dom.selectMesa.innerHTML = '<option value="">Primero seleccione zona</option>';
    
    dom.selectZona.addEventListener('change', () => {
        const idZonaSeleccionada = parseInt(dom.selectZona.value);
        
        if (!idZonaSeleccionada) {
            dom.selectMesa.innerHTML = '<option value="">Primero seleccione zona</option>';
            return;
        }

        const mesasFiltradas = todasLasMesas.filter(m => 
            m.idZona === idZonaSeleccionada && m.estado === 'LIBRE'
        );

        if (mesasFiltradas.length === 0) {
            dom.selectMesa.innerHTML = '<option value="">No hay mesas libres</option>';
        } else {
            dom.selectMesa.innerHTML = '<option value="">Seleccione Mesa...</option>' + 
                mesasFiltradas.map(m => `<option value="${m.id}">Mesa ${m.numeroMesa}</option>`).join('');
        }
    });
}

// Evento del botón Cancelar
dom.btnCancelar.addEventListener('click', async () => {
        try {
            await apiPedido.liberarMesaActiva(ID_USUARIO_LOGUEADO);
            habilitarSeleccionManual();
        } catch (error) {
            alert("Hubo un error al liberar la mesa. Intenta recargar la página.");
        }
});

// Evento del botón Confirmar
dom.btnConfirmar.addEventListener('click', async () => {
    const idMesa = dom.selectMesa.value;
    
    if (!idMesa) {
        alert("Por favor selecciona una mesa válida.");
        return;
    }

    const pedidoData = {
        observaciones: dom.txtObservaciones.value || "Sin observaciones",
        idmesa: parseInt(idMesa),
        idempresa: ID_EMPRESA,
        estado: "PENDIENTE",
        idusuario: parseInt(dom.selectMesero.value) || ID_USUARIO_LOGUEADO,
        fecha: new Date().toISOString()
    };

    try {
        await apiPedido.createPedido(pedidoData);
        await apiPedido.liberarMesaActiva(ID_USUARIO_LOGUEADO);
        
        showNotification();
        
        setTimeout(() => {
            window.location.href = "mesas.html";
        }, 2000);

    } catch (error) {
        alert("Hubo un error al crear el pedido. Revisa la consola.");
    }
});

function showNotification() {
    dom.notification.classList.add('show');
    setTimeout(() => dom.notification.classList.remove('show'), 3000);
}