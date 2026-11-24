import { API_BASE, TOKEN } from "../consumo/config.js";

// La empresa se resuelve en el back a partir del token (JWT).
// Ninguna petición de cierre de caja envía identidad de empresa.
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiCierre = {
    obtenerCierrePorFecha: async (fecha) => {
        try {
            const response = await fetch(`${API_BASE}/cierre-caja/fecha?fecha=${fecha}`, {
                headers: authHeader
            });
            if (response.status === 404 || response.status === 204) return null;
            return response.ok ? await response.json() : null;
        } catch (e) {
            return null;
        }
    },
    obtenerResumenDiario: async (fecha) => {
        const response = await fetch(`${API_BASE}/cierre-caja/resumen?fecha=${fecha}`, {
            headers: authHeader
        });
        if (!response.ok) throw new Error("Error al obtener resumen de caja");
        return await response.json();
    },
    guardarCierreCaja: async (data) => {
        const response = await fetch(`${API_BASE}/cierre-caja`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Error al guardar cierre de caja");
        return await response.json();
    }
};
