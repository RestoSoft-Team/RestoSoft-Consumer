const API_URL = "http://localhost:8080/api/v1/categoria-insumo";

const ApiCategorias = {

    obtenerCategorias: async () => {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Error al consultar el servidor");
        return await response.json();
    },

    crearCategoria: async (categoriaData) => {
        return await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoriaData)
        });
    },

    actualizarCategoria: async (id, categoriaData) => {
        return await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoriaData)
        });
    },

    eliminarCategoria: async (id) => {
        return await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
    }
};

export default ApiCategorias;