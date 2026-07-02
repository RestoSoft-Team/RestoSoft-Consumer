const API_URL = "http://localhost:8080/api/v1/categoria-insumo";

// Lee el token del localStorage o usa el hardcodeado para pruebas
const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjozLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI4NjU3NjQsImV4cCI6MTc4Mjk1MjE2NH0.3E_0AVT2_o420YbNVEyWjPw8vXfuj2qyrzNxvnf88LI";

const ApiCategorias = {

    obtenerCategorias: async () => {
        const response = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error("Error al consultar el servidor");
        return await response.json();
    },

    crearCategoria: async (categoriaData) => {
        return await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(categoriaData)
        });
    },

    actualizarCategoria: async (id, categoriaData) => {
        return await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(categoriaData)
        });
    },

    eliminarCategoria: async (id) => {
        return await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    }
};

export default ApiCategorias;