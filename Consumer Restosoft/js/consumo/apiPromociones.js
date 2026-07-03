// js/consumo/apiPromociones.js
const API_BASE = "http://localhost:8080/api";
const TEST_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJqdWFuLnBlcmV6MUByZXN0b3NvZnQuY29tIiwidXN1YXJpb0lkIjoxMywiZW1wcmVzYUlkIjoxLCJyb2wiOiJNZXNlcm8iLCJpYXQiOjE3ODI5MTEzODAsImV4cCI6MTc4Mjk5Nzc4MH0.lD2oHF9npzKldSx_jsFLPTqHoVhlfxs7Qgj0usPxeCM";

const getHeaders = (empresaId) => {
    const token = localStorage.getItem('token') || TEST_TOKEN;
    return {
        'idempresa': empresaId.toString(),
        'Authorization': `Bearer ${token}`
    };
};

export async function listarPromociones(empresaId = 1) {
    const response = await fetch(`${API_BASE}/promociones`, {
        headers: getHeaders(empresaId)
    });
    return response.ok ? await response.json() : [];
}

export async function listarPromocionesVigentes() {
    const token = localStorage.getItem('token') || TEST_TOKEN;
    const response = await fetch(`${API_BASE}/promociones/vigentes`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok ? await response.json() : [];
}

export async function obtenerPromocion(id) {
    const token = localStorage.getItem('token') || TEST_TOKEN;
    const response = await fetch(`${API_BASE}/promociones/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
}

export async function crearPromocion(data) {
    const token = localStorage.getItem('token') || TEST_TOKEN;
    const response = await fetch(`${API_BASE}/promociones`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'idempresa': data.idEmpresa ? data.idEmpresa.toString() : '1',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    return response.ok ? await response.json() : null;
}

export async function actualizarPromocion(id, data) {
    const token = localStorage.getItem('token') || TEST_TOKEN;
    const response = await fetch(`${API_BASE}/promociones/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'idempresa': data.idEmpresa ? data.idEmpresa.toString() : '1',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    return response.ok ? await response.json() : null;
}

export async function eliminarPromocion(id) {
    const token = localStorage.getItem('token') || TEST_TOKEN;
    const response = await fetch(`${API_BASE}/promociones/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;
}

export const apiPromociones = {
    listarPromociones,
    listarPromocionesVigentes,
    obtenerPromocion,
    crearPromocion,
    actualizarPromocion,
    eliminarPromocion
};
