const API = 'http://localhost:8080/api';

const EntradasConsumer = {

    async obtenerInsumos() {
        const res = await fetch(`${API}/insumos/empresa/1`);
        if (!res.ok) throw new Error('Error al cargar insumos (HTTP ' + res.status + ')');
        return await res.json();
    },

    async obtenerProveedores() {
        const res = await fetch(`${API}/proveedores`);
        if (!res.ok) throw new Error('Error al cargar proveedores (HTTP ' + res.status + ')');
        return await res.json();
    },

    async obtenerEntradas() {
        // Sin parámetro tipo — el backend no lo soporta y da 500
        const res = await fetch(`${API}/movimientos`);
        if (!res.ok) throw new Error('Error al obtener movimientos (HTTP ' + res.status + ')');
        const todos = await res.json();
        // Filtrar solo ENTRADA en el frontend
        return todos.filter(m => m.tipo_movimiento === 'ENTRADA' || m.tipoMovimiento === 'ENTRADA');
    },

    async guardarEntrada(payload) {
        const res = await fetch(`${API}/movimientos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            throw new Error(errBody || 'Error HTTP ' + res.status);
        }
        return await res.json();
    }
};