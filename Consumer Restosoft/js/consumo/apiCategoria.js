// /js/consumo/apiCategorias.js

const API_URL = "http://localhost:8080/api/v1/categoria-insumo";

const ApiCategorias = {
    /**
     * Obtiene todas las categorías desde el servidor
     */
    obtenerCategorias: async () => {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Error al consultar el servidor");
        return await response.json();
    },

    /**
     * Envía una nueva categoría para ser registrada en la base de datos
     */
    crearCategoria: async (categoriaData) => {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoriaData)
        });
        return response; // Retornamos la respuesta completa para que la UI maneje los estados HTTP (ej. 400 duplicado)
    }
};

export default ApiCategorias;