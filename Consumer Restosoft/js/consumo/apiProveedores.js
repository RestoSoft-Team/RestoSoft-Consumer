// /js/consumo/apiProveedores.js

// Elimina el "/v1" para que coincida con tu @RequestMapping("/api/proveedores")
const API_PROVEEDORES = "/api/proveedores"; 
const API_EMPRESAS = "/api/empresas"; // Asegúrate de que en tu EmpresaController también sea /api/empresas

const ApiProveedores = {
    obtenerProveedores: async () => {
        const response = await fetch(API_PROVEEDORES);
        if (!response.ok) throw new Error("Error al consultar los proveedores");
        return await response.json();
    },
    // ... resto del código

    /**
     * Obtiene todas las empresas para llenar el Dropdown List
     */
    obtenerEmpresas: async () => {
        const response = await fetch(API_EMPRESAS);
        if (!response.ok) throw new Error("Error al consultar las empresas");
        return await response.json();
    },

    /**
     * Guarda un nuevo proveedor en la base de datos
     */
    crearProveedor: async (proveedorData) => {
        const response = await fetch(API_PROVEEDORES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proveedorData)
        });
        return response;
    }
};

export default ApiProveedores;