import db from "../db/connection.js";

// Obtener equipos
export const getEquipos = async (req, res) => {
  try {
    const [equipos] = await db.query("SELECT id, nombre, estadio FROM equipos");
    res.status(200).json(equipos);
  } catch (error) {
    console.error("Error al obtener equipos:", error);
    res.status(500).json({ message: "Error al obtener equipos" });
  }
};

// Obtener jugadores
export const getJugadores = async (req, res) => {
  try {
    const [jugadores] = await db.query(
      "SELECT id, dorsal, nombre, alias, posicion, equipo, puntos, precio, imagen FROM jugadores"
    );
    res.status(200).json(jugadores);
  } catch (error) {
    console.error("Error al obtener jugadores:", error);
    res.status(500).json({ message: "Error al obtener jugadores" });
  }
};

// Obtener eventos
export const getEventos = async (req, res) => {
  try {
    const [eventos] = await db.query(
      "SELECT id, jornada, name, team, position, dorsal, event_type, event_minute FROM eventos"
    );
    res.status(200).json(eventos);
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    res.status(500).json({ message: "Error al obtener eventos" });
  }
};

// Obtener puntos por jornada
export const getPuntosJornada = async (req, res) => {
  try {
    const [puntos] = await db.query(`
      SELECT pj.jornada, j.alias AS jugador, j.equipo, pj.puntos
      FROM puntos_jornada pj
      JOIN jugadores j ON pj.jugador_id = j.id
      ORDER BY pj.jornada ASC, pj.puntos DESC
    `);
    res.status(200).json(puntos);
  } catch (error) {
    console.error("Error al obtener puntos por jornada:", error);
    res.status(500).json({ message: "Error al obtener puntos por jornada" });
  }
};
