import db from "../db/connection.js";

export const obtenerQuinteto = async (req, res) => {
  const { usuario_id, liga_id, jornada } = req.query;
  if (!usuario_id || !liga_id || !jornada) {
    return res.status(400).json({ message: "Faltan parámetros." });
  }
  try {
    
    const [quintetoRows] = await db.query(
      "SELECT id FROM quintetos WHERE usuario_id = ? AND liga_id = ? AND jornada = ?",
      [usuario_id, liga_id, jornada]
    );
    if (quintetoRows.length === 0) {
      return res.status(404).json({ quinteto: [] });
    }
    const quintetoId = quintetoRows[0].id;
    
    const [jugadores] = await db.query(
      `SELECT qj.id, j.alias AS jugador, j.posicion, pj.puntos, j.imagen 
      FROM quinteto_jugadores qj JOIN jugadores j ON qj.jugador_id = j.id 
      LEFT JOIN puntos_jornada pj ON j.id = pj.jugador_id AND pj.jornada = ? 
      WHERE qj.quinteto_id = ?`,
      [jornada, quintetoId]
    );
    res.status(200).json({ quinteto: jugadores });
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo quinteto." });
  }
};


export const guardarQuinteto = async (req, res) => {
  const { liga_id, jornada, quinteto, actualizar } = req.body;  
  const usuario_id = req.user.id;  

  if (!liga_id || !jornada || !Array.isArray(quinteto) || quinteto.length !== 5) {
    return res.status(400).json({ message: "Debe enviarse la liga, la jornada y 5 jugadores para el quinteto." });
  }

  try {
    
    const [existe] = await db.query(
      "SELECT id FROM quintetos WHERE usuario_id = ? AND liga_id = ? AND jornada = ?",
      [usuario_id, liga_id, jornada]
    );
    
    if (existe.length > 0) {

      const [puntosRows] = await db.query(
        "SELECT COUNT(*) AS total FROM puntos_jornada WHERE jornada = ?",
        [jornada]
      );
      if (puntosRows[0].total > 0) {
        return res.status(400).json({ message: "No puedes actualizar el quinteto. La jornada ya ha comenzado o se ha jugado." });
      }
      if (!actualizar) {
        return res.status(200).json({ 
          message: "Ya existe un quinteto para esta jornada. ¿Desea actualizarlo?", 
          exists: true 
        });
      } else {
        const quintetoId = existe[0].id;
        await db.query("DELETE FROM quinteto_jugadores WHERE quinteto_id = ?", [quintetoId]);
      
        for (const jugador_id of quinteto) {
          await db.query(
            "INSERT INTO quinteto_jugadores (quinteto_id, jugador_id) VALUES (?, ?)",
            [quintetoId, jugador_id]
          );
        }
        return res.status(200).json({ 
          message: "Quinteto actualizado exitosamente.", 
          updated: true 
        });
      }
    } else {
      // No existe un quinteto para esta jornada, se crea uno nuevo.
      const [result] = await db.query(
        "INSERT INTO quintetos (usuario_id, liga_id, jornada, total_puntos) VALUES (?, ?, ?, 0)",
        [usuario_id, liga_id, jornada]
      );
      const quintetoId = result.insertId;
      
      for (const jugador_id of quinteto) {
        await db.query(
          "INSERT INTO quinteto_jugadores (quinteto_id, jugador_id) VALUES (?, ?)",
          [quintetoId, jugador_id]
        );
      }
      return res.status(200).json({ 
        message: "Quinteto guardado exitosamente.", 
        created: true 
      });
    }
  } catch (error) {
    return res.status(500).json({ message: "Error guardando quinteto." });
  }
};
