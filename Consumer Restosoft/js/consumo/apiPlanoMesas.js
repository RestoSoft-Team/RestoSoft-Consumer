const API_BASE = "http://localhost:8080/api";

export const api = {


    subirImagenPlano: async (formData) => {
        const response = await fetch(`${API_BASE}/zonas/upload-plano`, {
            method: 'POST',
            body: formData 
        });
        if (!response.ok) throw new Error("Error al subir el plano");
        return response.json();
    },


    guardarConfiguracionCompleta: async (payload) => {
        
        const response = await fetch(`${API_BASE}/zonas/guardarM`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error en el servidor: ${response.status}`);
        }

        return await response.json();
    }
};