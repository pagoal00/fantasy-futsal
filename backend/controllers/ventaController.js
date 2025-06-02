import db from "../db/connection.js";

export const venderDirecto = async (req, res) => {
  const { liga_id, jugador_id } = req.body;
  const usuario_id = req.user.id; 

  if (!liga_id || !jugador_id) {
    return res.status(400).json({ message: "Faltan parámetros: liga_id y jugador_id." });
  }

  try {
    const [teamRows] = await db.query(
      "SELECT id, presupuesto FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?",
      [usuario_id, liga_id]
    );
    if (teamRows.length === 0) {
      return res.status(404).json({ message: "No se encontró el equipo del usuario en esa liga." });
    }
    const equipo_id = teamRows[0].id;
    const presupuestoActual = parseFloat(teamRows[0].presupuesto);

    // Obtener el precio actual del jugador
    const [playerRows] = await db.query("SELECT precio FROM jugadores WHERE id = ?", [jugador_id]);
    if (playerRows.length === 0) {
      return res.status(404).json({ message: "Jugador no encontrado." });
    }
    const jugadorPrecio = parseFloat(playerRows[0].precio);
    if (isNaN(jugadorPrecio)) {
      return res.status(500).json({ message: "Precio del jugador inválido." });
    }

    const nuevoPresupuesto = presupuestoActual + jugadorPrecio;

    
    await db.query("DELETE FROM equipos_jugadores WHERE equipo_id = ? AND jugador_id = ?", [equipo_id, jugador_id]);
    await db.query("UPDATE equipos_usuario SET presupuesto = ? WHERE id = ?", [nuevoPresupuesto, equipo_id]);

    res.status(200).json({ message: "Jugador vendido exitosamente. Se sumó el valor del jugador al presupuesto." });
  } catch (error) {
    res.status(500).json({ message: "Error al vender jugador." });
  }
};



export const venderMercado = async (req, res) => {
  const { liga_id, jugador_id, precio, actualizar } = req.body;
  const usuario_id = req.user.id;

  if (!liga_id || !jugador_id || precio === undefined) {
    return res.status(400).json({ message: "Faltan parámetros: liga_id, jugador_id y precio." });
  }

  try {
    const [teamRows] = await db.query(
      "SELECT id FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?",
      [usuario_id, liga_id]
    );
    if (teamRows.length === 0) {
      return res.status(404).json({ message: "No se encontró el equipo del usuario en esa liga." });
    }
    const equipo_id = teamRows[0].id;

    const [existingOffers] = await db.query(
      `SELECT id FROM mercado 
       WHERE jugador_id = ? 
       AND equipo_vendedor_id = ? 
       AND disponible = TRUE`,
      [jugador_id, equipo_id]
    );

    if (existingOffers.length > 0) {
      if (!actualizar) {
        return res.status(200).json({ 
          exists: true, 
          message: "Este jugador ya está en el mercado. ¿Deseas actualizar el precio?" 
        });
      } else {
        await db.query(
          "UPDATE mercado SET precio = ? WHERE id = ?",
          [precio, existingOffers[0].id]
        );
        return res.status(200).json({ message: "Precio de la oferta actualizado exitosamente." });
      }
    }

    await db.query(
      "INSERT INTO mercado (jugador_id, equipo_vendedor_id, precio, disponible) VALUES (?, ?, ?, TRUE)",
      [jugador_id, equipo_id, precio]
    );

    res.status(200).json({ message: "Jugador puesto en el mercado exitosamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al poner el jugador en el mercado." });
  }
};


export const quitarDelMercado = async (req, res) => {
  const { jugador_id, liga_id } = req.body;
  const usuario_id = req.user.id; 

  if (!jugador_id || !liga_id) {
    return res.status(400).json({ message: "Faltan parámetros: jugador_id y liga_id." });
  }

  try {
    
    const [teamRows] = await db.query(
      "SELECT id FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?",
      [usuario_id, liga_id]
    );
    if (teamRows.length === 0) {
      return res.status(404).json({ message: "No se encontró el equipo del usuario en esa liga." });
    }
    const equipo_id = teamRows[0].id;

    
    const [offers] = await db.query(
      `SELECT id FROM mercado 
       WHERE jugador_id = ? AND equipo_vendedor_id = ? AND disponible = TRUE`,
      [jugador_id, equipo_id]
    );

    if (offers.length === 0) {
      return res.status(404).json({ message: "No se encontró una oferta activa para este jugador." });
    }

    await db.query("UPDATE mercado SET disponible = FALSE WHERE id = ?", [offers[0].id]);

    res.status(200).json({ message: "Jugador quitado del mercado exitosamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al quitar jugador del mercado." });
  }
};

