const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const analytics = require("./lib/analytics");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const STATS_KEY = process.env.STATS_KEY || "cambia-esta-clave";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// registrar un evento anónimo (visita, uso de OCR, etc.)
app.post("/api/track", (req, res) => {
  const { type, sessionId, device } = req.body || {};
  analytics.record(type, sessionId, device);
  res.json({ ok: true });
});

// leer las estadísticas agregadas (requiere la clave)
app.get("/api/stats", (req, res) => {
  if (req.query.key !== STATS_KEY) return res.status(403).json({ error: "no autorizado" });
  res.json(analytics.getStats());
});

// página de estadísticas (requiere la misma clave en la URL)
app.get("/stats", (req, res) => {
  if (req.query.key !== STATS_KEY) {
    return res.status(403).send("No autorizado. Agrega ?key=TU_CLAVE al final de la URL.");
  }
  res.sendFile(path.join(__dirname, "public", "stats.html"));
});

// conteo de conectados en vivo, vía WebSocket
let conectados = 0;
io.on("connection", (socket) => {
  conectados++;
  io.emit("conectados", conectados);
  socket.on("disconnect", () => {
    conectados--;
    io.emit("conectados", conectados);
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});