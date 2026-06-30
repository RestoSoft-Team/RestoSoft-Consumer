/* ============================================
   API CLIENTE — Solo llamada al endpoint
   No sabe nada de DOM, no renderiza nada.
   Solo recibe un slug y devuelve el JSON.
   ============================================ */

const ApiCliente = (function () {
    'use strict';

    /* ── URL base del endpoint ──
       CAMBIA ESTA URL POR LA TUYA.
       Se concatenará: API_BASE_URL + "/" + slug        */
    const API_BASE_URL = '';

    /**
     * Busca una empresa por su slug.
     * @param {string} slug - Nombre de la empresa en la URL
     * @returns {Promise<object|null>} Datos de la empresa o null si no existe
     * @throws {Error} Si hay error de red o del servidor
     */
    async function obtenerEmpresa(slug) {
        if (!slug || typeof slug !== 'string') {
            throw new Error('Slug inválido');
        }

        const url = `${API_BASE_URL}/${encodeURIComponent(slug)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        return await response.json();
    }

    // Pública
    return {
        obtenerEmpresa
    };

})();