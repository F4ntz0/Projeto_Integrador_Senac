const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/", (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      error: "Informe from e to no formato YYYY-MM-DD."
    });
  }

  const tasks = db.prepare(`
    SELECT
      t.id,
      t.title,
      t.description,
      t.due_date AS date,
      t.due_time AS time,
      t.priority,
      t.status,
      c.name AS category
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
      AND t.due_date BETWEEN ? AND ?
    ORDER BY t.due_date, t.due_time
  `).all(req.user.id, from, to);

  res.json({
    from,
    to,
    total: tasks.length,
    events: tasks
  });
});

module.exports = router;
