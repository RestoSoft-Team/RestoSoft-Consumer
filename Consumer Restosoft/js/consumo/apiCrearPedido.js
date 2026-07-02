import { API_BASE, token } from "../consumo/config.js";

export const apiPedido = {
    abrirMesa: async (idUsuario, idMesa) => {
        try {
            await fetch(`${API_BASE}/sesion/mesa-activa/${idMesa}`, { method: 'POST', headers: { 'X-User-Id': idUsuario } });
        } catch (error) { console.error("Error al abrir mesa:", error); }
    },
    getMesaAbierta: async (idUsuario) => {
        try {
            const response = await fetch(`${API_BASE}/sesion/mesa-activa`, { method: 'GET', headers: { 'X-User-Id': idUsuario } });
            if (response.status === 204) return null;
            if (!response.ok) throw new Error("Error");
            return await response.json();
        } catch (error) { return null; }
    },
    cerrarMesa: async (idUsuario) => {
        try {
            await fetch(`${API_BASE}/sesion/mesa-activa`, { method: 'DELETE', headers: { 'X-User-Id': idUsuario } });
        } catch (error) { console.error("Error al cerrar mesa:", error); }
    },

    getZonas: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/zonas/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },
    getMesas: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/mesas/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },
    getCategorias: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/categorias/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },
    getPlatos: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/plato/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },
    getUsuarios: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/usuarios/empresa/${idEmpresa}`);
        return response.ok ? await response.json() : [];
    },

    createPedido: async (pedidoData) => {
        const response = await fetch(`${API_BASE}/pedido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            if (errorData && errorData.message) {
                throw new Error(errorData.message);
            }
            throw new Error("Error desconocido al crear el pedido.");
        }

        return await response.json();
    }
};