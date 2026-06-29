const API_URL = "http://localhost:8080/api/v1/categoria-insumo";

// const token = localStorage.getItem("token");
const token =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI2ODc0MTgsImV4cCI6MTc4Mjc3MzgxOH0.xEOf-8izPT5bu64_oCsojldcaD1mcRTZSI3HJ1Xn8ZE";

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