import { apiProfile } from "./apiProfile.js";
import { TOKEN } from "./config.js";

// ============================================================
// sesionContext.js — Único origen del perfilData de sesión.
//
// Cualquier página del panel que necesite perfilData (empresa,
// usuario, rol) debe llamar a obtenerPerfilSesion():
//
//   import { obtenerPerfilSesion } from "../consumo/sesionContext.js";
//   const perfilData = await obtenerPerfilSesion();
//   if (!perfilData) return; // la sesión era inválida y ya se redirigió
//
// La función:
//   1. Pide el perfil al back con el token de la sesión (GET /usuarios/me).
//   2. Valida que el perfil traiga usuario, rol y empresa (un usuario
//      del panel siempre pertenece a una empresa; si falta, la sesión
//      está corrupta o es de un flujo sin empresa).
//   3. Si algo falla: limpia la sesión y redirige a la página de error,
//      que devuelve a la raíz "/" para iniciar una sesión nueva.
//   4. Si todo está bien: devuelve el perfilData { usuario, empresa, rol }.
// ============================================================

const CLAVES_SESION = [
    "token",
    "perfilData",
    "restsoft_user",
    "restsoft_empresa",
    "restsoft_rol"
];

function limpiarSesion() {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
}

function sesionInvalida(mensaje) {
    limpiarSesion();
    window.location.href =
        "no-encontrado.html?msg=" + encodeURIComponent(mensaje);
    return null;
}

export async function obtenerPerfilSesion() {
    if (!TOKEN) {
        return sesionInvalida(
            "No hay una sesión activa. Vuelve a iniciar sesión desde la página de tu empresa."
        );
    }

    let perfilData = null;
    try {
        perfilData = await apiProfile.obtenerInfoMe();
    } catch (e) {
        return sesionInvalida(
            "No se pudo validar tu sesión. Vuelve a iniciar sesión."
        );
    }

    const empresaOk = perfilData?.empresa && perfilData.empresa.id;
    const usuarioOk = perfilData?.usuario;

    if (!empresaOk || !usuarioOk) {
        return sesionInvalida(
            "No se pudo determinar la empresa de tu sesión. Vuelve a iniciar sesión."
        );
    }

    return perfilData;
}
