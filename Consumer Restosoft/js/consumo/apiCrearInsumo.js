const API_BASE = "http://localhost:8080/api";

// const token = localStorage.getItem("token");
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJpYS5wZXJlekByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMiwiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI2ODc0MTgsImV4cCI6MTc4Mjc3MzgxOH0.xEOf-8izPT5bu64_oCsojldcaD1mcRTZSI3HJ1Xn8ZE";

const ApiInventario = {
  obtenerProveedores: async () => {
    const response = await fetch(`${API_BASE}/proveedores`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Error al cargar proveedores");
    return await response.json();
  },

  obtenerCategorias: async () => {
    const response = await fetch(`${API_BASE}/v1/categoria-insumo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error("Error al cargar categorías");
    return await response.json();
  },

  crearInsumo: async (payload) => {
    console.log("Payload enviado:", JSON.stringify(payload, null, 2));
    const response = await fetch(`${API_BASE}/insumos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error del servidor:", response.status, errorBody);
      throw new Error("Error al crear insumo");
    }
    return response;
  },
};

export default ApiInventario;