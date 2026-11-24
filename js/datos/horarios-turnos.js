import { apiHorarios }  from "../consumo/apiHorarios.js";
import { apiEmpleados } from "../consumo/apiEmpleados.js";
// --- AGREGADO: Importaciones para perfil y sidebar ---
import { obtenerPerfilSesion } from "../consumo/sesionContext.js";
import { generarSidebar } from './create-sidebar.js';

const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
const DIAS_LABEL = { LUNES:"Lun", MARTES:"Mar", MIERCOLES:"Mié", JUEVES:"Jue", VIERNES:"Vie", SABADO:"Sáb", DOMINGO:"Dom" };

const state = {
    empleados:       [],
    horarios:        [],
    modoEdicion:     false,
    horarioEnEdicion: null,   
    idParaEliminar:  null
};

const dom = {
    selectEmpleado:      document.getElementById("selectEmpleado"),
    modalSelectEmpleado: document.getElementById("modalSelectEmpleado"),
    btnConsultar:        document.getElementById("btnConsultar"),
    btnNuevoHorario:     document.getElementById("btnNuevoHorario"),
    semanaGrid:          document.getElementById("semanaGrid"),
    tablaBody:           document.getElementById("tablaBody"),
    tablaWrapper:        document.getElementById("tablaWrapper"),
    estadoInicial:       document.getElementById("estadoInicial"),
    estadoVacio:         document.getElementById("estadoVacio"),
    badgeTotal:          document.getElementById("badgeTotal"),
    modalHorario:        document.getElementById("modalHorario"),
    modalTitulo:         document.getElementById("modalTitulo"),
    inputDia:            document.getElementById("inputDia"),
    inputHoraEntrada:    document.getElementById("inputHoraEntrada"),
    inputHoraSalida:     document.getElementById("inputHoraSalida"),
    btnGuardarHorario:   document.getElementById("btnGuardarHorario"),
    modalEliminar:       document.getElementById("modalEliminar"),
    textoEliminar:       document.getElementById("textoEliminar"),
    btnConfirmarElim:    document.getElementById("btnConfirmarEliminar"),
    loader:              document.getElementById("pantallaCarga"),
    notification:        document.getElementById("notification"),
    notificationTitle:   document.getElementById("notificationTitle"),
    notificationText:    document.getElementById("notificationText"),
    notificationIcon:    document.getElementById("notificationIcon")
};

// ─── Notificación ───
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

// --- AGREGADO: Función para cargar perfil, validar rol y generar sidebar ---
function cargarPerfilUsuario(perfilData) {
    const rolesPermitidos = ["ADMINISTRADOR"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");
        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a Horarios y Turnos. Si crees que se trata de un error, comunícate con un administrador."
        );
        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
        return;
    }

    generarSidebar('sidebar-container', "empleados", "horarios", perfilData.rol.nombre);

    const infoPerfilContainer = document.getElementById("infoPerfilContainer");
    const nombreEmpresaContainer = document.getElementById("nombreEmpresa");
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
        const iniciales = (nombres.substring(0, 1) + apellidos.substring(0, 1)).toUpperCase() || "EP";

        const avatarHTML = perfilData.usuario.imagenUrl
            ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" onerror="this.style.display='none'"/>`
            : `<div class="avatar-iniciales" style="width: 48px; height: 48px; border-radius: 14px; font-size: 14px;">${iniciales}</div>`;

        const nombreCompleto = `${nombres} ${apellidos}`.trim() || "Usuario sin nombre";
        const rol = perfilData.rol?.nombre || "Sin rol asignado";

        infoPerfilContainer.innerHTML = `
                <a href="perfil.html" class="profile-link">
                    ${avatarHTML}
                    <div class="profile-info">
                        <strong>${nombreCompleto}</strong>
                        <div style="font-size: 13px; color: var(--gray)">${rol}</div>
                    </div>
                </a>`;
    } else {
        infoPerfilContainer.innerHTML = `
          <div class="avatar-iniciales" style="width: 48px; height: 48px; border-radius: 14px; font-size: 14px;">UA</div>
          <div>
            <h6>Usuario Anónimo</h6>
            <span>Invitado</span>
          </div>
        `;
    }
}

// LocalTime de Java llega como "HH:mm:ss" → queremos "HH:mm"
function formatHora(h) {
    if (!h) return "—";
    return String(h).substring(0, 5);
}

// Calcula duración entre dos strings "HH:mm"
function calcularDuracion(entrada, salida) {
    if (!entrada || !salida) return "—";
    const [h1,m1] = entrada.split(":").map(Number);
    const [h2,m2] = salida.split(":").map(Number);
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) mins += 1440;
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    return `${hh}h ${mm > 0 ? mm + "min" : ""}`.trim();
}

// ─── Poblar selects ───
function poblarSelects(empleados) {
    const base = `<option value="">-- Selecciona un empleado --</option>`;
    const opts = empleados.map(item => {
        const u = item.usuario || item;
        return `<option value="${u.id}">${u.nombres} ${u.apellidos}</option>`;
    }).join("");
    dom.selectEmpleado.innerHTML      = base + opts;
    dom.modalSelectEmpleado.innerHTML = base + opts;
}

// ─── Semana visual ───
function renderSemana(horarios) {
    dom.semanaGrid.innerHTML = "";
    DIAS.forEach(dia => {
        const turnos = horarios.filter(h => h.diaSemana === dia);
        const tieneTurno = turnos.length > 0;
        const turnosHtml = turnos.map(h =>
            `<div class="dia-turno">
                <i class="fa-solid fa-clock"></i>
                ${formatHora(h.horaEntrada)} – ${formatHora(h.horaSalida)}
            </div>`
        ).join("") || `<span class="dia-libre">Libre</span>`;

        dom.semanaGrid.innerHTML += `
            <div class="dia-card ${tieneTurno ? "tiene-turno" : ""}">
                <span class="dia-nombre">${DIAS_LABEL[dia]}</span>
                ${turnosHtml}
            </div>
        `;
    });
}

// ─── Tabla ───
function renderTabla(horarios) {
    dom.estadoInicial.style.display = "none";

    if (!horarios || horarios.length === 0) {
        dom.estadoVacio.style.display  = "block";
        dom.tablaWrapper.style.display = "none";
        dom.badgeTotal.style.display   = "none";
        renderSemana([]);
        return;
    }

    dom.estadoVacio.style.display  = "none";
    dom.tablaWrapper.style.display = "block";
    dom.badgeTotal.style.display   = "inline-block";
    dom.badgeTotal.textContent     = `${horarios.length} turno(s)`;

    const ordenados = [...horarios].sort(
        (a, b) => DIAS.indexOf(a.diaSemana) - DIAS.indexOf(b.diaSemana)
    );

    dom.tablaBody.innerHTML = "";

    ordenados.forEach(h => {
        const entrada  = formatHora(h.horaEntrada);
        const salida   = formatHora(h.horaSalida);
        const duracion = calcularDuracion(entrada, salida);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Día">
                <span class="badge-dia">${h.diaSemana}</span>
            </td>
            <td data-label="Hora entrada">${entrada}</td>
            <td data-label="Hora salida">${salida}</td>
            <td data-label="Duración">
                <span class="duracion-text">${duracion}</span>
            </td>
            <td data-label="Acciones">
                <div class="actions">
                    <button class="action-btn" title="Editar" onclick="abrirEditar(${h.id}, '${h.diaSemana}', '${entrada}', '${salida}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn danger" title="Eliminar" onclick="abrirEliminar(${h.id}, '${h.diaSemana}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        dom.tablaBody.appendChild(tr);
    });

    renderSemana(horarios);
}

// ─── Consultar ───
async function consultar() {
    const idUsuario = dom.selectEmpleado.value;
    if (!idUsuario) { showNotification("Selecciona un empleado.", "warning"); return; }
    mostrarLoader(true);
    try {
        const data = await apiHorarios.listar(parseInt(idUsuario));
        state.horarios = data;
        renderTabla(data);
    } catch (e) {
        showNotification("No se pudo cargar los horarios.", "error");
    } finally {
        mostrarLoader(false);
    }
}

// ─── Modal horario ───
window.cerrarModalHorario = () => {
    dom.modalHorario.classList.remove("show");
    state.modoEdicion      = false;
    state.horarioEnEdicion = null;
    dom.modalSelectEmpleado.value = "";
    dom.inputDia.value            = "";
    dom.inputHoraEntrada.value    = "";
    dom.inputHoraSalida.value     = "";
};

window.abrirEditar = (id, dia, entrada, salida) => {
    state.modoEdicion      = true;
    state.horarioEnEdicion = id;
    dom.modalTitulo.textContent       = "Editar Turno";
    dom.modalSelectEmpleado.value     = dom.selectEmpleado.value;
    dom.inputDia.value                = dia;
    dom.inputHoraEntrada.value        = entrada;
    dom.inputHoraSalida.value         = salida;
    dom.modalSelectEmpleado.disabled  = true;
    dom.modalHorario.classList.add("show");
};

async function guardarHorario() {
    const idUsuario   = parseInt(dom.modalSelectEmpleado.value);
    const dia         = dom.inputDia.value;
    const horaEntrada = dom.inputHoraEntrada.value;  
    const horaSalida  = dom.inputHoraSalida.value;   

    if (!idUsuario || !dia || !horaEntrada || !horaSalida) {
        showNotification("Completa todos los campos.", "warning");
        return;
    }

    if (horaEntrada >= horaSalida) {
        showNotification("La hora de entrada debe ser anterior a la hora de salida.", "warning");
        return;
    }

    const data = {
        idusuario:    idUsuario,
        horaEntrada:  horaEntrada + ":00",
        horaSalida:   horaSalida  + ":00",
        diaSemana:    dia
    };

    dom.btnGuardarHorario.disabled  = true;
    dom.btnGuardarHorario.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;

    try {
        if (state.modoEdicion) {
            await apiHorarios.actualizar(state.horarioEnEdicion, data);
            showNotification("Turno actualizado correctamente.", "success");
        } else {
            await apiHorarios.crear(data);
            showNotification("Turno asignado correctamente.", "success");
        }
        cerrarModalHorario();
        dom.modalSelectEmpleado.disabled = false;
        if (dom.selectEmpleado.value) await consultar();
    } catch (e) {
        showNotification(e.message || "No se pudo guardar el turno.", "error");
    } finally {
        dom.btnGuardarHorario.disabled  = false;
        dom.btnGuardarHorario.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar`;
    }
}

// ─── Modal eliminar ───
window.abrirEliminar = (id, dia) => {
    state.idParaEliminar          = id;
    dom.textoEliminar.innerHTML   = `Se eliminará el turno del día <strong>${dia}</strong>.`;
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
        const ok = await apiHorarios.eliminar(state.idParaEliminar);
        if (ok) {
            showNotification("Turno eliminado correctamente.", "success");
            cerrarModalEliminar();
            if (dom.selectEmpleado.value) await consultar();
        } else {
            showNotification("No se pudo eliminar el turno.", "error");
        }
    } catch (e) {
        showNotification("Error al eliminar el turno.", "error");
    } finally {
        dom.btnConfirmarElim.disabled = false;
    }
}

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
    mostrarLoader(true);
    try {
        // --- AGREGADO: Obtener perfil (único origen: sesionContext) ---
        const perfilData = await obtenerPerfilSesion();
        if (!perfilData) return;
        cargarPerfilUsuario(perfilData);

        const empleados = await apiEmpleados.listar();
        state.empleados = empleados;
        poblarSelects(empleados);
        renderSemana([]);
    } catch (e) {
        showNotification("No se pudo cargar la información inicial.", "error");
    } finally {
        mostrarLoader(false);
    }

    dom.btnConsultar.addEventListener("click", consultar);
    dom.btnNuevoHorario.addEventListener("click", () => {
        state.modoEdicion                = false;
        dom.modalTitulo.textContent      = "Nuevo Turno";
        dom.modalSelectEmpleado.disabled = false;
        if (dom.selectEmpleado.value) dom.modalSelectEmpleado.value = dom.selectEmpleado.value;
        dom.modalHorario.classList.add("show");
    });
    dom.btnGuardarHorario.addEventListener("click", guardarHorario);
    dom.btnConfirmarElim.addEventListener("click", confirmarEliminar);

    dom.modalHorario.addEventListener("click", e => { if (e.target === dom.modalHorario) cerrarModalHorario(); });
    dom.modalEliminar.addEventListener("click", e => { if (e.target === dom.modalEliminar) cerrarModalEliminar(); });
});