const API_BASE = "http://localhost:8080/api";
// const token = localStorage.getItem("token");
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxNiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJBZG1pbmlzdHJhZG9yIiwiaWF0IjoxNzgyNjkxMjQwLCJleHAiOjE3ODI3Nzc2NDB9.32d5LzAaR52loAERHojAkbFPakFWXD5qJncPGnMB_qk";


export const estilosEmpresaApi = {
  obtener: async () => {
    try {
      const response = await fetch(`${API_BASE}/estilosEmpresa`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al obtener el estilo de interfaz.");
      }

      return await response.json();
    } catch (error) {
      console.error("Fallo de API:", error);
      throw error;
    }
  },

  guardar: async (estilo) => {
    try {
      const response = await fetch(`${API_BASE}/estilosEmpresa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(estilo),
      });

      if (!response.ok) {
        throw new Error("Error al guardar el estilo de interfaz.");
      }

      return await response.json();
    } catch (error) {
      console.error("Fallo de API:", error);
      throw error;
    }
  },

  actualizar: async (estilo) => {
    try {
      const response = await fetch(`${API_BASE}/estilosEmpresa`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(estilo),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el estilo de interfaz.");
      }

      return await response.json();
    } catch (error) {
      console.error("Fallo de API:", error);
      throw error;
    }
  },

  eliminar: async () => {
    try {
      const response = await fetch(`${API_BASE}/estilosEmpresa`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al eliminar el estilo de interfaz.");
      }

      return true;
    } catch (error) {
      console.error("Fallo de API:", error);
      throw error;
    }
  },
};
