
const ID_EMPRESA = 1;
const API_URL = 'http://localhost:8080/api/insumos';

const api = {
    /**
     * Obtiene la lista completa de insumos de la empresa.
     */
    obtenerInsumos: async () => {
        const response = await fetch(`${API_URL}/empresa/${ID_EMPRESA}`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        return await response.json();
    },

    /**
     * Elimina un insumo específico por su ID.
     */
    eliminarInsumo: async (id) => {
        const response = await fetch(`${API_URL}/${id}/empresa/${ID_EMPRESA}`, { 
            method: 'DELETE' 
        });
        if (!response.ok) throw new Error('Error al intentar eliminar el insumo');
        return response;
    }
};

export default api;