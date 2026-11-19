import { API_BASE, TOKEN } from "./config.js";

const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiVentas = {
    listarVentas: async () => {
        const response = await fetch(`${API_BASE}/ventas`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    
    listarVentasPorFecha: async (fecha) => {
        const response = await fetch(`${API_BASE}/ventas/fecha?fecha=${fecha}`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    
    obtenerTotalDia: async (fecha) => {
        const response = await fetch(`${API_BASE}/ventas/total-dia?fecha=${fecha}`, { headers: authHeader });
        return response.ok ? await response.json() : 0;
    },
    
    crearVenta: async (data) => {
        const response = await fetch(`${API_BASE}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Error al registrar venta");
        return await response.json();
    }
};