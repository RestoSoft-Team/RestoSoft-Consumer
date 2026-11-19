
export function aplicarTema(c) {
  const root = document.documentElement.style;
  if (c.primary) root.setProperty('--primary', c.primary);
  if (c.primaryLight) root.setProperty('--primary-light', c.primaryLight);
  if (c.primarySoft) root.setProperty('--primary-soft', c.primarySoft);
  if (c.background) root.setProperty('--background', c.background);
  if (c.surface) root.setProperty('--surface', c.surface);
  if (c.surfaceContainer) root.setProperty('--surface-container', c.surfaceContainer);
  if (c.borderColor) root.setProperty('--border-color', c.borderColor);
  if (c.dark) root.setProperty('--dark', c.dark);
  if (c.gray) root.setProperty('--gray', c.gray);
  if (c.soft) root.setProperty('--soft', c.soft);
  if (c.success) root.setProperty('--success', c.success);
  if (c.successSoft) root.setProperty('--success-soft', c.successSoft);
  if (c.warning) root.setProperty('--warning', c.warning);
  if (c.warningSoft) root.setProperty('--warning-soft', c.warningSoft);
  if (c.danger) root.setProperty('--danger', c.danger);
  if (c.dangerSoft) root.setProperty('--danger-soft', c.dangerSoft);
}

export async function inicializarTema() {
  const temaGuardado = localStorage.getItem('restsoft_theme');

  if (!temaGuardado) {
    try {
      const response = await fetch('TU_ENDPOINT_DE_CONFIGURACION/api/theme/1');
      if (!response.ok) throw new Error('Error en la respuesta de la API');
      
      const coloresData = await response.json();
      localStorage.setItem(THEME_KEY, JSON.stringify(coloresData));
      aplicarTema(coloresData);
    } catch (error) {
      console.warn('No se pudo cargar el tema de la API, usando estilos por defecto del CSS.', error);
    }
  }
}

inicializarTema();