const API_BASE = "http://localhost:8080/api";

export const apiSeguimiento = {
    getPedidos: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/pedido/empresa/${idEmpresa}`);
        if (!response.ok) return [];
        const pedidos = await response.json();
        
        return pedidos.filter(p => p.estado === 'PENDIENTE' || p.estado === 'PREPARANDO' || p.estado === 'LISTO');
    }
};