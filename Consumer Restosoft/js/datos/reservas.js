import { apiReserva } from "../consumo/apiReservas.js";
import { api as apiMesas } from "../consumo/apiMesas.js";

const ID_EMPRESA = 1;

const state = {
  mesas: [],
  zonas: [],
  clientes: [],
  reservasAgrupadas: [],

  // Estado del formulario
  modoActivo: "CREAR",
  reservaEnEdicion: null,
  clienteSeleccionado: null,
  zonaActiva: null,
  mesasSeleccionadas: [],
  cantidadPersonasCalculada: 0,
};

const dom = {
  // Layout principal
  listaReservasContainer: document.getElementById("listaReservasContainer"),
  panelFormulario: document.getElementById("panelFormulario"),
  panelEliminar: document.getElementById("panelEliminar"),
  vistaPrincipalForm: document.getElementById("vistaPrincipalForm"),
  zonasView: document.getElementById("zonasView"),
  mesasView: document.getElementById("mesasView"),
  tablesGrid: document.getElementById("tablesGrid"),
  layoutMesas: document.getElementById("layoutMesas"),
  zonaTitulo: document.getElementById("zonaTitulo"),

  // Formulario
  formTitulo: document.getElementById("formTitulo"),
  formSubtitulo: document.getElementById("formSubtitulo"),
  fechaReserva: document.getElementById("fechaReserva"),
  horaReserva: document.getElementById("horaReserva"),
  estadoReserva: document.getElementById("estadoReserva"),
  contenedorEstado: document.getElementById("contenedorEstado"),
  infoComensales: document.getElementById("infoComensales"),

  // Clientes
  selectorCliente: document.getElementById("selectorCliente"),
  clienteSeleccionado: document.getElementById("clienteSeleccionado"),
  idCliente: document.getElementById("idCliente"),
  modalClientes: document.getElementById("modalClientes"),
  cerrarModalClientes: document.getElementById("cerrarModalClientes"),
  buscarCliente: document.getElementById("buscarCliente"),
  clientesList: document.getElementById("clientesList"),

  // Botones
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

  // 3. Asignar textos e iconos
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

  // 4. Mostrar (se desliza desde la derecha)
  notification.classList.add("show");

  // 5. Ocultar tras 6 segundos
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
  txtConfirmar = "Descartar"
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
  // 1. Seleccionamos el loader
  const loader = document.getElementById("pantalla-carga");

  try {
    // 2. Mostramos el loader quitando la clase 'oculto'
    if (loader) loader.classList.remove("oculto");

    const [mesasData, zonasData, clientesData, reservasDiariasRaw] =
      await Promise.all([
        apiMesas.obtenerMesas(ID_EMPRESA),
        apiMesas.obtenerZonas(ID_EMPRESA),
        apiReserva.listarClientes(),
        apiReserva.listarPorEmpresaDiario(ID_EMPRESA),
      ]);

    
    state.mesas = mesasData;
    state.zonas = zonasData;
    state.clientes = clientesData;

    agruparReservas(reservasDiariasRaw);

    renderListaReservas();
    renderZonas();

    dom.fechaReserva.value = new Date().toISOString().split("T")[0];

  } catch (error) {
    // 3. Manejo de Errores (API caída, error de red, o datos nulos)
    console.error("Error crítico al cargar la aplicación:", error);

    // Definimos el código y el mensaje para la pantalla de error
    const codigo = "503"; // Código HTTP 503: Service Unavailable
    const mensaje = encodeURIComponent("El sistema está caído o no se pudieron cargar los datos. Por favor, consulta a los administradores.");

    // Redirigimos a la plantilla que creamos construyendo la URL
    window.location.href = `error.html?code=${codigo}&msg=${mensaje}`;
    
  } finally {
    // 4. Ocultamos el loader al terminar (ya sea con éxito o error)
    if (loader) loader.classList.add("oculto");
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
function renderListaReservas() {
  dom.listaReservasContainer.innerHTML = "";

  if (state.reservasAgrupadas.length === 0) {
    dom.listaReservasContainer.innerHTML = `<p style="color:var(--gray); text-align:center;">No hay reservas para hoy.</p>`;
    return;
  }

  const html = state.reservasAgrupadas.map((agrupada) => {
    const res = agrupada.reserva;
    const mesasNum = agrupada.mesas.map((m) => m.numeroMesa).join(", ");
    const iniciales =
      res.usuario?.nombres?.substring(0, 2).toUpperCase() || "CL";
    const nombreCliente = res.usuario?.nombres || "Cliente Desconocido";

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
          <div class="avatar">${iniciales}</div>
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

function renderPlanoZona(idZona) {
  dom.layoutMesas.innerHTML = "";
  const mesasZona = state.mesas.filter((m) => m.idZona === idZona);

  const esModoSoloLectura = state.modoActivo === "VER" || esFechaPasada(dom.fechaReserva.value);

  mesasZona.forEach((mesa) => {
    const el = document.createElement("div");

    const ocupadaPorOtra = state.reservasAgrupadas.some(
      (ag) =>
        ag.reserva.id !== state.reservaEnEdicion &&
        ag.mesas.some((m) => m.id === mesa.id),
    );

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
  // Verificamos si hay cambios sin guardar y si el ID no es el mismo que se está editando ya
  if (tieneCambiosSinGuardar() && state.reservaEnEdicion !== idReserva) {
    const confirmar = await mostrarConfirmacion(
      "¿Abrir reserva?",
      "Tienes cambios sin guardar en la vista actual. ¿Deseas descartarlos para ver esta reserva?",
      "Cancelar",
      "Descartar y abrir"
    );
    if (!confirmar) return;
  }

  const agrupada = state.reservasAgrupadas.find(
    (r) => r.reserva.id === idReserva,
  );
  if (!agrupada) return;

  // Evaluamos bloqueos por vista (Fecha Pasada o estado FINALIZADA)
  const esPasada = esFechaPasada(agrupada.reserva.fecha);
  const estaFinalizada = agrupada.reserva.estado === "FINALIZADA";
  const esSoloLectura = esPasada || estaFinalizada;

  state.modoActivo = esSoloLectura ? "VER" : "EDITAR";
  state.reservaEnEdicion = idReserva;
  state.mesasSeleccionadas = agrupada.mesas.map((m) => m.id);
  state.clienteSeleccionado = {
    id: agrupada.reserva.usuario.id,
    nombre: agrupada.reserva.usuario.nombres,
  };

  dom.idCliente.value = agrupada.reserva.usuario.id;
  dom.clienteSeleccionado.textContent = agrupada.reserva.usuario.nombres;
  dom.clienteSeleccionado.style.color = "var(--dark)";
  dom.fechaReserva.value = agrupada.reserva.fecha;
  dom.horaReserva.value = agrupada.reserva.hora.substring(0, 5);

  dom.estadoReserva.value = agrupada.reserva.estado;
  dom.contenedorEstado.style.display = "block";

  // Controlar accesibilidad a los inputs si está bloqueado
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
    
    document.getElementById("btnCerrarDetalles").addEventListener("click", resetearFormulario);
  } else {
    dom.formTitulo.textContent = `Editar Reserva #${idReserva}`;
    dom.formSubtitulo.textContent = "Modifica los datos y mesas de la reserva";
    dom.btnCancelarEdicion.style.display = "block";

    dom.infoEliminarContenedor.innerHTML = `
          <div class="info-row"><span>Cliente</span><strong>${agrupada.reserva.usuario.nombre}</strong></div>
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
      
    document.getElementById("btnAbrirEliminar").addEventListener("click", () => {
      dom.panelFormulario.classList.remove("active");
      dom.panelEliminar.classList.add("active");
    });
  }

  renderZonas();
  mostrarPanelPrincipal();
};

function resetearFormulario() {
  state.modoActivo = "CREAR";
  state.reservaEnEdicion = null;
  state.mesasSeleccionadas = [];
  state.clienteSeleccionado = null;
  state.cantidadPersonasCalculada = 0;

  dom.idCliente.value = "";
  dom.clienteSeleccionado.textContent = "Seleccionar cliente";
  dom.clienteSeleccionado.style.color = "var(--gray)";
  dom.fechaReserva.value = new Date().toISOString().split("T")[0];
  dom.horaReserva.value = "";
  dom.contenedorEstado.style.display = "none";

  // Volver a habilitar en caso de que venga de una vista bloqueada
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

  renderZonas();
  mostrarPanelPrincipal();
}

// Hacemos el resetear global por si llegase a ser llamado en algún otro flujo del módulo
window.resetearFormulario = resetearFormulario; 

// =========================================
// CONTROL DE FLUJO Y API
// =========================================
async function procesarGuardado() {
  // ... (tus validaciones iniciales del frontend aquí) ...
  
  // Limpiamos errores de intentos anteriores
  limpiarErroresFormulario(); 

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
      showNotification("La reserva se ha registrado correctamente.", "success");
    } else {
      await apiReserva.actualizarReserva(
        state.reservaEnEdicion,
        requestData,
        state.mesasSeleccionadas,
      );
      showNotification("La reserva se ha actualizado correctamente.", "success");
    }

    const reservasDiariasRaw = await apiReserva.listarPorEmpresaDiario(ID_EMPRESA);
    agruparReservas(reservasDiariasRaw);
    renderListaReservas();
    resetearFormulario();

  } catch (e) {
    // --- CAMBIO PRINCIPAL AQUÍ ---
    // Si el error tiene la propiedad 'validations', usamos nuestra nueva función
    if (e.validations) {
      manejarErroresDeValidacion(e);
    } else if (e.message) {
      // Si es un error personalizado tuyo (como RecursoNoEncontradoException)
      showNotification(e.message, "error");
    } else {
      // Fallback por si la respuesta no es JSON (ej. caída de red)
      showNotification("No se pudo guardar la reserva. Verifique su conexión e intente de nuevo.", "error");
    }
  }
}

async function procesarEliminado() {
  if (!state.reservaEnEdicion) return;
  try {
    await apiReserva.eliminarReserva(state.reservaEnEdicion);
    const reservasDiariasRaw =
      await apiReserva.listarPorEmpresaDiario(ID_EMPRESA);
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
        "Descartar"
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
      const nombre = (
        c.nombre ||
        c.nombreCompleto ||
        c.nombres ||
        ""
      ).toLowerCase();
      return nombre.includes(texto);
    });
    renderClientesModal(filtrados);
  });

  dom.btnGuardarReserva.addEventListener("click", procesarGuardado);
}

function renderClientesModal(lista) {
  dom.clientesList.innerHTML = "";
  if (lista.length === 0) {
    dom.clientesList.innerHTML = `<div class="cliente-item">No se encontraron clientes</div>`;
    return;
  }

  dom.clientesList.innerHTML = lista
    .map((cliente) => {
      const nombre =
        cliente.nombre ||
        cliente.nombreCompleto ||
        cliente.nombres ||
        "Cliente";
      return `<div class="cliente-item" data-id="${cliente.id}" data-nombre="${nombre}">${nombre}</div>`;
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
  
  // Función para limpiar los errores previos antes de un nuevo intento
function limpiarErroresFormulario() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.error-message-text').forEach(el => el.remove());
}

// Función para agregar el mensaje de error debajo del input
function agregarMensajeErrorBajoInput(inputEl, mensaje) {
  // Evitar duplicados si ya existe un error allí
  if(inputEl.nextSibling && inputEl.nextSibling.classList && inputEl.nextSibling.classList.contains('error-message-text')) return;
  
  const errorSpan = document.createElement('span');
  errorSpan.className = 'error-message-text';
  errorSpan.textContent = mensaje;
  
  // Insertar justo después del input
  inputEl.parentNode.insertBefore(errorSpan, inputEl.nextSibling);
}

// Función principal que procesa el objeto ErrorResponse
function manejarErroresDeValidacion(errorResponse) {
  limpiarErroresFormulario();

  // Verificamos si existe el mapa de validaciones enviado por @ExceptionHandler
  if (errorResponse.validations) {
    let mensajes = [];
    
    // Mapeamos los campos del DTO de Java hacia los IDs del HTML
    const mapeoCampos = {
      "reserva.fecha": "fechaReserva",
      "reserva.hora": "horaReserva",
      "reserva.idusuario": "idCliente",
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

    // Mostramos notificación general uniendo los mensajes
    showNotification(mensajes.join(" | "), "error");
  } else {
    // Si es otro tipo de error (ej. 404, 500) mostramos el message general del ErrorResponse
    showNotification(errorResponse.message || "Ocurrió un error inesperado en el servidor.", "error");
  }
}
}

// Función para limpiar los errores previos antes de un nuevo intento
function limpiarErroresFormulario() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.error-message-text').forEach(el => el.remove());
}

// Función para agregar el mensaje de error debajo del input
function agregarMensajeErrorBajoInput(inputEl, mensaje) {
  // Evitar duplicados si ya existe un error allí
  if(inputEl.nextSibling && inputEl.nextSibling.classList && inputEl.nextSibling.classList.contains('error-message-text')) return;
  
  const errorSpan = document.createElement('span');
  errorSpan.className = 'error-message-text';
  errorSpan.textContent = mensaje;
  
  // Insertar justo después del input
  inputEl.parentNode.insertBefore(errorSpan, inputEl.nextSibling);
}

// Función principal que procesa el objeto ErrorResponse
function manejarErroresDeValidacion(errorResponse) {
  limpiarErroresFormulario();

  // Verificamos si existe el mapa de validaciones enviado por @ExceptionHandler
  if (errorResponse.validations) {
    let mensajes = [];
    
    // Mapeamos los campos del DTO de Java hacia los IDs del HTML
    const mapeoCampos = {
      "reserva.fecha": "fechaReserva",
      "reserva.hora": "horaReserva",
      "reserva.idusuario": "idCliente",
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

    // Mostramos notificación general uniendo los mensajes
    showNotification(mensajes.join(" | "), "error");
  } else {
    // Si es otro tipo de error (ej. 404, 500) mostramos el message general del ErrorResponse
    showNotification(errorResponse.message || "Ocurrió un error inesperado en el servidor.", "error");
  }
}