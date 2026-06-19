const API_BASE = "http://localhost:8080/api";

export const apiReserva = {

    crearReserva: async (reserva, idsMesa) => {

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
                throw new Error("Error al crear reserva");
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

            if (!response.ok) {
                throw new Error("Error al eliminar reserva");
            }

            return true;

        } catch (error) {

            console.error("Fallo de API:", error);
            return false;

        }
    },


    obtenerMesasReserva: async (idReserva) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/reserva/${idReserva}`
            );

            if (!response.ok) {
                throw new Error("Error al obtener mesas de la reserva");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            return [];

        }
    },


    obtenerReservasMesa: async (idMesa) => {

        try {

            const response = await fetch(
                `${API_BASE}/reserva-mesa/mesa/${idMesa}`
            );

            if (!response.ok) {
                throw new Error("Error al obtener reservas de la mesa");
            }

            return await response.json();

        } catch (error) {

            console.error("Fallo de API:", error);
            return [];

        }
    },


    eliminarMesaDeReserva: async (
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


    eliminarTodasMesasReserva: async (
        idReserva
    ) => {

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
    }
};