const API_BASE = "http://localhost:8080/api";
const TOKEN = localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEyLCJlbXByZXNhSWQiOjEsInJvbCI6Ik1lc2VybyIsImlhdCI6MTc4Mjc3MzYyMiwiZXhwIjoxNzgyODYwMDIyfQ.u7CG1zEdY36gDCpqDnl7_qTnOqUba9SzsGGVbG1Y94g";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

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