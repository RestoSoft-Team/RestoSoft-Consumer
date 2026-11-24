import { API_BASE, TOKEN } from "./config.js";

// ─────────────────────────────────────────────
// HEADERS COMUNES CON AUTORIZACIÓN
// ─────────────────────────────────────────────
function getAuthHeaders(extraHeaders = {}) {
    return {
        ...extraHeaders,
        "Authorization": `Bearer ${TOKEN}`
    };
}

export const apiAsistencia = {

    /**
     * Registra la entrada del empleado seleccionado en el dropdown.
     * La empresa se resuelve en el back a partir del token (JWT).
     * El body solo lleva el dato funcional: el usuario del turno.
     */
    registrarEntrada: async (idUsuario) => {
        const response = await fetch(`${API_BASE}/asistencias/entrada`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ idusuario: idUsuario })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Error ${response.status}`);
        }
        return await response.json();
    },

    /**
     * Registra la salida de un empleado cerrando un registro abierto.
     * PATCH /api/asistencias/{id}/salida
     */
    registrarSalida: async (idAsistencia) => {
        const response = await fetch(
            `${API_BASE}/asistencias/${idAsistencia}/salida`,
            { 
                method: "PATCH",
                headers: getAuthHeaders()
            }
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Error ${response.status}`);
        }
        return await response.json();
    },

    /**
     * Lista el historial de asistencia del empleado seleccionado.
     * La empresa se resuelve en el back a partir del token (JWT).
     * GET /api/asistencias/usuario/{idUsuario}
     */
    listar: async (idUsuario) => {
        try {
            const response = await fetch(
                `${API_BASE}/asistencias/usuario/${idUsuario}`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );
            if (!response.ok) throw new Error(`Error ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Fallo de API [listar asistencia]:", error);
            return [];
        }
    },

    /**
     * Marca asistencia mediante lector de código de barras (kiosco público).
     * La pantalla del kiosco no tiene sesión: la empresa llega por la URL
     * del enlace (?empresa=N) hasta que el back resuelva la empresa del
     * usuario a partir del propio carnet (tarea pendiente de back).
     */
    marcarPorCodigo: async (codigoBarras, idEmpresa) => {
        const response = await fetch(`${API_BASE}/asistencias/marcar`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ codigoBarras, idEmpresa })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `Error ${response.status}`);
        return data;
    }
};