const API_BASE = "http://localhost:8080/api";

// Token hardcodeado para pruebas
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI2ODc0MTgsImV4cCI6MTc4Mjc3MzgxOH0.xEOf-8izPT5bu64_oCsojldcaD1mcRTZSI3HJ1Xn8ZE";

export default {

    async obtenerInsumos() {
        const response = await fetch(`${API_BASE}/insumos`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error al cargar insumos: ${response.status}`);
        }

        return await response.json();
    },

    // Obtener todas las relaciones Proveedor - Insumo
    async obtenerRelaciones() {
        const response = await fetch(`${API_BASE}/proveedor-insumos`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error al cargar relaciones: ${response.status}`);
        }

        return await response.json();
    },

    // Crear una nueva relación
    async guardarRelacion(payload) {
        const response = await fetch(`${API_BASE}/proveedor-insumos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || `Error ${response.status}`);
        }

        return await response.json();
    },

    // Actualizar una relación
    async actualizarRelacion(id, payload) {
        const response = await fetch(`${API_BASE}/proveedor-insumos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || `Error ${response.status}`);
        }

        return await response.json();
    },

    // Eliminar una relación
    async eliminarRelacion(id) {
        const response = await fetch(`${API_BASE}/proveedor-insumos/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || `Error ${response.status}`);
        }

        return true;
    }
};