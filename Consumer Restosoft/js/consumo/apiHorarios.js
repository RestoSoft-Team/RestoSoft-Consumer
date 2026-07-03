import { API_BASE, token } from "../consumo/config.js";

// ─────────────────────────────────────────────
// HEADERS COMUNES CON AUTORIZACIÓN
// ─────────────────────────────────────────────
function getAuthHeaders(extraHeaders = {}) {
    return {
        ...extraHeaders,
        "Authorization": `Bearer ${token}`
    };
}

export const apiHorarios = {

    /**
     * Lista los horarios de un empleado en una empresa.
     * GET /api/horarios/usuario/{idUsuario}/empresa/{idEmpresa}
     */
    listar: async (idUsuario, idEmpresa) => {
        try {
            const r = await fetch(
                `${API_BASE}/horarios/usuario/${idUsuario}/empresa/${idEmpresa}`,
                {
                    headers: getAuthHeaders()
                }
            );
            if (!r.ok) throw new Error(`Error ${r.status}`);
            return await r.json();
        } catch (e) {
            console.error("Fallo de API [listar horarios]:", e);
            return [];
        }
    },

    /**
     * Crea un horario.
     * POST /api/horarios
     */
    crear: async (data) => {
        const r = await fetch(`${API_BASE}/horarios`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(data)
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.message || `Error ${r.status}`);
        }
        return await r.json();
    },

    /**
     * Actualiza un horario existente.
     * PUT /api/horarios/{id}
     */
    actualizar: async (id, data) => {
        const r = await fetch(`${API_BASE}/horarios/${id}`, {
            method: "PUT",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(data)
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.message || `Error ${r.status}`);
        }
        return await r.json();
    },

    /**
     * Elimina un horario.
     * DELETE /api/horarios/{id}
     */
    eliminar: async (id) => {
        const r = await fetch(`${API_BASE}/horarios/${id}`, { 
            method: "DELETE",
            headers: getAuthHeaders()
        });
        return r.ok;
    }

};