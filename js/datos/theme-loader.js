import { obtenerTema, aplicarTema } from "./theme-manager.js";

const tema = obtenerTema();

if (tema) {
    aplicarTema(tema);
}