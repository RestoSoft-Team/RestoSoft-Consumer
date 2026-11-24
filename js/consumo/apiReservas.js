import { API_BASE, TOKEN } from "../consumo/config.js";

export const apiReserva = {
  listarPorReservaId: async (idReserva) => {
    const response = await fetch(
      `${API_BASE}/reserva-mesa/reserva/${idReserva}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } },
    );

    if (!response.ok) {
      throw new Error("Error al listar por reserva");
    }

    return await response.json();
  },

  listarPorEmpresaDiario: async () => {
    const response = await fetch(`${API_BASE}/reserva-mesa/empresa/hoy`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al listar reservas diarias");
    }

    return await response.json();
  },

  listarPorEmpresaGeneral: async () => {
    const response = await fetch(`${API_BASE}/reserva-mesa/empresa`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al listar reservas");
    }

    return await response.json();
  },

  listarPorMesaId: async (idMesa) => {
    const response = await fetch(`${API_BASE}/reserva-mesa/mesa/${idMesa}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!response.ok) {
      throw new Error("Error al listar reservas de la mesa");
    }

    return await response.json();
  },
  guardarReserva: async (reserva, idsMesa) => {
    const response = await fetch(`${API_BASE}/reserva`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        reserva,
        idsMesa,
      }),
    });

    if (!response.ok) {
      // Intentamos leer el error estructurado que envía Spring Boot
      const errorData = await response.json().catch(() => ({}));
      throw errorData; // Lanzamos el objeto completo (que contiene 'validations')
    }

    return await response.json();
  },

  actualizarReserva: async (idReserva, reserva, idsMesa) => {
    const response = await fetch(`${API_BASE}/reserva/${idReserva}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        reserva,
        idsMesa,
      }),
    });

    if (!response.ok) {
      // Intentamos leer el error estructurado que envía Spring Boot
      const errorData = await response.json().catch(() => ({}));
      throw errorData; // Lanzamos el objeto completo
    }

    return await response.json();
  },

  eliminarReserva: async (idReserva) => {
    const response = await fetch(`${API_BASE}/reserva/${idReserva}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });

    return response.ok;
  },

  eliminarPorReservaYMesa: async (idReserva, idMesa) => {
    const response = await fetch(
      `${API_BASE}/reserva-mesa/reserva/${idReserva}/mesa/${idMesa}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    return response.ok;
  },

  eliminarPorReserva: async (idReserva) => {
    const response = await fetch(
      `${API_BASE}/reserva-mesa/reserva/${idReserva}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    return response.ok;
  },

  listarClientes: async () => {
    const response = await fetch(`${API_BASE}/usuarios/clientes`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al listar clientes");
    }

    return await response.json();
  },
};
