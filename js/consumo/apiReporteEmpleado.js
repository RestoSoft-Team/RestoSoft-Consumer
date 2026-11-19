import { API_BASE, TOKEN } from "../consumo/config.js";

// ─────────────────────────────────────────────
// HEADERS COMUNES CON AUTORIZACIÓN
// 
// ─────────────────────────────────────────────
function getAuthHeaders(extraHeaders = {}) {
    return {
        ...extraHeaders,
        "Authorization": `Bearer ${TOKEN}`
    };
}

export const apiReporteEmpleados = {

    
    obtenerAsistencia: async (idEmpresa, inicio, fin) => {

        try {

            const url = `${API_BASE}/reportes/asistencia`
                + `?idEmpresa=${idEmpresa}`
                + `&inicio=${inicio}`
                + `&fin=${fin}`;

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.message || `Error ${response.status}`);
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API [reporte asistencia]:", error);
            throw error;

        }

    }

};