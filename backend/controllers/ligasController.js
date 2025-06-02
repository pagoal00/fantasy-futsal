import db from "../db/connection.js";
import bcrypt from "bcrypt";


export const crearLiga = async (req, res) => {
    const { name, password, teamName } = req.body;
    const creador_id = req.user?.id; 

    if (!name || !password || !creador_id || !teamName) {
        return res.status(400).json({ message: "Nombre, contraseña y creador_id son obligatorios." });
    }

    try {
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            "INSERT INTO ligas (nombre, contraseña, creador_id) VALUES (?, ?, ?)", 
            [name, hashedPassword, creador_id]
        );

        const liga_id = result.insertId; 

        await db.execute(
            "INSERT INTO usuarios_ligas (usuario_id, liga_id) VALUES (?, ?)", 
            [creador_id, liga_id]
        );

        await db.execute(
            "INSERT INTO equipos_usuario (usuario_id, liga_id, nombre) VALUES (?, ?, ?)", 
            [creador_id, liga_id, teamName]
        );

        res.status(201).json({ message: "Liga creada y equipo asignado exitosamente." });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            res.status(400).json({ message: "El nombre de la liga ya existe." });
        } else {
            res.status(500).json({ message: "Error al crear la liga." });
        }
    }
};



export const unirseLiga = async (req, res) => {
    const { name, password, teamName } = req.body;
    const usuario_id = req.user?.id; 

    if (!name || !password || !usuario_id || !teamName) {
        return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    try {
        
        const [ligas] = await db.execute("SELECT id, contraseña FROM ligas WHERE nombre = ?", [name]);

        if (ligas.length === 0) {
            return res.status(404).json({ message: "Liga no encontrada." });
        }

        const liga = ligas[0];
        const comprobarLiga = await bcrypt.compare(password, liga.contraseña);

        if (!comprobarLiga) {
            return res.status(401).json({ message: "Contraseña incorrecta." });
        }

        const [exists] = await db.execute(
            "SELECT id FROM usuarios_ligas WHERE usuario_id = ? AND liga_id = ?",
            [usuario_id, liga.id]
        );

        if (exists.length > 0) {
            return res.status(400).json({ message: "Ya estás en esta liga." });
        }


        await db.execute("INSERT INTO usuarios_ligas (usuario_id, liga_id) VALUES (?, ?)", [usuario_id, liga.id]);
        
        const [equipoRows] = await db.execute(
            "SELECT id FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?",
            [usuario_id, liga.id]
        );
        if (equipoRows.length === 0) {
            await db.execute(
            "INSERT INTO equipos_usuario (usuario_id, liga_id, nombre) VALUES (?, ?, ?)",
            [usuario_id, liga.id, teamName]
            );
        }
        res.status(200).json({ message: "Te has unido a la liga y tu equipo ha sido creado exitosamente." });

    } catch (error) {
        res.status(500).json({ message: "Error al unirse a la liga." });
    }
};


export const getUsuariosLigas = async (req, res) => {
    const usuario_id = req.user?.id; 
    try {
      const [ligas] = await db.query(
        `SELECT l.id, l.nombre 
         FROM ligas l 
         JOIN usuarios_ligas ul ON l.id = ul.liga_id 
         WHERE ul.usuario_id = ?`,
        [usuario_id]
      );
      res.status(200).json(ligas);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener ligas del usuario." });
    }
  };
