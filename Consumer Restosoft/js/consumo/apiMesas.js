const API_BASE = "http://localhost:8080/api";
<<<<<<< Updated upstream
// const token = localStorage.getItem("token");
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqb3NlLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEzLCJlbXByZXNhSWQiOjEsInJvbCI6Ik1lc2VybyIsImlhdCI6MTc4MjUxMjU1MiwiZXhwIjoxNzgyNTk4OTUyfQ.wtI1vALmOsUwUdms17hGsYHjTGdO-TLWYz2Rboi-PnM";
=======
const TOKEN = localStorage.getItem("token") || "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEzLCJlbXByZXNhSWQiOjEsInJvbCI6IkFETUlOSVNUUkFET1IiLCJpYXQiOjE3ODI2OTEwNTMsImV4cCI6MTc4Mjc3NzQ1M30.B0ff1vGF6kvhh2Quw1Q3AIIL37RIBkZT7T2UFK93lgA";
const authHeader = { 'Authorization': `Bearer ${TOKEN}` };
>>>>>>> Stashed changes

export const api = {
  obtenerMesas: async () => {
    try {
<<<<<<< Updated upstream
      const response = await fetch(`${API_BASE}/mesas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
=======
      const response = await fetch(`${API_BASE}/mesas`, { headers: authHeader });
>>>>>>> Stashed changes
      if (!response.ok) throw new Error("Error al obtener mesas");
      return await response.json();
    } catch (error) {
      console.error("Fallo de API:", error);
      return [];
    }
  },
<<<<<<< Updated upstream

  obtenerZonas: async () => {
    try {
      const response = await fetch(`${API_BASE}/zonas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
=======
  obtenerZonas: async () => {
    try {
      const response = await fetch(`${API_BASE}/zonas`, { headers: authHeader });
>>>>>>> Stashed changes
      if (!response.ok) throw new Error("Error al obtener zonas");
      return await response.json();
    } catch (error) {
      console.error("Fallo de API:", error);
      return [];
    }
  },
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
  intercambiarMesas: async (idMesaA, idMesaB) => {
    try {
      const response = await fetch(`${API_BASE}/mesas/${idMesaA}/${idMesaB}`, {
        method: "PUT",
<<<<<<< Updated upstream
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok)
        throw new Error("Error en el servidor al intercambiar mesas");
      return true; // Retorna verdadero si el backend respondió exitosamente (200 OK)
=======
        headers: { "Content-Type": "application/json", ...authHeader }
      });
      if (!response.ok) throw new Error("Error en el servidor al intercambiar mesas");
      return true;
>>>>>>> Stashed changes
    } catch (error) {
      console.error("Fallo de API al transferir:", error);
      return false;
    }
<<<<<<< Updated upstream
  },
};
=======
  }
};
>>>>>>> Stashed changes
