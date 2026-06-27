import { apiReserva } from "../consumo/apiReservas.js";
import { api as apiMesas } from "../consumo/apiMesas.js";

const ID_EMPRESA = 1;

const state = {
  mesas: [],
  zonas: [],
  clientes: [],
  reservasGeneralData: [],
  mesasOcupadas: [],
  currentDate: new Date(),
  selectedDateStr: null,
  modoActivo: "CREAR",
  reservaEnEdicion: null,
  clienteSeleccionado: null,
  zonaActiva: null,
  mesasSeleccionadas: [],
  cantidadPersonasCalculada: 0,
};

const dom = {
  viewCalendar: document.getElementById("viewCalendar"),
  viewDayDetail: document.getElementById("viewDayDetail"),
  mesAnioTitulo: document.getElementById("mesAnioTitulo"),
  btnPrevMonth: document.getElementById("btnPrevMonth"),
  btnNextMonth: document.getElementById("btnNextMonth"),
  calendarDaysGrid: document.getElementById("calendarDaysGrid"),
  diaSeleccionadoTitulo: document.getElementById("diaSeleccionadoTitulo"),
  listaReservasDiaContainer: document.getElementById("listaReservasDiaContainer"),
  btnVolverCalendario: document.getElementById("btnVolverCalendario"),
  btnNuevaReservaLateral: document.getElementById("btnNuevaReservaLateral"),
  panelFormulario: document.getElementById("panelFormulario"),
  panelEliminar: document.getElementById("panelEliminar"),
  vistaPrincipalForm: document.getElementById("vistaPrincipalForm"),
  zonasView: document.getElementById("zonasView"),
  mesasView: document.getElementById("mesasView"),
  tablesGrid: document.getElementById("tablesGrid"),
  layoutMesas: document.getElementById("layoutMesas"),
  zonaTitulo: document.getElementById("zonaTitulo"),
  formTitulo: document.getElementById("formTitulo"),
  formSubtitulo: document.getElementById("formSubtitulo"),
  fechaReserva: document.getElementById("fechaReserva"),
  horaReserva: document.getElementById("horaReserva"),
  estadoReserva: document.getElementById("estadoReserva"),
  contenedorEstado: document.getElementById("contenedorEstado"),
  infoComensales: document.getElementById("infoComensales"),
  selectorCliente: document.getElementById("selectorCliente"),
  clienteSeleccionado: document.getElementById("clienteSeleccionado"),
  idCliente: document.getElementById("idCliente"),
  modalClientes: document.getElementById("modalClientes"),
  cerrarModalClientes: document.getElementById("cerrarModalClientes"),
  buscarCliente: document.getElementById("buscarCliente"),
  clientesList: document.getElementById("clientesList"),
  volverBtn: document.getElementById("volverBtn"),
  btnConfirmarMesas: document.getElementById("btnConfirmarMesas"),
  btnGuardarReserva: document.getElementById("btnGuardarReserva"),
  btnCancelarEdicion: document.getElementById("btnCancelarEdicion"),
  btnConfirmarEliminar: document.getElementById("btnConfirmarEliminar"),
  btnCancelarEliminar: document.getElementById("btnCancelarEliminar"),
  infoEliminarContenedor: document.getElementById("infoEliminarContenedor"),
  contenedorBotonesForm: document.getElementById("contenedorBotonesForm"),
};

document.addEventListener("DOMContentLoaded", async () => {
  await cargarDatosEstaticos();
  await cargarReservasGeneral();
  configurarEventosGenerales();
  renderCalendar();
});

async function cargarDatosEstaticos() {
  const loader = document.getElementById("pantalla-carga");
  try {
    if (loader) loader.classList.remove("oculto");
    const [mesasData, zonasData, clientesData] = await Promise.all([
      apiMesas.obtenerMesas(ID_EMPRESA),
      apiMesas.obtenerZonas(ID_EMPRESA),
      apiReserva.listarClientes(),
    ]);
   
    state.mesas = mesasData;
    state.zonas = zonasData;
    state.clientes = clientesData;
  } catch (error) {
    console.error("Error crítico al cargar datos estáticos:", error);
    const codigo = "503";
    const mensaje = encodeURIComponent("El sistema está caído o no se pudieron cargar los datos. Por favor, consulta a los administradores.");
    window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
  } finally {
    if (loader) loader.classList.add("oculto");
  }
}

async function cargarReservasGeneral() {
  try {
    const rawData = await apiReserva.listarPorEmpresaGeneral(ID_EMPRESA);
    state.reservasGeneralData = agruparReservas(rawData);
  } catch (error) {
    console.error("Error crítico al cargar reservas generales:", error);
    const codigo = "503";
    const mensaje = encodeURIComponent("La API está caída y no se pudieron cargar las reservas. Por favor, consulta a los administradores.");
    window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
  }
}

function agruparReservas(reservaMesasRaw) {
  const mapa = new Map();
  reservaMesasRaw.forEach((rm) => {
    const idRes = rm.reserva.id;
    if (!mapa.has(idRes)) {
      mapa.set(idRes, { reserva: rm.reserva, mesas: [] });
    }
    mapa.get(idRes).mesas.push(rm.mesa);
  });
  return Array.from(mapa.values());
}

window.showNotification = (text, type = "success") => {
  const notification = document.getElementById("notification");
  const notificationText = document.getElementById("notificationText");
  const notificationIcon = document.getElementById("notificationIcon");
  const notificationTitle = document.getElementById("notificationTitle");

  if (!notification || !notificationText) {
    console.warn(text);
    return;
  }

  if (window.notificationTimeout) {
    clearTimeout(window.notificationTimeout);
  }

  notification.style.transition = "none";
  notification.classList.remove("show");
  void notification.offsetWidth;
  notification.style.transition = "";

  notificationText.textContent = text;
  notification.className = "notification";

  if (type === "success") {
    notification.classList.add("success");
    notificationIcon.className = "fa-solid fa-circle-check";
    notificationTitle.textContent = "Operación Exitosa";
  } else if (type === "warning") {
    notification.classList.add("warning");
    notificationIcon.className = "fa-solid fa-triangle-exclamation";
    notificationTitle.textContent = "Aviso";
  } else if (type === "error") {
    notification.classList.add("error");
    notificationIcon.className = "fa-solid fa-circle-xmark";
    notificationTitle.textContent = "Error";
  }

  notification.classList.add("show");

  window.notificationTimeout = setTimeout(() => {
    notification.classList.remove("show");
    
    setTimeout(() => {
      notification.style.display = "none";
      setTimeout(() => {
        notification.style.display = "";
      }, 50);
    }, 500); 
  }, 3000);
};

function limpiarErroresFormulario() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.error-message-text').forEach(el => el.remove());
}

function agregarMensajeErrorBajoInput(inputEl, mensaje) {
  if(inputEl.nextSibling && inputEl.nextSibling.classList && inputEl.nextSibling.classList.contains('error-message-text')) return;
  const errorSpan = document.createElement('span');
  errorSpan.className = 'error-message-text';
  errorSpan.textContent = mensaje;
  inputEl.parentNode.insertBefore(errorSpan, inputEl.nextSibling);
}

function manejarErroresDeValidacion(errorResponse) {
  limpiarErroresFormulario();
  if (errorResponse.validations) {
    let mensajes = [];
    const mapeoCampos = {
      "reserva.fecha": "fechaReserva",
      "reserva.hora": "horaReserva",
      "reserva.usuario": "idCliente",
      "reserva.cantidadPersonas": "infoComensales"
    };
    for (const [campoBackend, mensaje] of Object.entries(errorResponse.validations)) {
      mensajes.push(mensaje);
      const idInput = mapeoCampos[campoBackend];
      if (idInput) {
        const inputEl = document.getElementById(idInput);
        if (inputEl) {
          inputEl.classList.add("input-error");
          agregarMensajeErrorBajoInput(inputEl, mensaje);
        }
      }
    }
    showNotification(mensajes.join(" | "), "error");
  } else {
    showNotification(errorResponse.message || "Ocurrió un error inesperado en el servidor.", "error");
  }
}

function formatFechaLocal(fechaStr) {
  const partes = fechaStr.split("-");
  const f = new Date(partes[0], partes[1] - 1, partes[2]);
  const opciones = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return f.toLocaleDateString("es-ES", opciones);
}

function esFechaPasada(fechaStr) {
  if (!fechaStr) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const partes = fechaStr.split("-");
  const fechaSeleccionada = new Date(partes[0], partes[1] - 1, partes[2]);
  return fechaSeleccionada < hoy;
}

function mostrarConfirmacion(titulo = "¿Descartar cambios?", mensaje = "Tienes información sin guardar. Si continúas perderás todos los cambios realizados.", txtCancelar = "Seguir editando", txtConfirmar = "Descartar") {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "modal-confirmacion";
    modal.innerHTML = `
      <div class="modal-confirmacion-card">
         <div class="modal-confirmacion-icon">
              <i class="fa-solid fa-triangle-exclamation"></i>
          </div> 
          <h3>${titulo}</h3>
          <p>${mensaje}</p>
          <div class="modal-confirmacion-actions">
              <button class="modal-confirmacion-cancelar">${txtCancelar}</button>
              <button class="modal-confirmacion-confirmar">${txtConfirmar}</button>
          </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".modal-confirmacion-cancelar").onclick = () => {
      modal.remove();
      resolve(false);
    };
    modal.querySelector(".modal-confirmacion-confirmar").onclick = () => {
      modal.remove();
      resolve(true);
    };
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };
  });
}

function renderCalendar() {
  dom.calendarDaysGrid.innerHTML = "";
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  dom.mesAnioTitulo.textContent = `${monthNames[month]} ${year}`;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;
  for (let i = 0; i < startDayOfWeek; i++) {
    const div = document.createElement("div");
    div.className = "day empty";
    dom.calendarDaysGrid.appendChild(div);
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const reservasDelDia = state.reservasGeneralData.filter((r) => r.reserva.fecha === dateStr);
    const count = reservasDelDia.length;
    const div = document.createElement("div");
    div.className = "day";
    let badgeHtml = count > 0 ? `<div class="res-count">${count} reserva${count > 1 ? "s" : ""}</div>` : "";
    div.innerHTML = `
      <div class="day-number">${day}</div>
      ${badgeHtml}
    `;
    div.addEventListener("click", () => abrirDetalleDia(dateStr));
    dom.calendarDaysGrid.appendChild(div);
  }
}

function abrirDetalleDia(dateStr) {
  state.selectedDateStr = dateStr;
  dom.fechaReserva.value = dateStr;
  dom.diaSeleccionadoTitulo.textContent = formatFechaLocal(dateStr);
  renderListaReservasDia();
  resetearFormulario();
  dom.viewCalendar.style.display = "none";
  dom.viewDayDetail.style.display = "grid";
  if (esFechaPasada(dateStr)) {
    dom.panelFormulario.classList.remove("active");
    dom.btnNuevaReservaLateral.style.display = "none";
  } else {
    dom.btnNuevaReservaLateral.style.display = "block";
  }
}

function tieneCambiosSinGuardar() {
  if (state.modoActivo === "EDITAR") return true;
  if (state.modoActivo === "CREAR") {
    if (state.clienteSeleccionado !== null || state.mesasSeleccionadas.length > 0 || dom.horaReserva.value !== "") {
      return true;
    }
  }
  return false;
}

async function volverAlCalendario() {
  if (tieneCambiosSinGuardar()) {
    const confirmar = await mostrarConfirmacion();
    if (!confirmar) return;
  }
  state.selectedDateStr = null;
  resetearFormulario();
  renderCalendar();
  dom.viewDayDetail.style.display = "none";
  dom.viewCalendar.style.display = "block";
}

function renderListaReservasDia() {
  dom.listaReservasDiaContainer.innerHTML = "";
  const reservasDia = state.reservasGeneralData.filter((r) => r.reserva.fecha === state.selectedDateStr);
  if (reservasDia.length === 0) {
    dom.listaReservasDiaContainer.innerHTML = `<p style="color:var(--gray); text-align:center;">No hay reservas registradas para esta fecha.</p>`;
    return;
  }
  const html = reservasDia.map((agrupada) => {
    const res = agrupada.reserva;
    const mesasNum = agrupada.mesas.map((m) => m.numeroMesa).join(", ");
    
    const nombres = res.usuario?.nombres || "";
    const apellidos = res.usuario?.apellidos || "";
    const nombreCliente = `${nombres} ${apellidos}`.trim() || "Cliente Desconocido";
    const iniciales = (nombres.substring(0, 1) + (apellidos.substring(0, 1) || "")).toUpperCase() || "CL";

    let badgeClass = "booking-pending";
    switch (res.estado) {
      case "CONFIRMADA": badgeClass = "booking-confirmed"; break;
      case "ACTIVA": badgeClass = "booking-active"; break;
      case "CANCELADA": badgeClass = "booking-cancelled"; break;
      case "FINALIZADA": badgeClass = "booking-finalized"; break;
    }
    return `
      <div class="reserva-item" onclick="abrirOpcionesReserva(${res.id})">
          <div class="reserva-left">
              <div class="avatar">${iniciales}</div>
              <div class="reserva-info">
                  <h5>${nombreCliente}</h5>
                  <span>Mesas: ${mesasNum} · ${res.hora.substring(0, 5)} · ${res.cantidadPersonas} pax</span>
              </div>
          </div>
          <div class="badge-status ${badgeClass}">${res.estado}</div>
      </div>
    `;
  });
  dom.listaReservasDiaContainer.innerHTML = html.join("");
}

function renderZonas() {
  dom.tablesGrid.innerHTML = "";
  calcularComensalesActuales();
  const html = state.zonas.map((zona) => {
    const mesasZona = state.mesas.filter((m) => m.idZona === zona.id);
    const seleccionadasEnZona = mesasZona.filter((m) => state.mesasSeleccionadas.includes(m.id)).length;
    let badgeHtml = seleccionadasEnZona > 0 ? `<div style="position: absolute; top: -8px; right: -8px;" class="zona-badge">${seleccionadasEnZona}</div>` : "";
    let borderStyle = seleccionadasEnZona > 0 ? "border: 2px solid var(--primary);" : "";
    return `
      <div class="zona-card" style="${borderStyle}" onclick="abrirZona(${zona.id})">
          ${badgeHtml}
          <div class="zona-icon">🍽</div>
          <h3 style="font-size: 16px; margin:0;">${zona.nombreZona}</h3>
          <p style="margin:5px 0 0; font-size:13px; color:var(--gray);">${mesasZona.length} mesas</p>
      </div>
    `;
  });
  dom.tablesGrid.innerHTML = html.join("");
}

function calcularComensalesActuales() {
  let capacidad = 0;
  state.mesasSeleccionadas.forEach((idMesa) => {
    const mesa = state.mesas.find((m) => m.id === idMesa);
    if (mesa) capacidad += mesa.disponibilidadPersonas;
  });
  state.cantidadPersonasCalculada = capacidad;
  dom.infoComensales.textContent = `Capacidad calculada: ${capacidad} personas`;
}

window.abrirZona = function (idZona) {
  state.zonaActiva = idZona;
  const zona = state.zonas.find((z) => z.id === idZona);
  dom.zonaTitulo.textContent = zona.nombreZona;
  dom.vistaPrincipalForm.style.display = "none";
  dom.mesasView.style.display = "block";
  renderPlanoZona(idZona);
};

function actualizarDisponibilidadMesas() {
  const fecha = dom.fechaReserva.value;
  const hora = dom.horaReserva.value;
  
  if (!fecha || !hora) {
    state.mesasOcupadas = [];
    if (dom.mesasView.style.display === "block" && state.zonaActiva) renderPlanoZona(state.zonaActiva);
    renderZonas();
    return;
  }

  const [hSel, mSel] = hora.split(":").map(Number);
  const minutosSeleccionados = hSel * 60 + mSel;

  state.mesasOcupadas = [];

  state.reservasGeneralData.forEach((agrupada) => {
    const res = agrupada.reserva;
    
    if (state.reservaEnEdicion && res.id === state.reservaEnEdicion) return;
    if (res.estado === "CANCELADA" || res.estado === "FINALIZADA") return;
    if (res.fecha !== fecha) return;

    const [hRes, mRes] = res.hora.substring(0, 5).split(":").map(Number);
    const minutosReserva = hRes * 60 + mRes;

    if (Math.abs(minutosSeleccionados - minutosReserva) <= 90) {
      agrupada.mesas.forEach(mesa => {
        if (!state.mesasOcupadas.includes(mesa.id)) {
          state.mesasOcupadas.push(mesa.id);
        }
      });
    }
  });

  state.mesasSeleccionadas = state.mesasSeleccionadas.filter(idMesa => !state.mesasOcupadas.includes(idMesa));
  
  if (dom.mesasView.style.display === "block" && state.zonaActiva) {
    renderPlanoZona(state.zonaActiva);
  }
  calcularComensalesActuales();
  renderZonas();
}

function renderPlanoZona(idZona) {
  dom.layoutMesas.innerHTML = "";
  const mesasZona = state.mesas.filter((m) => m.idZona === idZona);
  const esModoSoloLectura = state.modoActivo === "VER" || esFechaPasada(state.selectedDateStr);

  mesasZona.forEach((mesa) => {
    const el = document.createElement("div");
    
    const ocupadaPorOtra = state.mesasOcupadas.includes(mesa.id);

    let estadoClase = mesa.estado.toLowerCase();
    if (ocupadaPorOtra) estadoClase = "ocupada";
    
    el.className = `mesa ${estadoClase}`;
    if (state.mesasSeleccionadas.includes(mesa.id)) {
      el.classList.add("selected");
    }
    el.style.left = (mesa.posicionX || Math.floor(Math.random() * 200) + 20) + "px";
    el.style.top = (mesa.posicionY || Math.floor(Math.random() * 200) + 20) + "px";
    el.innerHTML = `<strong>${mesa.numeroMesa}</strong><small>${mesa.disponibilidadPersonas} pax</small>`;
    
    if (!ocupadaPorOtra && !esModoSoloLectura) {
      el.addEventListener("click", () => {
        el.classList.toggle("selected");
        if (el.classList.contains("selected")) {
          state.mesasSeleccionadas.push(mesa.id);
        } else {
          state.mesasSeleccionadas = state.mesasSeleccionadas.filter((id) => id !== mesa.id);
        }
        calcularComensalesActuales();
      });
    } else {
      el.style.cursor = "not-allowed";
    }
    dom.layoutMesas.appendChild(el);
  });
}

window.abrirOpcionesReserva = async function (idReserva) {
  if (tieneCambiosSinGuardar()) {
    const confirmar = await mostrarConfirmacion("¿Abrir reserva?", "Tienes cambios sin guardar en la vista actual. ¿Deseas descartarlos para ver esta reserva?", "Cancelar", "Descartar y abrir");
    if (!confirmar) return;
  }
  const agrupada = state.reservasGeneralData.find((r) => r.reserva.id === idReserva);
  if (!agrupada) return;
  
  const esPasada = esFechaPasada(agrupada.reserva.fecha);
  const estaFinalizada = agrupada.reserva.estado === "FINALIZADA";
  const esSoloLectura = esPasada || estaFinalizada;
  
  state.modoActivo = esSoloLectura ? "VER" : "EDITAR";
  state.reservaEnEdicion = idReserva;
  state.mesasSeleccionadas = agrupada.mesas.map((m) => m.id);

  const nombres = agrupada.reserva.usuario?.nombres || "";
  const apellidos = agrupada.reserva.usuario?.apellidos || "";
  const nombreCompleto = `${nombres} ${apellidos}`.trim();

  state.clienteSeleccionado = {
    id: agrupada.reserva.usuario.id,
    nombre: nombreCompleto,
  };

  dom.idCliente.value = agrupada.reserva.usuario.id;
  dom.clienteSeleccionado.textContent = nombreCompleto;
  dom.clienteSeleccionado.style.color = "var(--dark)";
  dom.fechaReserva.value = agrupada.reserva.fecha;
  dom.horaReserva.value = agrupada.reserva.hora.substring(0, 5);
  dom.estadoReserva.value = agrupada.reserva.estado;
  dom.contenedorEstado.style.display = "block";
  dom.horaReserva.disabled = esSoloLectura;
  dom.estadoReserva.disabled = esSoloLectura;
  dom.selectorCliente.style.pointerEvents = esSoloLectura ? "none" : "auto";

  if (esSoloLectura) {
    dom.formTitulo.textContent = `Reserva #${idReserva} (Solo Lectura)`;
    dom.formSubtitulo.textContent = estaFinalizada ? "Esta reserva ya se encuentra finalizada." : "Esta reserva pertenece a una fecha pasada.";
    dom.btnCancelarEdicion.style.display = "none";
    dom.contenedorBotonesForm.innerHTML = `
        <button type="button" class="btn-primary" style="background-color: var(--gray); width:100%;" onclick="volverAlCalendario()">
            Cerrar Detalles
        </button>
    `;
  } else {
    dom.formTitulo.textContent = `Editar Reserva #${idReserva}`;
    dom.formSubtitulo.textContent = "Modifica mesas o estado";
    dom.btnCancelarEdicion.style.display = "block";
    dom.infoEliminarContenedor.innerHTML = `
        <div class="info-row"><span>Cliente</span><strong>${nombreCompleto}</strong></div>
        <div class="info-row"><span>Fecha / Hora</span><strong>${agrupada.reserva.fecha} a las ${agrupada.reserva.hora.substring(0, 5)}</strong></div>
        <div class="info-row"><span>Mesas</span><strong>${agrupada.mesas.map((m) => m.numeroMesa).join(", ")}</strong></div>
    `;
    dom.contenedorBotonesForm.innerHTML = `
        <div style="display:flex; gap:10px; width: 100%;">
            <button id="btnActualizarReserva" class="btn-primary" style="flex:2;">Guardar Cambios</button>
            <button id="btnAbrirEliminar" class="btn-danger" style="flex:1;"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;
    document.getElementById("btnActualizarReserva").addEventListener("click", procesarGuardado);
    document.getElementById("btnAbrirEliminar").addEventListener("click", () => {
      dom.panelFormulario.classList.remove("active");
      dom.panelEliminar.classList.add("active");
    });
  }
  actualizarDisponibilidadMesas();
  mostrarPanelPrincipalForm();
};

function resetearFormulario() {
  state.modoActivo = "CREAR";
  state.reservaEnEdicion = null;
  state.mesasSeleccionadas = [];
  state.clienteSeleccionado = null;
  state.cantidadPersonasCalculada = 0;
  state.mesasOcupadas = [];
  limpiarErroresFormulario();
  dom.idCliente.value = "";
  dom.clienteSeleccionado.textContent = "Seleccionar cliente";
  dom.clienteSeleccionado.style.color = "var(--gray)";
  dom.fechaReserva.value = state.selectedDateStr;
  dom.horaReserva.value = "";
  dom.contenedorEstado.style.display = "none";
  dom.btnCancelarEdicion.style.display = "none";
  dom.horaReserva.disabled = false;
  dom.estadoReserva.disabled = false;
  dom.selectorCliente.style.pointerEvents = "auto";
  if (esFechaPasada(state.selectedDateStr)) {
    dom.formTitulo.textContent = "Consulta de Fecha Pasada";
    dom.formSubtitulo.textContent = "No se pueden crear reservas en días anteriores.";
    dom.contenedorBotonesForm.innerHTML = `<p style="color:var(--gray); text-align:center; font-style:italic;">Modo lectura</p>`;
  } else {
    dom.formTitulo.textContent = "Nueva Reserva";
    dom.formSubtitulo.textContent = "Completar datos de la reserva";
    dom.contenedorBotonesForm.innerHTML = `<button id="btnGuardarReserva" class="btn-primary">Crear Reserva</button>`;
    document.getElementById("btnGuardarReserva").addEventListener("click", procesarGuardado);
  }
  actualizarDisponibilidadMesas();
  mostrarPanelPrincipalForm();
}

function mostrarPanelPrincipalForm() {
  dom.panelEliminar.classList.remove("active");
  dom.panelFormulario.classList.add("active");
  dom.mesasView.style.display = "none";
  dom.vistaPrincipalForm.style.display = "block";
}

async function procesarGuardado() {
  limpiarErroresFormulario();

  if (state.modoActivo === "CREAR") {
    if (!state.clienteSeleccionado || !state.clienteSeleccionado.id) {
      showNotification("Debes seleccionar un cliente para la reserva.", "warning");
      dom.selectorCliente.focus();
      return;
    }

    if (!dom.fechaReserva.value || dom.fechaReserva.value.trim() === "") {
      showNotification("Debes seleccionar la fecha de la reserva.", "warning");
      dom.fechaReserva.focus();
      return;
    }

    if (!dom.horaReserva.value || dom.horaReserva.value.trim() === "") {
      showNotification("Debes seleccionar la hora de la reserva.", "warning");
      dom.horaReserva.focus();
      return;
    }

    if (!state.mesasSeleccionadas || state.mesasSeleccionadas.length === 0) {
      showNotification("Debes seleccionar al menos una mesa para la reserva.", "warning");
      return;
    }

    if (state.cantidadPersonasCalculada <= 0) {
      showNotification("La capacidad de comensales debe ser mayor a 0. Selecciona mesas válidas.", "warning");
      return;
    }
  }

  const requestData = {
    fecha: dom.fechaReserva.value,
    hora: dom.horaReserva.value + (dom.horaReserva.value.split(":").length === 2 ? ":00" : ""),
    idusuario: parseInt(state.clienteSeleccionado.id),
    cantidadPersonas: state.cantidadPersonasCalculada,
    idempresa: ID_EMPRESA,
    estado: state.modoActivo === "EDITAR" ? dom.estadoReserva.value : "PENDIENTE",
  };
  try {
    if (state.modoActivo === "CREAR") {
      await apiReserva.guardarReserva(requestData, state.mesasSeleccionadas);
      showNotification("Reserva creada exitosamente.", "success");
    } else {
      await apiReserva.actualizarReserva(state.reservaEnEdicion, requestData, state.mesasSeleccionadas);
      showNotification("Reserva actualizada correctamente.", "success");
    }
    await cargarReservasGeneral();
    renderListaReservasDia();
    resetearFormulario();
  } catch (e) {
    if (e.validations) {
      manejarErroresDeValidacion(e);
    } else if (e.message) {
      showNotification(e.message, "error");
    } else {
      showNotification("Error al procesar la reserva, verifica la conexión.", "error");
    }
  }
}

async function procesarEliminado() {
  if (!state.reservaEnEdicion) return;
  try {
    await apiReserva.eliminarReserva(state.reservaEnEdicion);
    showNotification("Reserva eliminada.", "success");
    await cargarReservasGeneral();
    renderListaReservasDia();
    resetearFormulario();
  } catch (e) {
    showNotification("No se pudo eliminar la reserva.", "error");
  }
}

function configurarEventosGenerales() {
  dom.btnPrevMonth.addEventListener("click", () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    renderCalendar();
  });
  dom.btnNextMonth.addEventListener("click", () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    renderCalendar();
  });
  dom.btnVolverCalendario.addEventListener("click", volverAlCalendario);
  dom.btnNuevaReservaLateral.addEventListener("click", async () => {
    if (tieneCambiosSinGuardar()) {
      const confirmar = await mostrarConfirmacion("¿Crear nueva reserva?", "Estás a punto de crear una nueva reserva, ¿deseas descartar la información actual?", "Cancelar", "Descartar y crear");
      if (!confirmar) return;
    }
    resetearFormulario();
  });
  dom.volverBtn.addEventListener("click", () => {
    dom.mesasView.style.display = "none";
    dom.vistaPrincipalForm.style.display = "block";
    renderZonas();
  });
  dom.btnConfirmarMesas.addEventListener("click", () => {
    dom.mesasView.style.display = "none";
    dom.vistaPrincipalForm.style.display = "block";
    renderZonas();
  });
  dom.btnCancelarEdicion.addEventListener("click", async () => {
    const confirmar = await mostrarConfirmacion("¿Cancelar edición?", "¿Estás seguro de que deseas descartar los cambios actuales?", "Volver", "Descartar");
    if (confirmar) {
      resetearFormulario();
    }
  });
  dom.btnCancelarEliminar.addEventListener("click", mostrarPanelPrincipalForm);
  dom.btnConfirmarEliminar.addEventListener("click", procesarEliminado);
  dom.selectorCliente.addEventListener("click", () => {
    dom.modalClientes.classList.add("show");
    renderClientesModal(state.clientes);
  });
  dom.cerrarModalClientes.addEventListener("click", () => {
    dom.modalClientes.classList.remove("show");
  });
  dom.buscarCliente.addEventListener("input", () => {
    const texto = dom.buscarCliente.value.toLowerCase();
    const filtrados = state.clientes.filter((c) => {
      const nombre = (`${c.usuario.nombres} ${c.usuario.apellidos}`).toLowerCase();
      return nombre.includes(texto);
    });
    renderClientesModal(filtrados);
  });
  dom.fechaReserva.addEventListener("change", actualizarDisponibilidadMesas);
  dom.horaReserva.addEventListener("change", actualizarDisponibilidadMesas);
}

function renderClientesModal(lista) {
  dom.clientesList.innerHTML = "";
  if (lista.length === 0) {
    dom.clientesList.innerHTML = `<div class="cliente-item">No se encontraron clientes</div>`;
    return;
  }
  dom.clientesList.innerHTML = lista
    .map((cliente) => {
      const nombre = `${cliente.usuario.nombres} ${cliente.usuario.apellidos}`;
      return `<div class="cliente-item" data-id="${cliente.usuario.id}" data-nombre="${nombre}">${nombre}</div>`;
    })
    .join("");
  document.querySelectorAll(".cliente-item").forEach((item) => {
    item.addEventListener("click", () => {
      state.clienteSeleccionado = {
        id: item.dataset.id,
        nombre: item.dataset.nombre,
      };
      dom.idCliente.value = item.dataset.id;
      dom.clienteSeleccionado.textContent = item.dataset.nombre;
      dom.clienteSeleccionado.style.color = "var(--dark)";
      dom.modalClientes.classList.remove("show");
    });
  });
}