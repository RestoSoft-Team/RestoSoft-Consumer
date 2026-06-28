const API_BASE = "http://localhost:8080/api";

const ApiInventario = {
    obtenerProveedores: async () => {
        const response = await fetch(`${API_BASE}/proveedores`);
        if (!response.ok) throw new Error('Error al cargar proveedores');
        return await response.json();
    },

    obtenerCategorias: async () => {
        const response = await fetch(`${API_BASE}/v1/categoria-insumo`);
        if (!response.ok) throw new Error('Error al cargar categorías');
        return await response.json();
    },

    crearInsumo: async (payload) => {
        console.log('Payload enviado:', JSON.stringify(payload, null, 2));
        const response = await fetch(`${API_BASE}/insumos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error del servidor:', response.status, errorBody);
            throw new Error('Error al crear insumo');
        }
        return response;
    }
};

export default ApiInventario;