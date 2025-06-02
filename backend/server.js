import express from "express";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";
import "./cronJobs.js";


dotenv.config();

const app = express();
const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/index.html");
  });
});

app.use(express.json());
app.use("/api", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
