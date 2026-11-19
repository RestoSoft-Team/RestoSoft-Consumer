import { API_BASE} from "../consumo/config.js";

export const apiRoles = {

    /** GET /api/roles */
    listar: async () => {
        try {
            const r = await fetch(`${API_BASE}/roles`);
            if (!r.ok) throw new Error(`Error ${r.status}`);
            return await r.json();
        } catch (e) {
            console.error("Fallo de API [listar roles]:", e);
            return [];
        }
    },

    /** POST /api/roles — Body: { nombre } */
    crear: async (nombre) => {
        const r = await fetch(`${API_BASE}/roles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre })
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.message || `Error ${r.status}`);
        }
        return await r.json();
    },

    /** DELETE /api/roles/{id} */
    eliminar: async (id) => {
        const r = await fetch(`${API_BASE}/roles/${id}`, { method: "DELETE" });
        return r.ok;
    }

};