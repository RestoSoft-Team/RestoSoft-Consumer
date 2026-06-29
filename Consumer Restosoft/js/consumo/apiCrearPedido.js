const API_BASE = "http://localhost:8080/api";
const TOKEN = localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEzLCJlbXByZXNhSWQiOjEsInJvbCI6IkFETUlOSVNUUkFET1IiLCJpYXQiOjE3ODI2OTEwNTMsImV4cCI6MTc4Mjc3NzQ1M30.B0ff1vGF6kvhh2Quw1Q3AIIL37RIBkZT7T2UFK93lgA";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export const apiPedido = {
    abrirMesa: async (idMesa) => {
        try {
            await fetch(`${API_BASE}/sesion/mesa-activa/${idMesa}`, { method: 'POST', headers: { ...authHeader } });
        } catch (error) { console.error("Error al abrir mesa:", error); }
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

    getZonas: async () => {
        const response = await fetch(`${API_BASE}/zonas`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },
    getMesas: async () => {
        const response = await fetch(`${API_BASE}/mesas`, { headers: authHeader });
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
    getUsuarios: async () => {
        const response = await fetch(`${API_BASE}/usuarios`, { headers: authHeader });
        return response.ok ? await response.json() : [];
    },

    createPedido: async (pedidoData) => {
        const response = await fetch(`${API_BASE}/pedido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(pedidoData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            if (errorData && errorData.message) throw new Error(errorData.message);
            throw new Error("Error desconocido al crear el pedido.");
        }
        return await response.json();
    }
};