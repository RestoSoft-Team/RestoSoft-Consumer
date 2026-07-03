import { apiPlato } from '../consumo/apiPlatos.js';
import { apiCategoria } from '../consumo/apiCategorias.js';
import { apiProfile } from '../consumo/apiProfile.js';
import { showNotification } from './notificaciones.js';
import { generarSidebar } from './create-sidebar.js';

const EMPRESA_ID = 1;

// 👇 LEEMOS Y BORRAMOS INMEDIATAMENTE
// Si existe, lo guardamos en la variable y lo eliminamos del sessionStorage.
// Así, si el usuario sale y vuelve a entrar, no quedará pillado en modo edición.
let platoId = sessionStorage.getItem('platoEditarId');
if (platoId) {
    sessionStorage.removeItem('platoEditarId');
}

const dom = {
    form: document.getElementById('productForm'),
    nombre: document.getElementById('nombre'),
    categoria: document.getElementById('idcategoria'),
    precio: document.getElementById('precio'),
    descripcion: document.getElementById('descripcion'),
    imagen: document.getElementById('imagen'),
    uploadTrigger: document.getElementById('uploadTrigger'),
    uploadText: document.getElementById('uploadText'),
    previewNombre: document.getElementById('previewNombre'),
    previewDescripcion: document.getElementById('previewDescripcion'),
    previewPrecio: document.getElementById('previewPrecio'),
    previewImgContainer: document.getElementById('previewImgContainer'),
    formTitle: document.getElementById('formTitle'),
    formSubtitle: document.getElementById('formSubtitle'),
    submitBtn: document.getElementById('submitBtn')
};

async function cargarCategorias() {
    try {
        const categorias = await apiCategoria.listarCategorias();
        dom.categoria.innerHTML = '<option value="">Seleccione una categoría</option>';
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.nombre;
            dom.categoria.appendChild(opt);
        });

        if (platoId) await cargarDatosPlato(platoId);
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        dom.categoria.innerHTML = '<option value="">Error al cargar</option>';
    }
}

async function cargarDatosPlato(id) {
    try {
        const plato = await apiPlato.obtenerPlato(id);

        if (plato) {
            dom.nombre.value = plato.nombre;
            dom.precio.value = plato.precio;
            dom.descripcion.value = plato.descripcion || '';
            dom.categoria.value = plato.idcategoria;

            dom.previewNombre.textContent = plato.nombre;
            dom.previewDescripcion.textContent = plato.descripcion || 'Sin descripción';
            dom.previewPrecio.textContent = `$${parseFloat(plato.precio).toLocaleString()}`;

            if (plato.imagenUrl && !plato.imagenUrl.includes('default-plate.png')) {
                dom.previewImgContainer.innerHTML = `<img src="${plato.imagenUrl}" alt="Vista previa">`;
            }

            dom.formTitle.textContent = 'Editar Platillo';
            dom.formSubtitle.textContent = 'Modifica los datos del producto seleccionado';
            dom.submitBtn.innerHTML = '<i class="fa-solid fa-save me-2"></i> Guardar Cambios';
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showNotification('Error', 'No se pudieron cargar los datos del platillo.', 'error', 'fa-circle-xmark');
    }
}

dom.nombre.addEventListener('input', () => dom.previewNombre.textContent = dom.nombre.value || 'Nombre del platillo');
dom.descripcion.addEventListener('input', () => dom.previewDescripcion.textContent = dom.descripcion.value || 'Descripción...');
dom.precio.addEventListener('input', () => {
    const val = parseFloat(dom.precio.value) || 0;
    dom.previewPrecio.textContent = `$${val.toLocaleString()}`;
});

dom.uploadTrigger.addEventListener('click', () => dom.imagen.click());
dom.imagen.addEventListener('change', () => {
    if (dom.imagen.files.length > 0) {
        const file = dom.imagen.files[0];
        dom.uploadText.textContent = `Archivo: ${file.name}`;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            dom.previewImgContainer.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
        };
        reader.readAsDataURL(file);
    } else {
        dom.uploadText.textContent = "Arrastra o selecciona una imagen";
        dom.previewImgContainer.innerHTML = `<i class="fa-solid fa-utensils"></i>`;
    }
});

dom.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const platoData = {
        nombre: dom.nombre.value.trim(),
        descripcion: dom.descripcion.value.trim(),
        precio: parseFloat(dom.precio.value),
        idcategoria: parseInt(dom.categoria.value),
        idempresa: EMPRESA_ID,
        estado: 'ACTIVO',
        representativo: false
    };

    if (!platoData.nombre || !platoData.precio || !platoData.idcategoria) {
        showNotification('Faltan datos', 'Por favor completa los campos obligatorios.', 'warning', 'fa-triangle-exclamation');
        return;
    }

    const formData = new FormData();
    formData.append('plato', new Blob([JSON.stringify(platoData)], { type: 'application/json' }));
    
    if (dom.imagen.files[0]) {
        formData.append('imagen', dom.imagen.files[0]);
    }

    try {
        dom.submitBtn.disabled = true;
        dom.submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Guardando...';

        if (platoId) {
            await apiPlato.actualizarPlato(platoId, formData);
            showNotification('Actualizado', 'Platillo actualizado correctamente.', 'success', 'fa-circle-check');
        } else {
            await apiPlato.crearPlato(formData);
            showNotification('Creado', 'Platillo creado correctamente.', 'success', 'fa-circle-check');
        }
        
        setTimeout(() => window.location.href = 'menu-productos.html', 1500);
    } catch (error) {
        showNotification('Error', 'Error al guardar: ' + error.message, 'error', 'fa-circle-xmark');
        dom.submitBtn.disabled = false;
        dom.submitBtn.innerHTML = '<i class="fa-solid fa-save me-2"></i> Guardar Platillo';
    }
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.href = 'menu-productos.html';
});

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


    generarSidebar('sidebar-container', "menu", "crear_platillo", perfilData.rol.nombre);


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
    await cargarCategorias();
}

inicializar();