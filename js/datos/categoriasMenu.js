import { apiCategoria } from '../consumo/apiCategorias.js';
import { obtenerPerfilSesion } from '../consumo/sesionContext.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

const dom = {
    container: document.getElementById('categoriasContainer'),
    form: document.getElementById('categoriaForm'),
    categoriaIdInput: document.getElementById('categoriaId'),
    nombreInput: document.getElementById('nombreCategoria'),
    submitBtn: document.getElementById('submitBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    formTitle: document.getElementById('formTitle')
};

function mostrarConfirmacion(titulo, mensaje, txtCancelar = "Cancelar", txtConfirmar = "Eliminar") {
    return new Promise((resolve) => {
        const modal = document.createElement("div");
        modal.className = "modal-confirmacion";
        modal.innerHTML = `
          <div class="modal-confirmacion-card">
             <div class="modal-confirmacion-icon"><i class="fa-solid fa-triangle-exclamation"></i></div> 
              <h3>${titulo}</h3>
              <p>${mensaje}</p>
              <div class="modal-confirmacion-actions">
                  <button class="modal-confirmacion-cancelar">${txtCancelar}</button>
                  <button class="modal-confirmacion-confirmar">${txtConfirmar}</button>
              </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector(".modal-confirmacion-cancelar").onclick = () => { modal.remove(); resolve(false); };
        modal.querySelector(".modal-confirmacion-confirmar").onclick = () => { modal.remove(); resolve(true); };
        modal.onclick = (e) => { if (e.target === modal) { modal.remove(); resolve(false); } };
    });
}

async function cargarCategorias() {
    try {
        const categorias = await apiCategoria.listarCategorias();
        if (categorias.length === 0) {
            dom.container.innerHTML = '<p class="text-muted text-center w-100">No hay categorías registradas.</p>';
            return;
        }
        dom.container.innerHTML = '';
        categorias.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'category-card';
            div.innerHTML = `
                <div class="cat-actions">
                    <button class="cat-btn btn-edit btn-editar" data-id="${cat.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="cat-btn btn-delete btn-eliminar" data-id="${cat.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="cat-icon"><i class="fa-solid fa-tag"></i></div>
                <h5>${cat.nombre}</h5>
                <small>ID: #${cat.id}</small>
            `;
            dom.container.appendChild(div);
        });

        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => editarCategoria(btn.dataset.id)));
        document.querySelectorAll('.btn-eliminar').forEach(btn => btn.addEventListener('click', () => eliminarCategoriaHandler(btn.dataset.id)));
    } catch (error) {
        dom.container.innerHTML = `<p class="text-danger text-center w-100">Error al cargar: ${error.message}</p>`;
    }
}

async function editarCategoria(id) {
    try {
        const cat = await apiCategoria.obtenerCategoria(id);
        if (cat) {
            dom.categoriaIdInput.value = cat.id;
            dom.nombreInput.value = cat.nombre;
            dom.formTitle.textContent = 'Editar Categoría';
            dom.submitBtn.innerHTML = '<i class="fa-solid fa-save me-2"></i> Guardar Cambios';
            dom.cancelBtn.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        showNotification('Error al cargar', 'No se pudo cargar la categoría para editar.', 'error', 'fa-circle-xmark');
    }
}

async function eliminarCategoriaHandler(id) {
    const confirmado = await mostrarConfirmacion('Eliminar Categoría', '¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer.');
    if (confirmado) {
        try {
            await apiCategoria.eliminarCategoria(id);
            showNotification('Categoría eliminada', 'La categoría fue eliminada con éxito.', 'success', 'fa-circle-check');
            cargarCategorias();
        } catch (error) {
            showNotification('Error al eliminar', 'No se pudo eliminar. Asegúrate de que no tenga platos asignados.', 'error', 'fa-circle-xmark');
        }
    }
}

function resetForm() {
    dom.categoriaIdInput.value = '';
    dom.form.reset();
    dom.formTitle.textContent = 'Crear Nueva Categoría';
    dom.submitBtn.innerHTML = '<i class="fa-solid fa-plus me-2"></i> Crear Categoría';
    dom.cancelBtn.style.display = 'none';
}

dom.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = dom.categoriaIdInput.value;
    const nombre = dom.nombreInput.value.trim();
    if (!nombre) {
        showNotification('Campo vacío', 'El nombre de la categoría es obligatorio.', 'warning', 'fa-triangle-exclamation');
        return;
    }
    // La empresa la resuelve el back a partir del token (JWT).
    const data = { nombre: nombre };

    try {
        if (id) {
            await apiCategoria.actualizarCategoria(id, data);
            showNotification('Categoría actualizada', 'La categoría se actualizó con éxito.', 'success', 'fa-circle-check');
        } else {
            await apiCategoria.crearCategoria(data);
            showNotification('Categoría creada', 'La categoría se registró con éxito.', 'success', 'fa-circle-check');
        }
        resetForm();
        cargarCategorias();
    } catch (error) {
        showNotification('Error al guardar', error.message, 'error', 'fa-circle-xmark');
    }
});

dom.cancelBtn.addEventListener('click', resetForm);

async function cargarPerfilUsuario(perfilData) {

    const rolesPermitidos = ["ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }


    generarSidebar('sidebar-container', "menu", "categorias_menu", perfilData.rol.nombre);
    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");
    if (!infoPerfilContainer) return;

    const empresaData = perfilData?.empresa || perfilData?.Data?.empresa;
    const nombreRaw = empresaData?.nombre || "";

    if (nombreEmpresaContainer) {
        nombreEmpresaContainer.innerHTML = nombreRaw.trim() !== "" ? `<h6>${nombreRaw.toUpperCase()}</h6>` : `<h6>RESTOSOFT</h6>`;
    }

    if (perfilData && perfilData.usuario) {
        const iniciales = ((perfilData.usuario.nombres || "").substring(0, 1) + (perfilData.usuario.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
        const avatarHTML = perfilData.usuario.imagenUrl ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />` : `<div class="profile-text-avatar">${iniciales}</div>`;
        const nombreCompleto = `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() || "Usuario sin nombre";
        const rol = perfilData.rol?.nombre || "Sin rol asignado";

        infoPerfilContainer.innerHTML = `
        <a href="perfil.html" class="profile-link">
            ${avatarHTML}
            <div class="profile-info">
                <strong>${nombreCompleto}</strong>
                <div style="font-size: 13px; color: var(--gray)">${rol}</div>
            </div>
        </a>`;
    }
}

async function inicializar() {
    try {
        // Perfil con validación de sesión (único origen: sesionContext).
        const perfilData = await obtenerPerfilSesion();
        if (!perfilData) return;
        cargarPerfilUsuario(perfilData);
    } catch (e) {
        console.error('Error loading profile info:', e);
    }
    cargarCategorias();
}

inicializar();