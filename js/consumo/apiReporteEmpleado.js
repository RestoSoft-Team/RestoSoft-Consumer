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

    
    obtenerAsistencia: async (inicio, fin) => {

        try {

            // La empresa se resuelve en el back a partir del token (JWT).
            const url = `${API_BASE}/reportes/asistencia`
                + `?inicio=${inicio}`
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