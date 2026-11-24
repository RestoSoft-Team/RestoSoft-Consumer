import { apiAsistencia } from "../consumo/apiAsistencia.js";

const input = document.getElementById("inputCodigoBarras");
const titulo = document.getElementById("kioscoTitulo");
const subtitulo = document.getElementById("kioscoSubtitulo");

const params = new URLSearchParams(window.location.search);
// La empresa del kiosco llega por la URL del enlace generado desde el
// panel (kiosco.html?empresa=N). Sin ese parámetro la pantalla no está
// configurada: no se asume ninguna empresa por defecto y no se envía
// nada al back.
const ID_EMPRESA = parseInt(params.get("empresa"), 10);
const kioscoConfigurado = Number.isInteger(ID_EMPRESA) && ID_EMPRESA > 0;

function mostrarKioscoNoConfigurado() {
    document.body.classList.add("error");
    titulo.textContent = "Kiosco no configurado";
    subtitulo.textContent = "Falta el parámetro de empresa en el enlace (?empresa=N)";
    input.readOnly = true;
}

if (!kioscoConfigurado) {
    mostrarKioscoNoConfigurado();
}

function mantenerFoco() { 
    input.focus(); 
}

["click", "touchstart", "blur"].forEach(ev => document.addEventListener(ev, mantenerFoco));
setInterval(mantenerFoco, 500);
window.addEventListener("load", mantenerFoco);

function mostrarResultado(mensaje, tipo) {
    document.body.classList.remove("exito", "salida", "error", "procesando");
    
    if (tipo === "ENTRADA") { 
        document.body.classList.add("exito");  
        titulo.textContent = `✅ Bienvenido, ${mensaje}`; 
        subtitulo.textContent = "Entrada registrada a las " + new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
    }
    else if (tipo === "SALIDA") { 
        document.body.classList.add("salida"); 
        titulo.textContent = `👋 Hasta luego, ${mensaje}`; 
        subtitulo.textContent = "Salida registrada a las " + new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'});
    }
    else { 
        document.body.classList.add("error"); 
        titulo.textContent = `⚠️ ${mensaje}`; 
        subtitulo.textContent = "Intenta de nuevo";
    }
    
    setTimeout(() => {
        document.body.classList.remove("exito", "salida", "error");
        titulo.textContent = "Escanea tu carnet";
        subtitulo.textContent = "Esperando código...";
    }, 3000);
}

async function procesarCodigo(codigo) {
    if (!kioscoConfigurado) {
        mostrarKioscoNoConfigurado();
        return;
    }
    try {
        // Mostrar estado de procesando inmediatamente
        document.body.classList.add("procesando");
        titulo.textContent = "⏳ Procesando...";
        subtitulo.textContent = "Verificando en el sistema";

        const data = await apiAsistencia.marcarPorCodigo(codigo, ID_EMPRESA);
        mostrarResultado(data.nombreCompleto || "Empleado", data.tipoRegistro);
    } catch (e) {
        mostrarResultado(e.message || "Código no válido", "ERROR");
    }
}

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const codigo = input.value.trim(); 
        input.value = "";
        if (codigo.length > 0) procesarCodigo(codigo);
    }
});