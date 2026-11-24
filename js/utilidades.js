/* ==========================================================================
   UTILIDADES
   Funciones chicas que usa app.js: leer la planilla (CSV), entender la edad,
   el estado y el precio, y armar los links de WhatsApp.
   ========================================================================== */

window.Util = (function () {
  'use strict';

  /** Pasa a minúsculas y saca tildes: "Petit, el MONSTRUO" -> "petit, el monstruo" */
  function normalizar(texto) {
    return String(texto ?? '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim();
  }

  /** Evita que un texto de la planilla se interprete como código HTML. */
  function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /**
   * Lee un texto CSV y devuelve una lista de filas (cada fila, una lista de celdas).
   * Acepta separador coma o punto y coma (Excel en castellano usa ";"),
   * comillas y saltos de línea dentro de una celda.
   */
  function leerCSV(texto) {
    texto = String(texto).replace(/^﻿/, '');
    const primeraLinea = texto.split(/\r?\n/, 1)[0];
    const sep = (primeraLinea.split(';').length > primeraLinea.split(',').length) ? ';' : ',';
    const filas = [];
    let fila = [], celda = '', entreComillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (entreComillas) {
        if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
        else if (c === '"') entreComillas = false;
        else celda += c;
      } else if (c === '"') entreComillas = true;
      else if (c === sep) { fila.push(celda); celda = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(celda); filas.push(fila); fila = []; celda = '';
      } else celda += c;
    }
    if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
    return filas.filter((f) => f.some((c) => c.trim() !== ''));
  }

  /**
   * Convierte las filas del CSV en objetos usando la primera fila como encabezado.
   * Los encabezados se comparan sin tildes ni mayúsculas, así que
   * "Código", "codigo" y "CÓDIGO" funcionan igual.
   */
  const COLUMNAS = {
    'codigo': 'codigo', 'nombre': 'nombre', 'tipo': 'tipo',
    'autor o marca': 'autor', 'autor': 'autor', 'marca': 'autor',
    'editorial': 'editorial', 'edad': 'edad',
    'descripcion': 'descripcion', 'estado': 'estado', 'precio': 'precio',
    'nuevo': 'nuevo', 'foto': 'foto',
  };
  function filasAObjetos(filas) {
    if (!filas.length) return [];
    const claves = filas[0].map((h) => COLUMNAS[normalizar(h)] || null);
    if (!claves.includes('nombre')) throw new Error('La planilla no tiene la columna "nombre".');
    return filas.slice(1).map((f) => {
      const o = {};
      claves.forEach((k, i) => { if (k) o[k] = String(f[i] ?? '').trim(); });
      return o;
    });
  }

  /** "Últimas unidades", "ultimas", "AGOTADO"... -> disponible | ultimas | agotado | oculto */
  function normalizarEstado(texto) {
    const t = normalizar(texto);
    if (t.startsWith('agot') || t === 'sin stock') return 'agotado';
    if (t.startsWith('ultim') || t.includes('pocas')) return 'ultimas';
    if (t.startsWith('ocult') || t === 'no mostrar') return 'oculto';
    return 'disponible'; // vacío o cualquier otra cosa se toma como disponible
  }
  const NOMBRE_ESTADO = { disponible: 'Disponible', ultimas: 'Últimas unidades', agotado: 'Agotado' };

  /** "sí", "si", "x", "1" -> true */
  function esSi(texto) {
    return ['si', 's', 'x', '1', 'true', 'nuevo'].includes(normalizar(texto));
  }

  /**
   * Interpreta la columna "edad". Formatos aceptados:
   *   "desde 3", "+3", "3+", "3 a 6", "3-6", "5", "todas", "todas las edades", "bebés", "meses".
   * Devuelve { desde, hasta, texto } o null si está vacía o no se entiende.
   */
  function interpretarEdad(texto) {
    const t = normalizar(texto);
    if (!t) return null;
    if (t.includes('toda')) return { desde: 0, hasta: 99, texto: 'Todas las edades' };
    const n = (t.match(/\d+/g) || []).map(Number);
    const esMeses = t.includes('mes') || t.includes('bebe');
    if (esMeses && (!n.length || t.includes('mes'))) {
      // edades en meses: se toman como 0 años hasta lo que diga en años (si dice)
      return { desde: 0, hasta: 2, texto: texto.trim() };
    }
    if (!n.length) return null;
    if (n.length >= 2) {
      const [a, b] = n[0] <= n[1] ? n : [n[1], n[0]];
      return { desde: a, hasta: b, texto: `De ${a} a ${b} años` };
    }
    const a = n[0];
    if (t.includes('hasta')) return { desde: 0, hasta: a, texto: `Hasta ${a} años` };
    if (t.includes('desde') || t.includes('+') || t.includes('mas')) {
      return { desde: a, hasta: 99, texto: `Desde ${a} año${a === 1 ? '' : 's'}` };
    }
    // un solo número sin más: se toma como "desde"
    return { desde: a, hasta: 99, texto: `Desde ${a} año${a === 1 ? '' : 's'}` };
  }

  /** "12500", "12.500", "$ 12.500,00" -> 12500. Si no hay número válido, null. */
  function interpretarPrecio(texto) {
    let t = String(texto ?? '').replace(/[^\d.,]/g, '');
    if (!t) return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); // formato argentino
    else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, '');          // "12.500"
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const formatoPesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  function formatearPrecio(n) { return '$ ' + formatoPesos.format(Math.round(n)); }

  /** Link a WhatsApp con un mensaje ya escrito. */
  function linkWhatsApp(mensaje) {
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  }
  function mensajeProducto(plantilla, nombre) {
    return plantilla.replace('{producto}', nombre);
  }

  /**
   * Acepta el link de "Publicar en la web" de Google Sheets en cualquiera de sus
   * formas y devuelve el que entrega CSV. Ej.: .../pubhtml -> .../pub?output=csv
   */
  function urlCSVdeGoogle(url) {
    url = String(url || '').trim();
    if (!url.includes('docs.google.com')) return url;
    if (/output=csv/.test(url)) return url;
    const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1];
    const base = url.replace(/\/pubhtml.*$/, '/pub').replace(/\/pub\?.*$/, '/pub');
    return base + '?output=csv' + (gid ? `&gid=${gid}&single=true` : '');
  }

  /** Arma un identificador para el link del producto, si no tiene código. */
  function slug(texto) {
    return normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  return {
    normalizar, escapar, leerCSV, filasAObjetos, normalizarEstado, NOMBRE_ESTADO, esSi,
    interpretarEdad, interpretarPrecio, formatearPrecio, linkWhatsApp, mensajeProducto, slug, urlCSVdeGoogle,
  };
})();
