import db from "../db/connection.js";

export const getClasificacion = async (req, res) => {
  const { liga_id, jornada } = req.params; 
  try {
    // clasificacion de cada liga general y por jornada
    const [rows] = await db.query(
        `
        SELECT 
          eu.nombre AS equipo, 
          COALESCE(total_total.total_puntos, 0) AS total_puntos,
          COALESCE(jornada_data.puntos_jornada, 0) AS puntos_jornada
        FROM equipos_usuario eu
        LEFT JOIN (
          SELECT usuario_id, liga_id, SUM(total_puntos) AS total_puntos
          FROM quintetos
          GROUP BY usuario_id, liga_id
        ) AS total_total ON eu.usuario_id = total_total.usuario_id AND eu.liga_id = total_total.liga_id
        LEFT JOIN (
          SELECT usuario_id, liga_id, total_puntos AS puntos_jornada
          FROM quintetos
          WHERE jornada = ?
        ) AS jornada_data ON eu.usuario_id = jornada_data.usuario_id AND eu.liga_id = jornada_data.liga_id
        WHERE eu.liga_id = ? 
          AND eu.nombre NOT LIKE 'Mercado Liga%'
        GROUP BY eu.id, eu.nombre, jornada_data.puntos_jornada, total_total.total_puntos
        ORDER BY total_puntos DESC;
        `,
        [jornada, liga_id]
      );

    const processedRows = rows.map(row => {
      return row;
    })

    res.status(200).json(processedRows);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo la clasificación." });
  }
};
