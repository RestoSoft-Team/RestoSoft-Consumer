import { obtenerPerfilSesion } from "../consumo/sesionContext.js";

document.addEventListener('DOMContentLoaded', async () => {
  const infoPerfilContainer = document.getElementById("infoPerfilContainer");

  // Si no estamos en una página con topbar, no hacemos nada
  if (!infoPerfilContainer) return;

  // Perfil con validación de sesión (único origen: sesionContext).
  // Si la sesión es inválida, sesionContext limpia la sesión y redirige
  // a la página de error. Antes este archivo armaba un perfilData con un
  // formato distinto al real ({ usuario: <respuesta completa>, rol }) y
  // por eso el topbar mostraba siempre las iniciales de respaldo.
  const perfilData = await obtenerPerfilSesion();
  if (!perfilData) return;

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
