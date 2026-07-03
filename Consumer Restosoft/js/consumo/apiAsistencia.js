import { API_BASE, token } from "./config.js";

// ─────────────────────────────────────────────
// HEADERS COMUNES CON AUTORIZACIÓN
// ─────────────────────────────────────────────
function getAuthHeaders(extraHeaders = {}) {
    return {
        ...extraHeaders,
        "Authorization": `Bearer ${token}`
    };
}

export const apiAsistencia = {

    /**
     * Registra la entrada de un empleado.
     */
    registrarEntrada: async (idUsuario, idEmpresa) => {
        const response = await fetch(`${API_BASE}/asistencias/entrada`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ idusuario: idUsuario, idempresa: idEmpresa })
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
     * Lista el historial de asistencia de un empleado.
     * GET /api/asistencias/usuario/{idUsuario}/empresa/{idEmpresa}
     */
    listar: async (idUsuario, idEmpresa) => {
        try {
            // --- CORRECCIÓN DE LA URL AQUÍ ---
            const response = await fetch(
                `${API_BASE}/asistencias/usuario/${idUsuario}/empresa/${idEmpresa}`,
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
     * Marca asistencia mediante lector de código de barras.
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