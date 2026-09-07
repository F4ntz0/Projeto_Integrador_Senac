const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const VALID_STATUS = ["PENDING", "COMPLETED", "CANCELLED"];

function validateTask(data) {
  if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
    return "Prioridade inválida. Use LOW, MEDIUM ou HIGH.";
  }

  if (data.status && !VALID_STATUS.includes(data.status)) {
    return "Status inválido. Use PENDING, COMPLETED ou CANCELLED.";
  }

  if (data.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) {
    return "dueDate deve estar no formato YYYY-MM-DD.";
  }

  if (data.dueTime && !/^\d{2}:\d{2}$/.test(data.dueTime)) {
    return "dueTime deve estar no formato HH:mm.";
  }

  if (data.reminderMinutes !== undefined &&
      data.reminderMinutes !== null &&
      (!Number.isInteger(data.reminderMinutes) || data.reminderMinutes < 0)) {
    return "reminderMinutes deve ser um inteiro maior ou igual a zero.";
  }

  return null;
}

function getTask(id, userId) {
  return db.prepare(`
    SELECT
      t.id, t.title, t.description,
      t.due_date AS dueDate,
      t.due_time AS dueTime,
      t.priority, t.status,
      t.reminder_minutes AS reminderMinutes,
      t.completed_at AS completedAt,
      t.created_at AS createdAt,
      t.updated_at AS updatedAt,
      c.id AS categoryId,
      c.name AS categoryName,
      c.color AS categoryColor
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ? AND t.user_id = ?
  `).get(id, userId);
}

router.get("/", (req, res) => {
  const { status, priority, categoryId, from, to, search } = req.query;

  const where = ["t.user_id = ?"];
  const params = [req.user.id];

  if (status) {
    where.push("t.status = ?");
    params.push(status);
  }

  if (priority) {
    where.push("t.priority = ?");
    params.push(priority);
  }

  if (categoryId) {
    where.push("t.category_id = ?");
    params.push(categoryId);
  }

  if (from) {
    where.push("t.due_date >= ?");
    params.push(from);
  }

  if (to) {
    where.push("t.due_date <= ?");
    params.push(to);
  }

  if (search) {
    where.push("(LOWER(t.title) LIKE LOWER(?) OR LOWER(COALESCE(t.description,'')) LIKE LOWER(?))");
    params.push(`%${search}%`, `%${search}%`);
  }

  const tasks = db.prepare(`
    SELECT
      t.id, t.title, t.description,
      t.due_date AS dueDate,
      t.due_time AS dueTime,
      t.priority, t.status,
      t.reminder_minutes AS reminderMinutes,
      t.completed_at AS completedAt,
      t.created_at AS createdAt,
      t.updated_at AS updatedAt,
      c.id AS categoryId,
      c.name AS categoryName,
      c.color AS categoryColor
    FROM tasks t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${where.join(" AND ")}
    ORDER BY
      CASE t.status WHEN 'PENDING' THEN 0 WHEN 'CANCELLED' THEN 1 ELSE 2 END,
      t.due_date IS NULL,
      t.due_date,
      t.due_time
  `).all(...params);

  res.json(tasks);
});

router.get("/:id", (req, res) => {
  const task = getTask(req.params.id, req.user.id);

  if (!task) {
    return res.status(404).json({ error: "Tarefa não encontrada." });
  }

  res.json(task);
});

router.post("/", (req, res) => {
  const {
    title,
    description,
    dueDate,
    dueTime,
    priority = "MEDIUM",
    categoryId,
    reminderMinutes
  } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "Título é obrigatório." });
  }

  const validationError = validateTask({
    dueDate, dueTime, priority, reminderMinutes
  });

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (categoryId) {
    const category = db.prepare(`
      SELECT id FROM categories WHERE id = ? AND user_id = ?
    `).get(categoryId, req.user.id);

    if (!category) {
      return res.status(400).json({ error: "Categoria inválida." });
    }
  }

  const result = db.prepare(`
    INSERT INTO tasks (
      user_id, category_id, title, description,
      due_date, due_time, priority, reminder_minutes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    categoryId || null,
    String(title).trim(),
    description || null,
    dueDate || null,
    dueTime || null,
    priority,
    reminderMinutes ?? null
  );

  res.status(201).json(getTask(result.lastInsertRowid, req.user.id));
});

router.put("/:id", (req, res) => {
  const existing = getTask(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Tarefa não encontrada." });
  }

  const data = {
    ...existing,
    ...req.body
  };

  const validationError = validateTask(data);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (data.categoryId) {
    const category = db.prepare(`
      SELECT id FROM categories WHERE id = ? AND user_id = ?
    `).get(data.categoryId, req.user.id);

    if (!category) {
      return res.status(400).json({ error: "Categoria inválida." });
    }
  }

  const status = data.status;
  const completedAt =
    status === "COMPLETED"
      ? (existing.completedAt || new Date().toISOString())
      : null;

  db.prepare(`
    UPDATE tasks SET
      title = ?,
      description = ?,
      due_date = ?,
      due_time = ?,
      priority = ?,
      status = ?,
      category_id = ?,
      reminder_minutes = ?,
      completed_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    String(data.title).trim(),
    data.description || null,
    data.dueDate || null,
    data.dueTime || null,
    data.priority,
    status,
    data.categoryId || null,
    data.reminderMinutes ?? null,
    completedAt,
    req.params.id,
    req.user.id
  );

  res.json(getTask(req.params.id, req.user.id));
});

router.patch("/:id/complete", (req, res) => {
  const result = db.prepare(`
    UPDATE tasks
    SET status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  if (!result.changes) {
    return res.status(404).json({ error: "Tarefa não encontrada." });
  }

  res.json({
    message: "Tarefa concluída.",
    task: getTask(req.params.id, req.user.id)
  });
});

router.delete("/:id", (req, res) => {
  const result = db.prepare(`
    DELETE FROM tasks WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  if (!result.changes) {
    return res.status(404).json({ error: "Tarefa não encontrada." });
  }

  res.status(204).send();
});

module.exports = router;
