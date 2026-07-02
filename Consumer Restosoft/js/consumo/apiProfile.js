import { API_BASE, token } from "../consumo/config.js";

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

export const apiProfileCliente = {


  
  obtenerInfoMe: async () => {
    const response = await fetch(`${API_BASE}/usuarios/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token_cliente")}`,
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
        Authorization: `Bearer ${localStorage.getItem("token_cliente")}`,
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
