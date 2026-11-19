import { apiPlato } from '../consumo/apiPlatos.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

const dom = {
    container: document.getElementById('productosContainer')
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

async function cargarPlatos() {
    try {
        const platos = await apiPlato.listarPlatos();
        if (platos.length === 0) {
            dom.container.innerHTML = '<p class="text-muted text-center w-100">No hay productos registrados. Crea el primero!</p>';
            return;
        }
        dom.container.innerHTML = '';
        platos.forEach(plato => {
            const div = document.createElement('div');
            div.className = 'product-card';
            
            const imageHtml = plato.imagenUrl && !plato.imagenUrl.includes('default-plate.png')
                ? `<img src="${plato.imagenUrl}" alt="${plato.nombre}" class="product-img">`
                : `<div class="product-icon-fallback"><i class="fa-solid fa-utensils"></i></div>`;
                
            div.innerHTML = `
                ${imageHtml}
                <h4>${plato.nombre}</h4>
                <small>${plato.descripcion || 'Sin descripción'}</small>
                <div class="product-price">$${plato.precio.toLocaleString()}</div>
                <div class="product-footer">
                    <span class="badge-status ${plato.estado === 'ACTIVO' ? 'bg-success-soft' : 'bg-secondary-soft'}">${plato.estado}</span>
                    <div class="product-actions">
                        <button class="action-icon-btn btn-edit btn-editar" data-id="${plato.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-icon-btn btn-delete btn-eliminar" data-id="${plato.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            dom.container.appendChild(div);
        });

        // Evento Editar (Usa sessionStorage para no exponer el ID en la URL)
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platoId = btn.dataset.id;
                sessionStorage.setItem('platoEditarId', platoId);
                window.location.href = 'platillo-crear.html';
            });
        });

        // Evento Eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const platoId = btn.dataset.id;
                const confirmado = await mostrarConfirmacion('Eliminar Platillo', '¿Estás seguro de que deseas eliminar este platillo del menú?');
                if (confirmado) {
                    try {
                        const exito = await apiPlato.eliminarPlato(platoId);
                        if (exito) {
                            showNotification('Platillo eliminado', 'El platillo se eliminó correctamente.', 'success', 'fa-circle-check');
                            cargarPlatos();
                        } else {
                            showNotification('Error', 'No se pudo eliminar el platillo.', 'error', 'fa-circle-xmark');
                        }
                    } catch (error) {
                        showNotification('Error al eliminar', error.message, 'error', 'fa-circle-xmark');
                    }
                }
            });
        });

    } catch (error) {
        dom.container.innerHTML = `<p class="text-danger text-center w-100">Error al cargar productos: ${error.message}</p>`;
    }
}

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


    generarSidebar('sidebar-container', "menu", "menu", perfilData.rol.nombre);

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
        const perfilData = await apiProfile.obtenerInfoMe();
        cargarPerfilUsuario(perfilData);
    } catch (e) {
        console.error('Error loading profile info:', e);
    }
    cargarPlatos();
}

inicializar();