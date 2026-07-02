const API_BASE = "http://localhost:8080/api";
const TOKEN = localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEyLCJlbXByZXNhSWQiOjEsInJvbCI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3ODI5NjM3NTgsImV4cCI6MTc4MzA1MDE1OH0.1WTCvqGMvtjPGPAHfR-d8_rpwphG3kqdBs7eki7uqKQ";
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