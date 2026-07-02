import { API_BASE,token } from "../consumo/config.js";

const getToken = () => localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEyLCJlbXByZXNhSWQiOjEsInJvbCI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3ODI5NjM3NTgsImV4cCI6MTc4MzA1MDE1OH0.1WTCvqGMvtjPGPAHfR-d8_rpwphG3kqdBs7eki7uqKQ";

export const api = {

    subirImagenPlanoPublica: async (formData) => {
        const response = await fetch(`${API_BASE}/zonas/upload-plano`, {
            method: 'POST',
            body: formData 
        });
        if (!response.ok) throw new Error("Error al subir el plano");
        return response.json();
    },

    guardarConfiguracionCompleta: async (payload, imagenAdminFile) => {
        const formData = new FormData();
        const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        formData.append("datos", jsonBlob);

        if (imagenAdminFile) {
            formData.append("imagenAdmin", imagenAdminFile);
        }

        const response = await fetch(`${API_BASE}/registro/wizard-completo`, {
            method: 'POST',
            body: formData 
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Error en el servidor: ${response.status}`);
        }

        return await response.text();
    },

    subirImagenPlanoPrivada: async (formData) => {
        const response = await fetch(`${API_BASE}/zonas/upload-plano`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData 
        });
        if (!response.ok) throw new Error("Error al subir el plano");
        return response.json();
    },

    obtenerPlanoEmpresa: async () => {
        const [zonasRes, mesasRes] = await Promise.all([
            fetch(`${API_BASE}/zonas`, { headers: { 'Authorization': `Bearer ${getToken()}` }}),
            fetch(`${API_BASE}/mesas`, { headers: { 'Authorization': `Bearer ${getToken()}` }})
        ]);

        if (!zonasRes.ok || !mesasRes.ok) throw new Error("Error al cargar el plano actual");

        const zonas = await zonasRes.json();
        const mesas = await mesasRes.json();
        return { zonas, mesas };
    },

    sincronizarPlano: async (payload) => {
        const response = await fetch(`${API_BASE}/zonas/sincronizar-plano`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Error en el servidor: ${response.status}`);
        }

        return await response.text();
    }
};