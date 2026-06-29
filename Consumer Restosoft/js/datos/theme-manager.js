const STORAGE_KEY = "restsoft_theme";

export function obtenerTema() {
    const tema = localStorage.getItem(STORAGE_KEY);
    return tema ? JSON.parse(tema) : null;
}

export function aplicarTema(tema) {

    if (!tema) return;

    const root = document.documentElement.style;

    Object.entries(tema).forEach(([key, value]) => {

        const cssVariable =
            "--" +
            key.replace(/[A-Z]/g, m => "-" + m.toLowerCase());

        root.setProperty(cssVariable, value);

    });

}