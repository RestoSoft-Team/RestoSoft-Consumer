import { API_BASE, TOKEN } from "../consumo/config.js";

document.addEventListener('DOMContentLoaded', async () => {
  const infoPerfilContainer = document.getElementById("infoPerfilContainer");

  // Si no estamos en una página con topbar, no hacemos nada
  if (!infoPerfilContainer) return;

  let perfilData = null;

  // 1. Intentamos leer del localStorage (Carga instantánea)
  const perfilDataStr = localStorage.getItem("perfilData");
  if (perfilDataStr) {
    try {
      perfilData = JSON.parse(perfilDataStr);
    } catch (e) {
      console.error("Error al leer perfilData", e);
    }
  }

  // 2. Si NO está en el localStorage pero hay Token, lo pedimos al backend
  if (!perfilData && TOKEN) {
    console.log("Topbar: Token encontrado. Pidiendo perfil al backend...");
    try {
      const response = await fetch(`${API_BASE}/usuarios/me`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      
      if (response.ok) {
        const usuarioData = await response.json();
        
        // Adaptamos la respuesta del backend al formato que espera nuestra función
        perfilData = {
          usuario: usuarioData,
          // Si el rol viene dentro del usuario, lo sacamos afuera para la vista
          rol: usuarioData.rol || { nombre: 'Usuario' } 
        };
        
        // Lo guardamos para la próxima vez
        localStorage.setItem("perfilData", JSON.stringify(perfilData));
        console.log("Topbar: Perfil cargado exitosamente.", perfilData);
      } else {
        console.error("Topbar: Error del backend al pedir perfil. Status:", response.status);
      }
    } catch (error) {
      console.error("Topbar: Error de red al obtener perfil:", error);
    }
  } else if (!TOKEN) {
    console.warn("Topbar: No hay Token disponible.");
  }

  // 3. Renderizamos el perfil
  cargarPerfilUsuario(perfilData);

  function cargarPerfilUsuario(perfilData) {
    const urlPerfil = "perfil.html"; // Ajusta la ruta si está en otra carpeta

    if (perfilData && perfilData.usuario) {
      const u = perfilData.usuario;
      const iniciales = ((u.nombres || "").substring(0, 1) + (u.apellidos || "").substring(0, 1)).toUpperCase() || "EP";
      const avatarHTML = u.imagenUrl
        ? `<img src="${u.imagenUrl}" alt="Perfil" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" />`
        : `<div class="profile-text-avatar">${iniciales}</div>`;
      const nombreCompleto = `${u.nombres || ""} ${u.apellidos || ""}`.trim() || "Usuario sin nombre";
      const rol = (perfilData.rol && perfilData.rol.nombre) ? perfilData.rol.nombre : (u.rol?.nombre || u.rol || "Sin rol asignado");

      infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" class="profile-link">
          ${avatarHTML}
          <div class="profile-info">
            <strong>${nombreCompleto}</strong>
            <div>${rol}</div>
          </div>
        </a>
      `;
    } else {
      infoPerfilContainer.innerHTML = `
        <a href="${urlPerfil}" class="profile-link">
          <div class="profile-text-avatar">UA</div>
          <div class="profile-info">
            <strong>Usuario Anónimo</strong>
            <div>Invitado</div>
          </div>
        </a>
      `;
    }
  }
});