import { API_BASE } from "../consumo/config.js";

export const ApiCliente = (function () {
  "use strict";

  async function obtenerEmpresa(slug) {
    if (!slug || typeof slug !== "string") {
      throw new Error("Slug inválido");
    }

    const url = `${API_BASE}/configuracion/empresa/${encodeURIComponent(slug)}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      return await response.json();
    } catch (error) {
      console.error("Error en fetch de ApiCliente:", error);
      throw error;
    }
  }

  return { obtenerEmpresa };
})();