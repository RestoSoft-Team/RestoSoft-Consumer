// /js/consumo/apiProveedores.js

const API_PROVEEDORES = "http://localhost:8080/api/proveedores";

// Lee el token del localStorage o usa el hardcodeado para pruebas
const token ="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjozLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI3NzU0NTAsImV4cCI6MTc4Mjg2MTg1MH0._BpqkCoVVywjjLzChkbPQztPsqmhZZ3k4bkPs8pMvoI";

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