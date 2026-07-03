// js/consumo/apiCierre.js
const API_BASE = "http://localhost:8080/api";
const TEST_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6MUByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMywiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI5MTEzODAsImV4cCI6MTc4Mjk5Nzc4MH0.lD2oHF9npzKldSx_jsFLPTqHoVhlfxs7Qgj0usPxeCM";

const getHeaders = (empresaId) => {
    const token = localStorage.getItem('token') || TEST_TOKEN;
    return {
        'idempresa': empresaId.toString(),
        'Authorization': `Bearer ${token}`
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
        const token = localStorage.getItem('token') || TEST_TOKEN;
        const response = await fetch(`${API_BASE}/cierre-caja`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'idempresa': data.idEmpresa ? data.idEmpresa.toString() : '1',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Error al guardar cierre de caja");
        return await response.json();
    }
};
