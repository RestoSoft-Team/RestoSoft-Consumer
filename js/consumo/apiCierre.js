import { API_BASE, TOKEN } from "../consumo/config.js";

const getHeaders = (empresaId) => {
    return {
        'idempresa': empresaId.toString(),
        'Authorization': `Bearer ${TOKEN}`
    };
};

export const apiCierre = {
    obtenerCierrePorFecha: async (empresaId = 1, fecha) => {
        try {
            const response = await fetch(`${API_BASE}/cierre-caja/fecha?fecha=${fecha}`, {
                headers: getHeaders(empresaId)
            });
            if (response.status === 404 || response.status === 204) return null;
            return response.ok ? await response.json() : null;
        } catch (e) {
            return null;
        }
    },
    obtenerResumenDiario: async (empresaId = 1, fecha) => {
        const response = await fetch(`${API_BASE}/cierre-caja/resumen?fecha=${fecha}`, {
            headers: getHeaders(empresaId)
        });
        if (!response.ok) throw new Error("Error al obtener resumen de caja");
        return await response.json();
    },
    guardarCierreCaja: async (data) => {
        const response = await fetch(`${API_BASE}/cierre-caja`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'idempresa': data.idEmpresa ? data.idEmpresa.toString() : '1',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Error al guardar cierre de caja");
        return await response.json();
    }
};
