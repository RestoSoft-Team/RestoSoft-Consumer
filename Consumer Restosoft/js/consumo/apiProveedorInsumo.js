const API_BASE = "http://localhost:8080/api";

// Lee el token del localStorage o usa el hardcodeado para pruebas
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjozLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI4NjU3NjQsImV4cCI6MTc4Mjk1MjE2NH0.3E_0AVT2_o420YbNVEyWjPw8vXfuj2qyrzNxvnf88LI";

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