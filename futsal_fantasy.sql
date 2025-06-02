CREATE DATABASE futsal_fantasy;
USE futsal_fantasy;

CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jornada VARCHAR(10),
    name VARCHAR(255) NOT NULL,
    team VARCHAR(255) NOT NULL,
    position VARCHAR(50),
    dorsal VARCHAR(10),
    event_type VARCHAR(100),
    event_minute VARCHAR(10),
    puntos INT DEFAULT 0
);
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE equipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    estadio VARCHAR(255) NOT NULL
);
CREATE TABLE jugadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dorsal INT,
  nombre VARCHAR(255),
  alias VARCHAR(255),
  posicion VARCHAR(255),
  equipo  VARCHAR(255), 
  puntos INT DEFAULT 0,
  precio DECIMAL(10,2) DEFAULT 0,
  imagen VARCHAR(255) DEFAULT NULL
);
CREATE TABLE puntos_jornada (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jornada INT,
  jugador_id INT,
  puntos INT,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
);
CREATE TABLE ligas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  contraseña VARCHAR(255) NOT NULL,
  creador_id INT,
  FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE usuarios_ligas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  liga_id INT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (liga_id) REFERENCES ligas(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, liga_id)
);

CREATE TABLE equipos_usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  liga_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  presupuesto DECIMAL(10,2) DEFAULT 100.00,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (liga_id) REFERENCES ligas(id) ON DELETE CASCADE
);

CREATE TABLE equipos_jugadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo_id INT NOT NULL,
  jugador_id INT NOT NULL,
  precio_compra DECIMAL(10,2),
  FOREIGN KEY (equipo_id) REFERENCES equipos_usuario(id) ON DELETE CASCADE,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
);

CREATE TABLE mercado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jugador_id INT NOT NULL,
  equipo_vendedor_id INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  disponible BOOLEAN DEFAULT TRUE,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
  FOREIGN KEY (equipo_vendedor_id) REFERENCES equipos_usuario(id) ON DELETE CASCADE
);

CREATE TABLE quintetos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  liga_id INT NOT NULL,
  jornada INT, 
  total_puntos INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (liga_id) REFERENCES ligas(id) ON DELETE CASCADE
);

CREATE TABLE quinteto_jugadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quinteto_id INT NOT NULL,
  jugador_id INT NOT NULL,
  FOREIGN KEY (quinteto_id) REFERENCES quintetos(id) ON DELETE CASCADE,
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
);











