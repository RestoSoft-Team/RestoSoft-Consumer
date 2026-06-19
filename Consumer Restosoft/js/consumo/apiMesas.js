const API_BASE = "http://localhost:8080/api";

export const api = {
    obtenerMesas: async (idEmpresa) => {
        try {
            const response = await fetch(`${API_BASE}/mesas/empresa/${idEmpresa}`);
            if (!response.ok) throw new Error("Error al obtener mesas");
            return await response.json();
        } catch (error) {
            console.error("Fallo de API:", error);
            return []; 
        }
    },

    obtenerZonas: async (idEmpresa) => {
        try {
            const response = await fetch(`${API_BASE}/zonas/empresa/${idEmpresa}`);
            if (!response.ok) throw new Error("Error al obtener zonas");
            return await response.json();
        } catch (error) {
            console.error("Fallo de API:", error);
            return [];
        }
    },

    intercambiarMesas: async (idMesaA, idMesaB) => {
        try {
            const response = await fetch(`${API_BASE}/mesas/${idMesaA}/${idMesaB}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) throw new Error("Error en el servidor al intercambiar mesas");
            return true; // Retorna verdadero si el backend respondió exitosamente (200 OK)
        } catch (error) {
            console.error("Fallo de API al transferir:", error);
            return false;
        }
    }
};