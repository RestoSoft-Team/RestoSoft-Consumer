import { api } from '../consumo/apiPlanoMesas.js';

let state = {
    step: 1,
    zonas: [],
    mesas: [],
    planoUrl: null,
    selectedTables: [],
    modalPaso3Visto: false
};

let isDragging = false;
let isSelecting = false;
let isClickForCreation = true;
let ultimoTiempoClick = 0;
let ultimoClickX = 0;
let ultimoClickY = 0;
let selStartX = 0, selStartY = 0, selCurrX = 0, selCurrY = 0;

const canvas = document.getElementById("restaurantCanvas");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");
const GRID_SIZE = 20;

// --- FUNCIONES DE APOYO ---
window.showNotification = (text, type = 'success') => {
    const notification = document.getElementById("notification");
    const notificationText = document.getElementById("notificationText");
    const notificationIcon = document.getElementById("notificationIcon");
    const notificationTitle = document.getElementById("notificationTitle");

    if (notification && notificationText) {
        notificationText.textContent = text;
        notification.className = "notification";
        notificationIcon.className = "";
        if (type === 'success') { notification.classList.add("success"); notificationIcon.className = "fa-solid fa-circle-check"; notificationTitle.textContent = "Operación Exitosa"; }
        else if (type === 'warning') { notification.classList.add("warning"); notificationIcon.className = "fa-solid fa-triangle-exclamation"; notificationTitle.textContent = "Aviso"; }
        else if (type === 'error') { notification.classList.add("error"); notificationIcon.className = "fa-solid fa-circle-xmark"; notificationTitle.textContent = "Error"; }
        notification.classList.add("show");
        setTimeout(() => notification.classList.remove("show"), 6000);
    }
};

function getTableBounds(mesa) {
    const C = parseInt(mesa.disponibilidadPersonas) || 4;
    let halfW = 27, halfH = 27;
    if (C > 6) { halfW = 48; halfH = 27; }
    const margin = 10;
    return {
        minX: halfW + 8 + margin, maxX: canvas.width - (halfW + 8 + margin),
        minY: halfH + 8 + margin, maxY: canvas.height - (halfH + 8 + margin)
    };
}

function verificarColision(nuevaX, nuevaY, idMesaIgnorada, idZona) {
    const DISTANCIA_MINIMA = 65;
    return state.mesas.some(m => {
        if (m.id === idMesaIgnorada) return false;
        if (m.idZona !== idZona) return false;
        const distancia = Math.sqrt(Math.pow(m.x - nuevaX, 2) + Math.pow(m.y - nuevaY, 2));
        return distancia < DISTANCIA_MINIMA;
    });
}

function actualizarResumen() {
    document.getElementById("totalMesas").textContent = state.mesas.length;
    document.getElementById("totalZonas").textContent = state.zonas.length;
    const capacidad = state.mesas.reduce((sum, mesa) => sum + (parseInt(mesa.disponibilidadPersonas) || 0), 0);
    document.getElementById("capacidadTotal").textContent = capacidad;
}

function alinearCoordenadaSimetrica(valor) { return Math.round(valor / GRID_SIZE) * GRID_SIZE; }

// --- CARGA INICIAL DESDE BACKEND ---
async function cargarPlanoExistente() {
    try {
        const { zonas, mesas } = await api.obtenerPlanoEmpresa();
        
        state.zonas = zonas.map(z => ({
            id: z.id,
            nombre: z.nombreZona,
            idDB: z.id
        }));
        
        state.mesas = mesas.map(m => ({
            id: m.id,
            numero: m.numeroMesa,
            x: m.posicionX,
            y: m.posicionY,
            tipo: m.tipoMesa,
            disponibilidadPersonas: m.disponibilidadPersonas,
            estado: m.estado,
            idZona: m.idZona,
            idDB: m.id
        }));
        
        if (state.zonas.length > 0) state.planoUrl = state.zonas[0].planoUrl;
        
        renderZonas();
        actualizarSelectorZonas();
        renderCanvas();
        actualizarResumen();
    } catch (error) {
        showNotification("Error al cargar el plano actual.", "error");
    }
}

// --- CONTROL DEL WIZARD ---
window.goToStep = (step) => {
    state.step = step;
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active-step'));
    document.getElementById(`step${step}`).classList.add('active-step');
    document.querySelectorAll('.step').forEach((item, index) => {
        item.classList.remove('active');
        if (index + 1 === step) item.classList.add('active');
    });

    if (step === 3) {
        actualizarSelectorZonas();
        if (state.zonas.length > 0) {
            document.getElementById("zonaSelector").value = state.zonas[0].id;
            renderCanvas();
        }
    }

    if (step === 4) {
        const previewBox = document.getElementById("previewBox");
        previewBox.innerHTML = '';
        previewBox.style.display = 'flex';
        previewBox.style.flexWrap = 'wrap';
        previewBox.style.gap = '20px';
        previewBox.style.justifyContent = 'center';
        previewBox.style.padding = '20px 0';

        const idZonaOriginal = document.getElementById("zonaSelector").value;
        state.zonas.forEach(zona => {
            document.getElementById("zonaSelector").value = zona.id;
            renderCanvas(false);
            const dataUrl = canvas.toDataURL("image/png");
            const zoneContainer = document.createElement('div');
            zoneContainer.style.textAlign = 'center';
            zoneContainer.innerHTML = `<h5 style="margin-bottom: 12px; font-weight: 700; color: var(--primary);">${zona.nombre}</h5><img src="${dataUrl}" style="width: 280px; border-radius: 12px; box-shadow: var(--shadow); border: 2px solid #eee;" />`;
            previewBox.appendChild(zoneContainer);
        });
        document.getElementById("zonaSelector").value = idZonaOriginal;
        renderCanvas();
    }
    actualizarResumen();
};

// --- GESTIÓN DE ZONAS ---
document.getElementById("addZonaBtn").addEventListener("click", () => {
    const zonaInput = document.getElementById("zonaInput");
    const nombre = zonaInput.value.trim();
    if (!nombre) return;
    state.zonas.push({ id: Date.now(), nombre, idDB: null });
    renderZonas();
    zonaInput.value = "";
    showNotification("Zona agregada. Recuerda guardar los cambios.", "success");
});

window.eliminarZona = (id) => {
    state.zonas = state.zonas.filter(z => z.id !== id);
    state.mesas = state.mesas.filter(m => m.idZona !== id);
    renderZonas();
    actualizarResumen();
    showNotification("Zona eliminada. Recuerda guardar los cambios.", "success");
};

function renderZonas() {
    const zonasContainer = document.getElementById("zonasContainer");
    zonasContainer.innerHTML = state.zonas.map(z => `
        <div class="zone-badge">
            <span>${z.nombre}</span>
            <button class="zone-delete" onclick="eliminarZona(${z.id})"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `).join('');
    document.getElementById("totalZonas").textContent = state.zonas.length;
}

function actualizarSelectorZonas() {
    const selector = document.getElementById("zonaSelector");
    selector.innerHTML = '<option value="">Selecciona una Zona...</option>' + state.zonas.map(z => `<option value="${z.id}">${z.nombre}</option>`).join('');
}

document.getElementById("zonaSelector").addEventListener("change", () => {
    state.selectedTables = [];
    renderCanvas();
    renderPropertiesPanel();
});

// --- MOTOR CANVAS ---
function mapearToqueAMouse(eventoTactil) {
    if (eventoTactil.cancelable) { eventoTactil.preventDefault(); }
    const toque = eventoTactil.touches[0] || eventoTactil.changedTouches[0];
    let tipoEventoMouse = "";
    switch (eventoTactil.type) {
        case "touchstart": tipoEventoMouse = "mousedown"; break; case "touchmove": tipoEventoMouse = "mousemove"; break;
        case "touchend": tipoEventoMouse = "mouseup"; break; case "touchcancel": tipoEventoMouse = "mouseleave"; break;
    }
    const eventoMouse = new MouseEvent(tipoEventoMouse, { clientX: toque ? toque.clientX : 0, clientY: toque ? toque.clientY : 0, bubbles: true, cancelable: true, ctrlKey: false });
    eventoTactil.target.dispatchEvent(eventoMouse);
}
canvas.addEventListener("touchstart", mapearToqueAMouse, { passive: false });
canvas.addEventListener("touchmove", mapearToqueAMouse, { passive: false });
canvas.addEventListener("touchend", mapearToqueAMouse, { passive: false });
canvas.addEventListener("touchcancel", mapearToqueAMouse, { passive: false });

canvas.addEventListener("mousedown", (e) => {
    const selector = document.getElementById("zonaSelector"); const idZonaSeleccionada = parseInt(selector.value);
    if (!idZonaSeleccionada) { showNotification("¡Debes seleccionar una zona arriba primero!", 'warning'); return; }
    const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX; const clickY = (e.clientY - rect.top) * scaleY;
    
    let mesaClickeada = state.mesas.find(m => {
        if (m.idZona !== idZonaSeleccionada) return false;
        if (m.disponibilidadPersonas > 6) { return Math.abs(clickX - m.x) <= 48 && Math.abs(clickY - m.y) <= 27; }
        else { return Math.sqrt(Math.pow(m.x - clickX, 2) + Math.pow(m.y - clickY, 2)) <= 27; }
    });

    if (mesaClickeada) {
        if (e.ctrlKey) {
            const idx = state.selectedTables.findIndex(t => t.id === mesaClickeada.id);
            if (idx > -1) state.selectedTables.splice(idx, 1); else state.selectedTables.push(mesaClickeada);
        } else { if (!state.selectedTables.some(t => t.id === mesaClickeada.id)) { state.selectedTables = [mesaClickeada]; } }
        isDragging = true; isClickForCreation = false;
        state.selectedTables.forEach(t => { t.dragOffsetX = clickX - t.x; t.dragOffsetY = clickY - t.y; t.originalX = t.x; t.originalY = t.y; });
        renderPropertiesPanel();
    } else {
        isSelecting = true; isClickForCreation = true; selStartX = clickX; selStartY = clickY; selCurrX = clickX; selCurrY = clickY;
        if (!e.ctrlKey) state.selectedTables = []; renderPropertiesPanel();
    }
    renderCanvas();
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX; const mouseY = (e.clientY - rect.top) * scaleY;
    if (isDragging) {
        state.selectedTables.forEach(t => {
            let newX = mouseX - t.dragOffsetX; let newY = mouseY - t.dragOffsetY;
            const bounds = getTableBounds(t);
            if (newX < bounds.minX) newX = bounds.minX; if (newX > bounds.maxX) newX = bounds.maxX;
            if (newY < bounds.minY) newY = bounds.minY; if (newY > bounds.maxY) newY = bounds.maxY;
            t.x = newX; t.y = newY;
        });
        renderCanvas();
    } else if (isSelecting) {
        if (Math.abs(mouseX - selStartX) > 5 || Math.abs(mouseY - selStartY) > 5) { isClickForCreation = false; }
        selCurrX = mouseX; selCurrY = mouseY; renderCanvas();
    }
});

const detenerEventosRaton = () => {
    const idZonaSeleccionada = parseInt(document.getElementById("zonaSelector").value);
    if (isDragging) {
        let huboChoque = false;
        state.selectedTables.forEach(t => {
            let snappedX = alinearCoordenadaSimetrica(t.x); let snappedY = alinearCoordenadaSimetrica(t.y);
            const bounds = getTableBounds(t);
            if (snappedX < bounds.minX) snappedX = bounds.minX; if (snappedX > bounds.maxX) snappedX = bounds.maxX;
            if (snappedY < bounds.minY) snappedY = bounds.minY; if (snappedY > bounds.maxY) snappedY = bounds.maxY;
            if (verificarColision(snappedX, snappedY, t.id, idZonaSeleccionada)) { t.x = t.originalX; t.y = t.originalY; huboChoque = true; }
            else { t.x = snappedX; t.y = snappedY; }
        });
        if (huboChoque) { window.showNotification("Espacio ocupado. La mesa regresó a su posición original.", "warning"); }
        isDragging = false; actualizarResumen(); renderCanvas();
    } else if (isSelecting) {
        isSelecting = false;
        if (isClickForCreation) {
            const tiempoActual = new Date().getTime(); const tiempoDiferencia = tiempoActual - ultimoTiempoClick;
            const distanciaClicks = Math.sqrt(Math.pow(selStartX - ultimoClickX, 2) + Math.pow(selStartY - ultimoClickY, 2));
            if (tiempoDiferencia < 400 && distanciaClicks < 20) {
                let nuevaX = alinearCoordenadaSimetrica(selStartX); let nuevaY = alinearCoordenadaSimetrica(selStartY);
                const tempBounds = getTableBounds({disponibilidadPersonas: 4});
                if (nuevaX < tempBounds.minX) nuevaX = tempBounds.minX; if (nuevaX > tempBounds.maxX) nuevaX = tempBounds.maxX;
                if (nuevaY < tempBounds.minY) nuevaY = tempBounds.minY; if (nuevaY > tempBounds.maxY) nuevaY = tempBounds.maxY;
                if (verificarColision(nuevaX, nuevaY, null, idZonaSeleccionada)) {
                    window.showNotification("No puedes crear una mesa sobre otra existente.", "warning");
                    renderCanvas(); ultimoTiempoClick = 0; return;
                }
                let sugerenciaNumero = state.mesas.length + 1;
                while (state.mesas.some(m => String(m.numero) === String(sugerenciaNumero))) { sugerenciaNumero++; }
                const nuevaMesa = { id: Date.now(), numero: sugerenciaNumero, x: nuevaX, y: nuevaY, tipo: 'estándar', disponibilidadPersonas: 4, estado: 'LIBRE', idZona: idZonaSeleccionada, idDB: null };
                state.mesas.push(nuevaMesa); state.selectedTables = [nuevaMesa];
                renderPropertiesPanel(); actualizarResumen(); ultimoTiempoClick = 0;
            } else {
                ultimoTiempoClick = tiempoActual; ultimoClickX = selStartX; ultimoClickY = selStartY;
                state.selectedTables = []; renderPropertiesPanel();
            }
        } else {
            const minX = Math.min(selStartX, selCurrX); const maxX = Math.max(selStartX, selCurrX);
            const minY = Math.min(selStartY, selCurrY); const maxY = Math.max(selStartY, selCurrY);
            const mesasEnCaja = state.mesas.filter(m => { return m.idZona === idZonaSeleccionada && m.x >= minX && m.x <= maxX && m.y >= minY && m.y <= maxY; });
            mesasEnCaja.forEach(m => { if (!state.selectedTables.some(t => t.id === m.id)) { state.selectedTables.push(m); } });
            renderPropertiesPanel();
        }
        renderCanvas();
    }
};
canvas.addEventListener("mouseup", detenerEventosRaton);
canvas.addEventListener("mouseleave", detenerEventosRaton);

function drawGourmetTable(ctx, mesa, numeroGlobal, isSelected) {
    const C = parseInt(mesa.disponibilidadPersonas) || 4;
    ctx.save();
    let mainColor = "#22521b"; let strokeColor = "#4a121a";
    if (mesa.estado === 'OCUPADA') { mainColor = "#d32f2f"; strokeColor = "#7f0000"; }
    else if (mesa.estado === 'RESERVADA') { mainColor = "#ff9800"; strokeColor = "#e65100"; }
    else if (mesa.estado === 'FUERA_SERVICIO' || mesa.estado === 'INACTIVA') { mainColor = "#757575"; strokeColor = "#424242"; }
    if (isSelected) { ctx.shadowColor = "#ff9800"; ctx.shadowBlur = 12; strokeColor = "#e65100"; }
    if (C > 6) {
        const width = 96; const height = 54; const xPos = mesa.x - width / 2; const yPos = mesa.y - height / 2;
        ctx.fillStyle = "#333333"; ctx.shadowBlur = 0;
        let sillasPorLado = Math.ceil((C - 2) / 2); let gapX = width / (sillasPorLado + 1);
        for (let i = 1; i <= sillasPorLado; i++) { ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos - 6, 6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(xPos + (i * gapX), yPos + height + 6, 6, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); ctx.arc(xPos - 6, mesa.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(xPos + width + 6, mesa.y, 6, 0, Math.PI * 2); ctx.fill();
        if (isSelected) ctx.shadowBlur = 12;
        ctx.fillStyle = mainColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath(); ctx.roundRect(xPos, yPos, width, height, 8); ctx.fill(); ctx.stroke();
    } else {
        const radius = 27; ctx.fillStyle = "#333333"; ctx.shadowBlur = 0;
        for (let i = 0; i < C; i++) { const angle = (i * 2 * Math.PI) / C; const chairX = mesa.x + (radius + 8) * Math.cos(angle); const chairY = mesa.y + (radius + 8) * Math.sin(angle); ctx.beginPath(); ctx.arc(chairX, chairY, 6, 0, Math.PI * 2); ctx.fill(); }
        if (isSelected) ctx.shadowBlur = 12;
        ctx.fillStyle = mainColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        if (mesa.tipo === 'redonda') { ctx.arc(mesa.x, mesa.y, radius, 0, Math.PI * 2); }
        else { ctx.roundRect(mesa.x - radius, mesa.y - radius, radius * 2, radius * 2, 6); }
        ctx.fill(); ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px Inter, Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(numeroGlobal, mesa.x, mesa.y);
    ctx.restore();
}

function renderCanvas(mostrarTodas = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fafafa"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#eef0f2"; ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
    for (let i = 0; i < canvas.height; i += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }
    const idZonaSeleccionada = parseInt(document.getElementById("zonaSelector").value);
    const mesasAMostrar = mostrarTodas ? state.mesas : state.mesas.filter(m => m.idZona === idZonaSeleccionada);
    mesasAMostrar.forEach((mesa) => {
        const isSelected = state.selectedTables.some(t => t.id === mesa.id);
        drawGourmetTable(ctx, mesa, mesa.numero, isSelected);
    });
    if (isSelecting && !isClickForCreation) {
        ctx.fillStyle = "rgba(107, 30, 40, 0.15)"; ctx.strokeStyle = "#6b1e28"; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
        const width = selCurrX - selStartX; const height = selCurrY - selStartY;
        ctx.fillRect(selStartX, selStartY, width, height); ctx.strokeRect(selStartX, selStartY, width, height);
        ctx.setLineDash([]);
    }
}

function renderPropertiesPanel() {
    const panel = document.getElementById("propertiesPanel");
    if (state.selectedTables.length === 0) {
        panel.innerHTML = `<div class="empty-state"><i class="fa-solid fa-object-group"></i><h5>Selecciona tus mesas</h5><p>Haz clic para seleccionar una, usa <b>Ctrl+Clic</b> o <b>arrastra</b> una caja para selección masiva.</p></div>`;
        return;
    }
    const isMulti = state.selectedTables.length > 1;
    const refTable = state.selectedTables[0];
    const titulo = isMulti ? `Selección Multiple (${state.selectedTables.length} mesas)` : `Mesa #${refTable.numero}`;

    panel.innerHTML = `
        <h4 style="margin-bottom: 20px;">${titulo}</h4>
        <div style="display: flex; flex-direction: column; gap: 15px;">
            ${!isMulti ? `<div><label style="font-size: 12px; color: var(--gray);">Número de Mesa</label><input type="text" id="editNumero" class="custom-input" style="width: 100%; margin-top: 5px;" value="${refTable.numero}"></div>` : ''}
            <div><label style="font-size: 12px; color: var(--gray);">Tipo de Mesa</label><select id="editTipo" class="custom-input" style="width: 100%; margin-top: 5px;"><option value="estándar" ${refTable.tipo === 'estándar' ? 'selected' : ''}>Estándar (Cuadrada)</option><option value="redonda" ${refTable.tipo === 'redonda' ? 'selected' : ''}>Redonda</option><option value="vip" ${refTable.tipo === 'vip' ? 'selected' : ''}>VIP</option></select></div>
            <div><label style="font-size: 12px; color: var(--gray);">Disponibilidad (Personas)</label><input type="number" id="editPersonas" class="custom-input" style="width: 100%; margin-top: 5px;" value="${refTable.disponibilidadPersonas}" min="1" max="55"><small id="helperForma" style="color: #0d6efd; font-size:11px; margin-top:4px; display:block;">${isMulti ? ' Se aplicará la forma a todo el grupo seleccionado' : (refTable.disponibilidadPersonas > 6 ? ' Forma: Mesa Imperial Alargada' : ' Forma: Mesa Confort Estándar')}</small></div>
            <div><label style="font-size: 12px; color: var(--gray);">Estado Actual</label><select id="editEstado" class="custom-input" style="width: 100%; margin-top: 5px;"><option value="LIBRE" ${refTable.estado === 'LIBRE' ? 'selected' : ''}>Libre (Borgoña)</option><option value="OCUPADA" ${refTable.estado === 'OCUPADA' ? 'selected' : ''}>Ocupada (Rojo)</option><option value="RESERVADA" ${refTable.estado === 'RESERVADA' ? 'selected' : ''}>Reservada (Naranja)</option><option value="FUERA_SERVICIO" ${refTable.estado === 'FUERA_SERVICIO' ? 'selected' : ''}>Fuera de Servicio (Gris)</option></select></div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="btnGuardarEdicion" class="btn-primary-custom" style="flex: 1; padding: 10px;">Deseleccionar</button>
                <button id="btnEliminarMesa" class="btn-outline-custom" style="color: var(--danger); border-color: var(--danger); padding: 10px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;

    if (!isMulti) {
        document.getElementById("editNumero").addEventListener("change", (e) => {
            refTable.numero = e.target.value; renderCanvas(); renderPropertiesPanel();
        });
    }
    document.getElementById("editPersonas").addEventListener("input", (e) => {
        let val = parseInt(e.target.value) || 1;
        if (val < 1) val = 1;
        if (val > 55) { val = 55; e.target.value = 55; showNotification("La capacidad máxima por mesa es de 55 personas.", "warning"); }
        state.selectedTables.forEach(t => t.disponibilidadPersonas = val);
        if (!isMulti) document.getElementById("helperForma").textContent = val > 6 ? "✨ Forma: Mesa Imperial Alargada" : "✨ Forma: Mesa Confort Estándar";
        renderCanvas(); actualizarResumen();
    });
    document.getElementById("editTipo").addEventListener("change", (e) => { state.selectedTables.forEach(t => t.tipo = e.target.value); renderCanvas(); });
    document.getElementById("editEstado").addEventListener("change", (e) => { state.selectedTables.forEach(t => t.estado = e.target.value); renderCanvas(); });
    document.getElementById("btnGuardarEdicion").addEventListener("click", () => { state.selectedTables = []; renderCanvas(); renderPropertiesPanel(); });
    document.getElementById("btnEliminarMesa").addEventListener("click", () => {
        const idsToDelete = state.selectedTables.map(t => t.id);
        state.mesas = state.mesas.filter(m => !idsToDelete.includes(m.id));
        state.selectedTables = []; renderCanvas(); actualizarResumen(); renderPropertiesPanel();
        showNotification(isMulti ? `${idsToDelete.length} Mesas eliminadas` : "Mesa eliminada", "success");
    });
}

const btnResubir = document.getElementById("btnResubir");
if (btnResubir) {
    btnResubir.addEventListener("click", () => {
        document.getElementById("fileInput").click();
    });
}

fileInput.addEventListener("change", async e => {
    const archivo = e.target.files[0]; 
    if (!archivo) return;
    
    document.getElementById("previewImage").src = URL.createObjectURL(archivo);
    document.getElementById("previewContainer").style.display = "block";
    document.getElementById("dropzoneContent").style.display = "none";
    document.getElementById("loadingOverlay").style.display = "flex";

    const formData = new FormData(); 
    formData.append("imagen", archivo);
    
    try {
        const respuesta = await api.subirImagenPlanoPrivada(formData);
        state.planoUrl = respuesta.url;
        
        if (respuesta.mesasDetectadas) {
            const zonasIA = JSON.parse(respuesta.mesasDetectadas);
            let contadorMesasIA = state.mesas.length + 1;
            
            zonasIA.forEach(zonaIA => {
                let zonaUsuario = state.zonas.find(z => z.nombre.toLowerCase() === zonaIA.nombreZona.toLowerCase());
                if (zonaUsuario && zonaIA.mesas) {
                    
                    state.mesas = state.mesas.filter(m => m.idZona !== zonaUsuario.id);
                    
                    zonaIA.mesas.forEach(mesaIA => {
                        state.mesas.push({
                            id: Date.now() + Math.random(), 
                            numero: "M-" + contadorMesasIA++,
                            x: parseFloat(mesaIA.posicionX) || 0, 
                            y: parseFloat(mesaIA.posicionY) || 0,
                            tipo: mesaIA.tipoMesa || 'estándar', 
                            disponibilidadPersonas: 4, 
                            estado: 'LIBRE',
                            idZona: zonaUsuario.id, 
                            idDB: null
                        });
                    });
                }
            });
            showNotification(`¡Análisis completo! Mesas actualizadas.`, 'success');
            renderCanvas(); 
            actualizarResumen();
        }
    } catch (error) {
        showNotification("Error al procesar el plano.", 'error');
    } finally {
        document.getElementById("loadingOverlay").style.display = "none"; 
        fileInput.value = '';
    }
});

document.getElementById("savePlanBtn").addEventListener("click", async () => {
    if (state.zonas.length === 0) { showNotification("Debes tener al menos una zona.", "warning"); return; }
    
    const btn = document.getElementById("savePlanBtn");
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'; 
    btn.disabled = true;

    try {
        const zonasRequest = state.zonas.map(z => ({
            id: z.idDB,
            idTemporal: z.idDB ? null : z.id,
            nombreZona: z.nombre,
            planoUrl: state.planoUrl || "diagrama_vectorial.jpg",
            estado: "DISPONIBLE",
            idEmpresa: 0 
        }));
        
        const mesasRequest = state.mesas.map(m => ({
            id: m.idDB,
            numeroMesa: String(m.numero).toUpperCase().startsWith("M-") ? m.numero : "M-" + m.numero,
            disponibilidadPersonas: m.disponibilidadPersonas,
            posicionX: m.x,
            posicionY: m.y,
            tipoMesa: m.tipo,
            estado: m.estado,
            idempresa: 0, 
            idZona: m.idZona 
        }));

        const payloadFinal = { 
            idEmpresa: 0, 
            zonas: zonasRequest, 
            mesas: mesasRequest 
        };

        await api.sincronizarPlano(payloadFinal);
        showNotification("¡Plano actualizado con éxito!", "success");
        
        await cargarPlanoExistente();
        goToStep(1);
        
    } catch (error) {
        showNotification("Error al guardar: " + error.message, "error");
    } finally {
        btn.innerHTML = 'Guardar Cambios'; 
        btn.disabled = false;
    }
});

cargarPlanoExistente();