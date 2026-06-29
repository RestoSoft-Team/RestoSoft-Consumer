const API_BASE = "http://localhost:8080/api";
const TOKEN = localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEzLCJlbXByZXNhSWQiOjEsInJvbCI6IkFETUlOSVNUUkFET1IiLCJpYXQiOjE3ODI2OTEwNTMsImV4cCI6MTc4Mjc3NzQ1M30.B0ff1vGF6kvhh2Quw1Q3AIIL37RIBkZT7T2UFK93lgA";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiPedidoDetalle = {
    getMesas: async () => {
        const response = await fetch(`${API_BASE}/mesas`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    getPedidoById: async (idPedido) => {
        const response = await fetch(`${API_BASE}/pedido/${idPedido}`, { headers: authHeader });
        return response.ok ? await response.json() : null;
    },
    getPedidosActivos: async () => {
        const response = await fetch(`${API_BASE}/pedido`, { headers: authHeader });
        if (!response.ok) return [];
        const pedidos = await response.json();
        return pedidos.filter(p => p.estado !== 'PAGADO' && p.estado !== 'CANCELADO');
    },
    getDetallesPedido: async (idPedido) => {
        const response = await fetch(`${API_BASE}/detallepedido/${idPedido}`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    getCategorias: async () => {
        const response = await fetch(`${API_BASE}/categorias`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    getPlatos: async () => {
        const response = await fetch(`${API_BASE}/plato`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    addDetallePedido: async (detalleData) => {
        const response = await fetch(`${API_BASE}/detallepedido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(detalleData)
        });
        if (!response.ok) throw new Error("Error al agregar el producto");
        return await response.json();
    },
    getPedidoActivoByMesa: async (idMesa) => {
        try {
            const response = await fetch(`${API_BASE}/pedido/mesa/${idMesa}`, { headers: authHeader });
            if (response.status === 404 || response.status === 500) return null; 
            if (!response.ok) throw new Error("Error al obtener el pedido");
            return await response.json();
        } catch (error) { return null; }
    }
};