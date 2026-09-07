require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/categories.routes");
const taskRoutes = require("./routes/tasks.routes");
const calendarRoutes = require("./routes/calendar.routes");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado. Crie o arquivo .env.");
}

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "Gerenciador de Tarefas Pessoais - API",
    version: "1.0.0",
    status: "online"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/calendar", calendarRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado." });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`API executando em http://localhost:${PORT}`);
});
