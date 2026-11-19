import { API_BASE, TOKEN } from "./config.js";

const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiCategoria = {
    listarCategorias: async () => {
        const response = await fetch(`${API_BASE}/categorias`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    obtenerCategoria: async (id) => {
        const response = await fetch(`${API_BASE}/categorias/${id}`, { headers: authHeader });
        return response.ok ? await response.json() : null;
    },
    crearCategoria: async (data) => {
        const response = await fetch(`${API_BASE}/categorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Error al crear la categoría");
        return await response.json();
    },
    actualizarCategoria: async (id, data) => {
        const response = await fetch(`${API_BASE}/categorias/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Error al actualizar la categoría");
        return await response.json();
    },
    eliminarCategoria: async (id) => {
        const response = await fetch(`${API_BASE}/categorias/${id}`, { 
            method: 'DELETE',
            headers: authHeader 
        });
        return response.ok;
    }
};