const API_BASE = "http://localhost:8080/api";

// Lee el token del localStorage o usa el hardcodeado para pruebas
const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjozLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI4NjU3NjQsImV4cCI6MTc4Mjk1MjE2NH0.3E_0AVT2_o420YbNVEyWjPw8vXfuj2qyrzNxvnf88LI";

export const apiSalidas = {
    obtenerInsumos: async () => {
        const res = await fetch(`${API_BASE}/insumos`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) throw new Error('Error al cargar insumos (HTTP ' + res.status + ')');
        return await res.json();
    },

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
            return tipo === 'SALIDA' || tipo === 'MERMA' || tipo === 'CONSUMO_INTERNO' || tipo === 'DANO' || tipo === 'DAÑO';
        });
    },

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