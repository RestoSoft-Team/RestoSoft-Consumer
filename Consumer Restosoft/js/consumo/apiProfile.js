const API_BASE = "http://localhost:8080/api";
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEyLCJlbXByZXNhSWQiOjEsInJvbCI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3ODI5NjM3NTgsImV4cCI6MTc4MzA1MDE1OH0.1WTCvqGMvtjPGPAHfR-d8_rpwphG3kqdBs7eki7uqKQ";

export const apiProfile = {
 
  obtenerInfoMe: async () => {
    const response = await fetch(`${API_BASE}/usuarios/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al obtener información de perfil.");
    }

    return await response.json();
  },

  
  actualizarEmpleado: async (idEmpleado, empleadoRequest, imagenFile) => {
    const formData = new FormData();

    formData.append(
      "empleado",
      new Blob([JSON.stringify(empleadoRequest)], { type: "application/json" })
    );

    if (imagenFile) {
      formData.append("imagen", imagenFile);
    }

    const response = await fetch(`${API_BASE}/usuarios/${idEmpleado}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = "Error al actualizar el empleado.";
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  },
};