import { API_BASE, TOKEN } from "../consumo/config.js";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiCocina = {
    getPedidosActivos: async () => {
        const response = await fetch(`${API_BASE}/pedido`, { headers: authHeader });
        if (!response.ok) return [];
        const pedidos = await response.json();
        return pedidos.filter(p => p.estado === 'PENDIENTE' || p.estado === 'PREPARANDO' || p.estado === 'LISTO');
    },

    getDetallesPedido: async (idPedido) => {
        const response = await fetch(`${API_BASE}/detallepedido/${idPedido}`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },

    actualizarUnidad: async (idUnidad, estado) => {
        await fetch(`${API_BASE}/detallepedido/unidad/${idUnidad}/estado/${estado}`, {
            method: 'PUT',
            headers: authHeader
        });
    }
};