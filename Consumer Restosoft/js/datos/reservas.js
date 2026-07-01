import { apiReservaCliente, apiMesas, apiProfile } from "../consumo/apiReservasCliente.js";
import { ApiCliente } from "../consumo/apiCliente.js";

const PanelClienteApp = (function () {
  let state = {
    perfil: null, idEmpresa: null, mesas: [], zonas: [],
    reservasAgrupadas: [], misReservas: [], mesasOcupadas: [],
    mesasSeleccionadas: [], cantidadPersonasCalculada: 0,
    zonaActiva: null, reservaEnEdicion: null, modoActivo: "CREAR",
    reservaOriginal: null,
    hayCambios: false
  };

  const dom = {};

  function iniciar() {
    cacheDom();
    configurarEventos();
    cargarDatosIniciales();
  }

  function cacheDom() {
    dom.appLoader = document.getElementById("appLoader");
    dom.topbarLogo = document.getElementById("topbarLogo");
    dom.topbarNombre = document.getElementById("topbarNombre");
    dom.userInfo = document.getElementById("userInfo");
    dom.listaReservas = document.getElementById("listaReservas");

    dom.step1View = document.getElementById("step1View");
    dom.step2View = document.getElementById("step2View");
    dom.step1Indicator = document.getElementById("step1-indicator");
    dom.step2Indicator = document.getElementById("step2-indicator");
    dom.tablesSummary = document.getElementById("tablesSummary");
    dom.btnGoToTables = document.getElementById("btnGoToTables");

    dom.fechaReserva = document.getElementById("fechaReserva");
    dom.horaReserva = document.getElementById("horaReserva");
    dom.btnGuardar = document.getElementById("btnGuardarReserva");
    dom.btnCancelar = document.getElementById("btnCancelarEdicion");
    dom.formTitulo = document.getElementById("formTitulo");

    dom.zonasView = document.getElementById("zonasView");
    dom.mesasView = document.getElementById("mesasView");
    dom.tablesGrid = document.getElementById("tablesGrid");
    dom.layoutMesas = document.getElementById("layoutMesas");
    dom.zonaTitulo = document.getElementById("zonaTitulo");
    dom.volverBtn = document.getElementById("volverBtn");
    dom.volverZonasBtn = document.getElementById("volverZonasBtn");
    dom.btnConfirmarMesas = document.getElementById("btnConfirmarMesas");
    dom.infoComensales = document.getElementById("infoComensales");

    dom.notifContainer = document.getElementById("notificationContainer");
  }

  async function cargarDatosIniciales() {
    try {
      const slug = localStorage.getItem("slugEmpresaActual") || "restosoft";
      const configData = await ApiCliente.obtenerEmpresa(slug);

      if (configData) {
        state.idEmpresa = configData.idEmpresa;
        aplicarBranding(configData);
        dom.topbarNombre.textContent = configData.brandingNombre || "Restaurante";
        dom.topbarLogo.src = configData.brandingLogo || "https://via.placeholder.com/40";
        document.title = `Mis Reservas | ${configData.brandingNombre || ""}`;
      }

      const [perfilData, misReservasData, mesasData, zonasData] = await Promise.all([
        apiProfile.obtenerInfoMe(),
        apiReservaCliente.listarMisReservas(),
        apiMesas.obtenerMesas(state.idEmpresa),
        apiMesas.obtenerZonas(state.idEmpresa)
      ]);

      state.perfil = perfilData;
      state.mesas = mesasData;
      state.zonas = zonasData;

      agruparReservas(misReservasData);

      cargarPerfilUsuario(perfilData);
      renderListaReservas();
      renderZonas();

      dom.fechaReserva.value = new Date().toISOString().split("T")[0];
      dom.appLoader.style.display = "none";
      goToStep(1);
      actualizarUI();

    } catch (error) {
      console.error("Error al cargar el panel:", error);
      showNotification("Error al cargar datos. ¿Iniciaste sesión?", "error");
      setTimeout(() => window.location.href = "/login-cliente.html", 2000);
    }
  }

  function aplicarBranding(data) {
    const root = document.documentElement;
    if (data.tipografiaFuenteGoogle) {
      const fontName = data.tipografiaFuenteGoogle.replace(/ /g, "+");
      const fontLink = document.createElement("link");
      fontLink.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700;800;900&display=swap`;
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    const setVar = (name, val) => { if (val) root.style.setProperty(name, val); };
    setVar("--c-primary", data.colorPrimario);
    setVar("--c-primary-hover", data.colorPrimarioHover);
    setVar("--c-dark", data.colorOscuro);
    setVar("--c-bg", data.colorBg);
    setVar("--c-bg-alt", data.colorBgAlt);
    setVar("--c-card", data.colorCard);
    setVar("--c-text", data.colorTexto);
    setVar("--c-text-sec", data.colorTextoSec);
    setVar("--c-border", data.colorBorde);
    setVar("--font-main", data.tipografiaFuente);
    setVar("--r-card", data.bordeTarjeta);
    setVar("--r-btn", data.bordeBoton);
    setVar("--sh-soft", data.sombraSuave);
  }

  function cargarPerfilUsuario(perfil) {
    const user = perfil.usuario || {};
    const iniciales = ((user.nombres || "U").substring(0, 1) + (user.apellidos || "C").substring(0, 1)).toUpperCase();
    const imagen = user.imagenUrl ? `<img src="${user.imagenUrl}" alt="Perfil" />` : `<div>${iniciales}</div>`;

    dom.userInfo.innerHTML = `
            <div class="user-avatar">${imagen}</div>
            <div class="user-details">
                <strong>${user.nombres || ""} ${user.apellidos || ""}</strong>
                <span>Cliente</span>
            </div>
            <button id="btnLogout" class="btn-logout" title="Cerrar sesión">
                <i class="fa-solid fa-right-from-bracket"></i>
            </button>
        `;
    document.getElementById("btnLogout").addEventListener("click", cerrarSesion);
  }

  function cerrarSesion() {
    localStorage.removeItem("token_cliente");
    window.location.href = "/login-cliente.html";
  }

  function agruparReservas(raw) {
    const mapa = new Map();
    raw.forEach(rm => {
      const id = rm.reserva.id;
      if (!mapa.has(id)) mapa.set(id, { reserva: rm.reserva, mesas: [] });
      mapa.get(id).mesas.push(rm.mesa);
    });
    state.reservasAgrupadas = Array.from(mapa.values());
  }

  function renderListaReservas() {
    dom.listaReservas.innerHTML = "";
    const activas = state.reservasAgrupadas.filter(r => r.reserva.estado !== "CANCELADA" && r.reserva.estado !== "FINALIZADA");

    if (activas.length === 0) {
      dom.listaReservas.innerHTML = `<p class="empty-state">No tienes reservas activas.<br>¡Crea una nueva en el panel derecho!</p>`;
      return;
    }

    const html = activas.map(agrupada => {
      const res = agrupada.reserva;
      const mesasNum = agrupada.mesas.map(m => m.numeroMesa).join(", ");
      let badgeClass = "badge-pending";
      if (res.estado === "CONFIRMADA") badgeClass = "badge-confirmed";
      else if (res.estado === "CANCELADA") badgeClass = "badge-cancelled";
      else if (res.estado === "FINALIZADA") badgeClass = "badge-finalized";

      const puedeCancelar = res.estado === "PENDIENTE" || res.estado === "CONFIRMADA";
      const puedeConfirmar = res.estado === "PENDIENTE";
      const fechaObj = new Date(res.fecha + "T00:00:00");

      return `
                <div class="reserva-card-client" onclick="PanelClienteApp.verDetalles(${res.id})">
                    <div class="reserva-header">
                        <div class="reserva-fecha">
                            <span class="dia">${fechaObj.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                            <span class="numero">${fechaObj.getDate()}</span>
                            <span class="mes">${fechaObj.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</span>
                        </div>
                        <div class="reserva-info">
                            <h5>${res.hora.substring(0, 5)} · ${res.cantidadPersonas} personas</h5>
                            <span>Mesas: ${mesasNum}</span>
                        </div>
                    </div>
                    <div class="reserva-footer">
                        <div class="badge-status ${badgeClass}">${res.estado}</div>
                        <div class="reserva-actions-mini">
                            ${puedeConfirmar ? `<button class="btn-confirm-mini" onclick="event.stopPropagation(); PanelClienteApp.confirmar(${res.id})">Confirmar</button>` : ''}
                            ${puedeCancelar ? `<button class="btn-cancel-mini" onclick="event.stopPropagation(); PanelClienteApp.cancelar(${res.id})">Cancelar</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
    });
    dom.listaReservas.innerHTML = html.join("");
  }

  function renderZonas() {
    dom.tablesGrid.innerHTML = "";
    const html = state.zonas.map(zona => {
      const mesasZona = state.mesas.filter(m => m.idZona === zona.id);
      const seleccionadasEnZona = mesasZona.filter(m => state.mesasSeleccionadas.includes(m.id)).length;
      let badgeHtml = seleccionadasEnZona > 0 ? `<div style="position: absolute; top: 12px; right: 12px; background: var(--c-primary); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${seleccionadasEnZona}</div>` : "";

      return `
                <div class="zona-card-client" onclick="PanelClienteApp.abrirZona(${zona.id})">
                    ${badgeHtml}
                    <div class="zona-icon-client">🍽️</div>
                    <h4>${zona.nombreZona}</h4>
                    <p>${mesasZona.length} mesas en total</p>
                </div>
            `;
    });
    dom.tablesGrid.innerHTML = html.join("");
  }

  function actualizarDisponibilidadMesas() {
    const fecha = dom.fechaReserva.value;
    const hora = dom.horaReserva.value;
    state.mesasOcupadas = [];

    if (!fecha || !hora) {
      if (state.zonaActiva) renderPlanoZona(state.zonaActiva);
      return;
    }

    const [hSel, mSel] = hora.split(":").map(Number);
    const minSel = hSel * 60 + mSel;

    state.reservasAgrupadas.forEach(agrupada => {
      const res = agrupada.reserva;
      if (state.reservaEnEdicion && res.id === state.reservaEnEdicion) return;
      if (res.estado === "CANCELADA" || res.estado === "FINALIZADA") return;
      if (res.fecha !== fecha) return;

      const [hRes, mRes] = res.hora.substring(0, 5).split(":").map(Number);
      const minRes = hRes * 60 + mRes;

      if (Math.abs(minSel - minRes) <= 90) {
        agrupada.mesas.forEach(mesa => {
          if (!state.mesasOcupadas.includes(mesa.id)) {
            state.mesasOcupadas.push(mesa.id);
          }
        });
      }
    });

    state.mesasSeleccionadas = state.mesasSeleccionadas.filter(id => !state.mesasOcupadas.includes(id));
    if (state.zonaActiva) renderPlanoZona(state.zonaActiva);
    actualizarUI();
  }

  function renderPlanoZona(idZona) {
    dom.layoutMesas.innerHTML = "";
    const mesasZona = state.mesas.filter(m => m.idZona === idZona);

    mesasZona.forEach(mesa => {
      const el = document.createElement("div");
      const ocupada = state.mesasOcupadas.includes(mesa.id);
      el.className = `mesa-client ${ocupada ? 'ocupada' : 'libre'}`;
      if (state.mesasSeleccionadas.includes(mesa.id)) el.classList.add("selected");

      el.style.left = mesa.posicionX + "px";
      el.style.top = mesa.posicionY + "px";
      el.innerHTML = `<strong>${mesa.numeroMesa}</strong><small>${mesa.disponibilidadPersonas} pax</small>`;

      if (!ocupada) {
        el.addEventListener("click", () => {
          el.classList.toggle("selected");
          if (el.classList.contains("selected")) {
            state.mesasSeleccionadas.push(mesa.id);
          } else {
            state.mesasSeleccionadas = state.mesasSeleccionadas.filter(id => id !== mesa.id);
          }
          actualizarUI();
        });
      } else {
        el.style.cursor = "not-allowed";
      }
      dom.layoutMesas.appendChild(el);
    });
  }

  function verificarCambios() {
    if (state.modoActivo !== "EDITAR" || !state.reservaOriginal) {
      state.hayCambios = false;
      return;
    }

    const fechaCambiada = dom.fechaReserva.value !== state.reservaOriginal.fecha;
    const horaCambiada = (dom.horaReserva.value + ":00") !== state.reservaOriginal.hora;

    const mesasOriginales = state.reservaOriginal.mesas.map(m => parseInt(m.id)).sort();
    const mesasActuales = [...state.mesasSeleccionadas].sort();
    const mesasCambiadas = JSON.stringify(mesasOriginales) !== JSON.stringify(mesasActuales);

    state.hayCambios = fechaCambiada || horaCambiada || mesasCambiadas;
  }

  function actualizarUI() {
    verificarCambios();

    let cap = 0;
    state.mesasSeleccionadas.forEach(id => {
      const m = state.mesas.find(mesa => parseInt(mesa.id) === parseInt(id));
      if (m) cap += m.disponibilidadPersonas;
    });
    state.cantidadPersonasCalculada = cap;
    dom.infoComensales.textContent = cap;

    if (state.mesasSeleccionadas.length === 0) {
      dom.tablesSummary.innerHTML = `<div class="empty-summary">Aún no has seleccionado mesas.</div>`;
    } else {
      const pills = state.mesasSeleccionadas.map(id => {
        const m = state.mesas.find(x => parseInt(x.id) === parseInt(id));
        if (!m) return ''; // Blindaje por si no encuentra la mesa
        return `<span class="table-pill"><i class="fa-solid fa-chair"></i> Mesa ${m.numeroMesa} (${m.disponibilidadPersonas} pax)</span>`;
      }).join('');
      dom.tablesSummary.innerHTML = `<div class="pills-container">${pills}</div><div class="total-pax">Total: ${cap} personas</div>`;
    }

    const formValido = dom.fechaReserva.value && dom.horaReserva.value && state.mesasSeleccionadas.length > 0 && cap > 0;
    let puedeGuardar = false;

    if (state.modoActivo === "CREAR") {
      puedeGuardar = formValido;
      dom.btnGuardar.innerHTML = 'Confirmar Reserva <i class="fa-solid fa-check"></i>';
    } else if (state.modoActivo === "EDITAR") {
      puedeGuardar = formValido && state.hayCambios;
      dom.btnGuardar.innerHTML = 'Guardar Cambios <i class="fa-solid fa-save"></i>';
    }

    if (puedeGuardar) {
      dom.btnGuardar.classList.remove("disabled");
      dom.btnGuardar.disabled = false;
    } else {
      dom.btnGuardar.classList.add("disabled");
      dom.btnGuardar.disabled = true;
    }

    if (state.zonaActiva && dom.mesasView.style.display === 'block') {
      renderPlanoZona(state.zonaActiva);
    }
  }

  function goToStep(step) {
    dom.step1View.style.display = step === 1 ? 'block' : 'none';
    dom.step2View.style.display = step === 2 ? 'block' : 'none';
    dom.step1Indicator.classList.toggle('active', step === 1);
    dom.step2Indicator.classList.toggle('active', step === 2);
    if (step === 1) actualizarUI();
  }

  function extraerMensajeError(e) {
    if (e && e.validations && typeof e.validations === 'object') {
      return Object.values(e.validations).join(' | ');
    }
    if (e && e.message) {
      return e.message;
    }
    return "Ocurrió un error inesperado en el servidor.";
  }

  async function procesarGuardado() {
    if (dom.btnGuardar.disabled) return;

    const isEdit = state.modoActivo === "EDITAR";

    const tituloModal = isEdit ? "Actualizar Reserva" : "Política de Reserva";
    const msgModal = isEdit
      ? "¿Deseas guardar los cambios realizados en tu reserva?"
      : "Tu reserva quedará en estado pendiente. Recuerda que debe ser confirmada por ti al menos una hora antes de la hora de inicio; de lo contrario, se cancelará automáticamente.";
    const txtConfirmar = isEdit ? "Sí, actualizar" : "Acepto y Continuar";

    const confirmar = await mostrarConfirmacion(tituloModal, msgModal, "Cancelar", txtConfirmar);
    if (!confirmar) return;

    const estadoReserva = isEdit ? state.reservaOriginal.estado : "PENDIENTE";

    const requestData = {
      fecha: dom.fechaReserva.value,
      hora: dom.horaReserva.value + ":00",
      idusuario: state.perfil.usuario.id,
      cantidadPersonas: state.cantidadPersonasCalculada,
      idempresa: state.idEmpresa,
      estado: estadoReserva
    };

    dom.btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    dom.btnGuardar.disabled = true;

    try {
      if (isEdit) {
        await apiReservaCliente.actualizarReserva(state.reservaEnEdicion, requestData, state.mesasSeleccionadas);
        showNotification("¡Reserva actualizada con éxito!", "success");
      } else {
        await apiReservaCliente.guardarReserva(requestData, state.mesasSeleccionadas);
        showNotification("¡Reserva creada con éxito!", "success");
      }

      const data = await apiReservaCliente.listarMisReservas();
      agruparReservas(data);
      renderListaReservas();
      resetearFormulario();
    } catch (e) {
      showNotification(extraerMensajeError(e), "error");
      dom.btnGuardar.innerHTML = isEdit ? 'Guardar Cambios <i class="fa-solid fa-save"></i>' : 'Confirmar Reserva <i class="fa-solid fa-check"></i>';
      dom.btnGuardar.disabled = false;
    }
  }

  function resetearFormulario() {
    state.mesasSeleccionadas = [];
    state.cantidadPersonasCalculada = 0;
    state.mesasOcupadas = [];
    state.zonaActiva = null;
    state.reservaEnEdicion = null;
    state.modoActivo = "CREAR";
    state.reservaOriginal = null;
    state.hayCambios = false;

    dom.horaReserva.value = "";
    dom.formTitulo.textContent = "Nueva Reserva";
    dom.btnCancelar.style.display = "none";
    dom.zonasView.style.display = "block";
    dom.mesasView.style.display = "none";

    renderZonas();
    goToStep(1);
    actualizarUI();
  }

  window.PanelClienteApp = {
    abrirZona(idZona) {
      state.zonaActiva = idZona;
      const zona = state.zonas.find(z => z.id === idZona);
      dom.zonaTitulo.textContent = zona.nombreZona;
      dom.zonasView.style.display = "none";
      dom.mesasView.style.display = "block";
      actualizarDisponibilidadMesas();
    },

    confirmar(idReserva) {
      mostrarConfirmacion(
        "Confirmar Reserva",
        "Al confirmar, aseguras tu mesa. Recuerda llegar a tiempo.",
        "Volver",
        "Sí, confirmar reserva"
      ).then(async (confirmado) => {
        if (!confirmado) return;

        const r = state.reservaOriginal;
        const reservaActualizada = {
          fecha: r.fecha,
          hora: r.hora,
          idusuario: r.idusuario,
          cantidadPersonas: r.cantidadPersonas,
          idempresa: r.idempresa,
          estado: "CONFIRMEDA" // <<-- OJO: CORREGIDO A CONFIRMADA
        };
        const idsMesas = state.reservaOriginal.mesas.map(m => parseInt(m.id));

        try {
          await apiReservaCliente.actualizarReserva(idReserva, reservaActualizada, idsMesas);
          showNotification("¡Reserva confirmada!", "success");
          const data = await apiReservaCliente.listarMisReservas();
          agruparReservas(data);
          renderListaReservas();
        } catch (e) {
          showNotification(extraerMensajeError(e), "error");
        }
      });
    },

    cancelar(idReserva) {
      mostrarConfirmacion("¿Cancelar Reserva?", "¿Seguro que deseas cancelar esta reserva?", "No", "Sí, cancelar")
        .then(async (confirmado) => {
          if (!confirmado) return;

          const r = state.reservaOriginal;
          const reservaActualizada = {
            fecha: r.fecha,
            hora: r.hora,
            idusuario: r.idusuario,
            cantidadPersonas: r.cantidadPersonas,
            idempresa: r.idempresa,
            estado: "CANCELADA"
          };
          const idsMesas = state.reservaOriginal.mesas.map(m => parseInt(m.id));

          try {
            await apiReservaCliente.actualizarReserva(idReserva, reservaActualizada, idsMesas);
            showNotification("Reserva cancelada", "success");
            const data = await apiReservaCliente.listarMisReservas();
            agruparReservas(data);
            renderListaReservas();
            resetearFormulario();
          } catch (e) {
            showNotification(extraerMensajeError(e), "error");
          }
        });
    },

    verDetalles(idReserva) {
      const agrupada = state.reservasAgrupadas.find(r => r.reserva.id === idReserva);
      if (!agrupada) return;

      state.modoActivo = "EDITAR";
      state.reservaEnEdicion = idReserva;
      state.reservaOriginal = agrupada.reserva;

      // Forzar conversión a entero para evitar problemas de tipo
      state.mesasSeleccionadas = agrupada.mesas.map(m => parseInt(m.id));
      state.zonaActiva = null;

      dom.formTitulo.textContent = `Editar Reserva #${idReserva}`;
      dom.fechaReserva.value = agrupada.reserva.fecha;
      dom.horaReserva.value = agrupada.reserva.hora.substring(0, 5);
      dom.btnCancelar.style.display = "block";

      goToStep(1);
    }
  };

  function mostrarConfirmacion(titulo, mensaje, txtCancelar, txtConfirmar) {
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
      setTimeout(() => modal.classList.add("show"), 10);

      modal.querySelector(".modal-confirmacion-cancelar").onclick = () => { modal.remove(); resolve(false); };
      modal.querySelector(".modal-confirmacion-confirmar").onclick = () => { modal.remove(); resolve(true); };
    });
  }

  function showNotification(text, type = "success") {
    const notif = document.createElement("div");
    notif.className = `notification-client ${type}`;
    notif.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check' : 'triangle-exclamation'}"></i> <span>${text}</span>`;
    dom.notifContainer.appendChild(notif);
    setTimeout(() => notif.classList.add("show"), 10);
    setTimeout(() => { notif.classList.remove("show"); setTimeout(() => notif.remove(), 300); }, 4000);
  }

  function configurarEventos() {
    dom.btnGuardar.addEventListener("click", procesarGuardado);

    dom.btnGoToTables.addEventListener("click", () => goToStep(2));
    dom.volverBtn.addEventListener("click", () => goToStep(1));

    dom.volverZonasBtn.addEventListener("click", () => {
      dom.mesasView.style.display = "none";
      dom.zonasView.style.display = "block";
      renderZonas();
    });

    dom.btnConfirmarMesas.addEventListener("click", () => goToStep(1));

    dom.fechaReserva.addEventListener("change", actualizarDisponibilidadMesas);
    dom.horaReserva.addEventListener("change", actualizarDisponibilidadMesas);

    dom.btnCancelar.addEventListener("click", () => {
      mostrarConfirmacion("¿Descartar vista?", "Volverás a la pantalla de crear reserva nueva.", "No", "Sí, descartar")
        .then(confirmar => { if (confirmar) resetearFormulario(); });
    });
  }

  return { iniciar };
})();

document.addEventListener("DOMContentLoaded", PanelClienteApp.iniciar);