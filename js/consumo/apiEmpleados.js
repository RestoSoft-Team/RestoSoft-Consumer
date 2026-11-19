import { API_BASE, TOKEN } from "../consumo/config.js";

// ─────────────────────────────────────────────
// HEADERS COMUNES CON AUTORIZACIÓN
// ─────────────────────────────────────────────
function getAuthHeaders(extraHeaders = {}) {
    return {
        ...extraHeaders,
        "Authorization": `Bearer ${TOKEN}`
    };
}

export const apiEmpleados = {

    /**
     * Lista todos los empleados de la empresa del usuario autenticado.
     * GET /api/usuarios
     */
    listar: async () => {
        try {
            const response = await fetch(
                `${API_BASE}/usuarios`,
                { headers: getAuthHeaders() }
            );
            if (!response.ok) {
                throw new Error("Error al listar empleados");
            }
            return await response.json();
        } catch (error) {
            console.error("Fallo de API [listar empleados]:", error);
            return [];
        }
    },

    /**
     * Obtiene un empleado por su ID.
     * GET /api/usuarios/{id}
     */
    obtener: async (id) => {
        try {
            const response = await fetch(
                `${API_BASE}/usuarios/${id}`,
                { headers: getAuthHeaders() }
            );
            if (!response.ok) {
                throw new Error(`Error al obtener empleado ${id}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Fallo de API [obtener empleado]:", error);
            return null;
        }
    },

    /**
     * Crea un nuevo empleado.
     * POST /api/usuarios/empleados
     */
    crear: async (data, imagen = null) => {
        try {
            const formData = new FormData();
            formData.append(
                "empleado",
                new Blob([JSON.stringify(data)], { type: "application/json" })
            );
            if (imagen) {
                formData.append("imagen", imagen);
            }
            const response = await fetch(
                `${API_BASE}/usuarios/empleados`,
                {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${TOKEN}` },
                    body: formData
                }
            );
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const mensaje = errorBody.message || `Error ${response.status}`;
                throw new Error(mensaje);
            }
            return await response.json();
        } catch (error) {
            console.error("Fallo de API [crear empleado]:", error);
            throw error;
        }
    },

    /**
     * Actualiza un empleado existente.
     * PUT /api/usuarios/{id}
     */
    actualizar: async (id, data, imagen = null) => {
        try {
            const formData = new FormData();
            formData.append(
                "empleado",
                new Blob([JSON.stringify(data)], { type: "application/json" })
            );
            if (imagen) {
                formData.append("imagen", imagen);
            }
            const response = await fetch(
                `${API_BASE}/usuarios/${id}`,
                {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${TOKEN}` },
                    body: formData
                }
            );
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const mensaje = errorBody.message || `Error ${response.status}`;
                throw new Error(mensaje);
            }
            return await response.json();
        } catch (error) {
            console.error("Fallo de API [actualizar empleado]:", error);
            throw error;
        }
    },

    /**
     * Elimina un empleado por su ID.
     * DELETE /api/usuarios/{id}
     */
    eliminar: async (id) => {
        try {
            const response = await fetch(
                `${API_BASE}/usuarios/${id}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders()
                }
            );
            return response.ok;
        } catch (error) {
            console.error("Fallo de API [eliminar empleado]:", error);
            return false;
        }
    },

    /**
     * Lista todos los roles disponibles.
     * GET /api/roles
     */
    listarRoles: async () => {
        try {
            const response = await fetch(
                `${API_BASE}/roles`,
                { headers: getAuthHeaders() }
            );
            if (!response.ok) {
                throw new Error("Error al listar roles");
            }
            return await response.json();
        } catch (error) {
            console.error("Fallo de API [listar roles]:", error);
            return [];
        }
    },

    /**
     * Asigna o regenera el código de barras del carnet.
     * PATCH /api/usuarios/{id}/codigo-barras
     * → El string del código se almacena en la base de datos.
     */
    asignarCodigoBarras: async (id, codigoBarras) => {
        try {
            const response = await fetch(
                `${API_BASE}/usuarios/${id}/codigo-barras`,
                {
                    method: "PATCH",
                    headers: getAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ codigoBarras })
                }
            );
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || `Error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Fallo de API [asignar código de barras]:", error);
            throw error;
        }
    }

};