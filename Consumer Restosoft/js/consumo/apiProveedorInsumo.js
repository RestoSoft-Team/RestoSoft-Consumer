const API_BASE = 'http://localhost:8080/api';

const ApiProveedorInsumo = {

    obtenerInsumos: async (idEmpresa = 1) => {
        const res = await fetch(`${API_BASE}/insumos/empresa/${idEmpresa}`);
        if (!res.ok) throw new Error('Error al cargar insumos');
        return await res.json();
    },

    // ✅ ESTE ENDPOINT YA EXISTE EN TU CONTROLLER
    obtenerRelaciones: async () => {
        const res = await fetch(`${API_BASE}/proveedor-insumos`);
        if (!res.ok) throw new Error('Error al cargar relaciones');
        return await res.json();
    },

    obtenerProveedores: async () => {
        const res = await fetch(`${API_BASE}/proveedores`);
        if (!res.ok) throw new Error('Error al cargar proveedores');
        return await res.json();
    }
};

export default ApiProveedorInsumo;