// /js/consumo/apiProveedores.js

const API_PROVEEDORES = "http://localhost:8080/api/proveedores";
const API_EMPRESAS    = "http://localhost:8080/api/empresa";

const ApiProveedores = {

    /**
     * Obtiene todos los proveedores
     */
    obtenerProveedores: async () => {
        const response = await fetch(API_PROVEEDORES);
        if (!response.ok) throw new Error("Error al consultar los proveedores");
        return await response.json();
    },

    /**
     * Obtiene todas las empresas para el dropdown
     */
    obtenerEmpresas: async () => {
        const response = await fetch(API_EMPRESAS);
        if (!response.ok) throw new Error("Error al consultar las empresas");
        return await response.json();
    },

    /**
     * Crea un nuevo proveedor
     */
    crearProveedor: async (proveedorData) => {
        return await fetch(API_PROVEEDORES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proveedorData)
        });
    },

    /**
     * Actualiza un proveedor existente por ID
     */
    actualizarProveedor: async (id, proveedorData) => {
        return await fetch(`${API_PROVEEDORES}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proveedorData)
        });
    },

    /**
     * Elimina un proveedor por ID
     */
    eliminarProveedor: async (id) => {
        return await fetch(`${API_PROVEEDORES}/${id}`, {
            method: 'DELETE'
        });
    }
};

export default ApiProveedores;