import { API_BASE } from "./config.js";

export const apiAuth = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Credenciales incorrectas o error de servidor");
    }

    return await response.json();
  },

  registrarCliente: async (idEmpresa, clienteData, imagenFile) => {
    const formData = new FormData();
    
    // Adjuntamos el JSON como un Blob bajo la key "cliente"
    const clienteBlob = new Blob([JSON.stringify(clienteData)], { type: "application/json" });
    formData.append("cliente", clienteBlob);

    // Si hay imagen, la adjuntamos bajo la key "imagen"
    if (imagenFile) {
      formData.append("imagen", imagenFile);
    }

    // Inyectamos el idEmpresa directamente en la URL
    const response = await fetch(`${API_BASE}/usuarios/clientes/${idEmpresa}`, {
      method: "POST",
      // NO poner headers de Content-Type, el navegador lo hace automáticamente
      body: formData,
    });

    if (!response.ok) {
      throw new Error("No se pudo registrar el cliente");
    }

    return await response.json();
  }
};