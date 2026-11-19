import { API_BASE, TOKEN } from "../consumo/config.js";

export const api = {
  obtenerInsumos: async () => {
    const response = await fetch(`${API_BASE}/insumos`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error en la respuesta del servidor");
    }

    return await response.json();
  },

  eliminarInsumo: async (id) => {
    const response = await fetch(`${API_BASE}/insumos/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al intentar eliminar el insumo");
    }

    return response.ok;
  },
};