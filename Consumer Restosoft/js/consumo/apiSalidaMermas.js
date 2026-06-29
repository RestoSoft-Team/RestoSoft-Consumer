const API_BASE = "http://localhost:8080/api";

// const token = localStorage.getItem("token");
const token =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI2ODc0MTgsImV4cCI6MTc4Mjc3MzgxOH0.xEOf-8izPT5bu64_oCsojldcaD1mcRTZSI3HJ1Xn8ZE";

export const apiSalidas = {
    // ✅ CORREGIDO: Se quitó el /empresa/1 (El Controller lo saca del token)
    obtenerInsumos: async () => {
        const res = await fetch(`${API_BASE}/insumos`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) throw new Error('Error al cargar insumos (HTTP ' + res.status + ')');
        return await res.json();
    },

    // ✅ APUNTA AL ENDPOINT QUE SÍ EXISTE: /api/movimientos
    obtenerSalidas: async () => {
        const res = await fetch(`${API_BASE}/movimientos`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) throw new Error('Error al cargar salidas (HTTP ' + res.status + ')');
        
        const todos = await res.json();
        
        // Filtramos en el navegador solo los de tipo SALIDA, MERMA, CONSUMO_INTERNO o DAÑO
        return todos.filter(mov => {
            const tipo = (mov.tipoMovimiento || "").toUpperCase();
            return tipo === 'SALIDA' || tipo === 'MERMA' || tipo === 'CONSUMO_INTERNO' || tipo === 'DANO';
        });
    },

    // Registra una nueva salida
    registrarSalida: async (payload) => {
        const res = await fetch(`${API_BASE}/movimientos`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || "Error al registrar la salida");
        }
        return await res.json();
    }
};