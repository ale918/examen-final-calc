# ¿Cuánto necesitas? — Calculadora de examen final

App web sencilla para que cualquier estudiante calcule qué nota necesita en el examen final para aprobar cada materia, según sus cortes y el mínimo de aprobación (por defecto 7/10, asistencia mínima 70%, ambos editables desde la interfaz).

## Correr localmente

```bash
npm install
npm start
```

Abre `http://localhost:3000`.

## Publicar en Railway

1. Sube esta carpeta a un repositorio de GitHub (o usa `railway up` desde la CLI directamente sin GitHub).
2. En [railway.app](https://railway.app), crea un **New Project → Deploy from GitHub repo** y selecciona el repositorio.
3. Railway detecta automáticamente que es un proyecto Node.js (por el `package.json`) y usa `npm start` como comando de inicio — no necesitas configurar nada más.
4. Cuando termine el build, Railway te da una URL pública (algo como `tuapp.up.railway.app`). Ábrela y compártela con tus compañeros.

### Alternativa: Railway CLI (sin GitHub)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## Estructura

```
examen-final-calc/
├── package.json
├── server.js        # servidor Express, sirve la carpeta public/
├── public/
│   └── index.html   # toda la interfaz (HTML + CSS + JS en un solo archivo)
└── README.md
```

## Nota

La fórmula asume que los cortes valen 70% de la nota final y el examen final vale 30% (`nota_final = cortes + examen_final * 0.30`). Si tu universidad usa otra ponderación, edita esa línea en `public/index.html` dentro de la función `calcularFila`.
