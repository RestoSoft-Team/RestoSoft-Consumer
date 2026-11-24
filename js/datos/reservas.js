import { apiReserva } from "../consumo/apiReservas.js";
import { api as apiMesas } from "../consumo/apiMesas.js";
import { obtenerPerfilSesion } from "../consumo/sesionContext.js";
import { generarSidebar } from './create-sidebar.js';

const state = {
  mesas: [],
  zonas: [],
  clientes: [],
  reservasAgrupadas: [],
  mesasOcupadas: [],

  modoActivo: "CREAR",
  reservaEnEdicion: null,
  clienteSeleccionado: null,
  zonaActiva: null,
  mesasSeleccionadas: [],
  cantidadPersonasCalculada: 0,
};

const dom = {
  listaReservasContainer: document.getElementById("listaReservasContainer"),
  infoPerfilContainer: document.getElementById("infoPerfilContainer"),
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
};

// =========================================
// UTILIDADES UI / ALERTAS / VALIDACIONES
// =========================================
// Sistema de Notificaciones Moderno
window.showNotification = (text, type = "success") => {
  const contenedor = document.getElementById("notificationContainer");
  if (!contenedor) {
    console.warn("Contenedor de notificaciones no encontrado:", text);
    return;
  }

  // Mapear iconos y títulos según el tipo de alerta
  const config = {
    success: { icon: "fa-circle-check", title: "Operación Exitosa" },
    warning: { icon: "fa-triangle-exclamation", title: "Aviso" },
    error: { icon: "fa-circle-xmark", title: "Error" },
  };

  const { icon, title } = config[type] || config.success;

  // Crear el elemento de la notificación
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.innerHTML = `
    <div class="notification-icon">
      <i class="fa-solid ${icon}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${text}</div>
    </div>
    <button class="notification-close">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  // Agregar al DOM
  contenedor.appendChild(notif);

  // Forzar reflow para que la animación de entrada funcione
  void notif.offsetWidth;

  // Mostrar con animación
  setTimeout(() => notif.classList.add("show"), 10);

  // Función para cerrar y eliminar
  const cerrarNotif = () => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 400);
  };

  // Cerrar al hacer clic en la X
  notif
    .querySelector(".notification-close")
    .addEventListener("click", cerrarNotif);

  // Auto-cerrar a los 4 segundos
  setTimeout(cerrarNotif, 4000);
};

function limpiarErroresFormulario() {
  document
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));
  document.querySelectorAll(".error-message-text").forEach((el) => el.remove());
}

function agregarMensajeErrorBajoInput(inputEl, mensaje) {
  if (
    inputEl.nextSibling &&
    inputEl.nextSibling.classList &&
    inputEl.nextSibling.classList.contains("error-message-text")
  )
    return;
  const errorSpan = document.createElement("span");
  errorSpan.className = "error-message-text";
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
      "reserva.idusuario": "idCliente",
      "reserva.cantidadPersonas": "infoComensales",
    };
    for (const [campoBackend, mensaje] of Object.entries(
      errorResponse.validations,
    )) {
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
    showNotification(
      errorResponse.message || "Ocurrió un error inesperado en el servidor.",
      "error",
    );
  }
}

function esFechaPasada(fechaStr) {
  if (!fechaStr) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const partes = fechaStr.split("-");
  const fechaSeleccionada = new Date(partes[0], partes[1] - 1, partes[2]);
  return fechaSeleccionada < hoy;
}

function tieneCambiosSinGuardar() {
  if (state.modoActivo === "EDITAR") return true;
  if (state.modoActivo === "CREAR") {
    if (
      state.clienteSeleccionado !== null ||
      state.mesasSeleccionadas.length > 0 ||
      dom.horaReserva.value !== ""
    ) {
      return true;
    }
  }
  return false;
}

function mostrarConfirmacion(
  titulo = "¿Descartar cambios?",
  mensaje = "Tienes información sin guardar. Si continúas perderás todos los cambios realizados.",
  txtCancelar = "Seguir editando",
  txtConfirmar = "Descartar",
) {
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

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener("DOMContentLoaded", async () => {
  await cargarDatosIniciales();
  configurarEventosGenerales();
});

async function cargarDatosIniciales() {
  try {
    // Perfil con validación de sesión (único origen: sesionContext).
    const perfilData = await obtenerPerfilSesion();
    if (!perfilData) return;

    const [mesasData, zonasData, clientesData, reservasDiariasRaw] =
      await Promise.all([
        apiMesas.obtenerMesas(),
        apiMesas.obtenerZonas(),
        apiReserva.listarClientes(),
        apiReserva.listarPorEmpresaDiario(),
      ]);

    state.mesas = mesasData;
    state.zonas = zonasData;
    state.clientes = clientesData;

    agruparReservas(reservasDiariasRaw);
    renderListaReservas();
    renderZonas();
    cargarPerfilUsuario(perfilData);

    dom.fechaReserva.value = new Date().toISOString().split("T")[0];
  } catch (error) {
    console.error("Error crítico al cargar la aplicación:", error);
    const codigo = "503";
    const mensaje = encodeURIComponent(
      "El sistema está caído o no se pudieron cargar los datos. Por favor, consulta a los administradores.",
    );
    window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
  } finally {
  }
}

// =========================================
// LÓGICA DE AGRUPACIÓN (JAVA DTOs)
// =========================================
function agruparReservas(reservaMesasRaw) {
  const mapa = new Map();
  reservaMesasRaw.forEach((rm) => {
    const idRes = rm.reserva.id;
    if (!mapa.has(idRes)) {
      mapa.set(idRes, { reserva: rm.reserva, mesas: [] });
    }
    mapa.get(idRes).mesas.push(rm.mesa);
  });
  state.reservasAgrupadas = Array.from(mapa.values());
}

// =========================================
// RENDERIZADOS
// =========================================
function cargarPerfilUsuario(perfilData) {

  const rolesPermitidos = ["RECEPCIONISTA", "ADMINISTRADOR"];

if (!rolesPermitidos.includes(perfilData?.rol?.nombre)) {
    console.error("Acceso no autorizado");

    const codigo = "403";
    const mensaje = encodeURIComponent(
        "No tienes permisos para acceder a esta página. Si crees que se trata de un error, comunícate con un administrador."
    );

    window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
}

  generarSidebar('sidebar-container', "reservas", "reservas", perfilData.rol.nombre);

  const infoPerfilContainer = document.getElementById("infoPerfilContainer");
  const nombreEmpresaContainer = document.getElementById("nombreEmpresa");

  const empresaData = perfilData?.empresa || perfilData?.data?.empresa;
  const nombreRaw = empresaData?.nombre || "";

  if (nombreRaw.trim() !== "") {
    nombreEmpresaContainer.innerHTML = `<h6>${nombreRaw.toUpperCase()}</h6>`;
  } else {
    nombreEmpresaContainer.innerHTML = `<h6>RESTOSOFT</h6>`;
  }

  const urlPerfil = "perfil.html";

  if (perfilData) {
    const iniciales =
      (
        (perfilData.usuario.nombres || "").substring(0, 1) +
        (perfilData.usuario.apellidos || "").substring(0, 1)
      ).toUpperCase() || "EP";

    const avatarHTML = perfilData.usuario.imagenUrl
      ? `<img src="${perfilData.usuario.imagenUrl}" alt="Perfil" />`
      : `<div class="profile-text-avatar">${iniciales}</div>`;

    const nombreCompleto =
      `${perfilData.usuario.nombres || ""} ${perfilData.usuario.apellidos || ""}`.trim() ||
      "Usuario sin nombre";

    const rol = perfilData.rol.nombre || "Sin rol asignado";

    infoPerfilContainer.innerHTML = `
    <a href="${urlPerfil}" class="profile-link">
      ${avatarHTML}
      <div class="profile-info">
        <strong>${nombreCompleto}</strong>
        <div style="font-size: 13px; color: var(--gray)">
          ${rol}
        </div>
      </div>
    </a>
  `;
  } else {
    // Estado de Fallback si no hay datos
    infoPerfilContainer.innerHTML = `
    <a href="${urlPerfil}" class="profile-link">
      <div class="profile-text-avatar">UA</div>
      <div class="profile-info">
        <strong>Usuario Anónimo</strong>
        <div style="font-size: 13px; color: var(--gray)">Invitado</div>
      </div>
    </a>
  `;
  }
}

function renderListaReservas() {
  dom.listaReservasContainer.innerHTML = "";
  if (state.reservasAgrupadas.length === 0) {
    dom.listaReservasContainer.innerHTML = `<p style="color:var(--gray); text-align:center;">No hay reservas para hoy.</p>`;
    return;
  }

  const html = state.reservasAgrupadas.map((agrupada) => {
    const res = agrupada.reserva;
    const mesasNum = agrupada.mesas.map((m) => m.numeroMesa).join(", ");

    const nombres = res.usuario?.nombres || "";
    const apellidos = res.usuario?.apellidos || "";
    const nombreCliente =
      `${nombres} ${apellidos}`.trim() || "Cliente Desconocido";
    const iniciales =
      (
        nombres.substring(0, 1) + (apellidos.substring(0, 1) || "")
      ).toUpperCase() || "CL";
    const imagenAvatar = res.usuario?.imagenUrl || null;

    let badgeClass = "booking-pending";
    switch (res.estado) {
      case "CONFIRMADA":
        badgeClass = "booking-confirmed";
        break;
      case "ACTIVA":
        badgeClass = "booking-active";
        break;
      case "CANCELADA":
        badgeClass = "booking-cancelled";
        break;
      case "FINALIZADA":
        badgeClass = "booking-finalized";
        break;
    }

    return `
      <div class="reserva reserva-item" onclick="abrirOpcionesReserva(${res.id})">
        <div class="reserva-left">
          ${imagenAvatar ? `<img src="${imagenAvatar}" alt="Avatar" class="avatar">` : `<div class="avatar">${iniciales}</div>`}
          <div class="reserva-info">
            <h5>${nombreCliente}</h5>
            <span>Mesas: ${mesasNum} · ${res.hora.substring(0, 5)} · ${res.cantidadPersonas} personas</span>
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <div class="badge-status ${badgeClass}">${res.estado}</div>
            <i class="fa-solid fa-ellipsis-vertical" style="color:var(--gray);"></i>
        </div>
      </div>
    `;
  });
  dom.listaReservasContainer.innerHTML = html.join("");
}

function renderZonas() {
  dom.tablesGrid.innerHTML = "";
  calcularComensalesActuales();

  const html = state.zonas.map((zona) => {
    const mesasZona = state.mesas.filter((m) => m.idZona === zona.id);
    const seleccionadasEnZona = mesasZona.filter((m) =>
      state.mesasSeleccionadas.includes(m.id),
    ).length;

    let badgeHtml =
      seleccionadasEnZona > 0
        ? `<div style="position: absolute; top: 12px; right: 12px;" class="zona-badge">${seleccionadasEnZona}</div>`
        : "";
    let borderStyle =
      seleccionadasEnZona > 0 ? "border: 2px solid var(--primary);" : "";

    return `
      <div class="zona-card" style="${borderStyle}" onclick="abrirZona(${zona.id})">
        ${badgeHtml}
        <div class="zona-icon">🍽</div>
        <h3>${zona.nombreZona}</h3>
        <p>${mesasZona.length} mesas</p>
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

// =========================================
// LÓGICA DE MESAS Y ZONAS
// =========================================
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
    if (state.zonaActiva) renderPlanoZona(state.zonaActiva);
    return;
  }

  const [hSel, mSel] = hora.split(":").map(Number);
  const minutosSeleccionados = hSel * 60 + mSel;
  state.mesasOcupadas = [];

  state.reservasAgrupadas.forEach((agrupada) => {
    const res = agrupada.reserva;
    if (state.reservaEnEdicion && res.id === state.reservaEnEdicion) return;
    if (res.estado === "CANCELADA" || res.estado === "FINALIZADA") return;
    if (res.fecha !== fecha) return;

    const [hRes, mRes] = res.hora.substring(0, 5).split(":").map(Number);
    const minutosReserva = hRes * 60 + mRes;

    if (Math.abs(minutosSeleccionados - minutosReserva) <= 90) {
      agrupada.mesas.forEach((mesa) => {
        if (!state.mesasOcupadas.includes(mesa.id)) {
          state.mesasOcupadas.push(mesa.id);
        }
      });
    }
  });

  state.mesasSeleccionadas = state.mesasSeleccionadas.filter(
    (idMesa) => !state.mesasOcupadas.includes(idMesa),
  );

  if (state.zonaActiva) {
    renderPlanoZona(state.zonaActiva);
  }
  calcularComensalesActuales();
}

function renderPlanoZona(idZona) {
  dom.layoutMesas.innerHTML = "";
  const mesasZona = state.mesas.filter((m) => m.idZona === idZona);
  const esModoSoloLectura =
    state.modoActivo === "VER" || esFechaPasada(dom.fechaReserva.value);

  mesasZona.forEach((mesa) => {
    const el = document.createElement("div");
    const ocupadaPorOtra = state.mesasOcupadas.includes(mesa.id);

    let estadoClase = mesa.estado.toLowerCase();
    if (ocupadaPorOtra) estadoClase = "ocupada";

    el.className = `mesa ${estadoClase}`;
    if (state.mesasSeleccionadas.includes(mesa.id)) {
      el.classList.add("selected");
    }

    el.style.left = mesa.posicionX + "px";
    el.style.top = mesa.posicionY + "px";
    el.innerHTML = `
      <strong>${mesa.numeroMesa}</strong>
      <small>${mesa.disponibilidadPersonas} pax</small>
    `;

    if (!ocupadaPorOtra && !esModoSoloLectura) {
      el.addEventListener("click", () => {
        el.classList.toggle("selected");
        if (el.classList.contains("selected")) {
          state.mesasSeleccionadas.push(mesa.id);
        } else {
          state.mesasSeleccionadas = state.mesasSeleccionadas.filter(
            (id) => id !== mesa.id,
          );
        }
        calcularComensalesActuales();
      });
    } else {
      el.style.cursor = "not-allowed";
    }

    dom.layoutMesas.appendChild(el);
  });
}

// =========================================
// WIZARD: TRANSICIONES DE ESTADO
// =========================================
window.abrirOpcionesReserva = async function (idReserva) {
  if (tieneCambiosSinGuardar() && state.reservaEnEdicion !== idReserva) {
    const confirmar = await mostrarConfirmacion(
      "¿Abrir reserva?",
      "Tienes cambios sin guardar en la vista actual. ¿Deseas descartarlos para ver esta reserva?",
      "Cancelar",
      "Descartar y abrir",
    );
    if (!confirmar) return;
  }

  const agrupada = state.reservasAgrupadas.find(
    (r) => r.reserva.id === idReserva,
  );
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

  const contenedorBotones = document.querySelector("#panelFormulario .actions");

  if (esSoloLectura) {
    dom.formTitulo.textContent = `Reserva #${idReserva} (Solo Lectura)`;
    dom.formSubtitulo.textContent = estaFinalizada
      ? "Esta reserva ya se encuentra finalizada."
      : "Esta reserva pertenece a una fecha pasada.";
    dom.btnCancelarEdicion.style.display = "none";

    contenedorBotones.innerHTML = `
        <button type="button" id="btnCerrarDetalles" class="btn-primary" style="background-color: var(--gray); width:100%;">
            Nueva Reserva / Cerrar
        </button>
    `;
    document
      .getElementById("btnCerrarDetalles")
      .addEventListener("click", resetearFormulario);
  } else {
    dom.formTitulo.textContent = `Editar Reserva #${idReserva}`;
    dom.formSubtitulo.textContent = "Modifica los datos y mesas de la reserva";
    dom.btnCancelarEdicion.style.display = "block";

    dom.infoEliminarContenedor.innerHTML = `
          <div class="info-row"><span>Cliente</span><strong>${nombreCompleto}</strong></div>
          <div class="info-row"><span>Fecha y Hora</span><strong>${agrupada.reserva.fecha} a las ${agrupada.reserva.hora.substring(0, 5)}</strong></div>
          <div class="info-row"><span>Mesas</span><strong>${agrupada.mesas.map((m) => m.numeroMesa).join(", ")}</strong></div>
      `;

    contenedorBotones.innerHTML = `
          <button id="btnActualizarReserva" class="btn-primary" style="flex:1;">Guardar Cambios</button>
          <button id="btnAbrirEliminar" class="btn-danger" style="margin-left: 10px;"><i class="fa-solid fa-trash"></i></button>
      `;

    document
      .getElementById("btnActualizarReserva")
      .addEventListener("click", procesarGuardado);
    document
      .getElementById("btnAbrirEliminar")
      .addEventListener("click", () => {
        dom.panelFormulario.classList.remove("active");
        dom.panelEliminar.classList.add("active");
      });
  }

  actualizarDisponibilidadMesas();
  mostrarPanelPrincipal();
};

function resetearFormulario() {
  state.modoActivo = "CREAR";
  state.reservaEnEdicion = null;
  state.mesasSeleccionadas = [];
  state.clienteSeleccionado = null;
  state.cantidadPersonasCalculada = 0;
  state.mesasOcupadas = [];

  dom.idCliente.value = "";
  dom.clienteSeleccionado.textContent = "Seleccionar cliente";
  dom.clienteSeleccionado.style.color = "var(--gray)";
  dom.fechaReserva.value = new Date().toISOString().split("T")[0];
  dom.horaReserva.value = "";
  dom.contenedorEstado.style.display = "none";

  dom.horaReserva.disabled = false;
  dom.estadoReserva.disabled = false;
  dom.selectorCliente.style.pointerEvents = "auto";

  dom.formTitulo.textContent = "Nueva Reserva";
  dom.formSubtitulo.textContent = "Crear una reserva rápidamente";
  dom.btnCancelarEdicion.style.display = "none";

  const contenedorBotones = document.querySelector("#panelFormulario .actions");
  contenedorBotones.innerHTML = `<button id="btnGuardarReserva" class="btn-primary">Crear Reserva</button>`;
  document
    .getElementById("btnGuardarReserva")
    .addEventListener("click", procesarGuardado);

  actualizarDisponibilidadMesas();
  mostrarPanelPrincipal();
}

window.resetearFormulario = resetearFormulario;

// =========================================
// CONTROL DE FLUJO Y API
// =========================================
async function procesarGuardado() {
  limpiarErroresFormulario();

  if (state.modoActivo === "CREAR") {
    if (!state.clienteSeleccionado || !state.clienteSeleccionado.id) {
      showNotification(
        "Debes seleccionar un cliente para la reserva.",
        "warning",
      );
      return;
    }
    if (!dom.fechaReserva.value || dom.fechaReserva.value.trim() === "") {
      showNotification("Debes seleccionar la fecha de la reserva.", "warning");
      return;
    }
    if (!dom.horaReserva.value || dom.horaReserva.value.trim() === "") {
      showNotification("Debes seleccionar la hora de la reserva.", "warning");
      return;
    }
    if (!state.mesasSeleccionadas || state.mesasSeleccionadas.length === 0) {
      showNotification(
        "Debes seleccionar al menos una mesa para la reserva.",
        "warning",
      );
      return;
    }
    if (state.cantidadPersonasCalculada <= 0) {
      showNotification(
        "La capacidad de comensales debe ser mayor a 0. Selecciona mesas válidas.",
        "warning",
      );
      return;
    }
  }

  const requestData = {
    fecha: dom.fechaReserva.value,
    hora:
      dom.horaReserva.value +
      (dom.horaReserva.value.split(":").length === 2 ? ":00" : ""),
    idusuario: parseInt(state.clienteSeleccionado.id),
    cantidadPersonas: state.cantidadPersonasCalculada,
    estado:
      state.modoActivo === "EDITAR" ? dom.estadoReserva.value : "PENDIENTE",
  };

  try {
    if (state.modoActivo === "CREAR") {
      await apiReserva.guardarReserva(requestData, state.mesasSeleccionadas);
      showNotification("La reserva se ha registrado correctamente.", "success");
    } else {
      await apiReserva.actualizarReserva(
        state.reservaEnEdicion,
        requestData,
        state.mesasSeleccionadas,
      );
      showNotification(
        "La reserva se ha actualizado correctamente.",
        "success",
      );
    }

    const reservasDiariasRaw =
      await apiReserva.listarPorEmpresaDiario();
    agruparReservas(reservasDiariasRaw);
    renderListaReservas();
    resetearFormulario();
  } catch (e) {
    if (e.validations) {
      manejarErroresDeValidacion(e);
    } else if (e.message) {
      showNotification(e.message, "error");
    } else {
      showNotification(
        "No se pudo guardar la reserva. Verifique su conexión e intente de nuevo.",
        "error",
      );
    }
  }
}

async function procesarEliminado() {
  if (!state.reservaEnEdicion) return;
  try {
    await apiReserva.eliminarReserva(state.reservaEnEdicion);
    const reservasDiariasRaw =
      await apiReserva.listarPorEmpresaDiario();
    agruparReservas(reservasDiariasRaw);
    renderListaReservas();

    dom.panelEliminar.classList.remove("active");
    resetearFormulario();
  } catch (e) {
    showNotification(
      "No se pudo eliminar la reserva, intenta de nuevo.",
      "error",
    );
  }
}

function mostrarPanelPrincipal() {
  dom.panelEliminar.classList.remove("active");
  dom.panelFormulario.classList.add("active");
  dom.mesasView.style.display = "none";
  dom.vistaPrincipalForm.style.display = "block";
}

// =========================================
// EVENT LISTENERS
// =========================================
function configurarEventosGenerales() {
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
    const confirmar = await mostrarConfirmacion(
      "¿Cancelar edición?",
      "¿Estás seguro de que deseas descartar los cambios actuales?",
      "Volver",
      "Descartar",
    );
    if (confirmar) {
      resetearFormulario();
    }
  });

  dom.btnCancelarEliminar.addEventListener("click", () => {
    dom.panelEliminar.classList.remove("active");
    dom.panelFormulario.classList.add("active");
  });

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
      const nombre =
        `${c.usuario.nombres} ${c.usuario.apellidos}`.toLowerCase();
      return nombre.includes(texto);
    });
    renderClientesModal(filtrados);
  });

  dom.btnGuardarReserva.addEventListener("click", procesarGuardado);

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

