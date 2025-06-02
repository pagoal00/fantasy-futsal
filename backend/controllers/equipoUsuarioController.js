import db from "../db/connection.js"; 

export const getEquipoUsuario = async (req, res) => {
    const usuario_id = req.user.id;  
    const { liga_id } = req.params;   
  
    try {
      // Obtener los jugadores del equipo del usuario en la liga indicada
      const [result] = await db.query(`
        SELECT ej.id, j.id AS jugador_id, j.alias AS jugador_nombre, j.posicion, ej.precio_compra, j.imagen,
        CASE 
          WHEN m.id IS NOT NULL THEN TRUE 
          ELSE FALSE 
        END AS en_mercado
        FROM equipos_jugadores ej
        JOIN jugadores j ON ej.jugador_id = j.id
        JOIN equipos_usuario eu ON ej.equipo_id = eu.id
        LEFT JOIN mercado m ON m.jugador_id = j.id AND m.equipo_vendedor_id = eu.id AND m.disponible = TRUE
        WHERE eu.usuario_id = ? AND eu.liga_id = ?
      `, [usuario_id, liga_id]);
  
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: "Error obteniendo el equipo del usuario", error });
    }
};

export const getPresupuesto = async (req, res) => {
  const { liga_id } = req.params;
  const usuario_id = req.user.id; 

  try {
    const [rows] = await db.query(
      "SELECT presupuesto FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?",
      [usuario_id, liga_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }
    res.status(200).json({ presupuesto: rows[0].presupuesto });
  } catch (error) {
    console.error("Error obteniendo presupuesto:", error);
    res.status(500).json({ message: "Error al obtener presupuesto" });
  }
};
