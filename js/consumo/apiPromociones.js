import { API_BASE, TOKEN } from "../consumo/config.js";

const getHeaders = (empresaId) => {
    return {
        'idempresa': empresaId.toString(),
        'Authorization': `Bearer ${TOKEN}`
    };
};

export async function listarPromociones(empresaId = 1) {
    const response = await fetch(`${API_BASE}/promociones`, {
        headers: getHeaders(empresaId)
    });
    return response.ok ? await response.json() : [];
}

export async function listarPromocionesVigentes() {
    const response = await fetch(`${API_BASE}/promociones/vigentes`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    return response.ok ? await response.json() : [];
}

export async function obtenerPromocion(id) {
    const response = await fetch(`${API_BASE}/promociones/${id}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    return response.ok ? await response.json() : null;
}

export async function crearPromocion(data) {
    const response = await fetch(`${API_BASE}/promociones`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'idempresa': data.idEmpresa ? data.idEmpresa.toString() : '1',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify(data)
    });
    return response.ok ? await response.json() : null;
}

export async function actualizarPromocion(id, data) {
    const response = await fetch(`${API_BASE}/promociones/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'idempresa': data.idEmpresa ? data.idEmpresa.toString() : '1',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify(data)
    });
    return response.ok ? await response.json() : null;
}

export async function eliminarPromocion(id) {
    const response = await fetch(`${API_BASE}/promociones/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${TOKEN}` }
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
