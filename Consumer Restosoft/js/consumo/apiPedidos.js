import { API_BASE, token } from "../consumo/config.js";
const authHeader = { 'Authorization': `Bearer ${token}` };

export const apiPedidos = {
    getPedidosActivos: async () => {
        const response = await fetch(`${API_BASE}/pedido`, { headers: authHeader });
        if (!response.ok) return [];
        const pedidos = await response.json();
        return pedidos.filter(p => p.estado !== 'PAGADO' && p.estado !== 'CANCELADO');
    },

    setPedidoActivo: async (idPedido) => {
        try {
            await fetch(`${API_BASE}/sesion/pedido-activo/${idPedido}`, { method: 'POST', headers: { ...authHeader } });
        } catch (error) { console.error("Error al abrir pedido en sesión:", error); }
    },

    getPedidoActivo: async () => {
        try {
            const response = await fetch(`${API_BASE}/sesion/pedido-activo`, { method: 'GET', headers: { ...authHeader } });
            if (response.status === 204) return null;
            if (!response.ok) return null;
            return await response.json(); 
        } catch (error) { return null; }
    },

    cerrarPedidoActivo: async () => {
        try {
            await fetch(`${API_BASE}/sesion/pedido-activo`, { method: 'DELETE', headers: { ...authHeader } });
        } catch (error) { console.error("Error al cerrar pedido:", error); }
    }
};