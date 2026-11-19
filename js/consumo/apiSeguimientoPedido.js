import { API_BASE, TOKEN } from "../consumo/config.js";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiSeguimiento = {
    getPedidos: async () => {
        const response = await fetch(`${API_BASE}/pedido`, { headers: authHeader });
        if (!response.ok) return [];
        const pedidos = await response.json();
        return pedidos.filter(p => p.estado === 'PENDIENTE' || p.estado === 'PREPARANDO' || p.estado === 'LISTO');
    }
};