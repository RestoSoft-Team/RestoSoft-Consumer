const API_BASE = "http://localhost:8080/api";
// const token = localStorage.getItem("token");
const token =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6QHJlc3Rvc29mdC5jb20iLCJ1c3VhcmlvSWQiOjEyLCJlbXByZXNhSWQiOjEsInJvbCI6Ik1lc2VybyIsImlhdCI6MTc4Mjc3MzYyMiwiZXhwIjoxNzgyODYwMDIyfQ.u7CG1zEdY36gDCpqDnl7_qTnOqUba9SzsGGVbG1Y94g";

export const apiReserva = {
  listarPorReservaId: async (idReserva) => {
    const response = await fetch(
      `${API_BASE}/reserva-mesa/reserva/${idReserva}`,
    );

    if (!response.ok) {
      throw new Error("Error al listar por reserva");
    }

    return await response.json();
  },

  listarPorEmpresaDiario: async () => {
    const response = await fetch(`${API_BASE}/reserva-mesa/empresa/hoy`, {
      headers: {
        Authorization: `Bearer ${token}`,
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
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al listar reservas");
    }

    return await response.json();
  },

  listarPorMesaId: async (idMesa) => {
    const response = await fetch(`${API_BASE}/reserva-mesa/mesa/${idMesa}`);

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
         Authorization: `Bearer ${token}`,
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
         Authorization: `Bearer ${token}`,
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
    });

    return response.ok;
  },

  eliminarPorReservaYMesa: async (idReserva, idMesa) => {
    const response = await fetch(
      `${API_BASE}/reserva-mesa/reserva/${idReserva}/mesa/${idMesa}`,
      {
        method: "DELETE",
      },
    );

    return response.ok;
  },

  eliminarPorReserva: async (idReserva) => {
    const response = await fetch(
      `${API_BASE}/reserva-mesa/reserva/${idReserva}`,
      {
        method: "DELETE",
      },
    );

    return response.ok;
  },

  listarClientes: async () => {
    const response = await fetch(`${API_BASE}/usuarios/clientes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al listar clientes");
    }

    return await response.json();
  },
};
