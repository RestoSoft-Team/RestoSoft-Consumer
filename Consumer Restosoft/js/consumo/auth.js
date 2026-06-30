const API_BASE = "http://localhost:8080/api";
const TOKEN = localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEzLCJlbXByZXNhSWQiOjEsInJvbCI6IkFETUlOSVNUUkFET1IiLCJpYXQiOjE3ODI2OTEwNTMsImV4cCI6MTc4Mjc3NzQ1M30.B0ff1vGF6kvhh2Quw1Q3AIIL37RIBkZT7T2UFK93lgA";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };

export function obtenerIdUsuarioDeToken() {
    try {
        const base64Url = TOKEN.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const data = JSON.parse(jsonPayload);
        return data.usuarioId || 1;
    } catch (e) {
        return 1;
    }
}

export const apiAuth = {
    getMiPerfil: async () => {
        try {
            const response = await fetch(`${API_BASE}/usuarios/me`, { headers: authHeader });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error al obtener perfil:", error);
            return null;
        }
    }
};