const API_BASE = "http://localhost:8080/api";

// Lee el token del localStorage o usa el hardcodeado para pruebas
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjozLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI4NjU3NjQsImV4cCI6MTc4Mjk1MjE2NH0.3E_0AVT2_o420YbNVEyWjPw8vXfuj2qyrzNxvnf88LI";

export default {
    async obtenerClientes() {
        const response = await fetch(`${API_BASE}/usuarios/clientes?_=${Date.now()}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        });
        if (!response.ok) throw new Error("Error al obtener clientes");
        return await response.json();
    },

    async crearCliente(formData) {
        const response = await fetch(`${API_BASE}/usuarios/clientes`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${TOKEN}` },
            body: formData
        });
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || "Error al crear cliente");
        }
        return await response.json();
    },

    async actualizarCliente(id, datosCliente, imagenFile) {
        const formData = new FormData();
        const clienteBlob = new Blob([JSON.stringify(datosCliente)], {
            type: 'application/json'
        });
        formData.append('cliente', clienteBlob);

        if (imagenFile) {
            formData.append('imagen', imagenFile);
        }

        const response = await fetch(`${API_BASE}/usuarios/clientes/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${TOKEN}` },
            body: formData
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('>>> BODY DEL ERROR:', errorBody);
            throw new Error('Error al actualizar cliente');
        }

        return await response.json();
    },
    
    async eliminarCliente(id) {
        const response = await fetch(`${API_BASE}/usuarios/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${TOKEN}` }
        });
        if (!response.ok) throw new Error("Error al eliminar cliente");
        return true;
    }
};