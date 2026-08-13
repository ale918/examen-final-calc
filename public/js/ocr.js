/**
 * ocr.js
 * Lee una captura de pantalla del panel de materias del SGA y extrae:
 * nombre de materia, nota final y % de asistencia.
 * por si estas revisando el code, todo corre en el navegador del estudiante — la imagen nunca se sube
 * a ningún servidor.
 */

const OCR = (() => {

  const PALABRAS_IGNORAR = [
    "EN CURSO", "CURSO", "TEC-INF", "NIVEL", "PARALELO", "MIN.", "NOTA", "FINAL",
    "ASISTENCIA", "FINALIZADO", "APROBADO"
  ];

  function normalizar(txt) {
    return txt.trim().toUpperCase();
  }

  // ¿esta línea parece el título de una materia? (mayormente mayúsculas,
  // sin números largos, y no es una de las palabras de badges/labels)
  function esLineaDeTitulo(linea) {
    const limpia = linea.trim();
    if (limpia.length < 4) return false;
    if (/\d{2,}/.test(limpia)) return false; // rechaza fechas, horarios, notas (2+ dígitos seguidos)
    const soloLetras = limpia.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, "");
    if (soloLetras.length < 4) return false;
    const mayus = soloLetras.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, "");
    if (mayus.length / soloLetras.length < 0.55) return false; // debe ser mayormente mayúsculas
    const normalizada = limpia.toUpperCase();
    if (PALABRAS_IGNORAR.some(p => normalizada.includes(p))) return false;
    return true;
  }

  function limpiarTitulo(txt) {
    return txt
      .replace(/[|[\]{}$@*#~^_=]/g, " ")
      .replace(/\b\d+\b/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .toUpperCase();
  }

  // agrupa centros-X en columnas, separando donde hay un hueco grande
  function agruparPorColumnas(centrosX, holguraMinima) {
    const ordenados = [...centrosX].sort((a, b) => a - b);
    const grupos = [];
    let actual = [ordenados[0]];
    for (let i = 1; i < ordenados.length; i++) {
      if (ordenados[i] - ordenados[i - 1] > holguraMinima) {
        grupos.push(actual);
        actual = [];
      }
      actual.push(ordenados[i]);
    }
    if (actual.length) grupos.push(actual);
    return grupos.map(g => g.reduce((a, b) => a + b, 0) / g.length);
  }

  function columnaMasCercana(x, centroides) {
    let mejor = 0, mejorDist = Infinity;
    centroides.forEach((c, i) => {
      const d = Math.abs(x - c);
      if (d < mejorDist) { mejorDist = d; mejor = i; }
    });
    return mejor;
  }

  function reconstruirLineasPorColumna(words, imgWidth) {
    const anclas = words.filter(w => normalizar(w.text) === "ASISTENCIA");
    const centrosAncla = anclas.map(w => (w.bbox.x0 + w.bbox.x1) / 2);

    let centroides;
    if (centrosAncla.length >= 2) {
      centroides = agruparPorColumnas(centrosAncla, imgWidth * 0.12).sort((a, b) => a - b);
    } else {
      centroides = [imgWidth / 2];
    }

    const columnas = centroides.map(() => []);
    words.forEach(w => {
      const centroX = (w.bbox.x0 + w.bbox.x1) / 2;
      columnas[columnaMasCercana(centroX, centroides)].push(w);
    });

    return columnas.map(colWords => {
      colWords.sort((a, b) => a.bbox.y0 - b.bbox.y0);
      const lineas = [];
      let lineaActual = [];
      let yRef = null;
      colWords.forEach(w => {
        const centroY = (w.bbox.y0 + w.bbox.y1) / 2;
        const altura = w.bbox.y1 - w.bbox.y0;
        if (yRef === null || Math.abs(centroY - yRef) <= altura * 0.7) {
          lineaActual.push(w);
        } else {
          lineas.push(lineaActual);
          lineaActual = [w];
        }
        yRef = centroY;
      });
      if (lineaActual.length) lineas.push(lineaActual);

      return lineas
        .map(l => l.sort((a, b) => a.bbox.x0 - b.bbox.x0).map(w => w.text).join(" ").trim())
        .filter(Boolean);
    });
  }

 function esLimiteEstructural(linea) {
    // fechas, códigos de horario o "en curso": señal de que ya cruzamos
    // a los datos de la tarjeta anterior, hay que parar de buscar aquí
    return /\d{2}-\d{2}-\d{4}/.test(linea) ||
      /\bMPS\d?\b/i.test(linea) ||
      /\bMASA\b/i.test(linea) ||
      /\b(HAD|HPS|HAS)\s*\d/i.test(linea); // exige un número después (código real de horario)
  }

  function buscarTituloArriba(lineas, indice, maxSaltos) {
    const partes = [];
    for (let i = indice - 1, saltos = 0; i >= 0 && saltos < maxSaltos; i--, saltos++) {
      const linea = lineas[i].trim();
      if (!linea) continue;
      if (esLimiteEstructural(linea)) break; // cruzamos a la tarjeta anterior, mejor parar
      if (esLineaDeTitulo(linea)) {
        partes.unshift(linea);
        continue;
      }
      if (linea.length <= 2) continue;
      if (partes.length > 0) break;
    }
    return partes.join(" ").trim();
  }

  // se ancla en la etiqueta "NOTA FINAL" (confiable) y busca el número
  // decimal y el porcentaje en las líneas cercanas, en cualquier orden
  function extraerMateriasDeLineas(lineas) {
    const regexDecimal = /(\d{1,2}[.,]\d{1,2})/;
    const regexPorcentajeAsistencia = /(?<!\/)(?<!\/\s)(\d{1,3})\s*%/;
    const materias = [];

    lineas.forEach((linea, i) => {
      if (!/NOTA\s*FINAL/i.test(linea)) return;

      const inicio = Math.max(0, i - 6);
      const fin = Math.min(lineas.length, i + 3);
      const ventana = lineas.slice(inicio, fin).join(" ");

      const mDecimal = ventana.match(regexDecimal);
      const mPorcentaje = ventana.match(regexPorcentajeAsistencia);

      const tituloCrudo = buscarTituloArriba(lineas, i, 12);
      const materia = limpiarTitulo(tituloCrudo) || `Materia ${materias.length + 1}`;

      materias.push({
        materia,
        notaFinal: mDecimal ? mDecimal[1].replace(",", ".") : "",
        asistencia: mPorcentaje ? mPorcentaje[1] : ""
      });
    });

    return materias;
  }

  async function procesarImagen(archivo, onProgreso = () => {}) {
    if (typeof Tesseract === "undefined") {
      throw new Error("El motor de lectura (Tesseract.js) no cargó. Revisa tu conexión a internet.");
    }

    onProgreso("Leyendo texto de la imagen…");

    const resultado = await Tesseract.recognize(archivo, "spa", {
      logger: (info) => {
        if (info.status === "recognizing text") {
          onProgreso(`Leyendo texto… ${Math.round(info.progress * 100)}%`);
        }
      }
    });

    const words = (resultado.data.words || []).filter(w => w.text && w.text.trim());

    let materias = [];

   if (words.length > 0) {
      const imgWidth = Math.max(...words.map(w => w.bbox.x1), 1000);
      const columnas = reconstruirLineasPorColumna(words, imgWidth);
      columnas.forEach((lineasColumna, idx) => {
        console.log(`--- COLUMNA ${idx} ---`, lineasColumna);
        materias = materias.concat(extraerMateriasDeLineas(lineasColumna));
      });
    }

    if (materias.length === 0) {
      const textoCompleto = resultado.data.text || "";
      const lineas = textoCompleto.split("\n").map(l => l.trim()).filter(Boolean);
      materias = extraerMateriasDeLineas(lineas);
    }

    return materias;
  }

  return { procesarImagen };
})();