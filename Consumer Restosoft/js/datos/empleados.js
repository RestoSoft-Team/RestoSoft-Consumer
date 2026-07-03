import { apiEmpleados } from "../consumo/apiEmpleados.js";
import { apiProfile } from "../consumo/apiProfile.js";
import { generarSidebar } from './create-sidebar.js';

// ─────────────────────────────────────────────
// ESTADO GLOBAL DEL MÓDULO
// ─────────────────────────────────────────────
const state = {
    empleados: [],
    roles: [],
    empleadoEnEdicion: null,
    filtroEstado: "todos",   // "todos" | "ACTIVO" | "INACTIVO"
    filtroTexto: ""
};

// ─────────────────────────────────────────────
// REFERENCIAS AL DOM
// ─────────────────────────────────────────────
const dom = {
    // Tabla
    tablaBody: document.getElementById("tablaEmpleadosBody"),
    totalActivos: document.getElementById("statTotalActivos"),
    totalInactivos: document.getElementById("statTotalInactivos"),
    totalEmpleados: document.getElementById("statTotalEmpleados"),
    inputBuscar: document.getElementById("inputBuscar"),

    // Cards clickeables (filtro)
    cardTotal: document.getElementById("cardTotal"),
    cardActivos: document.getElementById("cardActivos"),
    cardInactivos: document.getElementById("cardInactivos"),

    // Modal crear/editar
    modal: document.getElementById("employeeModal"),
    modalTitulo: document.getElementById("modalTitulo"),
    inputNombres: document.getElementById("inputNombres"),
    inputApellidos: document.getElementById("inputApellidos"),
    inputEmail: document.getElementById("inputEmail"),
    inputPassword: document.getElementById("inputPassword"),
    inputTelefono: document.getElementById("inputTelefono"),
    inputFechaNac: document.getElementById("inputFechaNac"),
    selectRol: document.getElementById("selectRol"),
    passwordHint: document.getElementById("passwordHint"),
    btnGuardar: document.getElementById("btnGuardar"),

    // Imagen
    inputImagen: document.getElementById("inputImagen"),
    imagenPreview: document.getElementById("imagenPreview"),
    imagenPreviewImg: document.getElementById("imagenPreviewImg"),
    imagenRemoveBtn: document.getElementById("imagenRemoveBtn"),
    imagenDropZone: document.getElementById("imagenDropZone"),

    // Carnet / código de barras
    seccionCarnet: document.getElementById("seccionCarnet"),
    carnetSinCodigo: document.getElementById("carnetSinCodigo"),
    carnetConCodigo: document.getElementById("carnetConCodigo"),
    btnGenerarCarnet: document.getElementById("btnGenerarCarnet"),
    btnRegenerarCarnet: document.getElementById("btnRegenerarCarnet"),
    btnImprimirCarnet: document.getElementById("btnImprimirCarnet"),
    btnDescargarCarnet: document.getElementById("btnDescargarCarnet"),

    // Modal confirmación eliminar
    modalEliminar: document.getElementById("modalEliminar"),
    eliminarNombre: document.getElementById("eliminarNombre"),
    btnConfirmarElim: document.getElementById("btnConfirmarEliminar"),
    btnCancelarElim: document.getElementById("btnCancelarEliminar"),

    // Notificación
    notification: document.getElementById("notification"),
    notificationTitle: document.getElementById("notificationTitle"),
    notificationText: document.getElementById("notificationText"),
    notificationIcon: document.getElementById("notificationIcon"),

    // Pantalla de carga
    loader: document.getElementById("pantallaCarga")
};

// ─────────────────────────────────────────────
// NOTIFICACIONES
// ─────────────────────────────────────────────
function showNotification(text, type = "success") {

    const tipos = {
        success: { clase: "success", icon: "fa-circle-check", titulo: "Operación exitosa" },
        warning: { clase: "warning", icon: "fa-triangle-exclamation", titulo: "Aviso" },
        error: { clase: "error", icon: "fa-circle-xmark", titulo: "Error" }
    };

    const cfg = tipos[type] || tipos.success;

    dom.notification.className = `notification ${cfg.clase} show`;
    dom.notificationIcon.className = `fa-solid ${cfg.icon}`;
    dom.notificationTitle.textContent = cfg.titulo;
    dom.notificationText.textContent = text;

    setTimeout(() => {
        dom.notification.classList.remove("show");
    }, 5000);

}

// ─────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {

    mostrarLoader(true);

    try {

        const [empleados, roles, perfilData] = await Promise.all([
            apiEmpleados.listar(),
            apiEmpleados.listarRoles(),
            apiProfile.obtenerInfoMe(),
        ]);

        if (!empleados || !roles) {
            throw new Error("No se pudo conectar con el servidor");
        }

        state.empleados = empleados;
        state.roles = roles;

        cargarPerfilUsuario(perfilData);
        poblarSelectRoles();
        renderTabla(state.empleados);
        actualizarStats();

    } catch (error) {

        console.error("Error al cargar el módulo de empleados:", error);
        showNotification(
            "No se pudo conectar con el servidor. Verifica que el backend esté activo.",
            "error"
        );

    } finally {

        mostrarLoader(false);

    }

    configurarEventos();

});

// ─────────────────────────────────────────────
// LOADER
// ─────────────────────────────────────────────
function mostrarLoader(visible) {
    if (dom.loader) {
        dom.loader.style.display = visible ? "flex" : "none";
    }
}

// ─────────────────────────────────────────────
// POBLAR SELECT DE ROLES
// ─────────────────────────────────────────────
function poblarSelectRoles() {

    dom.selectRol.innerHTML = `<option value="">-- Selecciona un rol --</option>`;

    state.roles.forEach(rol => {
        const opt = document.createElement("option");
        opt.value = rol.id;
        opt.textContent = rol.nombre;
        dom.selectRol.appendChild(opt);
    });

}

// ─────────────────────────────────────────────
// PERFIL USUARIO 
// ─────────────────────────────────────────────
function cargarPerfilUsuario(perfilData) {

    const rolesPermitidos = ["ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");

        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
        );

        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    }

    generarSidebar('sidebar-container', "empleados", "empleados", perfilData.rol.nombre);

    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

    // Actualizar nombre de empresa en el sidebar
    const empresaData = perfilData?.empresa || perfilData?.data?.empresa;
    const nombreRaw = empresaData?.nombre || "";
    if (nombreRaw.trim() !== "") {
        nombreEmpresaContainer.textContent = nombreRaw.toUpperCase();
    } else {
        nombreEmpresaContainer.textContent = "RESTOSOFT";
    }

    if (perfilData && perfilData.usuario) {
        const nombres = perfilData.usuario.nombres || "";
        const apellidos = perfilData.usuario.apellidos || "";

        const iniciales =
            (
                nombres.substring(0, 1) +
                apellidos.substring(0, 1)
            ).toUpperCase() || "EP";

        // Usamos la misma estructura de .profile del Dashboard
        const avatarHTML = perfilData.usuario.imagenUrl
            ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" onerror="this.style.display='none'"/>`
            : `<div class="avatar-iniciales" style="width: 48px; height: 48px; border-radius: 14px; font-size: 14px;">${iniciales}</div>`;

        const nombreCompleto = `${nombres} ${apellidos}`.trim() || "Usuario sin nombre";
        const rol = perfilData.rol?.nombre || "Sin rol asignado";

        infoPerfilContainer.innerHTML = `
      ${avatarHTML}
      <div>
        <h6>${nombreCompleto}</h6>
        <span>${rol}</span>
      </div>
    `;
    } else {
        // Estado de Fallback si no hay datos
        infoPerfilContainer.innerHTML = `
      <div class="avatar-iniciales" style="width: 48px; height: 48px; border-radius: 14px; font-size: 14px;">UA</div>
      <div>
        <h6>Usuario Anónimo</h6>
        <span>Invitado</span>
      </div>
    `;
    }
}

// ─────────────────────────────────────────────
// RENDER DE TABLA
// ─────────────────────────────────────────────
function renderTabla(lista) {

    dom.tablaBody.innerHTML = "";

    if (!lista || lista.length === 0) {
        dom.tablaBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:40px; color:#6f7782;">
                    <i class="fa-solid fa-users-slash" style="font-size:28px; margin-bottom:10px; display:block;"></i>
                    No hay empleados registrados.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach(item => {

        const usuario = item.usuario || item;
        const rol = item.rol || usuario.rol || {};

        const nombres = `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim();
        const email = usuario.email || "—";
        const telefono = usuario.telefono || "—";
        const rolNombre = rol.nombre || "—";
        const id = usuario.id;
        const imagenUrl = usuario.imagenUrl || null;

        const activo = esActivo(usuario);
        const badgeClass = activo ? "badge-active" : "badge-off";
        const badgeTexto = activo ? "Activo" : "Inactivo";

        const iniciales = nombres
            .split(" ")
            .slice(0, 2)
            .map(p => p[0]?.toUpperCase() || "")
            .join("");

        const avatarHTML = imagenUrl
            ? `<img src="${imagenUrl}" alt="${nombres}" class="avatar-img" onerror="this.parentElement.innerHTML='<div class=\\'avatar-iniciales\\'>${iniciales}</div>'"/>`
            : `<div class="avatar-iniciales">${iniciales}</div>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Empleado">
                <div class="employee">
                    ${avatarHTML}
                    <div>
                        <h6>${nombres}</h6>
                        <span>${email}</span>
                    </div>
                </div>
            </td>
            <td data-label="Rol">${rolNombre}</td>
            <td data-label="Teléfono">${telefono}</td>
            <td data-label="Estado">
                <span class="badge-custom ${badgeClass}">${badgeTexto}</span>
            </td>
            <td data-label="Acciones">
                <div class="actions">
                    <button class="action-btn" title="Editar" onclick="abrirModalEditar(${id})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn danger" title="Eliminar" onclick="abrirModalEliminar(${id}, '${nombres}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        dom.tablaBody.appendChild(tr);

    });

}

// ─────────────────────────────────────────────
// Helper: determina si un empleado está activo,
// usando la MISMA regla en toda la app (stats y filtro)
// ─────────────────────────────────────────────
function esActivo(usuario) {
    return usuario.estado === "ACTIVO" || !usuario.estado;
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
function actualizarStats() {

    const total = state.empleados.length;
    const activos = state.empleados.filter(e => {
        const u = e.usuario || e;
        return esActivo(u);
    }).length;
    const inactivos = total - activos;

    if (dom.totalEmpleados) dom.totalEmpleados.textContent = total;
    if (dom.totalActivos) dom.totalActivos.textContent = activos;
    if (dom.totalInactivos) dom.totalInactivos.textContent = inactivos;

}

// ─────────────────────────────────────────────
// FILTRO COMBINADO (texto de búsqueda + card de estado)
// ─────────────────────────────────────────────
function aplicarFiltros() {

    const q = state.filtroTexto.toLowerCase();

    const filtrados = state.empleados.filter(item => {

        const u = item.usuario || item;
        const rol = item.rol || u.rol || {};
        const nombreComp = `${u.nombres || ""} ${u.apellidos || ""}`.toLowerCase();
        const email = (u.email || "").toLowerCase();
        const rolNombre = (rol.nombre || "").toLowerCase();

        const coincideTexto = !q ||
            nombreComp.includes(q) ||
            email.includes(q) ||
            rolNombre.includes(q);

        const activo = esActivo(u);

        const coincideEstado =
            state.filtroEstado === "todos" ||
            (state.filtroEstado === "ACTIVO" && activo) ||
            (state.filtroEstado === "INACTIVO" && !activo);

        return coincideTexto && coincideEstado;

    });

    renderTabla(filtrados);
    actualizarCardActiva();

}

// Resalta visualmente la card seleccionada
function actualizarCardActiva() {

    [dom.cardTotal, dom.cardActivos, dom.cardInactivos].forEach(card => {
        card?.classList.remove("active");
    });

    if (state.filtroEstado === "todos") dom.cardTotal?.classList.add("active");
    if (state.filtroEstado === "ACTIVO") dom.cardActivos?.classList.add("active");
    if (state.filtroEstado === "INACTIVO") dom.cardInactivos?.classList.add("active");

}

// Mantiene compatibilidad con el nombre anterior de la función de búsqueda
function filtrarEmpleados(texto) {
    state.filtroTexto = texto;
    aplicarFiltros();
}

// ─────────────────────────────────────────────
// MANEJO DE IMAGEN
// ─────────────────────────────────────────────
function resetearImagen() {
    if (dom.inputImagen) dom.inputImagen.value = "";
    if (dom.imagenPreviewImg) dom.imagenPreviewImg.src = "";
    if (dom.imagenPreview) dom.imagenPreview.style.display = "none";
    if (dom.imagenDropZone) dom.imagenDropZone.style.display = "flex";
}

function mostrarPreviewImagen(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        if (dom.imagenPreviewImg) dom.imagenPreviewImg.src = e.target.result;
        if (dom.imagenPreview) dom.imagenPreview.style.display = "block";
        if (dom.imagenDropZone) dom.imagenDropZone.style.display = "none";
    };
    reader.readAsDataURL(file);
}

function mostrarPreviewDesdeURL(url) {
    if (!url) {
        resetearImagen();
        return;
    }
    if (dom.imagenPreviewImg) dom.imagenPreviewImg.src = url;
    if (dom.imagenPreview) dom.imagenPreview.style.display = "block";
    if (dom.imagenDropZone) dom.imagenDropZone.style.display = "none";
}

// ─────────────────────────────────────────────
// MODAL CREAR/EDITAR — ABRIR
// ─────────────────────────────────────────────
window.abrirModalCrear = function () {

    state.empleadoEnEdicion = null;

    dom.modalTitulo.textContent = "Registrar Empleado";
    dom.inputNombres.value = "";
    dom.inputApellidos.value = "";
    dom.inputEmail.value = "";
    dom.inputPassword.value = "";
    dom.inputTelefono.value = "";
    dom.inputFechaNac.value = "";
    dom.selectRol.value = "";

    dom.passwordHint.style.display = "none";
    dom.inputPassword.required = true;
    dom.inputPassword.placeholder = "Mínimo 8 caracteres";

    dom.seccionCarnet.style.display = "none";

    resetearImagen();
    dom.modal.classList.add("show");

};

window.abrirModalEditar = async function (id) {

    mostrarLoader(true);

    try {

        const item = await apiEmpleados.obtener(id);

        if (!item) {
            showNotification("No se pudo cargar el empleado.", "error");
            return;
        }

        const usuario = item.usuario || item;
        const rol = item.rol || usuario.rol || {};

        state.empleadoEnEdicion = usuario.id;

        dom.modalTitulo.textContent = "Editar Empleado";
        dom.inputNombres.value = usuario.nombres || "";
        dom.inputApellidos.value = usuario.apellidos || "";
        dom.inputEmail.value = usuario.email || "";
        dom.inputPassword.value = "";
        dom.inputTelefono.value = usuario.telefono || "";
        dom.inputFechaNac.value = usuario.fechaNacimiento || "";
        dom.selectRol.value = rol.id || "";

        dom.passwordHint.style.display = "block";
        dom.inputPassword.required = false;
        dom.inputPassword.placeholder = "Dejar en blanco para no cambiar";

        dom.seccionCarnet.style.display = "block";
        renderizarCarnet(usuario);

        // Forzamos la generación visual del carnet basado en el ID para asegurar que always se muestre
        await generarOCambiarCarnet();

        resetearImagen();
        if (usuario.imagenUrl) {
            mostrarPreviewDesdeURL(usuario.imagenUrl);
        }

        dom.modal.classList.add("show");

    } catch (error) {

        showNotification("Error al cargar los datos del empleado.", "error");

    } finally {

        mostrarLoader(false);

    }

};

// ─────────────────────────────────────────────
// CARNET / CÓDIGO DE BARRAS
// ─────────────────────────────────────────────
function renderizarCarnet(usuario) {
    // Validamos si el código viene directamente o anidado en otro objeto (previene errores de la API)
    const codigo = usuario.codigoBarras || usuario.codigo_barras || (usuario.usuario && (usuario.usuario.codigoBarras || usuario.usuario.codigo_barras));

    if (codigo) {
        dom.carnetSinCodigo.style.display = "none";
        dom.carnetConCodigo.style.display = "block"; // Esto hace visible el botón de descarga
        JsBarcode("#barcodeSvg", codigo, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true
        });
    } else {
        dom.carnetSinCodigo.style.display = "block";
        dom.carnetConCodigo.style.display = "none";
    }
}

async function generarOCambiarCarnet() {
    if (!state.empleadoEnEdicion) return;

    // 1. Generamos el código localmente basado en el ID
    const codigo = `EMP${String(state.empleadoEnEdicion).padStart(4, "0")}`;

    // 2. Mostramos y dibujamos la imagen INMEDIATAMENTE en la pantalla (sin esperar al backend)
    dom.carnetSinCodigo.style.display = "none";
    dom.carnetConCodigo.style.display = "block";

    try {
        JsBarcode("#barcodeSvg", codigo, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true
        });
    } catch (e) {
        console.error("Error al dibujar el código de barras:", e);
    }

    // 3. Intentamos guardar el código en la base de datos en segundo plano
    try {
        await apiEmpleados.asignarCodigoBarras(state.empleadoEnEdicion, codigo);
        showNotification("Carnet generado y guardado correctamente.", "success");
    } catch (error) {
        console.error("Fallo al guardar en backend:", error);
        showNotification("Se generó el carnet visual, pero hubo un error al guardarlo en la base de datos.", "warning");
    }
}

function imprimirCarnet() {
    const svg = document.getElementById("barcodeSvg").outerHTML;
    const nombre = `${dom.inputNombres.value} ${dom.inputApellidos.value}`;

    const ventana = window.open("", "_blank", "width=400,height=500");
    ventana.document.write(`
        <html>
        <head><title>Carnet - ${nombre}</title></head>
        <body style="text-align:center; font-family:sans-serif; padding:30px;">
            <h3>${nombre}</h3>
            ${svg}
        </body>
        </html>
    `);
    ventana.document.close();
    ventana.print();
}

// ─────────────────────────────────────────────
// DESCARGAR CARNET COMO IMAGEN PNG
// ─────────────────────────────────────────────
function descargarCarnetImagen() {
    const svgElement = document.getElementById("barcodeSvg");
    const nombre = `${dom.inputNombres.value} ${dom.inputApellidos.value}`.trim();

    if (!svgElement || svgElement.innerHTML.trim() === "") {
        showNotification("No hay un código de barras generado para descargar.", "warning");
        return;
    }

    // Clonar el SVG para no modificar el original
    const clonedSvg = svgElement.cloneNode(true);

    // Obtener dimensiones reales del SVG o usar unas por defecto
    const rect = svgElement.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : 300;
    const height = rect.height > 0 ? rect.height : 80;

    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Serializar y convertir a Base64 (Mucho más seguro que Blob para Canvas)
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
    const image64 = 'data:image/svg+xml;base64,' + svgBase64;

    const img = new Image();
    img.onload = function () {
        const canvas = document.createElement("canvas");
        const padding = 40;
        const nameHeight = 60; // Espacio para el nombre

        canvas.width = width + (padding * 2);
        canvas.height = height + (padding * 2) + nameHeight;

        const ctx = canvas.getContext("2d");

        // Fondo blanco
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Texto del nombre
        ctx.fillStyle = "#000000";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(nombre, canvas.width / 2, padding + 25);

        // Dibujar el código de barras
        ctx.drawImage(img, padding, padding + nameHeight, width, height);

        // Forzar descarga
        try {
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `Carnet_${nombre.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            showNotification("Carnet descargado correctamente.", "success");
        } catch (e) {
            console.error("Error al generar el PNG:", e);
            showNotification("Hubo un error al exportar la imagen.", "error");
        }
    };

    img.onerror = function () {
        console.error("Error al cargar la imagen SVG para canvas");
        showNotification("No se pudo procesar el código de barras.", "error");
    };

    img.src = image64;
}

// ─────────────────────────────────────────────
// MODAL CREAR/EDITAR — CERRAR
// ─────────────────────────────────────────────
window.cerrarModal = function () {
    dom.modal.classList.remove("show");
};

// ─────────────────────────────────────────────
// GUARDAR (CREAR O EDITAR)
// ─────────────────────────────────────────────
window.guardarEmpleado = async function () {

    const nombres = dom.inputNombres.value.trim();
    const apellidos = dom.inputApellidos.value.trim();
    const email = dom.inputEmail.value.trim();
    const password = dom.inputPassword.value.trim();
    const telefono = dom.inputTelefono.value.trim();
    const fechaNac = dom.inputFechaNac.value;
    const idRol = parseInt(dom.selectRol.value);
    const imagenFile = dom.inputImagen?.files?.[0] || null;

    if (!nombres || !apellidos || !email || !telefono || !fechaNac || !idRol) {
        showNotification("Por favor completa todos los campos obligatorios.", "warning");
        return;
    }

    if (!state.empleadoEnEdicion && !password) {
        showNotification("La contraseña es obligatoria al crear un empleado.", "warning");
        return;
    }

    if (password && password.length < 8) {
        showNotification("La contraseña debe tener al menos 8 caracteres.", "warning");
        return;
    }

    if (imagenFile && imagenFile.size > 5 * 1024 * 1024) {
        showNotification("La imagen no puede superar los 5MB.", "warning");
        return;
    }

    const data = {
        nombres,
        apellidos,
        email,
        telefono,
        fechaNacimiento: fechaNac,
        idRol
    };

    if (password) {
        data.password = password;
    }

    dom.btnGuardar.disabled = true;
    dom.btnGuardar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;

    try {

        if (state.empleadoEnEdicion) {

            await apiEmpleados.actualizar(state.empleadoEnEdicion, data, imagenFile);
            showNotification("Empleado actualizado correctamente.", "success");

        } else {

            await apiEmpleados.crear(data, imagenFile);
            showNotification("Empleado registrado correctamente.", "success");

        }

        state.empleados = await apiEmpleados.listar();
        aplicarFiltros();
        actualizarStats();
        cerrarModal();

    } catch (error) {

        showNotification(
            error.message || "No se pudo guardar. Verifica los datos e intenta de nuevo.",
            "error"
        );

    } finally {

        dom.btnGuardar.disabled = false;
        dom.btnGuardar.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar`;

    }

};

// ─────────────────────────────────────────────
// MODAL ELIMINAR
// ─────────────────────────────────────────────
let _idParaEliminar = null;

window.abrirModalEliminar = function (id, nombre) {
    _idParaEliminar = id;
    dom.eliminarNombre.textContent = nombre;
    dom.modalEliminar.classList.add("show");
};

window.cerrarModalEliminar = function () {
    _idParaEliminar = null;
    dom.modalEliminar.classList.remove("show");
};

async function confirmarEliminar() {

    if (!_idParaEliminar) return;

    dom.btnConfirmarElim.disabled = true;

    try {

        const ok = await apiEmpleados.eliminar(_idParaEliminar);

        if (ok) {
            showNotification("Empleado eliminado correctamente.", "success");
            state.empleados = await apiEmpleados.listar();
            aplicarFiltros();
            actualizarStats();
            cerrarModalEliminar();
        } else {
            showNotification("No se pudo eliminar el empleado.", "error");
        }

    } catch (error) {

        showNotification("Error al eliminar el empleado.", "error");

    } finally {

        dom.btnConfirmarElim.disabled = false;

    }

}

// ─────────────────────────────────────────────
// EVENTOS GENERALES
// ─────────────────────────────────────────────
function configurarEventos() {

    // ── Búsqueda ──
    dom.inputBuscar?.addEventListener("input", (e) => {
        filtrarEmpleados(e.target.value);
    });

    // ── Filtros por tarjetas ──
    dom.cardTotal?.addEventListener("click", () => {
        state.filtroEstado = "todos";
        aplicarFiltros();
    });

    dom.cardActivos?.addEventListener("click", () => {
        state.filtroEstado = "ACTIVO";
        aplicarFiltros();
    });

    dom.cardInactivos?.addEventListener("click", () => {
        state.filtroEstado = "INACTIVO";
        aplicarFiltros();
    });

    // ── Imagen: click en drop zone ──
    dom.imagenDropZone?.addEventListener("click", () => {
        dom.inputImagen?.click();
    });

    // ── Imagen: selección de archivo ──
    dom.inputImagen?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                showNotification("Solo se permiten archivos de imagen.", "warning");
                dom.inputImagen.value = "";
                return;
            }
            mostrarPreviewImagen(file);
        }
    });

    // ── Imagen: drag & drop ──
    dom.imagenDropZone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.imagenDropZone.classList.add("dragover");
    });

    dom.imagenDropZone?.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.imagenDropZone.classList.remove("dragover");
    });

    dom.imagenDropZone?.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.imagenDropZone.classList.remove("dragover");

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showNotification("Solo se permiten archivos de imagen.", "warning");
            return;
        }

        // Asignar el archivo al input para que se envíe al guardar
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        dom.inputImagen.files = dataTransfer.files;

        mostrarPreviewImagen(file);
    });

    // ── Imagen: botón quitar ──
    dom.imagenRemoveBtn?.addEventListener("click", (e) => {
        e.stopPropagation(); // Evita que abra el seleccionador de archivos
        resetearImagen();
    });

    // ── Carnet: botones ──
    dom.btnGenerarCarnet?.addEventListener("click", generarOCambiarCarnet);
    dom.btnRegenerarCarnet?.addEventListener("click", generarOCambiarCarnet);
    dom.btnImprimirCarnet?.addEventListener("click", imprimirCarnet);

    // Nuevo botón de descarga
    dom.btnDescargarCarnet?.addEventListener("click", descargarCarnetImagen);

    // ── Modal Eliminar: botones ──
    dom.btnConfirmarElim?.addEventListener("click", confirmarEliminar);
    dom.btnCancelarElim?.addEventListener("click", cerrarModalEliminar);

    // ── Cerrar modal al hacer clic fuera ──
    dom.modal?.addEventListener("click", (e) => {
        if (e.target === dom.modal) cerrarModal();
    });

    dom.modalEliminar?.addEventListener("click", (e) => {
        if (e.target === dom.modalEliminar) cerrarModalEliminar();
    });

}