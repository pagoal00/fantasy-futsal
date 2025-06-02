import db from "../db/connection.js";


export const comprarJugador = async (req, res) => {
  const { offerId, precio, liga_id } = req.body;
  const comprador_id = req.user.id; 

  try {
    
    const [offerRows] = await db.query(
      "SELECT jugador_id, equipo_vendedor_id FROM mercado WHERE id = ? AND disponible = TRUE",
      [offerId]
    );
    if (offerRows.length === 0) {
      return res.status(404).json({ message: "Oferta no encontrada o no disponible." });
    }
    const { jugador_id, equipo_vendedor_id } = offerRows[0];

    const [sellerTeamRows] = await db.query(
      "SELECT usuario_id FROM equipos_usuario WHERE id = ?",
      [equipo_vendedor_id]
    );
    if (sellerTeamRows.length > 0) {
      const seller_id = sellerTeamRows[0].usuario_id;
      if (seller_id === comprador_id) {
        return res.status(400).json({ message: "No puedes comprar un jugador que tú mismo has puesto en venta." });
      }
    }

    await db.query("UPDATE mercado SET disponible = FALSE WHERE id = ?", [offerId]);

    const [buyerTeamRows] = await db.query(
      "SELECT id, presupuesto FROM equipos_usuario WHERE usuario_id = ? AND liga_id = ?",
      [comprador_id, liga_id]
    );
    let buyer_team_id;
    let buyerPresupuesto;
    if (buyerTeamRows.length > 0) {
      buyer_team_id = buyerTeamRows[0].id;
      buyerPresupuesto = parseFloat(buyerTeamRows[0].presupuesto);
    } else {
      const presupuestoInicial = 100.00;
      const [result] = await db.query(
        "INSERT INTO equipos_usuario (usuario_id, liga_id, nombre, presupuesto) VALUES (?, ?, ?, ?)",
        [comprador_id, liga_id, `Equipo de ${req.user.username}`, presupuestoInicial]
      );
      buyer_team_id = result.insertId;
      buyerPresupuesto = presupuestoInicial;
    }

  
    const precioNumero = parseFloat(precio);
    if (isNaN(precioNumero)) {
      return res.status(400).json({ message: "El precio enviado no es válido." });
    }
    if (buyerPresupuesto < precioNumero) {
      return res.status(400).json({ message: "No tienes suficiente presupuesto para fichar a este jugador." });
    }

    await db.query(
      "DELETE FROM equipos_jugadores WHERE equipo_id = ? AND jugador_id = ?",
      [equipo_vendedor_id, jugador_id]
    );
    
    await db.query(
      "INSERT INTO equipos_jugadores (equipo_id, jugador_id, precio_compra) VALUES (?, ?, ?)",
      [buyer_team_id, jugador_id, precioNumero]
    );

    const nuevoPresupuestoBuyer = buyerPresupuesto - precioNumero;
    await db.query(
      "UPDATE equipos_usuario SET presupuesto = ? WHERE id = ?",
      [nuevoPresupuestoBuyer, buyer_team_id]
    );

    const [sellerTeamRows2] = await db.query(
      "SELECT id, presupuesto FROM equipos_usuario WHERE id = ?",
      [equipo_vendedor_id]
    );
    if (sellerTeamRows2.length > 0) {
      let sellerPresupuesto = parseFloat(sellerTeamRows2[0].presupuesto);
      const nuevoPresupuestoSeller = sellerPresupuesto + precioNumero;
      await db.query(
        "UPDATE equipos_usuario SET presupuesto = ? WHERE id = ?",
        [nuevoPresupuestoSeller, equipo_vendedor_id]
      );
    }

    res.status(200).json({ message: "Jugador comprado exitosamente." });
  } catch (error) {
    res.status(500).json({ message: "Error al comprar jugador." });
  }
};



export const getMercado = async (req, res) => {
  const { liga_id } = req.params;
  try {
    // Ofertas del sistema (cron job) – limite a 15
    const [systemOffers] = await db.query(
      `
      SELECT m.id, j.nombre AS jugador_nombre, j.posicion, m.precio, eu.nombre AS equipo_vendedor, j.imagen, j.equipo
      FROM mercado m
      JOIN jugadores j ON m.jugador_id = j.id
      JOIN equipos_usuario eu ON m.equipo_vendedor_id = eu.id
      WHERE eu.liga_id = ? 
        AND m.disponible = TRUE 
        AND eu.nombre LIKE 'Mercado Liga%'
      ORDER BY m.precio DESC
      `,
      [liga_id]
    );

    // Ofertas puestas por usuarios
    const [userOffers] = await db.query(
      `
      SELECT m.id, j.nombre AS jugador_nombre, j.posicion, m.precio, eu.nombre AS equipo_vendedor, j.imagen, j.equipo
      FROM mercado m
      JOIN jugadores j ON m.jugador_id = j.id
      JOIN equipos_usuario eu ON m.equipo_vendedor_id = eu.id
      WHERE eu.liga_id = ? 
        AND m.disponible = TRUE 
        AND eu.nombre NOT LIKE 'Mercado Liga%'
      ORDER BY m.precio DESC
      `,
      [liga_id]
    );

    // Combinar ambos resultados
    const offers = [...systemOffers, ...userOffers];
    offers.sort((a, b) => b.precio - a.precio);

    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el mercado." });
  }
};
