import { API_BASE, TOKEN } from "../consumo/config.js";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiPedidoDetalle = {
    getMesas: async () => {
        const response = await fetch(`${API_BASE}/mesas`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },

    getMesaAbierta: async () => {
        try {
            const response = await fetch(`${API_BASE}/sesion/mesa-activa`, { method: 'GET', headers: { ...authHeader } });
            if (response.status === 204) return null;
            if (!response.ok) throw new Error("Error");
            return await response.json();
        } catch (error) { return null; }
    },

    cerrarMesa: async () => {
        try {
            await fetch(`${API_BASE}/sesion/mesa-activa`, { method: 'DELETE', headers: { ...authHeader } });
        } catch (error) { console.error("Error al cerrar mesa:", error); }
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

    getTodosLosPedidos: async () => {
        const response = await fetch(`${API_BASE}/pedido`, { headers: authHeader });
        return response.ok ? await response.json() : [];
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
    },
    enviarTicketCorreo: async (idPedido) => {
        const response = await fetch(`${API_BASE}/pedido/enviar-ticket/${idPedido}`, {
            method: 'POST',
            headers: { ...authHeader }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || "No se pudo enviar el ticket.");
        }
        return true;
    },

    setPedidoActivo: async (idPedido) => {
        try {
            await fetch(`${API_BASE}/sesion/pedido-activo/${idPedido}`, {
                method: 'POST',
                headers: { ...authHeader }
            });
        } catch (error) {
            console.error("Error al guardar pedido activo:", error);
        }
    },

    procesarPago: async (idPedido, payload) => {
        const response = await fetch(`${API_BASE}/pedido/procesar-pago/${idPedido}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || "No se pudo procesar el pago.");
        }
        return true;
    },

    cancelarPedido: async (idPedido, motivo) => {
        const response = await fetch(`${API_BASE}/pedido/cancelar/${idPedido}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ motivo: motivo })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || "No se pudo cancelar el pedido.");
        }
        return true;
    }
};