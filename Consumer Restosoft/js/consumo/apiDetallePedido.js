import { API_BASE, token } from "../consumo/config.js";

export const apiPedidoDetalle = {
    // Obtener todas las mesas para filtrar las ocupadas en el frontend
    getMesas: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/mesas/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },

    // Obtener un pedido por ID
    getPedidoById: async (idPedido) => {
        const response = await fetch(`${API_BASE}/pedido/${idPedido}`);
        return response.ok ? await response.json() : null;
    },

    // Obtener todos los pedidos de la empresa y filtrar los activos en el frontend
    getPedidosActivos: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/pedido/empresa/${idEmpresa}`);
        if (!response.ok) return [];
        const pedidos = await response.json();
        // Filtramos pedidos que no estén pagados/cerrados
        return pedidos.filter(p => p.estado !== 'PAGADO' && p.estado !== 'CANCELADO');
    },

    // Obtener detalles (productos) de un pedido específico
    // Asumiendo que tu backend puede devolver los detalles filtrados por pedido
    getDetallesPedido: async (idPedido) => {
        const response = await fetch(`${API_BASE}/detallepedido/${idPedido}`);
        return response.ok ? await response.json() : [];
    },

    // Catálogos para el modal
    getCategorias: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/categorias/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },
    getPlatos: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/plato/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },

    addDetallePedido: async (detalleData) => {
        const response = await fetch(`${API_BASE}/detallepedido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(detalleData)
        });
        if (!response.ok) throw new Error("Error al agregar el producto");
        return await response.json();
    },

    getPedidoActivoByMesa: async (idMesa) => {
        try {
            const response = await fetch(`${API_BASE}/pedido/mesa/${idMesa}`);
            if (response.status === 404 || response.status === 500) return null;
            if (!response.ok) throw new Error("Error al obtener el pedido");
            return await response.json();
        } catch (error) {
            return null;
        }
    },
};