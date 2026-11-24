/* ==========================================================================
   APP DEL CATÁLOGO
   1. Carga los productos (planilla de Google o archivo de respaldo).
   2. Dibuja la grilla, los filtros y el buscador.
   3. Abre el detalle de cada producto con su propio link (#producto-CÓDIGO).
   ========================================================================== */

(function () {
  'use strict';

  const U = window.Util;
  const C = window.CONFIG;
  const $ = (sel) => document.querySelector(sel);

  // Estado de la página
  let productos = [];          // lista lista para mostrar (sin los ocultos)
  const filtro = { tipo: 'todos', edad: '', texto: '' };
  let detalleAbiertoDesdeLaPagina = false;

  // En la compu (localhost) se ven los avisos de "borrador"; en internet, no.
  const esVistaLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);

  /* ---------------------------------------------------------------------
     TEXTOS FIJOS Y LINKS
     --------------------------------------------------------------------- */
  function completarTextos() {
    document.querySelectorAll('[data-texto]').forEach((el) => {
      el.textContent = C.textos[el.dataset.texto] || '';
    });
    document.querySelectorAll('[data-whatsapp="general"]').forEach((a) => {
      a.href = U.linkWhatsApp(C.mensajes.general);
    });
    $('#link-instagram').href = `https://www.instagram.com/${C.instagram}`;
    $('#medios-pago').innerHTML = C.textos.mediosDePago.map((m) => `<li>${U.escapar(m)}</li>`).join('');
    $('#texto-quienes').innerHTML = C.textos.quienesSomos.map((p) => `<p>${U.escapar(p)}</p>`).join('');
    $('#aviso-provisorio').hidden = !C.textos.quienesSomosProvisorio;
    $('#aviso-precios').hidden = !C.mostrarPrecios;

    // Menú del celular
    const boton = $('.boton-menu');
    const menu = $('#menu');
    boton.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', String(abierto));
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) { menu.classList.remove('abierto'); boton.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------------------------------------------------------------------
     CARGA DE PRODUCTOS
     Primero intenta la planilla de Google (si está configurada).
     Si falla o viene rota, usa el archivo de respaldo datos/productos.csv.
     --------------------------------------------------------------------- */
  async function leerPlanilla(url) {
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('No se pudo leer ' + url);
    const lista = U.filasAObjetos(U.leerCSV(await resp.text()));
    if (!lista.some((p) => p.nombre)) throw new Error('La planilla está vacía');
    return lista;
  }

  async function cargarProductos() {
    let crudos = null;
    if (C.planillaGoogle) {
      try { crudos = await leerPlanilla(U.urlCSVdeGoogle(C.planillaGoogle)); }
      catch (e) { console.warn('Planilla de Google no disponible, uso el respaldo.', e); }
    }
    if (!crudos) crudos = await leerPlanilla(C.planillaRespaldo);
    await cargarListaDeFotos();
    return prepararProductos(crudos);
  }

  /** Lista de fotos preparadas (fotos/lista.json). Si no existe, se prueban todas. */
  let fotosDisponibles = null;
  async function cargarListaDeFotos() {
    try {
      const resp = await fetch(C.carpetaFotos + 'lista.json', { cache: 'no-cache' });
      if (resp.ok) fotosDisponibles = new Set(await resp.json());
    } catch (_) { /* sin lista: se intenta cargar cada foto igual */ }
  }

  /** Mismo criterio que herramientas/preparar-fotos.js: el código del principio del nombre. */
  function nombreDeFoto(texto) {
    const base = String(texto || '').trim().replace(/\.[a-z0-9]+$/i, '');
    if (!base) return '';
    const codigo = base.match(/^\d{4,}/) || base.match(/^[0-9A-Za-z-]+/);
    return U.normalizar(codigo ? codigo[0] : base).replace(/[^a-z0-9-]+/g, '-') + '.jpg';
  }

  /** Limpia y completa cada fila. Tolera datos faltantes. */
  function prepararProductos(crudos) {
    const usados = new Set();
    const lista = [];
    crudos.forEach((p, orden) => {
      if (!p.nombre) return;                       // fila sin nombre: se ignora
      const estado = U.normalizarEstado(p.estado);
      if (estado === 'oculto') return;

      let id = (p.codigo || U.slug(p.nombre)).replace(/\s+/g, '');
      while (usados.has(id)) id += '-2';           // por si hay códigos repetidos
      usados.add(id);

      let descripcion = p.descripcion || '';
      const esBorrador = /^\[borrador\]/i.test(descripcion);
      descripcion = descripcion.replace(/^\[borrador\]\s*/i, '');

      // Foto: la de la columna "foto" o, si está vacía, <código>.jpg.
      // Si existe la lista de fotos preparadas, solo se usa si está en la lista.
      let foto = '', fotoChica = '';
      const archivo = nombreDeFoto(p.foto || (p.codigo ? p.codigo + '.jpg' : ''));
      if (/^(https?:)?\/\//.test(p.foto || '')) { foto = fotoChica = p.foto; }
      else if (archivo && (!fotosDisponibles || fotosDisponibles.has(archivo))) {
        foto = C.carpetaFotos + archivo;
        fotoChica = C.carpetaFotos + 'chicas/' + archivo;
      }

      lista.push({
        id, orden,
        codigo: p.codigo || '',
        nombre: p.nombre,
        tipo: p.tipo || 'Otros',
        autor: p.autor || '',
        editorial: p.editorial || '',
        edad: U.interpretarEdad(p.edad),
        descripcion, esBorrador,
        estado,
        precio: U.interpretarPrecio(p.precio),
        nuevo: U.esSi(p.nuevo),
        foto, fotoChica,
        busqueda: U.normalizar([p.nombre, p.autor, p.editorial, p.codigo, p.tipo].join(' ')),
      });
    });
    return lista;
  }

  /* ---------------------------------------------------------------------
     FILTROS
     --------------------------------------------------------------------- */
  function armarFiltros() {
    // Tipos: primero los del orden configurado, después cualquier tipo nuevo.
    const existentes = [...new Set(productos.map((p) => p.tipo))];
    const tipos = [
      ...C.ordenTipos.filter((t) => existentes.includes(t)),
      ...existentes.filter((t) => !C.ordenTipos.includes(t)).sort(),
    ];
    const grupo = $('#filtro-tipos');
    grupo.innerHTML = [['todos', 'Todo'], ...tipos.map((t) => [t, t])]
      .map(([v, t]) => `<button type="button" class="chip" data-tipo="${U.escapar(v)}" aria-pressed="${v === filtro.tipo}">${U.escapar(t)}</button>`)
      .join('');
    grupo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tipo]');
      if (!b) return;
      filtro.tipo = b.dataset.tipo;
      grupo.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      dibujarCatalogo();
    });

    const sel = $('#filtro-edad');
    sel.innerHTML = '<option value="">Todas las edades</option>' +
      C.rangosEdad.map((r, i) => `<option value="${i}">${U.escapar(r.nombre)}</option>`).join('');
    sel.addEventListener('change', () => { filtro.edad = sel.value; dibujarCatalogo(); });

    let espera;
    $('#buscador').addEventListener('input', (e) => {
      clearTimeout(espera);
      espera = setTimeout(() => { filtro.texto = U.normalizar(e.target.value); dibujarCatalogo(); }, 150);
    });
  }

  /** Aplica filtros y ordena: disponibles primero, agotados al final. */
  function productosFiltrados() {
    const rango = filtro.edad === '' ? null : C.rangosEdad[Number(filtro.edad)];
    const palabras = filtro.texto.split(/\s+/).filter(Boolean);
    const salida = [];
    for (const p of productos) {
      if (filtro.tipo !== 'todos' && p.tipo !== filtro.tipo) continue;
      if (palabras.length && !palabras.every((w) => p.busqueda.includes(w))) continue;
      let sinEdad = false;
      if (rango) {
        if (!p.edad) sinEdad = true; // sin edad cargada: se muestra igual, al final
        else if (p.edad.hasta < rango.desde || p.edad.desde > rango.hasta) continue;
      }
      salida.push({ p, sinEdad });
    }
    const peso = ({ p, sinEdad }) => (p.estado === 'agotado' ? 2 : 0) + (sinEdad ? 1 : 0);
    salida.sort((a, b) => peso(a) - peso(b) || a.p.orden - b.p.orden);
    return salida;
  }

  /* ---------------------------------------------------------------------
     DIBUJO DE TARJETAS
     --------------------------------------------------------------------- */
  const GATO = 'img/gato-lira.png';

  function htmlFoto(p, grande) {
    const cartel = p.estado === 'agotado' ? '<span class="foto__cartel">Agotado</span>' : '';
    if (!p.foto) {
      return `<div class="foto foto--vacia"><img src="${GATO}" alt="" width="260" height="300">${cartel}</div>`;
    }
    const src = grande ? p.foto : p.fotoChica;
    return `<div class="foto"><img class="foto-producto" src="${U.escapar(src)}" alt="Foto de ${U.escapar(p.nombre)}"
      ${grande ? '' : 'loading="lazy"'} decoding="async">${cartel}</div>`;
  }

  function htmlEstado(p) {
    return `<span class="estado estado--${p.estado}">${U.NOMBRE_ESTADO[p.estado]}</span>`;
  }

  function htmlPrecio(p) {
    if (C.mostrarPrecios && p.precio) return U.formatearPrecio(p.precio);
    return 'Consultá el precio';
  }

  function htmlTarjeta(p) {
    const quien = p.autor || p.editorial;
    return `<a class="tarjeta${p.estado === 'agotado' ? ' tarjeta--agotado' : ''}" href="#producto-${encodeURIComponent(p.id)}">
      ${htmlFoto(p, false)}
      <div class="tarjeta__info">
        <h3 class="tarjeta__nombre">${U.escapar(p.nombre)}</h3>
        ${quien ? `<p class="tarjeta__dato">${U.escapar(quien)}</p>` : ''}
        ${p.edad ? `<p class="tarjeta__dato">${U.escapar(p.edad.texto)}</p>` : ''}
        <div class="tarjeta__pie">${htmlEstado(p)}
          ${C.mostrarPrecios && p.precio ? `<span class="tarjeta__dato"><strong>${htmlPrecio(p)}</strong></span>` : ''}
        </div>
      </div>
    </a>`;
  }

  function dibujarCatalogo() {
    const lista = productosFiltrados();
    const grilla = $('#grilla-catalogo');
    if (!lista.length) {
      grilla.innerHTML = `<p class="cargando">No encontramos productos con esa búsqueda.
        Probá con otra palabra o <a href="${U.linkWhatsApp(C.mensajes.general)}" target="_blank" rel="noopener">escribinos por WhatsApp</a>.</p>`;
    } else {
      grilla.innerHTML = lista.map(({ p }) => htmlTarjeta(p)).join('');
    }
    const sinEdad = lista.filter((x) => x.sinEdad).length;
    let texto = lista.length === 1 ? '1 producto' : `${lista.length} productos`;
    if (sinEdad) texto += `. Incluimos ${sinEdad === 1 ? '1 que todavía no tiene' : sinEdad + ' que todavía no tienen'} la edad cargada.`;
    $('#resultado').textContent = texto;
  }

  function dibujarNuevos() {
    const nuevos = productos.filter((p) => p.nuevo)
      .sort((a, b) => (a.estado === 'agotado') - (b.estado === 'agotado') || a.orden - b.orden)
      .slice(0, 8);
    $('#recien-llegados').hidden = !nuevos.length;
    $('#grilla-nuevos').innerHTML = nuevos.map(htmlTarjeta).join('');
  }

  // Si una foto no existe o no carga, se reemplaza por el gato-lira.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('foto-producto')) return;
    img.classList.remove('foto-producto');
    img.alt = '';
    img.src = GATO;
    img.parentElement.classList.add('foto--vacia');
  }, true);

  /* ---------------------------------------------------------------------
     DETALLE DE PRODUCTO (link propio: #producto-CÓDIGO)
     --------------------------------------------------------------------- */
  const dialogo = $('#detalle');

  function htmlDetalle(p) {
    const faltante = '<span class="dato-faltante">A confirmar</span>';
    const esAgotado = p.estado === 'agotado';
    const plantilla = esAgotado ? C.mensajes.avisame : C.mensajes.consulta;
    const link = U.linkWhatsApp(U.mensajeProducto(plantilla, p.nombre));
    const boton = esAgotado
      ? `<a class="boton boton--principal boton--ancho" href="${link}" target="_blank" rel="noopener"><span class="icono icono--campana" aria-hidden="true"></span> Avisame cuando haya stock</a>`
      : `<a class="boton boton--whatsapp boton--ancho" href="${link}" target="_blank" rel="noopener"><span class="icono icono--whatsapp" aria-hidden="true"></span> Consultar por WhatsApp</a>`;
    // A futuro: acá se puede sumar un botón "Agregar al carrito" (pago online).

    const filas = [];
    if (p.tipo === 'Libros' || p.autor) filas.push(['Autor' + (p.tipo === 'Libros' ? '' : ' o marca'), p.autor ? U.escapar(p.autor) : faltante]);
    if (p.editorial) filas.push(['Editorial', U.escapar(p.editorial)]);
    filas.push(['Edad', p.edad ? U.escapar(p.edad.texto) : '<span class="dato-faltante">A confirmar, consultanos</span>']);
    if (p.codigo) filas.push([p.tipo === 'Libros' ? 'ISBN' : 'Código', U.escapar(p.codigo)]);

    return `
      ${htmlFoto(p, true)}
      <div>
        <h2 class="detalle__nombre" id="detalle-nombre">${U.escapar(p.nombre)}</h2>
        <div class="detalle__etiquetas">${htmlEstado(p)}<span class="etiqueta">${U.escapar(p.tipo)}</span>
          ${p.nuevo ? '<span class="etiqueta">Nuevo</span>' : ''}</div>
        <dl class="datos">${filas.map(([t, v]) => `<dt>${t}</dt><dd>${v}</dd>`).join('')}</dl>
        ${p.descripcion ? `<p class="detalle__descripcion">${esVistaLocal && p.esBorrador ? '<span class="borrador">Borrador</span> ' : ''}${U.escapar(p.descripcion)}</p>` : ''}
        <p class="precio">${htmlPrecio(p)}</p>
        ${C.mostrarPrecios && p.precio ? '<p class="precio__aviso">Precios sujetos a cambios.</p>' : '<p class="precio__aviso"></p>'}
        <div class="detalle__acciones">
          ${boton}
          ${esAgotado ? '<p class="detalle__nota">Por ahora no tenemos stock. Escribinos y te avisamos cuando vuelva.</p>' : ''}
        </div>
      </div>`;
  }

  function idDesdeHash() {
    const m = location.hash.match(/^#producto-(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function mostrarDetalleSegunHash() {
    const id = idDesdeHash();
    if (!id) { if (dialogo.open) cerrarDialogo(); return; }
    const p = productos.find((x) => x.id === id);
    $('#detalle-cuerpo').innerHTML = p ? htmlDetalle(p) : `
      <div><h2 class="detalle__nombre" id="detalle-nombre">No encontramos este producto</h2>
      <p>Puede que ya no esté en el catálogo. <a href="#catalogo">Ver el catálogo</a> o
      <a href="${U.linkWhatsApp(C.mensajes.general)}" target="_blank" rel="noopener">escribinos por WhatsApp</a>.</p></div>`;
    document.title = (p ? p.nombre + ' · ' : '') + C.nombre;
    $('#boton-compartir').hidden = !p;
    if (!dialogo.open) {
      dialogo.showModal();
      document.body.classList.add('con-detalle');
    }
    dialogo.scrollTop = 0;
    // El foco va al nombre del producto (así los lectores de pantalla lo leen primero)
    const titulo = $('#detalle-nombre');
    titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: true });
  }

  function cerrarDialogo() {
    dialogo.close();
    document.body.classList.remove('con-detalle');
    document.title = 'Lira. Casa de Cuentos · Libros, juegos y mapas para chicos en Tucumán';
  }

  /** Botón "Volver": vuelve a donde estaba (o al catálogo si entró por un link). */
  function volver() {
    if (detalleAbiertoDesdeLaPagina) { detalleAbiertoDesdeLaPagina = false; history.back(); }
    else { history.replaceState(null, '', '#catalogo'); cerrarDialogo(); $('#catalogo').scrollIntoView(); }
  }

  function prepararDetalle() {
    dialogo.querySelector('[data-cerrar]').addEventListener('click', volver);
    dialogo.addEventListener('cancel', (e) => { e.preventDefault(); volver(); }); // tecla Esc
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) volver(); }); // clic afuera (compu)
    document.addEventListener('click', (e) => {
      if (e.target.closest('a[href^="#producto-"]')) detalleAbiertoDesdeLaPagina = true;
    });

    $('#boton-compartir').addEventListener('click', async () => {
      const p = productos.find((x) => x.id === idDesdeHash());
      if (!p) return;
      const url = location.href;
      try {
        if (navigator.share) { await navigator.share({ title: p.nombre, text: `${p.nombre} en Lira. Casa de Cuentos`, url }); return; }
        await navigator.clipboard.writeText(url);
        const etiqueta = $('#boton-compartir span:last-child');
        etiqueta.textContent = 'Link copiado';
        setTimeout(() => { etiqueta.textContent = 'Compartir'; }, 2500);
      } catch (_) { /* la persona canceló el compartir */ }
    });
    window.addEventListener('hashchange', mostrarDetalleSegunHash);
  }

  /* ---------------------------------------------------------------------
     ARRANQUE
     --------------------------------------------------------------------- */
  async function iniciar() {
    completarTextos();
    prepararDetalle();
    try {
      productos = await cargarProductos();
    } catch (e) {
      console.error(e);
      $('#grilla-catalogo').innerHTML = `<p class="cargando">No pudimos cargar el catálogo en este momento.
        <a href="${U.linkWhatsApp(C.mensajes.general)}" target="_blank" rel="noopener">Escribinos por WhatsApp</a> y te contamos qué tenemos.</p>`;
      return;
    }
    armarFiltros();
    dibujarCatalogo();
    dibujarNuevos();
    mostrarDetalleSegunHash(); // por si entró directo con un link de producto
  }

  iniciar();
})();
