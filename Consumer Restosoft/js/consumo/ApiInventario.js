const API_BASE = "http://localhost:8080/api";

export const api = {
    obtenerInsumos: async (idEmpresa) => {
        const response = await fetch(`${API_BASE}/insumos/empresa/${idEmpresa}`);
        if (!response.ok) throw new Error("Error al obtener los insumos del servidor");
        return response.json();
    },
    crearInsumo: async (insumoRequest) => {
        const response = await fetch(`${API_BASE}/insumos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(insumoRequest)
        });
        if (!response.ok) throw new Error("Error al crear el insumo");
        return response.json();
    },
    actualizarInsumo: async (id, insumoRequest) => {
        const response = await fetch(`${API_BASE}/insumos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(insumoRequest)
        });
        if (!response.ok) throw new Error("Error al actualizar el insumo");
        return response.json();
    },
    eliminarInsumo: async (id, idEmpresa) => {
        const response = await fetch(`${API_BASE}/insumos/${id}/empresa/${idEmpresa}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Error al eliminar el insumo");
        return true;
    }
};