const API_BASE = "http://localhost:8080/api";
// const token = localStorage.getItem("token");
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxNiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJBZG1pbmlzdHJhZG9yIiwiaWF0IjoxNzgyNjkxMjQwLCJleHAiOjE3ODI3Nzc2NDB9.32d5LzAaR52loAERHojAkbFPakFWXD5qJncPGnMB_qk";

export const api = {
  obtenerMesas: async () => {
    try {
      const response = await fetch(`${API_BASE}/mesas`, { headers: authHeader });
      if (!response.ok) throw new Error("Error al obtener mesas");
      return await response.json();
    } catch (error) {
      console.error("Fallo de API:", error);
      return [];
    }
  },
  obtenerZonas: async () => {
    try {
      const response = await fetch(`${API_BASE}/zonas`, { headers: authHeader });
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
        headers: { "Content-Type": "application/json", ...authHeader }
      });
      if (!response.ok) throw new Error("Error en el servidor al intercambiar mesas");
      return true;
    } catch (error) {
      console.error("Fallo de API al transferir:", error);
      return false;
    }
  }
};
