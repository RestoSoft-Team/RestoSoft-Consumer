import { API_BASE, TOKEN } from "../consumo/config.js";

  export default async function estilosInicio() {
    try {

      const response = await fetch(`${API_BASE}/estilosEmpresa`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      });

      if (!response.ok) return;

      const tema = await response.json();

      localStorage.setItem("restsoft_theme", JSON.stringify(tema));
    } catch (error) {
      console.error("Error al cargar el tema:", error);
    }
  }
  