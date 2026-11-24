import { apiAsistencia } from "../consumo/apiAsistencia.js";
import { apiEmpleados }  from "../consumo/apiEmpleados.js";
// --- AGREGADO: Importaciones para perfil y sidebar ---
import { obtenerPerfilSesion } from "../consumo/sesionContext.js";
import { generarSidebar } from './create-sidebar.js';

// ─── Estado ───
const state = {
    empleados:          [],
    historial:          [],
    asistenciaIdSalida: null
};

let intervaloRefresco = null;

// ─── DOM ───
const dom = {
    selectEmpleado:       document.getElementById("selectEmpleado"),
    modalSelectEmpleado:  document.getElementById("modalSelectEmpleado"),
    btnConsultar:         document.getElementById("btnConsultar"),
    btnRegistrarEntrada:  document.getElementById("btnRegistrarEntrada"),
    btnConfirmarEntrada:  document.getElementById("btnConfirmarEntrada"),
    btnConfirmarSalida:   document.getElementById("btnConfirmarSalida"),
    btnExportarPDF:       document.getElementById("btnExportarPDF"),
    tablaBody:            document.getElementById("tablaBody"),
    tablaWrapper:         document.getElementById("tablaWrapper"),
    estadoInicial:        document.getElementById("estadoInicial"),
    estadoVacio:          document.getElementById("estadoVacio"),
    badgeTotal:           document.getElementById("badgeTotal"),
    statEntradas:         document.getElementById("statEntradas"),
    statSalidas:          document.getElementById("statSalidas"),
    statAbiertos:         document.getElementById("statAbiertos"),
    salidaIdTexto:        document.getElementById("salidaIdTexto"),
    modalEntrada:         document.getElementById("modalEntrada"),
    modalSalida:          document.getElementById("modalSalida"),
    loader:               document.getElementById("pantallaCarga"),
    notification:         document.getElementById("notification"),
    notificationTitle:    document.getElementById("notificationTitle"),
    notificationText:     document.getElementById("notificationText"),
    notificationIcon:     document.getElementById("notificationIcon")
};

// ─── Notificación ───
function showNotification(text, type = "success") {
    const cfg = {
        success: { clase:"success", icon:"fa-circle-check",        titulo:"Listo" },
        warning: { clase:"warning", icon:"fa-triangle-exclamation", titulo:"Aviso" },
        error:   { clase:"error",   icon:"fa-circle-xmark",         titulo:"Error" }
    }[type];
    dom.notification.className        = `notification ${cfg.clase} show`;
    dom.notificationIcon.className    = `fa-solid ${cfg.icon}`;
    dom.notificationTitle.textContent = cfg.titulo;
    dom.notificationText.textContent  = text;
    setTimeout(() => dom.notification.classList.remove("show"), 5000);
}

function mostrarLoader(v) {
    if (dom.loader) dom.loader.style.display = v ? "flex" : "none";
}

// --- AGREGADO: Función para cargar perfil, validar rol y generar sidebar ---
function cargarPerfilUsuario(perfilData) {
    // 1. Definir los roles permitidos para este módulo
    const rolesPermitidos = ["ADMINISTRADOR", "RECEPCIONISTA"];

    if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
        console.error("Acceso no autorizado");
        const codigo = "403";
        const mensaje = encodeURIComponent(
            "No tienes permisos para acceder a la página de Asistencia. Si crees que se trata de un error, comunícate con un administrador."
        );
        window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
        return;
    }

    // 2. Generar sidebar dinámico pasando el rol
    generarSidebar('sidebar-container', "empleados", "asistencia", perfilData.rol.nombre);

    // 3. Inyectar perfil en el topbar
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

// ─── Helpers de fecha/hora ───
function formatFecha(instant) {
    if (!instant) return "—";
    const d = new Date(instant);
    return d.toLocaleDateString("es-CO", { year:"numeric", month:"2-digit", day:"2-digit" });
}

function formatHora(instant) {
    if (!instant) return "—";
    const d = new Date(instant);
    return d.toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" });
}

// ─── Poblar selects ───
function poblarSelects(empleados) {
    const opcion = `<option value="">-- Selecciona un empleado --</option>`;
    const opciones = empleados.map(item => {
        const u    = item.usuario || item;
        const nombre = `${u.nombres || ""} ${u.apellidos || ""}`.trim();
        return `<option value="${u.id}">${nombre}</option>`;
    }).join("");
    dom.selectEmpleado.innerHTML      = opcion + opciones;
    dom.modalSelectEmpleado.innerHTML = opcion + opciones;
}

// ─── Render tabla ───
function renderTabla(lista) {
    dom.estadoInicial.style.display = "none";

    if (!lista || lista.length === 0) {
        dom.estadoVacio.style.display  = "block";
        dom.tablaWrapper.style.display = "none";
        dom.badgeTotal.style.display   = "none";
        dom.btnExportarPDF.disabled    = true;
        ["statEntradas","statSalidas","statAbiertos"]
            .forEach(id => document.getElementById(id).textContent = "0");
        return;
    }

    dom.estadoVacio.style.display  = "none";
    dom.tablaWrapper.style.display = "block";
    dom.badgeTotal.style.display   = "inline-block";
    dom.badgeTotal.textContent     = `${lista.length} registro(s)`;
    dom.btnExportarPDF.disabled    = false;

    const sinSalida = lista.filter(r => !r.fechaSalida).length;
    dom.statEntradas.textContent  = lista.length;
    dom.statSalidas.textContent   = lista.filter(r => r.fechaSalida).length;
    dom.statAbiertos.textContent  = sinSalida;

    const ordenada = [...lista].sort((a, b) =>
        new Date(b.fechaEntrada) - new Date(a.fechaEntrada)
    );

    dom.tablaBody.innerHTML = "";

    ordenada.forEach((reg, idx) => {
        const abierto = !reg.fechaSalida;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="#">${idx + 1}</td>
            <td data-label="Fecha entrada">${formatFecha(reg.fechaEntrada)}</td>
            <td data-label="Hora entrada">${formatHora(reg.fechaEntrada)}</td>
            <td data-label="Fecha salida">${abierto ? "—" : formatFecha(reg.fechaSalida)}</td>
            <td data-label="Hora salida">${abierto ? "—" : formatHora(reg.fechaSalida)}</td>
            <td data-label="Estado">
                <span class="${abierto ? "badge-abierto" : "badge-cerrado"}">
                    ${abierto ? "Activo" : "Cerrado"}
                </span>
            </td>
            <td data-label="Acción">
                ${abierto
                    ? `<button class="btn-salida" onclick="abrirModalSalida(${reg.id})">
                           <i class="fa-solid fa-arrow-right-from-bracket"></i> Cerrar salida
                       </button>`
                    : `<span style="color:var(--gray);font-size:13px;">Completo</span>`
                }
            </td>
        `;
        dom.tablaBody.appendChild(tr);
    });
}

// ─── Consultar historial ───
async function consultarHistorial() {
    const idUsuario = dom.selectEmpleado.value;
    if (!idUsuario) {
        showNotification("Selecciona un empleado antes de consultar.", "warning");
        return;
    }
    
    mostrarLoader(true);
    try {
        const data = await apiAsistencia.listar(parseInt(idUsuario));
        state.historial = data;
        renderTabla(data);
        
        clearInterval(intervaloRefresco); 
        intervaloRefresco = setInterval(async () => {
            if (!dom.modalEntrada.classList.contains('show') && !dom.modalSalida.classList.contains('show')) {
                const newData = await apiAsistencia.listar(parseInt(idUsuario));
                state.historial = newData;
                renderTabla(newData);
            }
        }, 5000);

    } catch (e) {
        showNotification("No se pudo cargar el historial.", "error");
    } finally {
        mostrarLoader(false);
    }
}

// ─── Modal entrada ───
window.cerrarModalEntrada = () => dom.modalEntrada.classList.remove("show");

async function confirmarEntrada() {
    const idUsuario = parseInt(dom.modalSelectEmpleado.value);
    if (!idUsuario) {
        showNotification("Selecciona un empleado.", "warning");
        return;
    }
    dom.btnConfirmarEntrada.disabled = true;
    try {
        await apiAsistencia.registrarEntrada(idUsuario);
        showNotification("Entrada registrada correctamente.", "success");
        cerrarModalEntrada();
        if (dom.selectEmpleado.value === String(idUsuario)) {
            await consultarHistorial();
        }
    } catch (e) {
        showNotification(e.message || "No se pudo registrar la entrada.", "error");
    } finally {
        dom.btnConfirmarEntrada.disabled = false;
    }
}

// ─── Modal salida ───
window.abrirModalSalida = (idAsistencia) => {
    state.asistenciaIdSalida     = idAsistencia;
    dom.salidaIdTexto.textContent = `#${idAsistencia}`;
    dom.modalSalida.classList.add("show");
};

window.cerrarModalSalida = () => dom.modalSalida.classList.remove("show");

async function confirmarSalida() {
    if (!state.asistenciaIdSalida) return;
    dom.btnConfirmarSalida.disabled = true;
    try {
        await apiAsistencia.registrarSalida(state.asistenciaIdSalida);
        showNotification("Salida registrada correctamente.", "success");
        cerrarModalSalida();
        await consultarHistorial();
    } catch (e) {
        showNotification(e.message || "No se pudo registrar la salida.", "error");
    } finally {
        dom.btnConfirmarSalida.disabled = false;
    }
}

// ─── EXPORTAR PDF ASISTENCIA ───
function exportarPDFAsistencia() {
    if (!state.historial || state.historial.length === 0) {
        showNotification("Consulta el historial de un empleado antes de exportar.", "warning");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    const nombreEmpleado = dom.selectEmpleado.options[dom.selectEmpleado.selectedIndex].text;

    doc.setFontSize(20);
    doc.setTextColor(107, 30, 40); 
    doc.text('RestoSoft - Reporte de Asistencia', 40, 40);

    doc.setFontSize(12);
    doc.setTextColor(38, 47, 60);
    doc.text(`Empleado: ${nombreEmpleado}`, 40, 60);
    
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 40, 75);

    const stats = [
        { label: 'Total Entradas', value: dom.statEntradas.innerText },
        { label: 'Total Salidas', value: dom.statSalidas.innerText },
        { label: 'Sin Cerrar (Activos)', value: dom.statAbiertos.innerText }
    ];

    let xPos = 40;
    const cardWidth = 160;
    const cardHeight = 50;
    const yPos = 95;

    doc.setFontSize(10);
    stats.forEach(stat => {
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setTextColor(38, 47, 60);
        doc.setFont(undefined, 'normal');
        doc.text(stat.label, xPos + 10, yPos + 20);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        doc.text(stat.value, xPos + 10, yPos + 38);
        doc.setFontSize(10);
        xPos += cardWidth + 15;
    });

    const grupos = {};
    state.historial.forEach(reg => {
        const fecha = new Date(reg.fechaEntrada);
        const mesAnio = fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
        if (!grupos[mesAnio]) grupos[mesAnio] = [];
        grupos[mesAnio].push(reg);
    });

    let finalY = yPos + cardHeight + 30;

    for (const mesAnio in grupos) {
        const registros = grupos[mesAnio];
        
        doc.setFontSize(14);
        doc.setTextColor(107, 30, 40);
        doc.text(mesAnio.toUpperCase(), 40, finalY);
        finalY += 10;

        const bodyData = registros.map((reg, idx) => {
            const abierto = !reg.fechaSalida;
            return [
                idx + 1,
                formatFecha(reg.fechaEntrada),
                formatHora(reg.fechaEntrada),
                abierto ? "—" : formatFecha(reg.fechaSalida),
                abierto ? "—" : formatHora(reg.fechaSalida),
                abierto ? "Activo" : "Cerrado"
            ];
        });

        doc.autoTable({
            head: [['#', 'Fecha Entrada', 'Hora Entrada', 'Fecha Salida', 'Hora Salida', 'Estado']],
            body: bodyData,
            startY: finalY,
            theme: 'grid',
            headStyles: { fillColor: [107, 30, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            styles: { fontSize: 9, cellPadding: 5, textColor: [38, 47, 60] },
            margin: { left: 40, right: 40 }
        });

        finalY = doc.lastAutoTable.finalY + 25;
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
    }

    doc.save(`reporte_asistencia_${nombreEmpleado}.pdf`);
    showNotification("PDF exportado correctamente.", "success");
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
    } catch (e) {
        showNotification("No se pudo cargar la información inicial.", "error");
    } finally {
        mostrarLoader(false);
    }

    dom.btnConsultar.addEventListener("click", consultarHistorial);
    dom.btnRegistrarEntrada.addEventListener("click", () => {
        dom.modalEntrada.classList.add("show");
    });
    dom.btnConfirmarEntrada.addEventListener("click", confirmarEntrada);
    dom.btnConfirmarSalida.addEventListener("click", confirmarSalida);
    
    dom.btnExportarPDF.addEventListener("click", exportarPDFAsistencia);

    dom.modalEntrada.addEventListener("click", e => { if (e.target === dom.modalEntrada) cerrarModalEntrada(); });
    dom.modalSalida.addEventListener("click",  e => { if (e.target === dom.modalSalida)  cerrarModalSalida();  });
});