import { API_BASE, TOKEN } from "../consumo/config.js";

const ApiInventario = {
    obtenerProveedores: async () => {
        const response = await fetch(`${API_BASE}/proveedores`, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });
        if (!response.ok) throw new Error("Error al cargar proveedores");
        return await response.json();
    },

    obtenerCategorias: async () => {
        const response = await fetch(`${API_BASE}/v1/categoria-insumo`, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });
        if (!response.ok) throw new Error("Error al cargar categorías");
        return await response.json();
    },

    crearInsumo: async (payload) => {
        const response = await fetch(`${API_BASE}/insumos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Error del servidor:", response.status, errorBody);
            throw new Error("Error al crear insumo");
        }
        return response;
    },
};

export default ApiInventario;