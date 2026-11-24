/* ==========================================================================
   CONFIGURACIÓN DEL CATÁLOGO
   Este es el único archivo que hace falta tocar para cambiar datos del
   negocio, textos y opciones. Cambiá solo lo que está entre comillas
   o los valores true / false. No borres las comas del final de cada línea.
   ========================================================================== */

window.CONFIG = {
  // --- Datos del negocio ---------------------------------------------------
  nombre: 'Lira. Casa de Cuentos',
  whatsapp: '5493814488994', // solo números: 54 9 + característica + número
  instagram: 'liralibreria', // usuario de Instagram, sin @

  // --- Precios -------------------------------------------------------------
  // false = en cada producto dice "Consultá el precio".
  // true  = se muestra la columna "precio" de la planilla (ej.: $ 12.500).
  // OJO: la planilla pública se puede leer aunque esto esté en false.
  // No cargues precios en la planilla si todavía no querés que se vean.
  mostrarPrecios: false,

  // --- Dirección de la página en internet ----------------------------------
  // Si algún día conectan un dominio propio (ej.: https://liracasadecuentos.com.ar/),
  // se cambia acá y se vuelve a publicar.
  direccionWeb: 'https://liracasadecuentos.github.io/',

  // --- De dónde salen los productos ----------------------------------------
  // Link de la planilla de Google, el que da "Archivo > Compartir > Publicar en la web".
  // Si está vacío o la planilla falla, la página usa el respaldo datos/productos.csv
  // (que se actualiza solo cada vez que publicás).
  planillaGoogle: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvlGg7rm7BzlCuuNMCwAk-ag4YO_HPohqr_qbMsYT2N57OKQh8qlRzQ1sOL-o_zfHI5ldzqKGa84mR/pub?gid=752344064&single=true&output=csv',
  planillaRespaldo: 'datos/productos.csv',

  // Carpeta de fotos. Si un producto no tiene nada en la columna "foto",
  // se busca  fotos/<código>.jpg  (por ejemplo fotos/9873967818.jpg).
  carpetaFotos: 'fotos/',

  // --- Tipos de producto ---------------------------------------------------
  // Orden en que aparecen los botones del filtro. Si en la planilla escribís
  // un tipo nuevo (por ejemplo "Papelería"), aparece solo al final.
  ordenTipos: ['Libros', 'Juegos', 'Mapas'],

  // --- Rangos de edad del filtro --------------------------------------------
  rangosEdad: [
    { nombre: '0 a 3 años', desde: 0, hasta: 3 },
    { nombre: '4 a 6 años', desde: 4, hasta: 6 },
    { nombre: '7 a 9 años', desde: 7, hasta: 9 },
    { nombre: '10 años en adelante', desde: 10, hasta: 99 },
  ],

  // --- Textos de la página --------------------------------------------------
  textos: {
    bienvenida: 'Libros, juegos y mapas elegidos con cariño para leer, jugar y descubrir en familia.',

    // Texto de la primera publicación de Instagram (7/11/2026), sin hashtags.
    // Cada renglón entre comillas es un párrafo.
    // Si lo cambiás por un borrador, poné  quienesSomosProvisorio: true  para ver el aviso.
    quienesSomos: [
      'Lira tiene muchos significados. Para nosotras es, antes que nada, el nombre de nuestra mamá.',
      'Es un nombre que ya pasó por tres generaciones. Lo eligió por primera vez nuestro bisabuelo, poeta, para una de sus hijas: nuestra abuela. Lo pensó por la lira, el instrumento que tocan los ángeles, y por eso la llamó Lira Angélica.',
      'De ella lo heredó nuestra mamá, Lira Angélica también, y hoy lo lleva una de nosotras.',
      'Elegimos su nombre para esta librería porque este proyecto empezó un poco con ella, y porque ella es quien nos dio la vida. Llamarla así es nuestra forma de honrarla.',
      'Bienvenidos a Lira. Casa de cuentos. Espacio que estamos construyendo con libros para adultos e infancias, talleres y experiencias.',
      'Gracias por acompañarnos.',
    ],
    quienesSomosProvisorio: false,

    retiro: 'Retiro a coordinar.',
    envios: 'Hacemos envíos solo dentro de la provincia de Tucumán. Los coordinamos con vos y el costo del envío corre por tu cuenta.',
    mediosDePago: ['Efectivo', 'Transferencia', 'Mercado Pago'],
  },

  // --- Mensajes que se abren en WhatsApp ------------------------------------
  // «{producto}» se reemplaza por el nombre del producto.
  mensajes: {
    general: 'Hola! Quería hacer una consulta.',
    consulta: 'Hola! Quería consultar por «{producto}» que vi en la página de Lira. Casa de Cuentos.',
    avisame: 'Hola! Quiero que me avisen cuando haya stock de «{producto}».',
  },

  // --- A futuro (todavía no se usa) -----------------------------------------
  // ventaOnline: false,  // carrito y pago con Mercado Pago
};
