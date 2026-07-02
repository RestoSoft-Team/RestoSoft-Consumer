import { API_BASE, token } from "../consumo/config.js";

const API_PROVEEDORES = API_BASE +"/proveedores";

const ApiProveedores = {
    /**
     * Obtiene todos los proveedores (El backend filtrará por el idEmpresa del token)
     */
    obtenerProveedores: async () => {
        const response = await fetch(API_PROVEEDORES, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error("Error al consultar los proveedores");
        return await response.json();
    },

    /**
     * Crea un nuevo proveedor (Sin idEmpresa en el body, el backend lo infiere del token)
     */
    crearProveedor: async (proveedorData) => {
        return await fetch(API_PROVEEDORES, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(proveedorData),
        });
    },

    /**
     * Actualiza un proveedor existente por ID
     */
    actualizarProveedor: async (id, proveedorData) => {
        return await fetch(`${API_PROVEEDORES}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(proveedorData),
        });
    },

    /**
     * Elimina un proveedor por ID
     */
    eliminarProveedor: async (id) => {
        return await fetch(`${API_PROVEEDORES}/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    },
};

export default ApiProveedores;