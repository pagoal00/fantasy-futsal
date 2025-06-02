import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer";
import db from "../db/connection.js";

const eventPoints = {
  "Gol": 5,
  "Gol en propia puerta": -2,
  "Tarjeta Amarilla": -1,
  "Tarjeta roja": -3,
};

const prieceBaseByPosition = {
  "Portero": 10.00,
  "Cierre": 8.00,
  "Ala": 7.00,
  "Pívot": 9.00
};
// Multiplicador para calculo de precio
const multiplier = 0.1;

export const scrapeEvents = async (req, res) => {
  const { url } = req.body;  

  if (!url) {
    return res.status(400).json({ message: "La URL es obligatoria." });
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const matchDay = await page.evaluate(() => {
      return document.querySelector(".bg2.color-white.match-header .fw div b")?.nextSibling?.nodeValue.trim().replace(/^\.\s*Jornada\s*/, "");
    });

    
    const players = await page.evaluate(() => {
      const data = [];
      const localTeam = document.querySelector(".content-match .team.ta-r .name")?.innerText.trim();
      const visitorTeam = document.querySelector(".content-match .team.ta-l .name")?.innerText.trim();

      const rows = document.querySelectorAll(".row.row-flex .team_local, .team_visitor");
      //Obtener eventos
      rows.forEach((row) => {
        const isLocal = row.classList.contains("team_local");
        const teamName = isLocal ? localTeam : visitorTeam;
        const players = row.querySelectorAll(".detail-data");
        players.forEach((player) => {
          const name = player.querySelector(".name p.bold")?.innerText.trim();
          const position = player.querySelector(".name .color-main2")?.innerText.trim();
          const dorsal = player.querySelector(".r-dorsal")?.innerText.trim();
          const events = [];

          if (position && position.toLowerCase() !== "entrenador") {
            const actions = player.querySelectorAll(".actions .ico-actions");
            actions.forEach((action) => {
              const event = action.querySelector("img")?.alt.trim();
              const minute = action.querySelector(".minute-actions")?.innerText.trim();
              events.push({ event, minute });
            });
            data.push({
              team: teamName,
              name,
              position,
              dorsal,
              events,
            });
          }
        });
      });
      return data;
    });

    //Sumar puntos
    for (const player of players) {
      const { name, team, position, dorsal, events } = player;
      let totalPoints = 0; 

      for (const event of events) {
        const { event: eventType, minute: eventMinute } = event;
        const points = eventPoints[eventType] || 0;
        totalPoints += points;

        await db.execute(
        "INSERT INTO eventos (jornada, name, team, position, dorsal, event_type, event_minute) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [matchDay, name, team, position, dorsal, eventType, eventMinute]
        );
      }

      // Guardar los puntos
      const [rows] = await db.execute("SELECT id FROM jugadores WHERE alias = ? AND equipo = ?", [name, team]);
      if (rows.length > 0) {
        const jugadorId = rows[0].id;
        await db.execute("INSERT INTO puntos_jornada (jornada, jugador_id, puntos) VALUES (?, ?, ?)",[matchDay, jugadorId, totalPoints]);
        await db.execute("UPDATE jugadores SET puntos = puntos + ? WHERE id = ?", [totalPoints, jugadorId]);

        // Actualizar precio
        if (totalPoints !== 0) {
          const [jugadorData] = await db.execute("SELECT puntos, posicion, precio FROM jugadores WHERE id = ?", [jugadorId]);
          const currentPoints = jugadorData[0].puntos;
          const currentPosition = jugadorData[0].posicion;
          const normalizedPosition = currentPosition.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
          const basePrice = prieceBaseByPosition[normalizedPosition] || parseFloat(jugadorData[0].precio);
          const newPrice = basePrice + (currentPoints * multiplier);
          await db.execute("UPDATE jugadores SET precio = ? WHERE id = ?", [newPrice, jugadorId]);
        }
      
      }
    }

    await actualizarQuintetos(matchDay);
    await browser.close();
    res.json({ message: "Datos extraídos e insertados con éxito." });
  } catch (error) {
    res.status(500).json({ message: "Error durante el scraping.", error });
  }
};


async function actualizarQuintetos(jornada) {
  try {
    const [quintetos] = await db.query("SELECT id FROM quintetos WHERE jornada = ?", [jornada]);
    for (const quinteto of quintetos) {
      const quintetoId = quinteto.id;
      const [jugadores] = await db.query("SELECT jugador_id FROM quinteto_jugadores WHERE quinteto_id = ?", [quintetoId]);
      const jugadorIds = jugadores.map(j => j.jugador_id);
      if (jugadorIds.length === 0) continue;
      const [resultado] = await db.query(
        "SELECT SUM(puntos) AS total FROM puntos_jornada WHERE jugador_id IN (?) AND jornada = ?",
        [jugadorIds, jornada]
      );
      const total_puntos = resultado[0].total || 0;
      await db.query("UPDATE quintetos SET total_puntos = ? WHERE id = ?", [total_puntos, quintetoId]);
    }
  } catch (error) {
    console.error("Error actualizando quintetos:", error);
  }
}

export const scrapeTeam = async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ message: "La URL es obligatoria." });
  }

  let browser = null;
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const teamName = await page.evaluate(() => {
      const teamElement = document.querySelector("h2.color-main2");
      const fullTeamName = teamElement ? teamElement.innerText.trim() : null;
      return fullTeamName ? fullTeamName.replace(/^PLANTILLA\s/, "") : null;
    });

    const players = await page.evaluate(() => {
      const data = [];
      const rows = document.querySelectorAll("tr");

      rows.forEach((row) => {
        const dorsal = row.querySelector("td.color-white")?.innerText.trim();
        const playerName = row.querySelector(".name p.bold")?.innerText.trim();
        const nicknameElement = row.querySelector(".name p:nth-child(2)")?.innerText.trim();
        const position = row.querySelector("td.bold")?.innerText.trim();
        const status = row.querySelector(".mini-label")?.innerText.trim();
        const imageUrl = row.querySelector("td.ph5.img img")?.getAttribute("src") || null;

        if (dorsal && playerName && status !== "Dejó el equipo") {
          const nickname = nicknameElement !== playerName ? nicknameElement : "";
          data.push({ dorsal, playerName, nickname, position, imageUrl });
        }
      });
      return data;
    });

    
    for (const player of players) {
      const { dorsal, playerName, nickname, position, imageUrl } = player;
      const basePrice = prieceBaseByPosition[position] || 5.00;
      await db.execute(
        "INSERT INTO jugadores (dorsal, nombre, alias, posicion, equipo, precio, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [dorsal, playerName, nickname, position, teamName, basePrice, imageUrl]
      );
    }

    await browser.close();
    res.json({ message: "Datos del equipo extraídos e insertados con éxito." });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ message: "Error durante el scraping.", error });
  }
};
