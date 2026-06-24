const API_BASE = "http://localhost:8080/api";

export const apiPedido = {
    // 1. Verificar si hay una mesa asignada en sesión
    getMesaActiva: async (idUsuario) => {
        try {
            const response = await fetch(`${API_BASE}/sesion/mesa-activa`, {
                method: 'GET',
                headers: { 'X-User-Id': idUsuario }
            });
            if (response.status === 204) return null; // No hay mesa asignada
            if (!response.ok) throw new Error("Error de autenticación");
            return await response.json();
        } catch (error) {
            console.error("Fallo al obtener mesa activa:", error);
            return null;
        }
    },

    // 2. Obtener zonas para el selector
    getZonas: async (idEmpresa) => {
        try {
            const response = await fetch(`${API_BASE}/zonas/empresa/${idEmpresa}`);
            if (!response.ok) throw new Error("Error al obtener zonas");
            return await response.json();
        } catch (error) {
            console.error("Fallo de API:", error);
            return [];
        }
    },

    // 3. Obtener mesas para el selector
    getMesas: async (idEmpresa) => {
        try {
            const response = await fetch(`${API_BASE}/mesas/empresa/${idEmpresa}`);
            if (!response.ok) throw new Error("Error al obtener mesas");
            return await response.json();
        } catch (error) {
            console.error("Fallo de API:", error);
            return [];
        }
    },

    // 4. Crear el pedido en la base de datos
    createPedido: async (pedidoData) => {
        try {
            const response = await fetch(`${API_BASE}/pedido`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoData)
            });
            if (!response.ok) throw new Error("Error al crear el pedido");
            return await response.json();
        } catch (error) {
            console.error("Fallo al crear pedido:", error);
            throw error;
        }
    },

    // 5. Liberar la mesa al confirmar el pedido
    liberarMesaActiva: async (idUsuario) => {
        try {
            await fetch(`${API_BASE}/sesion/mesa-activa`, {
                method: 'DELETE',
                headers: { 'X-User-Id': idUsuario }
            });
        } catch (error) {
            console.error("Fallo al liberar mesa:", error);
        }
    }
};