import { API_BASE, token } from "./config.js";

const authHeader = { 'Authorization': `Bearer ${token}` };

export const apiPlato = {
    listarPlatos: async () => {
        const response = await fetch(`${API_BASE}/plato`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    obtenerPlato: async (id) => {
        const response = await fetch(`${API_BASE}/plato/${id}`, { headers: authHeader });
        if (!response.ok) throw new Error("Error al obtener el plato");
        return await response.json();
    },
    crearPlato: async (formData) => {
        const response = await fetch(`${API_BASE}/plato`, {
            method: 'POST',
            headers: authHeader, 
            body: formData
        });
        if (!response.ok) throw new Error("Error al crear el plato");
        return await response.json();
    },
    actualizarPlato: async (id, formData) => {
        const response = await fetch(`${API_BASE}/plato/${id}`, {
            method: 'PUT',
            headers: authHeader,
            body: formData
        });
        if (!response.ok) throw new Error("Error al actualizar el plato");
        return await response.json();
    },
    eliminarPlato: async (id) => {
        const response = await fetch(`${API_BASE}/plato/${id}`, { 
            method: 'DELETE',
            headers: authHeader 
        });
        return response.ok;
    }
};