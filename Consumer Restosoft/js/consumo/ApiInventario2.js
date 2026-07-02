import { token } from "../consumo/config.js";
const API_BASE = "http://localhost:8080/api/insumos";


export const api = {
  obtenerInsumos: async () => {
    // ✅ CORREGIDO: Se agregó /empresa/1
    const response = await fetch(`${API_BASE}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error en la respuesta del servidor");
    }

    return await response.json();
  },

  eliminarInsumo: async (id) => {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al intentar eliminar el insumo");
    }

    return response.ok;
  },
};