const API_BASE = "http://localhost:8080/api/insumos";
// const token = localStorage.getItem("token");
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjozLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI3NzU0NTAsImV4cCI6MTc4Mjg2MTg1MH0._BpqkCoVVywjjLzChkbPQztPsqmhZZ3k4bkPs8pMvoI";

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