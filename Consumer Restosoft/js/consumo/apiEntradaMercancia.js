const API = 'http://localhost:8080/api';

// const token = localStorage.getItem("token");
const token =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI2ODc0MTgsImV4cCI6MTc4Mjc3MzgxOH0.xEOf-8izPT5bu64_oCsojldcaD1mcRTZSI3HJ1Xn8ZE";

const EntradasConsumer = {

    async obtenerInsumos() {
        const res = await fetch(`${API}/insumos`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) throw new Error('Error al cargar insumos (HTTP ' + res.status + ')');
        return await res.json();
    },

    async obtenerProveedores() {
        const res = await fetch(`${API}/proveedores`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) throw new Error('Error al cargar proveedores (HTTP ' + res.status + ')');
        return await res.json();
    },

    async obtenerEntradas() {
        const res = await fetch(`${API}/movimientos`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) throw new Error('Error al obtener movimientos (HTTP ' + res.status + ')');
        const todos = await res.json();
        return todos.filter(m => m.tipo_movimiento === 'ENTRADA' || m.tipoMovimiento === 'ENTRADA');
    },

    async guardarEntrada(payload) {
        const res = await fetch(`${API}/movimientos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            throw new Error(errBody || 'Error HTTP ' + res.status);
        }
        return await res.json();
    }
};