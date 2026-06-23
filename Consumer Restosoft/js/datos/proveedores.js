// /js/datos/proveedores.js

import api from '../consumo/apiProveedores.js';

// Variables globales para mantener el estado en memoria de la pantalla
let listaEmpresas = [];
let listaProveedores = [];

// Recalcular estadísticas analizando los datos reales cargados de la base de datos
function actualizarEstadisticas() {
    const txtTotalProveedores = document.getElementById("stat-total-proveedores");
    const txtTotalEmpresas = document.getElementById("stat-total-empresas");

    if (txtTotalProveedores) txtTotalProveedores.innerText = listaProveedores.length;
    if (txtTotalEmpresas) txtTotalEmpresas.innerText = listaEmpresas.length;
}

// Carga las empresas de la BD dentro del Dropdown List (<select>)
async function cargarDropdownEmpresas() {
    try {
        listaEmpresas = await api.obtenerEmpresas();
        const select = document.getElementById('select-empresa');
        if (!select) return;

        // Limpiar opciones previas dejando solo la por defecto
        select.innerHTML = '<option value="" disabled selected>Seleccione una empresa asociada...</option>';

        listaEmpresas.forEach(emp => {
            const option = document.createElement('option');
            // Salvavidas: toma el ID sin importar si en Java se llama idempresa o id
            option.value = emp.idempresa || emp.id; 
            option.textContent = emp.nombre_empresa || emp.nombre; 
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando empresas para el dropdown:", error);
    }
}

// Renderiza las filas de la tabla procesando la lista de proveedores
function renderizarTabla() {
    const tbody = document.getElementById('tabla-proveedores');
    if (!tbody) return;

    tbody.innerHTML = ""; // Limpiar tabla

    listaProveedores.forEach(prov => {
        // Como Spring Boot envía el objeto anidado, podemos acceder directamente al nombre
        const nombreEmpresa = prov.empresa ? prov.empresa.nombre : "Sin Empresa";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="supplier">
                    <div class="supplier-logo"><i class="fa-solid fa-user-tie"></i></div>
                    <div>
                        <h6>${prov.nombre}</h6>
                        <span>ID: ${prov.id}</span> 
                    </div>
                </div>
            </td>
            <td>${prov.email}</td>
            <td>${prov.telefono}</td>
            <td>${prov.direccion}</td>
            <td>
                <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
                    <i class="fa-solid fa-building me-1"></i> ${nombreEmpresa}
                </span>
            </td>
            <td>
                <button class="action-btn" data-id="${prov.id}">
                    <i class="fa-solid fa-ellipsis"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    actualizarEstadisticas();
}

// ==========================================
// ESTAS DOS FUNCIONES FALTABAN EN TU CÓDIGO
// ==========================================

function limpiarFormulario() {
    document.getElementById('form-proveedor')?.reset();
}

async function inicializarModulo() {
    try {
        // 1. Cargamos las empresas para el dropdown
        await cargarDropdownEmpresas();
        
        // 2. Cargamos los proveedores
        listaProveedores = await api.obtenerProveedores();
        
        // 3. Pintamos los datos en pantalla
        renderizarTabla();
    } catch (error) {
        console.error("Error al inicializar el módulo de proveedores:", error);
    }
}

// ==========================================
// EVENTO DEL FORMULARIO
// ==========================================
document.getElementById('form-proveedor')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('input-nombre').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const telefono = document.getElementById('input-telefono').value.trim();
    const direccion = document.getElementById('input-direccion').value.trim();
    const idSeleccionado = parseInt(document.getElementById('select-empresa').value);

    // IMPORTANTE: Adaptamos el objeto a lo que espera Spring Boot
    const proveedorData = {
        nombre: nombre,
        email: email,
        telefono: telefono,
        direccion: direccion,
        // Creamos el objeto anidado para la relación @ManyToOne
        empresa: {
            id: idSeleccionado
        }
    };

    try {
        const response = await api.crearProveedor(proveedorData);

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Proveedor Registrado!',
                text: `El proveedor "${nombre}" ha sido guardado de forma segura.`,
                showConfirmButton: false,
                timer: 2200,
                customClass: { popup: 'resto-swal-popup' }
            });

            listaProveedores = await api.obtenerProveedores();
            renderizarTabla();
            limpiarFormulario();
        } else {
            const errorMsg = await response.text();
            Swal.fire({
                icon: 'warning',
                title: 'No se pudo registrar',
                text: errorMsg || 'Verifica que los datos no estén duplicados.',
                customClass: { popup: 'resto-swal-popup', confirmButton: 'resto-swal-confirm' }
            });
        }
    } catch (error) {
        console.error("Error guardando proveedor:", error);
        Swal.fire({
            icon: 'error',
            title: 'Ocurrió un problema',
            text: 'No fue posible conectar con el servidor.',
            customClass: { popup: 'resto-swal-popup', confirmButton: 'resto-swal-confirm' }
        });
    }
});

// Registrar funciones globales por si se cancela desde atributos HTML antiguos
window.limpiarFormulario = limpiarFormulario;

// Disparar carga cuando el DOM esté completamente listo
document.addEventListener("DOMContentLoaded", inicializarModulo);