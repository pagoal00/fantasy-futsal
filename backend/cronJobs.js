import cron from "node-cron";
import db from "./db/connection.js";

// Función para obtener (o crear) el equipo vendedor del sistema para una liga
async function obtenerEquipoVendedor(ligaId) {
  try {
    const [rows] = await db.query(
      "SELECT id FROM equipos_usuario WHERE liga_id = ? AND nombre LIKE ?",
      [ligaId, 'Mercado Liga%']
    );
    if (rows.length > 0) {
      return rows[0].id;
    } else {
      const [ligaRows] = await db.query("SELECT nombre FROM ligas WHERE id = ?", [ligaId]);
      const nombreLiga = ligaRows[0].nombre;
      // Usa un usuario especial, por ejemplo con id = 9999
      const usuarioSistema = 2; // Asegúrate de que este usuario exista en la tabla usuarios
      const equipoNombre = `Mercado Liga (${nombreLiga})`;
      const [result] = await db.query(
        "INSERT INTO equipos_usuario (usuario_id, liga_id, nombre, presupuesto) VALUES (?, ?, ?, ?)",
        [usuarioSistema, ligaId, equipoNombre, 0]
      );
      return result.insertId;
    }
    
  } catch (error) {
    console.error("Error obteniendo/creando equipo vendedor:", error);
    throw error;
  }
}


async function insertarOfertasMercado() {
  try {
    
    const [ligas] = await db.query("SELECT id FROM ligas");

    for (const liga of ligas) {
      const ligaId = liga.id;
      const equipoVendedorId = await obtenerEquipoVendedor(ligaId);

      // 15 jugadores al azar libres
      const [jugadores] = await db.query(
        `
        SELECT j.id, j.nombre AS jugador_nombre, j.posicion, j.precio
        FROM jugadores j
        WHERE j.id NOT IN (
          SELECT ej.jugador_id
          FROM equipos_jugadores ej
          JOIN equipos_usuario eu ON ej.equipo_id = eu.id
          WHERE eu.liga_id = ?
        )
        AND j.id NOT IN (
          SELECT m.jugador_id
          FROM mercado m
          JOIN equipos_usuario eu ON m.equipo_vendedor_id = eu.id
          WHERE eu.liga_id = ? AND m.disponible = TRUE
        )
        ORDER BY RAND()
        LIMIT 15
        `,
        [ligaId, ligaId]
      );

      if (jugadores.length === 0) {
        console.log(`No se encontraron jugadores disponibles para la liga ${ligaId}.`);
        continue;
      }

      for (const jugador of jugadores) {
        await db.execute(
          "INSERT INTO mercado (jugador_id, equipo_vendedor_id, precio, disponible) VALUES (?, ?, ?, TRUE)",
          [jugador.id, equipoVendedorId, jugador.precio]
        );
      }
    }
  } catch (error) {
    console.error("Error al insertar ofertas en el mercado:", error);
  }
}

// Programar la tarea para que se ejecute cada 12 horas
// La expresión cron '0 */12 * * *' significa: a la hora 0 y 12 de cada día
//cron.schedule('0 */12 * * *', () => {
//  console.log("Ejecutando tarea programada para insertar ofertas en el mercado...");
//  insertarOfertasMercado();
//});
cron.schedule('30 12 * * *', () => {
    console.log("Ejecutando tarea programada a las 12:30...");
    insertarOfertasMercado();
  });