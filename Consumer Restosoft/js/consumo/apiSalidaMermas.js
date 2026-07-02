import { API_BASE, token } from "../consumo/config.js";

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