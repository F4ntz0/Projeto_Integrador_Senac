const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/", (req, res) => {
  const categories = db.prepare(`
    SELECT id, name, color, created_at
    FROM categories
    WHERE user_id = ?
    ORDER BY name
  `).all(req.user.id);

  res.json(categories);
});

router.post("/", (req, res) => {
  const { name, color } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Nome da categoria é obrigatório." });
  }

  try {
    const result = db.prepare(`
      INSERT INTO categories (user_id, name, color)
      VALUES (?, ?, ?)
    `).run(req.user.id, String(name).trim(), color || null);

    const category = db.prepare(`
      SELECT id, name, color, created_at
      FROM categories WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(category);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Categoria já cadastrada." });
    }
    res.status(500).json({ error: "Erro ao criar categoria." });
  }
});

router.put("/:id", (req, res) => {
  const { name, color } = req.body;

  const result = db.prepare(`
    UPDATE categories
    SET name = COALESCE(?, name),
        color = COALESCE(?, color)
    WHERE id = ? AND user_id = ?
  `).run(
    name ? String(name).trim() : null,
    color ?? null,
    req.params.id,
    req.user.id
  );

  if (!result.changes) {
    return res.status(404).json({ error: "Categoria não encontrada." });
  }

  res.json(
    db.prepare(`
      SELECT id, name, color, created_at
      FROM categories WHERE id = ?
    `).get(req.params.id)
  );
});

router.delete("/:id", (req, res) => {
  const result = db.prepare(`
    DELETE FROM categories WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  if (!result.changes) {
    return res.status(404).json({ error: "Categoria não encontrada." });
  }

  res.status(204).send();
});

module.exports = router;
