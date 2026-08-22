const fs = require("fs");
const path = require("path");

const ARCHIVO = path.join(__dirname, "..", "data", "stats.json");

function hoy() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function cargar() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
  } catch {
    return { dias: {} };
  }
}

function guardar(data) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(data, null, 2));
}

function diaVacio() {
  return {
    visitas: 0,
    sesionesUnicas: [],
    ocrIntentos: 0,
    ocrExitos: 0,
    funciones: { subirCaptura: 0, agregarMateria: 0 },
    dispositivos: { movil: 0, escritorio: 0 },
  };
}

function record(type, sessionId, device) {
  const data = cargar();
  const d = hoy();
  if (!data.dias[d]) data.dias[d] = diaVacio();
  const registro = data.dias[d];

  if (type === "page_view") {
    registro.visitas++;
    if (sessionId && !registro.sesionesUnicas.includes(sessionId)) {
      registro.sesionesUnicas.push(sessionId);
    }
    if (device === "movil") registro.dispositivos.movil++;
    else registro.dispositivos.escritorio++;
  } else if (type === "ocr_intento") {
    registro.ocrIntentos++;
  } else if (type === "ocr_exito") {
    registro.ocrExitos++;
  } else if (type === "subir_captura") {
    registro.funciones.subirCaptura++;
  } else if (type === "agregar_materia") {
    registro.funciones.agregarMateria++;
  }

  guardar(data);
}

function getStats() {
  const data = cargar();
  const dias = Object.entries(data.dias)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([fecha, r]) => ({
      fecha,
      visitas: r.visitas,
      sesionesUnicas: r.sesionesUnicas.length,
      ocrIntentos: r.ocrIntentos,
      ocrExitos: r.ocrExitos,
      funciones: r.funciones,
      dispositivos: r.dispositivos,
    }));
  return { dias };
}

module.exports = { record, getStats };