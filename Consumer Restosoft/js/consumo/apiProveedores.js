// /js/consumo/apiProveedores.js

const API_PROVEEDORES = "http://localhost:8080/api/proveedores";
const API_EMPRESAS = "http://localhost:8080/api/empresa";

// const token = localStorage.getItem("token");
const token =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI2ODc0MTgsImV4cCI6MTc4Mjc3MzgxOH0.xEOf-8izPT5bu64_oCsojldcaD1mcRTZSI3HJ1Xn8ZE";

const ApiProveedores = {
    /**
     * Obtiene todos los proveedores
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
     * Obtiene todas las empresas para el dropdown
     */
    obtenerEmpresas: async () => {
        const response = await fetch(API_EMPRESAS, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error("Error al consultar las empresas");
        return await response.json();
    },

    /**
     * Crea un nuevo proveedor
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