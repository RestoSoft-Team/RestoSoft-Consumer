// /js/datos/categorias.js

import api from '../consumo/apiCategoria.js';

// Mapeador de íconos inteligentes según la palabra clave
const ICON_MAPPER = {
    lacteos: { icon: "fa-cheese", style: "primary-soft" },
    leche: { icon: "fa-cow", style: "primary-soft" },
    bebidas: { icon: "fa-wine-bottle", style: "success-soft" },
    licores: { icon: "fa-glass-martini-alt", style: "success-soft" },
    mariscos: { icon: "fa-fish", style: "warning-soft" },
    pescado: { icon: "fa-fish", style: "warning-soft" },
    carnes: { icon: "fa-bacon", style: "danger-soft" },
    carne: { icon: "fa-meat", style: "danger-soft" },
    pollo: { icon: "fa-drumstick-bite", style: "danger-soft" },
    verduras: { icon: "fa-carrot", style: "success-soft" },
    vegetales: { icon: "fa-seedling", style: "success-soft" },
    frutas: { icon: "fa-apple-whole", style: "warning-soft" },
    panaderia: { icon: "fa-bread-slice", style: "warning-soft" },
    postres: { icon: "fa-ice-cream", style: "info-soft" },
    cafeteria: { icon: "fa-mug-hot", style: "info-soft" }
};

// Recalcular estadísticas analizando las cards que están vivas en la pantalla
function actualizarEstadisticas() {
    const cards = document.querySelectorAll("#categoryGrid .category-card");
    const txtActivas = document.getElementById("txtCategoríasActivas");
    const txtProductos = document.getElementById("txtProductosOrganizados");

    if (txtActivas) txtActivas.innerText = cards.length;

    let totalProductos = 0;
    cards.forEach(card => {
        totalProductos += parseInt(card.getAttribute("data-productos") || 0);
    });
    if (txtProductos) txtProductos.innerText = totalProductos;
}

// Retorna el ícono apropiado procesando el string
function obtenerIconoPorNombre(nombre) {
    const limpio = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const clave in ICON_MAPPER) {
        if (limpio.includes(clave)) {
            return ICON_MAPPER[clave];
        }
    }
    return { icon: "fa-bowl-food", style: "primary-soft" };
}

// Renderiza el HTML de la card dentro de la grilla (Versión integrada con ID)
function agregarCardAlGrid(id, nombre, descripcion, estado, productosCount = 0) {
    const grid = document.getElementById("categoryGrid");
    if (!grid) return;

    const configIcono = obtenerIconoPorNombre(nombre);
    const textoEstado = estado.replace('-', ' ');

    const nuevaCard = document.createElement("div");
    nuevaCard.className = "card-premium category-card";
    nuevaCard.setAttribute("data-productos", productosCount);

    nuevaCard.innerHTML = `
        <div class="category-top">
            <div class="category-icon ${configIcono.style}"><i class="fa-solid ${configIcono.icon}"></i></div>
            <button class="category-menu" data-id="${id}" data-estado="${estado}" data-nombre="${nombre}">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
        </div>
        <h4>${nombre}</h4>
        <p>${descripcion}</p>
        <div class="category-meta">
            <span class="badge-soft badge-${estado}">${textoEstado}</span>
            <span class="category-count">${productosCount} productos</span>
        </div>
    `;
    grid.appendChild(nuevaCard);
}

function limpiarFormulario() {
    document.getElementById('formCategoria')?.reset();
}

// Cargar categorías desde el Backend al iniciar
async function cargarCategorias() {
    try {
        const categorias = await api.obtenerCategorias();
        const grid = document.getElementById("categoryGrid");
        if (!grid) return;
        
        grid.innerHTML = ""; 

        categorias.forEach(cat => {
            const idReal = cat.id || 0;
            const nombreReal = cat.nombreCategoria || 'Sin Nombre';
            const descripcionReal = cat.descripcion || 'Sin descripción';
            const estadoReal = cat.estadoCategoria || 'activa';
            
            agregarCardAlGrid(idReal, nombreReal, descripcionReal, estadoReal, 0);
        });

        actualizarEstadisticas();
    } catch (error) {
        console.error("Error cargando categorías:", error);
        Swal.fire({
            icon: 'error',
            title: 'No se pudieron cargar las categorías',
            text: 'Por favor, intenta nuevamente en unos momentos.',
            customClass: { popup: 'resto-swal-popup', confirmButton: 'resto-swal-confirm' }
        });
    }
}

// Guardado de formulario interactivo
document.getElementById('formCategoria')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombreCategoria').value.trim();
    const estado = document.getElementById('estadoCategoria').value;
    const descripcion = document.getElementById('descripcionCategoria').value.trim();

    const categoriaData = { nombre, estado, descripcion };

    try {
        const response = await api.crearCategoria(categoriaData);

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Categoría Registrada!',
                text: `La categoría "${nombre}" ha sido guardada de forma segura en la base de datos.`,
                showConfirmButton: false,
                timer: 2200,
                customClass: { popup: 'resto-swal-popup' }
            });

            // Re-ejecutamos la carga limpia desde el backend para obtener IDs reales o añadimos temporalmente:
            agregarCardAlGrid(0, nombre, descripcion, estado, 0);
            actualizarEstadisticas();
            limpiarFormulario();
        } else {
            const errorMsg = await response.text();
            Swal.fire({
                icon: 'warning',
                title: 'Categoría Duplicada',
                text: errorMsg || 'Ese registro ya existe en el sistema.',
                customClass: { popup: 'resto-swal-popup', confirmButton: 'resto-swal-confirm' }
            });
        }
    } catch (error) {
        console.error("Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Ocurrió un problema',
            text: 'No fue posible procesar la solicitud en este momento. Inténtalo nuevamente.',
            customClass: { popup: 'resto-swal-popup', confirmButton: 'resto-swal-confirm' }
        });
    }
});

// Evento delegado para acciones del menú interno de las categorías (Reemplazo seguro de onclick en línea)
document.getElementById('categoryGrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-menu');
    if (btn) {
        const id = btn.getAttribute('data-id');
        const estado = btn.getAttribute('data-estado');
        const nombre = btn.getAttribute('data-nombre');
        
        // Aquí puedes invocar la lógica que requieras para cambiar de estado
        console.log(`Acción solicitada para ID: ${id}, Estado: ${estado}, Nombre: ${nombre}`);
    }
});

// Lógica estructural del menú responsive lateral
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");

menuToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("show");
});

overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("show");
});

// Exportar funciones globales necesarias fuera del módulo si hiciera falta cancelar desde HTML
window.limpiarFormulario = limpiarFormulario;

// Al iniciar la ventana, llamamos al backend
document.addEventListener("DOMContentLoaded", cargarCategorias);