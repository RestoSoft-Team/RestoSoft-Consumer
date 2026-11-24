import { apiReporteEmpleados } from "../consumo/apiReporteEmpleado.js";
import { obtenerPerfilSesion } from "../consumo/sesionContext.js";
// --- AGREGADO: Importación para generar sidebar dinámico ---
import { generarSidebar } from './create-sidebar.js';

let perfilSesion = null;

const state = {
    datos: [],          
    chartInstance: null 
};

const dom = {
    fechaInicio:        document.getElementById("fechaInicio"),
    fechaFin:           document.getElementById("fechaFin"),
    btnGenerar:         document.getElementById("btnGenerar"),
    btnExportarCSV:     document.getElementById("btnExportarCSV"),
    btnExportarPDF:     document.getElementById("btnExportarPDF"), 

    statEmpleados:      document.getElementById("statEmpleados"),
    statEntradas:       document.getElementById("statEntradas"),
    statSalidas:        document.getElementById("statSalidas"),
    statSinSalida:      document.getElementById("statSinSalida"),

    tablaBody:          document.getElementById("tablaBody"),
    tablaWrapper:       document.getElementById("tablaWrapper"),
    estadoVacio:        document.getElementById("estadoVacio"),
    estadoSinResultados:document.getElementById("estadoSinResultados"),
    badgeTotal:         document.getElementById("badgeTotal"),

    chartCanvas:        document.getElementById("chartAsistencia"),
    chartEmpty:         document.getElementById("chartEmpty"),

    loader:             document.getElementById("pantallaCarga"),
    notification:       document.getElementById("notification"),
    notificationTitle:  document.getElementById("notificationTitle"),
    notificationText:   document.getElementById("notificationText"),
    notificationIcon:   document.getElementById("notificationIcon")
};

function showNotification(text, type = "success") {
    const tipos = {
        success: { clase: "success", icon: "fa-circle-check",        titulo: "Listo" },
        warning: { clase: "warning", icon: "fa-triangle-exclamation", titulo: "Aviso" },
        error:   { clase: "error",   icon: "fa-circle-xmark",         titulo: "Error" }
    };

    const cfg = tipos[type] || tipos.success;

    dom.notification.className         = `notification ${cfg.clase} show`;
    dom.notificationIcon.className     = `fa-solid ${cfg.icon}`;
    dom.notificationTitle.textContent  = cfg.titulo;
    dom.notificationText.textContent   = text;

    setTimeout(() => dom.notification.classList.remove("show"), 5000);
}

function mostrarLoader(v) {
    if (dom.loader) dom.loader.style.display = v ? "flex" : "none";
}

// --- MODIFICADO: Se añadió validación de rol y generación de sidebar ---
function cargarPerfilUsuario(perfilData) {
  // 1. Validar rol permitido
  const rolesPermitidos = ["ADMINISTRADOR"];
  if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
      console.error("Acceso no autorizado");
      const codigo = "403";
      const mensaje = encodeURIComponent(
          "No tienes permisos para ver los Reportes de Empleados. Si crees que se trata de un error, comunícate con un administrador."
      );
      window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
      return;
  }

  // 2. Generar sidebar dinámico
  generarSidebar('sidebar-container', "empleados", "reporte_empleado", perfilData.rol.nombre);

  // 3. Inyectar info en el topbar
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
      ${avatarHTML}
      <div>
        <h6>${nombreCompleto}</h6>
        <span>${rol}</span>
      </div>
    `;
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

document.addEventListener("DOMContentLoaded", async () => {

    mostrarLoader(true);

    const hoy    = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    dom.fechaInicio.value = formatearFecha(inicio);
    dom.fechaFin.value    = formatearFecha(hoy);

    dom.btnExportarCSV.disabled = true;
    dom.btnExportarPDF.disabled = true; 

    try {
        // Perfil con validación de sesión (único origen: sesionContext).
        // La empresa del reporte la resuelve el back con el token (JWT).
        const perfilData = await obtenerPerfilSesion();
        if (!perfilData) return;

        perfilSesion = perfilData;

        // Se carga el perfil y se valida el acceso
        cargarPerfilUsuario(perfilData);

    } catch (error) {
        console.error("Error al obtener el perfil del usuario:", error);
        showNotification(
            "No se pudo cargar la información de tu empresa. Vuelve a iniciar sesión.",
            "error"
        );
        dom.btnGenerar.disabled = true;
    } finally {
        mostrarLoader(false);
    }

    configurarEventos();
});

function formatearFecha(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

async function generarReporte() {
    if (!perfilSesion) {
        showNotification("No se pudo validar tu sesión. Recarga la página.", "error");
        return;
    }

    const inicio = dom.fechaInicio.value;
    const fin    = dom.fechaFin.value;

    if (!inicio || !fin) {
        showNotification("Selecciona una fecha de inicio y una fecha fin.", "warning");
        return;
    }

    if (inicio > fin) {
        showNotification("La fecha de inicio no puede ser posterior a la fecha fin.", "warning");
        return;
    }

    dom.btnGenerar.disabled  = true;
    dom.btnGenerar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cargando...`;
    mostrarLoader(true);

    try {
        const datos = await apiReporteEmpleados.obtenerAsistencia(inicio, fin);
        state.datos = datos;

        if (!datos || datos.length === 0) {
            mostrarEstadoSinResultados();
            showNotification("No hay registros en ese rango de fechas.", "warning");
        } else {
            actualizarStats(datos);
            renderTabla(datos);
            renderGrafica(datos);
            dom.btnExportarCSV.disabled = false;
            dom.btnExportarPDF.disabled = false; 
            showNotification(`Reporte generado: ${datos.length} empleado(s) encontrado(s).`, "success");
        }
    } catch (error) {
        showNotification(
            error.message || "No se pudo conectar con el servidor. Verifica que el backend esté activo.",
            "error"
        );
    } finally {
        dom.btnGenerar.disabled  = false;
        dom.btnGenerar.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Generar reporte`;
        mostrarLoader(false);
    }
}

function mostrarEstadoSinResultados() {
    dom.estadoVacio.style.display        = "none";
    dom.estadoSinResultados.style.display = "block";
    dom.tablaWrapper.style.display        = "none";
    dom.badgeTotal.style.display          = "none";
    dom.chartCanvas.style.display         = "none";
    dom.chartEmpty.style.display          = "block";

    ["statEmpleados","statEntradas","statSalidas","statSinSalida"]
        .forEach(id => document.getElementById(id).textContent = "0");
}

function actualizarStats(datos) {
    const totalEntradas  = datos.reduce((s, d) => s + Number(d.totalEntradas  || 0), 0);
    const totalSalidas   = datos.reduce((s, d) => s + Number(d.totalSalidas   || 0), 0);
    const totalSinSalida = datos.reduce((s, d) => s + Number(d.asistenciasSinSalida || 0), 0);

    dom.statEmpleados.textContent = datos.length;
    dom.statEntradas.textContent  = totalEntradas;
    dom.statSalidas.textContent   = totalSalidas;
    dom.statSinSalida.textContent = totalSinSalida;
}

function renderTabla(datos) {
    dom.estadoVacio.style.display         = "none";
    dom.estadoSinResultados.style.display = "none";
    dom.tablaWrapper.style.display        = "block";
    dom.badgeTotal.style.display          = "inline-block";
    dom.badgeTotal.textContent            = `${datos.length} empleado(s)`;

    dom.tablaBody.innerHTML = "";

    datos.forEach(item => {
        const nombre   = item.nombreCompleto || `Empleado #${item.idUsuario}`;
        const entradas = Number(item.totalEntradas        || 0);
        const salidas  = Number(item.totalSalidas         || 0);
        const sinSal   = Number(item.asistenciasSinSalida || 0);

        const pct = entradas > 0 ? Math.round((salidas / entradas) * 100) : 0;

        let badgeClass, badgeTexto;
        if (pct >= 90)      { badgeClass = "badge-bueno";   badgeTexto = `${pct}% Bueno`; }
        else if (pct >= 60) { badgeClass = "badge-regular"; badgeTexto = `${pct}% Regular`; }
        else                { badgeClass = "badge-bajo";    badgeTexto = `${pct}% Bajo`; }

        const iniciales = nombre.split(" ").slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Empleado">
                <div class="empleado-cell">
                    <div class="avatar-iniciales">${iniciales}</div>
                    <div>
                        <strong>${nombre}</strong>
                        <span>ID: ${item.idUsuario}</span>
                    </div>
                </div>
            </td>
            <td data-label="Total entradas">${entradas}</td>
            <td data-label="Total salidas">${salidas}</td>
            <td data-label="Sin salida">
                ${sinSal > 0
                    ? `<span style="color:var(--danger);font-weight:700;">${sinSal}</span>`
                    : `<span style="color:var(--success);font-weight:700;">0</span>`
                }
            </td>
            <td data-label="Cumplimiento">
                <span class="badge-cumplimiento ${badgeClass}">${badgeTexto}</span>
            </td>
        `;

        dom.tablaBody.appendChild(tr);
    });
}

function renderGrafica(datos) {
    dom.chartEmpty.style.display  = "none";
    dom.chartCanvas.style.display = "block";

    if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
    }

    const labels   = datos.map(d => d.nombreCompleto || `#${d.idUsuario}`);
    const entradas = datos.map(d => Number(d.totalEntradas        || 0));
    const salidas  = datos.map(d => Number(d.totalSalidas         || 0));
    const sinSal   = datos.map(d => Number(d.asistenciasSinSalida || 0));

    state.chartInstance = new Chart(dom.chartCanvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Entradas", data: entradas, backgroundColor: "rgba(61, 139, 92, 0.75)", borderRadius: 8, borderSkipped: false },
                { label: "Salidas", data: salidas, backgroundColor: "rgba(107, 30, 40, 0.75)", borderRadius: 8, borderSkipped: false },
                { label: "Sin salida", data: sinSal, backgroundColor: "rgba(217, 164, 65, 0.75)", borderRadius: 8, borderSkipped: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: "top", labels: { font: { family: "Inter", size: 13 }, borderRadius: 6, usePointStyle: true } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 12 } } },
                y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { family: "Inter", size: 12 }, stepSize: 1, precision: 0 } }
            }
        }
    });
}

function exportarCSV() {
    if (!state.datos || state.datos.length === 0) return;

    const encabezados = ["ID Empleado", "Nombre Completo", "Total Entradas", "Total Salidas", "Sin Salida", "Cumplimiento (%)"];

    const filas = state.datos.map(item => {
        const entradas = Number(item.totalEntradas || 0);
        const salidas  = Number(item.totalSalidas  || 0);
        const pct      = entradas > 0 ? Math.round((salidas / entradas) * 100) : 0;
        return [item.idUsuario, `"${item.nombreCompleto || ""}"`, entradas, salidas, Number(item.asistenciasSinSalida || 0), pct].join(",");
    });

    const csv = [encabezados.join(","), ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);

    const link    = document.createElement("a");
    link.href     = url;
    link.download = `reporte-empleados_${dom.fechaInicio.value}_${dom.fechaFin.value}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    showNotification("CSV exportado correctamente.", "success");
}

function exportarPDF() {
    if (!state.datos || state.datos.length === 0) {
        showNotification("Genera un reporte antes de exportar a PDF.", "warning");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    doc.setFontSize(20);
    doc.setTextColor(107, 30, 40); 
    doc.text('RestoSoft - Reporte de Empleados', 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(38, 47, 60);
    doc.text(`Rango de fechas: ${dom.fechaInicio.value} al ${dom.fechaFin.value}`, 40, 60);

    const stats = [
        { label: 'Empleados', value: dom.statEmpleados.innerText },
        { label: 'Entradas', value: dom.statEntradas.innerText },
        { label: 'Salidas', value: dom.statSalidas.innerText },
        { label: 'Sin Salida', value: dom.statSinSalida.innerText }
    ];

    let xPos = 40;
    const cardWidth = 125;
    const cardHeight = 50;
    const yPos = 80;

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
        xPos += cardWidth + 10;
    });

    if (dom.chartCanvas && dom.chartCanvas.style.display !== 'none') {
        const chartImage = dom.chartCanvas.toDataURL('image/png', 1.0);
        doc.addImage(chartImage, 'PNG', 40, 150, 515, 200);
    }

    doc.autoTable({
        html: '#tablaWrapper table',
        startY: 380,
        theme: 'grid',
        headStyles: { fillColor: [107, 30, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 5, textColor: [38, 47, 60] },
        columnStyles: { 0: { cellWidth: 200 } }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 40, doc.internal.pageSize.height - 20);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
    }

    doc.save(`reporte-empleados_${dom.fechaInicio.value}_${dom.fechaFin.value}.pdf`);
    showNotification("PDF exportado correctamente.", "success");
}

function configurarEventos() {
    dom.btnGenerar.addEventListener("click", generarReporte);
    dom.btnExportarCSV.addEventListener("click", exportarCSV);
    dom.btnExportarPDF.addEventListener("click", exportarPDF); 

    [dom.fechaInicio, dom.fechaFin].forEach(input => {
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") generarReporte();
        });
    });
}
