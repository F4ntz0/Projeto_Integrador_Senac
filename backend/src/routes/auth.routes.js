const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Nome, e-mail e senha são obrigatórios."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "A senha deve possuir pelo menos 6 caracteres."
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "E-mail inválido." });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 12);

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `).run(String(name).trim(), normalizedEmail, passwordHash);

    const user = db.prepare(`
      SELECT id, name, email, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user,
      token: createToken(user)
    });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }

    return res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "E-mail e senha são obrigatórios."
    });
  }

  const user = db.prepare(`
    SELECT id, name, email, password_hash, created_at
    FROM users WHERE email = ?
  `).get(String(email).trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  delete user.password_hash;

  return res.json({
    message: "Login realizado com sucesso.",
    user,
    token: createToken(user)
  });
});

router.get("/me", auth, (req, res) => {
  const user = db.prepare(`
    SELECT id, name, email, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  res.json(user);
});

module.exports = router;
