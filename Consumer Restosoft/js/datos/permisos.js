import { apiRoles } from "../consumo/apiRoles.js";

const state = { roles: [], idParaEliminar: null };

const dom = {
    rolesGrid:          document.getElementById("rolesGrid"),
    estadoVacio:        document.getElementById("estadoVacio"),
    statRoles:          document.getElementById("statRoles"),
    btnNuevoRol:        document.getElementById("btnNuevoRol"),
    modalRol:           document.getElementById("modalRol"),
    inputNombreRol:     document.getElementById("inputNombreRol"),
    btnGuardarRol:      document.getElementById("btnGuardarRol"),
    modalEliminar:      document.getElementById("modalEliminar"),
    eliminarNombreRol:  document.getElementById("eliminarNombreRol"),
    btnConfirmarElim:   document.getElementById("btnConfirmarEliminar"),
    loader:             document.getElementById("pantallaCarga"),
    notification:       document.getElementById("notification"),
    notificationTitle:  document.getElementById("notificationTitle"),
    notificationText:   document.getElementById("notificationText"),
    notificationIcon:   document.getElementById("notificationIcon")
};

function showNotification(text, type = "success") {
    const cfg = {
        success:{ clase:"success", icon:"fa-circle-check",        titulo:"Listo"  },
        warning:{ clase:"warning", icon:"fa-triangle-exclamation", titulo:"Aviso"  },
        error:  { clase:"error",   icon:"fa-circle-xmark",         titulo:"Error"  }
    }[type];
    dom.notification.className        = `notification ${cfg.clase} show`;
    dom.notificationIcon.className    = `fa-solid ${cfg.icon}`;
    dom.notificationTitle.textContent = cfg.titulo;
    dom.notificationText.textContent  = text;
    setTimeout(() => dom.notification.classList.remove("show"), 5000);
}

function mostrarLoader(v) { if (dom.loader) dom.loader.style.display = v ? "flex" : "none"; }

// Iconos por nombre de rol
function iconoRol(nombre) {
    const n = (nombre || "").toUpperCase();
    if (n.includes("ADMIN"))      return "fa-crown";
    if (n.includes("MESERO"))     return "fa-person-walking";
    if (n.includes("COCIN"))      return "fa-kitchen-set";
    if (n.includes("CAJERO"))     return "fa-cash-register";
    if (n.includes("CONFIG"))     return "fa-gear";
    if (n.includes("CLIENTE"))    return "fa-user";
    if (n.includes("SUPERVISOR")) return "fa-star";
    return "fa-shield-halved";
}

function renderRoles(roles) {
    dom.statRoles.textContent = roles.length;

    if (roles.length === 0) {
        dom.estadoVacio.style.display = "block";
        dom.rolesGrid.innerHTML       = "";
        return;
    }

    dom.estadoVacio.style.display = "none";
    dom.rolesGrid.innerHTML = roles.map(rol => `
        <div class="rol-card">
            <div class="rol-card-header">
                <div class="rol-icon"><i class="fa-solid ${iconoRol(rol.nombre)}"></i></div>
                <button class="btn-eliminar-rol" onclick="abrirModalEliminar(${rol.id}, '${rol.nombre}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div>
                <p class="rol-nombre">${rol.nombre}</p>
                <p class="rol-id">ID: ${rol.id}</p>
            </div>
        </div>
    `).join("");
}

// Modal crear
window.cerrarModalRol = () => {
    dom.modalRol.classList.remove("show");
    dom.inputNombreRol.value = "";
};

async function guardarRol() {
    const nombre = dom.inputNombreRol.value.trim();
    if (!nombre) { showNotification("Ingresa un nombre para el rol.", "warning"); return; }
    dom.btnGuardarRol.disabled = true;
    dom.btnGuardarRol.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    try {
        await apiRoles.crear(nombre);
        showNotification(`Rol "${nombre.toUpperCase()}" creado correctamente.`, "success");
        cerrarModalRol();
        state.roles = await apiRoles.listar();
        renderRoles(state.roles);
    } catch (e) {
        showNotification(e.message || "No se pudo crear el rol.", "error");
    } finally {
        dom.btnGuardarRol.disabled = false;
        dom.btnGuardarRol.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar`;
    }
}

// Modal eliminar
window.abrirModalEliminar = (id, nombre) => {
    state.idParaEliminar              = id;
    dom.eliminarNombreRol.textContent = nombre;
    dom.modalEliminar.classList.add("show");
};

window.cerrarModalEliminar = () => {
    state.idParaEliminar = null;
    dom.modalEliminar.classList.remove("show");
};

async function confirmarEliminar() {
    if (!state.idParaEliminar) return;
    dom.btnConfirmarElim.disabled = true;
    try {
        const ok = await apiRoles.eliminar(state.idParaEliminar);
        if (ok) {
            showNotification("Rol eliminado correctamente.", "success");
            cerrarModalEliminar();
            state.roles = await apiRoles.listar();
            renderRoles(state.roles);
        } else {
            showNotification("No se pudo eliminar el rol.", "error");
        }
    } catch (e) {
        showNotification("Error al eliminar el rol.", "error");
    } finally {
        dom.btnConfirmarElim.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    mostrarLoader(true);
    try {
        state.roles = await apiRoles.listar();
        renderRoles(state.roles);
    } catch (e) {
        showNotification("No se pudo conectar con el servidor.", "error");
    } finally {
        mostrarLoader(false);
    }

    dom.btnNuevoRol.addEventListener("click", () => dom.modalRol.classList.add("show"));
    dom.btnGuardarRol.addEventListener("click", guardarRol);
    dom.btnConfirmarElim.addEventListener("click", confirmarEliminar);

    dom.inputNombreRol.addEventListener("keydown", e => { if (e.key === "Enter") guardarRol(); });
    dom.modalRol.addEventListener("click", e => { if (e.target === dom.modalRol) cerrarModalRol(); });
    dom.modalEliminar.addEventListener("click", e => { if (e.target === dom.modalEliminar) cerrarModalEliminar(); });

    document.querySelectorAll(".menu-group-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.nextElementSibling?.classList.toggle("open");
            btn.querySelector(".chevron")?.classList.toggle("rotate");
        });
    });
    const toggle  = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    toggle?.addEventListener("click", () => { sidebar?.classList.toggle("open"); overlay?.classList.toggle("show"); });
    overlay?.addEventListener("click", () => { sidebar?.classList.remove("open"); overlay?.classList.remove("show"); });
});