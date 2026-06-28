const API_BASE = "http://localhost:8080/api";

export const apiSalidas = {
    // Obtiene insumos
    obtenerInsumos: async (idEmpresa = 1) => {
        const res = await fetch(`${API_BASE}/insumos/empresa/${idEmpresa}`);
        if (!res.ok) throw new Error("Error al cargar insumos");
        return res.json();
    },

    // ✅ APUNTA AL ENDPOINT QUE SÍ EXISTE: /api/movimientos
    obtenerSalidas: async () => {
        const res = await fetch(`${API_BASE}/movimientos`);
        if (!res.ok) throw new Error("Error al cargar salidas");
        
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || "Error al registrar la salida");
        }
        return res.json();
    }
};