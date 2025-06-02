import db from "../db/connection.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

//Función Registro
export const registro = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );
    res.json({ message: "Usuario registrado correctamente!" });
  } catch (error) {
    res.status(500).json({ message: "Error registrando al usuario", error });
  }
};

const JWT_SECRET = "your_secret_key";
const JWT_EXPIRATION = "15m";

//Función Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.execute("SELECT * FROM usuarios WHERE email = ?", [
      email,
    ]);
    const user = users[0];
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
      });
      res.json({ message: "Login exitoso!", token });
    } else {
      res.status(401).json({ message: "Credenciales inválidas" });
    }
  } catch (error) {
    res.status(500).json({ message: "Login erróneo", error });
  }
};
