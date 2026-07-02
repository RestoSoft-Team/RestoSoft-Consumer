import { API_BASE, token } from "../consumo/config.js";

export const api = {
    obtenerInsumos: async () => {
        const response = await fetch(`${API_BASE}/insumos`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Error al obtener los insumos del servidor");
        return response.json();
    },

    obtenerInsumoPorId: async (id) => {
        const response = await fetch(`${API_BASE}/insumos/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Error al obtener el insumo");
        return response.json();
    },

    crearInsumo: async (insumoRequest) => {
        const response = await fetch(`${API_BASE}/insumos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(insumoRequest),
        });
        if (!response.ok) throw new Error("Error al crear el insumo");
        return response.json();
    },

    actualizarInsumo: async (id, insumoRequest) => {
        const response = await fetch(`${API_BASE}/insumos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(insumoRequest),
        });
        if (!response.ok) throw new Error("Error al actualizar el insumo");
        return response.json();
    },

    eliminarInsumo: async (id) => {
        const response = await fetch(`${API_BASE}/insumos/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Error al eliminar el insumo");
        return true;
    },

    obtenerProveedores: async () => {
        const response = await fetch(`${API_BASE}/proveedores`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Error al obtener proveedores");
        return response.json();
    },

    obtenerCategorias: async () => {
        const response = await fetch(`${API_BASE}/v1/categoria-insumo`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Error al obtener categorías");
        return response.json();
    },
};