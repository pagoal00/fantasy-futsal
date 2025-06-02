import express from "express";
import path from "path";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import cron from "./cronJobs.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

// Necesario para obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/logout", (req, res) => {
  req.session?.destroy(() => {
    res.redirect("/index.html");
  });
});

app.use(express.json());
app.use("/api", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
