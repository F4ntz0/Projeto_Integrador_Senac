# Backend - Gerenciador de Tarefas Pessoais

Backend da prova de conceito do Projeto Integrador.

## Tecnologias

- Node.js
- Express
- SQLite
- JWT para autenticação
- bcryptjs para hash de senha
- CORS
- dotenv

## Funcionalidades

- Cadastro de usuário
- Login e autenticação JWT
- CRUD de tarefas
- Prioridade e status da tarefa
- Categorias
- Data e horário de vencimento
- Lembretes
- Filtros por status, prioridade, categoria e período
- Visualização de tarefas pendentes/concluídas
- Marcação de tarefa como concluída
- Exclusão e edição
- Endpoint para agenda/calendário

## Requisitos

Node.js 18+ e npm.

## Instalação

```bash
npm install
copy .env.example .env
npm run dev
```

Linux/macOS:

```bash
cp .env.example .env
npm install
npm run dev
```

Servidor:

`http://localhost:3000`

A base SQLite é criada automaticamente em `data/database.sqlite`.

## Endpoints

### Público

POST `/api/auth/register`
```json
{
  "name": "Ana Carolina",
  "email": "ana@email.com",
  "password": "123456"
}
```

POST `/api/auth/login`
```json
{
  "email": "ana@email.com",
  "password": "123456"
}
```

### Autenticados

Enviar:
`Authorization: Bearer SEU_TOKEN`

GET `/api/auth/me`

GET `/api/categories`

POST `/api/categories`
```json
{
  "name": "Faculdade",
  "color": "#4F46E5"
}
```

GET `/api/tasks`

Filtros opcionais:
- `status=PENDING|COMPLETED|CANCELLED`
- `priority=LOW|MEDIUM|HIGH`
- `categoryId=1`
- `from=2026-09-01`
- `to=2026-09-30`
- `search=prova`

POST `/api/tasks`
```json
{
  "title": "Entregar trabalho",
  "description": "Projeto Integrador",
  "dueDate": "2026-09-15",
  "dueTime": "20:00",
  "priority": "HIGH",
  "categoryId": 1,
  "reminderMinutes": 60
}
```

GET `/api/tasks/:id`

PUT `/api/tasks/:id`

PATCH `/api/tasks/:id/complete`

DELETE `/api/tasks/:id`

GET `/api/calendar?from=2026-09-01&to=2026-09-30`

## Estrutura

```text
src/
  server.js
  db.js
  middleware/
    auth.js
  routes/
    auth.routes.js
    categories.routes.js
    tasks.routes.js
```