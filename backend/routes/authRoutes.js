import express from "express";

import * as authController from "../controllers/authController.js";
import { verifyToken } from "../controllers/authMiddleware.js";
import { scrapeTeam, scrapeEvents } from "../controllers/scrapingController.js";
import { getEquipos, getJugadores, getEventos, getPuntosJornada } from "../controllers/adminController.js";
import { crearLiga, unirseLiga, getUsuariosLigas } from "../controllers/ligasController.js";
import { getEquipoUsuario, getPresupuesto } from "../controllers/equipoUsuarioController.js";
import { getMercado, comprarJugador } from "../controllers/mercadoController.js";
import { getClasificacion } from "../controllers/clasificacionController.js";
import { obtenerQuinteto, guardarQuinteto } from "../controllers/quintetoController.js";
import { venderDirecto, venderMercado, quitarDelMercado } from "../controllers/ventaController.js";
import { changeEmail, changePassword, deleteAccount, cambiarNombreEquipo, abandonarLiga, 
         getUsuariosLiga, expulsarUsuarioLiga, editarLiga } from "../controllers/masController.js";

const router = express.Router();

//auth
router.post("/register", authController.registro);
router.post("/login", authController.login);

//authMiddleware
router.post("/validate-token", verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

//scraping
router.post("/scrape", scrapeEvents);
router.post("/scrape-team", scrapeTeam);

//admin
router.get("/teams", getEquipos);
router.get("/players", getJugadores);
router.get("/events", getEventos);
router.get("/points", getPuntosJornada);

//ligas
router.post("/crearLiga", verifyToken, crearLiga);
router.post("/unirseLiga", verifyToken, unirseLiga);
router.get("/userLigas", verifyToken, getUsuariosLigas);

// mercado
router.get("/mercado/:liga_id", verifyToken, getMercado);
router.post("/mercado/comprar", verifyToken, comprarJugador);

// equipo
router.get("/equipo/:liga_id", verifyToken, getEquipoUsuario);
router.get("/presupuesto/:liga_id", verifyToken, getPresupuesto);



// clasificación
router.get("/clasificacion/:liga_id/:jornada", verifyToken, getClasificacion);

//quinteto
router.get("/quintetos", verifyToken, obtenerQuinteto);
router.post("/guardarQuinteto", verifyToken, guardarQuinteto);

//ventas
router.post("/equipo/venderDirecto", verifyToken, venderDirecto);
router.post("/equipo/venderMercado", verifyToken, venderMercado);
router.post("/equipo/quitarMercado", verifyToken, quitarDelMercado);

//mas
router.post("/cambiar-email", verifyToken, changeEmail);
router.post("/cambiar-password", verifyToken, changePassword);
router.delete("/eliminar-cuenta", verifyToken, deleteAccount);
router.post("/cambiar-nombre-equipo", verifyToken, cambiarNombreEquipo);
router.post("/abandonar-liga", verifyToken, abandonarLiga);

router.get("/ligas/:ligaId/usuarios", verifyToken, getUsuariosLiga);
router.post("/ligas/:ligaId/expulsar", verifyToken, expulsarUsuarioLiga);
router.post("/ligas/:ligaId/editar", verifyToken, editarLiga);


export default router;
