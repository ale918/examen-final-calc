const filasEl = document.getElementById('filas');
const notaMinimaEl = document.getElementById('notaMinima');
const asistMinimaEl = document.getElementById('asistMinima');
const btnAgregar = document.getElementById('btnAgregar');

const inputCaptura = document.getElementById('inputCaptura');
const btnSubirCaptura = document.getElementById('btnSubirCaptura');
const ocrBox = document.getElementById('ocrBox');
const ocrEstado = document.getElementById('ocrEstado');

let contador = 0;

function crearFila({ materia = '', notaFinal = '', asistencia = '' } = {}) {
  contador++;
  const fila = document.createElement('div');
  fila.className = 'fila';
  fila.dataset.id = contador;
  fila.innerHTML = `
    <div class="campo campo-materia">
      <label>Materia</label>
      <input type="text" class="in-materia" placeholder="Ej. Cálculo Diferencial" value="${escaparHTML(materia)}">
    </div>
    <div class="campo campo-cortes">
      <label>Cortes (sobre 7)</label>
      <input type="number" class="in-cortes" min="0" max="7" step="0.01" placeholder="0.0" value="${escaparHTML(notaFinal)}">
    </div>
    <div class="campo campo-asist">
      <label>Asistencia %</label>
      <input type="number" class="in-asist" min="0" max="100" step="1" placeholder="0" value="${escaparHTML(asistencia)}">
    </div>
    <div class="resultado" data-resultado></div>
    <button class="borrar" type="button" title="Quitar materia">✕</button>
  `;
  filasEl.appendChild(fila);

  fila.querySelector('.borrar').addEventListener('click', () => fila.remove());
  fila.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => calcularFila(fila));
  });

  calcularFila(fila);
  return fila;
}

function escaparHTML(valor) {
  return String(valor).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function calcularFila(fila) {
  const cortes = parseFloat(fila.querySelector('.in-cortes').value);
  const asist = parseFloat(fila.querySelector('.in-asist').value);
  const notaMinima = parseFloat(notaMinimaEl.value) || 7;
  const asistMinima = parseFloat(asistMinimaEl.value) || 70;
  const resultadoEl = fila.querySelector('[data-resultado]');

  resultadoEl.className = 'resultado';

  if (isNaN(cortes)) {
    resultadoEl.innerHTML = `<span style="color:var(--ink-soft)">ingresa tu nota de cortes</span>`;
    return;
  }

  let avisoAsistencia = '';
  if (!isNaN(asist) && asist < asistMinima) {
    avisoAsistencia = `<div class="aviso-asistencia">⚠ asistencia bajo el ${asistMinima}% mínimo</div>`;
  }

  if (cortes >= notaMinima) {
    resultadoEl.classList.add('estado-aprobado');
    resultadoEl.innerHTML = `<span class="sello ok">ya aprobaste</span>${avisoAsistencia}`;
    return;
  }

  if (cortes < 0 || cortes > notaMinima + 3) {
    resultadoEl.innerHTML = `<span style="color:var(--ink-soft)">revisa el valor de cortes</span>`;
    return;
  }

  const examenFinal = (notaMinima - cortes) / 0.30;

  if (examenFinal > 10) {
    resultadoEl.classList.add('estado-imposible');
    resultadoEl.innerHTML = `
      <span class="sello imposible">ya no alcanza</span>
      <span>necesitarías ${examenFinal.toFixed(2)}/10</span>
      ${avisoAsistencia}
    `;
    return;
  }

  const notaFinal = cortes + examenFinal * 0.30;
  resultadoEl.classList.add('estado-pendiente');
  resultadoEl.innerHTML = `
    <span class="num">${examenFinal.toFixed(2)}</span>
    <span>/10 en el examen · nota final ${notaFinal.toFixed(2)}</span>
    ${avisoAsistencia}
  `;
}

function recalcularTodo() {
  document.querySelectorAll('.fila').forEach(calcularFila);
}

notaMinimaEl.addEventListener('input', recalcularTodo);
asistMinimaEl.addEventListener('input', recalcularTodo);
btnAgregar.addEventListener('click', () => {
  crearFila();
  if (window.trackEvent) trackEvent('agregar_materia');
});

// ---- Importar desde captura (OCR) ----

btnSubirCaptura.addEventListener('click', () => inputCaptura.click());

inputCaptura.addEventListener('change', async () => {
  const archivo = inputCaptura.files[0];
  if (!archivo) return;
  await procesarCaptura(archivo);
  inputCaptura.value = '';
});

['dragover', 'dragenter'].forEach(evento => {
  ocrBox.addEventListener(evento, (e) => {
    e.preventDefault();
    ocrBox.classList.add('arrastrando');
  });
});
['dragleave', 'drop'].forEach(evento => {
  ocrBox.addEventListener(evento, (e) => {
    e.preventDefault();
    ocrBox.classList.remove('arrastrando');
  });
});
ocrBox.addEventListener('drop', (e) => {
  const archivo = e.dataTransfer.files[0];
  if (archivo) procesarCaptura(archivo);
});

async function procesarCaptura(archivo) {
  ocrEstado.className = 'ocr-estado';
  ocrEstado.textContent = '';
  btnSubirCaptura.disabled = true;
  if (window.trackEvent) trackEvent('subir_captura');
  if (window.trackEvent) trackEvent('ocr_intento');

  try {
    const materias = await OCR.procesarImagen(archivo, (mensaje) => {
      ocrEstado.textContent = mensaje;
    });

    if (materias.length === 0) {
      ocrEstado.className = 'ocr-estado error';
      ocrEstado.textContent = 'No se reconoció ninguna materia en la imagen. Prueba con una captura más nítida, o agrégalas manualmente.';
      return;
    }

    materias.forEach(m => {
      const fila = crearFila(m);
      fila.classList.add('recien-importada');
    });

    if (window.trackEvent) trackEvent('ocr_exito');
    ocrEstado.className = 'ocr-estado ok';
    ocrEstado.textContent = `Se importaron ${materias.length} materia(s). Revisa que los datos estén correctos antes de calcular.`;
  } catch (err) {
    console.error(err);
    ocrEstado.className = 'ocr-estado error';
    ocrEstado.textContent = 'Ocurrió un error leyendo la imagen. Intenta de nuevo o agrega tus materias manualmente.';
  } finally {
    btnSubirCaptura.disabled = false;
  }
}

// arranca con una fila vacía lista para usar
crearFila();