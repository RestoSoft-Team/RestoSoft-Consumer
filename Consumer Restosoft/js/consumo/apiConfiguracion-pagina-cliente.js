import { API_BASE, token } from "../consumo/config.js";

export const apiConfig = {
  cargar: async () => {
    const response = await fetch(`${API_BASE}/configuracion`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Error al cargar");
    return await response.json();
  },

  guardar: async (state, pendingFiles) => {
    const method = state.id ? "PUT" : "POST";
    const formData = new FormData();

    // Limpiar el estado para que coincida exactamente con el DTO Request
    const dtoPayload = { ...state };
    delete dtoPayload.id; // El ID no va en el body, va en la URL o se maneja por token
    delete dtoPayload.horariosItems;
    delete dtoPayload.redesConfig;

    const configBlob = new Blob([JSON.stringify(dtoPayload)], {
      type: "application/json",
    });
    formData.append("configuracion", configBlob);

    const fileKeys = [
      "brandingLogo",
      "brandingFavicon",
      "heroImagen",
      "acercaImagen",
      "galeriaImagen1",
      "galeriaImagen2",
      "galeriaImagen3",
      "galeriaImagen4",
      "galeriaImagen5",
      "galeriaImagen6",
    ];

    fileKeys.forEach((key) => {
      if (pendingFiles[key]) formData.append(key, pendingFiles[key]);
    });

    const response = await fetch(`${API_BASE}/configuracion`, {
      method: method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) throw new Error("Error al guardar");
    return await response.json();
  },

  eliminar: async () => {
    const response = await fetch(`${API_BASE}/configuracion`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 204)
      throw new Error("Error al eliminar");
  },
};
