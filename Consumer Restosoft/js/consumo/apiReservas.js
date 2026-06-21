const API_BASE = "http://localhost:8080/api";

export const apiReserva = {

    listarPorReservaId: async (idReserva) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/reserva/${idReserva}`
            );

            if (!response.ok) {
                throw new Error("Error al listar por reserva");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            return [];

        }
    },

    listarPorEmpresaDiario: async (idEmpresa) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/empresa/${idEmpresa}/hoy`
            );

            if (!response.ok) {
                throw new Error("Error al listar reservas diarias");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            return [];

        }
    },

    listarPorEmpresaGeneral: async (idEmpresa) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/empresa/${idEmpresa}`
            );

            if (!response.ok) {
                throw new Error("Error al listar reservas");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            return [];

        }
    },

    listarPorMesaId: async (idMesa) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/mesa/${idMesa}`
            );

            if (!response.ok) {
                throw new Error("Error al listar reservas de la mesa");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            return [];

        }
    },

    guardarReserva: async (
        reserva,
        idsMesa
    ) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        reserva,
                        idsMesa
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Error al guardar reserva");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            throw error;

        }
    },

    actualizarReserva: async (
        idReserva,
        reserva,
        idsMesa
    ) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva/${idReserva}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        reserva,
                        idsMesa
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Error al actualizar reserva");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            throw error;

        }
    },

    eliminarReserva: async (idReserva) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva/${idReserva}`,
                {
                    method: "DELETE"
                }
            );

            return response.ok;

        } catch (error) {

            console.error("Fallo de API:", error);
            return false;

        }
    },

    eliminarPorReservaYMesa: async (
        idReserva,
        idMesa
    ) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/reserva/${idReserva}/mesa/${idMesa}`,
                {
                    method: "DELETE"
                }
            );

            return response.ok;

        } catch (error) {

            console.error("Fallo de API:", error);
            return false;

        }
    },

    eliminarPorReserva: async (idReserva) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/reserva/${idReserva}`,
                {
                    method: "DELETE"
                }
            );

            return response.ok;

        } catch (error) {

            console.error("Fallo de API:", error);
            return false;

        }
    },

    listarClientes: async () => {
        try {

            const response = await fetch(
                `${API_BASE}/usuarios/clientes`
            );

            if (!response.ok) {
                throw new Error("Error al listar clientes");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            return [];

        }
    }

    }