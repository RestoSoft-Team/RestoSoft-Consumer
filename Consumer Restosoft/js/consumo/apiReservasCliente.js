import { API_BASE } from "./config.js";
import { api as apiMesas } from "./apiMesas.js";
import { apiProfileCliente } from "./apiProfile.js";

const token = localStorage.getItem("token_cliente");
const apiProfile = apiProfileCliente;

export { apiMesas, apiProfile };

export const apiReservaCliente = {
    listarMisReservas: async () => {
        const response = await fetch(`${API_BASE}/reserva-mesa/reserva/cliente`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Error al listar tus reservas");
        return await response.json();
    },

    guardarReserva: async (reserva, idsMesa) => {
        const response = await fetch(`${API_BASE}/reserva`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reserva, idsMesa }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw errorData;
        }
        return await response.json();
    },

    // Único método para actualizar (cambiar estado a CONFIRMADA o CANCELADA)
    actualizarReserva: async (idReserva, reserva, idsMesa) => {
        const response = await fetch(`${API_BASE}/reserva/${idReserva}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reserva, idsMesa }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw errorData;
        }
        return await response.json();
    }
};