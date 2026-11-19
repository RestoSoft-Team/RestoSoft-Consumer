import { API_BASE, TOKEN } from "../consumo/config.js";
const API_URL = API_BASE + "/v1/categoria-insumo";

const ApiCategorias = {

    obtenerCategorias: async () => {
        const response = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });
        if (!response.ok) throw new Error("Error al consultar el servidor");
        return await response.json();
    },

    crearCategoria: async (categoriaData) => {
        return await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify(categoriaData)
        });
    },

    actualizarCategoria: async (id, categoriaData) => {
        return await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify(categoriaData)
        });
    },

    eliminarCategoria: async (id) => {
        return await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });
    }
};

export default ApiCategorias;