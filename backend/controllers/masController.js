import db from "../db/connection.js";
import bcrypt from "bcrypt";

export const changeEmail = async (req, res) => {
  const userId = req.user?.id;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "El nuevo correo es obligatorio." });
  }

  try {
    // Verificar si el correo ya está en uso
    const [existing] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Este correo ya está registrado." });
    }

    await db.execute("UPDATE usuarios SET email = ? WHERE id = ?", [email, userId]);
    res.status(200).json({ message: "Correo actualizado correctamente." });

  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el correo." });
  }
};


export const changePassword = async (req, res) => {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;
  
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }
  
    try {
      const [result] = await db.execute("SELECT password FROM usuarios WHERE id = ?", [userId]);
      const hashedPassword = result[0]?.password;
  
      const match = await bcrypt.compare(oldPassword, hashedPassword);
      if (!match) {
        return res.status(401).json({ message: "La contraseña actual no es correcta." });
      }
  
      const newHashed = await bcrypt.hash(newPassword, 10);
      await db.execute("UPDATE usuarios SET password = ? WHERE id = ?", [newHashed, userId]);
  
      res.status(200).json({ message: "Contraseña actualizada correctamente." });
    } catch (error) {
      res.status(500).json({ message: "Error al cambiar la contraseña." });
    }
};


export const deleteAccount = async (req, res) => {
  const userId = req.user?.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "La contraseña es obligatoria para confirmar." });
  }

  try {
    const [rows] = await db.query("SELECT password FROM usuarios WHERE id = ?", [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    await db.query("DELETE FROM usuarios WHERE id = ?", [userId]);
    res.status(200).json({ message: "Cuenta eliminada correctamente." });
    
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la cuenta." });
  }
};


export const cambiarNombreEquipo = async (req, res) => {
  const userId = req.user?.id;
  const { liga_id, nuevoNombre } = req.body;

  if (!liga_id || !nuevoNombre) {
    return res.status(400).json({ message: "Liga y nombre son obligatorios." });
  }

  try {
    await db.query(
      "UPDATE equipos_usuario SET nombre = ? WHERE usuario_id = ? AND liga_id = ?",
      [nuevoNombre, userId, liga_id]
    );
    res.status(200).json({ message: "Nombre del equipo actualizado correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar el nombre del equipo." });
  }
};


export const abandonarLiga = async (req, res) => {
  const userId = req.user?.id;
  const { liga_id } = req.body;

  if (!liga_id) {
    return res.status(400).json({ message: "Liga obligatoria." });
  }

  try {
    // Eliminar de usuarios_ligas
    await db.query("DELETE FROM usuarios_ligas WHERE usuario_id = ? AND liga_id = ?", [userId, liga_id]);

    // Eliminar equipo del usuario en esa liga
    await db.query("DELETE FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?", [userId, liga_id]);

    // Eliminar quintetos del usuario en esa liga
    await db.query("DELETE FROM quintetos WHERE usuario_id = ? AND liga_id = ?", [userId, liga_id]);

    res.status(200).json({ message: "Has abandonado la liga correctamente." });
  } catch (error) {
    res.status(500).json({ message: "No se pudo abandonar la liga." });
  }
};


export const getUsuariosLiga = async (req, res) => {
  const { ligaId } = req.params;
  const userId = req.user?.id;

  try {
    // Verificar si el usuario es el creador de la liga
    const [liga] = await db.query("SELECT creador_id FROM ligas WHERE id = ?", [ligaId]);
    if (liga.length === 0) {
      return res.status(404).json({ message: "Liga no encontrada." });
    }

    if (liga[0].creador_id !== userId) {
      return res.status(403).json({ message: "No tienes permisos para gestionar esta liga." });
    }

    // Obtener usuarios de la liga
    const [usuarios] = await db.query(
      `SELECT u.id, u.username, u.email, 
              CASE WHEN u.id = ? THEN TRUE ELSE FALSE END AS es_creador
       FROM usuarios u
       JOIN usuarios_ligas ul ON u.id = ul.usuario_id
       WHERE ul.liga_id = ?`,
      [userId, ligaId]
    );

    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error obteniendo usuarios de la liga:", error);
    res.status(500).json({ message: "Error obteniendo usuarios de la liga." });
  }
};


export const expulsarUsuarioLiga = async (req, res) => {
  const { ligaId } = req.params;
  const { userId } = req.body; // Usuario a expulsar
  const adminId = req.user?.id;

  try {
    // Verificar si quien expulsa es el creador
    const [liga] = await db.query("SELECT creador_id FROM ligas WHERE id = ?", [ligaId]);
    if (liga.length === 0 || liga[0].creador_id !== adminId) {
      return res.status(403).json({ message: "No tienes permiso para expulsar usuarios." });
    }

    // Eliminar relaciones del usuario en esa liga
    await db.query("DELETE FROM usuarios_ligas WHERE usuario_id = ? AND liga_id = ?", [userId, ligaId]);
    await db.query("DELETE FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?", [userId, ligaId]);
    await db.query("DELETE FROM quintetos WHERE usuario_id = ? AND liga_id = ?", [userId, ligaId]);

    res.status(200).json({ message: "Usuario expulsado correctamente." });
  } catch (error) {
    res.status(500).json({ message: "No se pudo expulsar al usuario." });
  }
};


export const editarLiga = async (req, res) => {
  const { ligaId } = req.params;
  const { nuevoNombre, nuevaPassword } = req.body;
  const userId = req.user?.id;

  try {
    const [liga] = await db.query("SELECT creador_id FROM ligas WHERE id = ?", [ligaId]);
    if (liga.length === 0 || liga[0].creador_id !== userId) {
      return res.status(403).json({ message: "No tienes permiso para modificar esta liga." });
    }

    const campos = [];
    const valores = [];

    if (nuevoNombre) {
      campos.push("nombre = ?");
      valores.push(nuevoNombre);
    }

    if (nuevaPassword) {
      const hashed = await bcrypt.hash(nuevaPassword, 10);
      campos.push("contraseña = ?");
      valores.push(hashed);
    }

    if (campos.length === 0) {
      return res.status(400).json({ message: "No se proporcionaron datos para actualizar." });
    }

    valores.push(ligaId);
    await db.query(`UPDATE ligas SET ${campos.join(", ")} WHERE id = ?`, valores);

    res.status(200).json({ message: "Liga actualizada correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al modificar la liga." });
  }
};