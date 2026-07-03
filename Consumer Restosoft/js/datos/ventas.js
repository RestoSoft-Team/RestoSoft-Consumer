// js/ventas.js
import { apiVentas } from 'consumo/apiVentas.js';

export const listarVentas = apiVentas.listarVentas;
export const listarVentasPorFecha = apiVentas.listarVentasPorFecha;
export const obtenerTotalDia = apiVentas.obtenerTotalDia;
export const crearVenta = apiVentas.crearVenta;
