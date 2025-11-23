import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pkg from "pg";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();

const { Pool } = pkg;

const DEFAULT_PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL;

export function createPoolFromEnv() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada.");
  }
  return new Pool({ connectionString: DATABASE_URL });
}

export async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      due_date TEXT NOT NULL,
      whatsapp TEXT,
      telegram TEXT,
      email TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
      proof_name TEXT,
      proof_base64 TEXT,
      paid_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function serializeAccounts(pool, rows) {
  const accountsWithPayments = await Promise.all(
    rows.map(async (account) => {
      const payments = await pool.query(
        "SELECT id, proof_name, proof_base64, paid_at FROM payments WHERE account_id=$1 ORDER BY paid_at DESC",
        [account.id]
      );
      return { ...account, payments: payments.rows };
    })
  );
  return accountsWithPayments;
}

export function createApp(pool, { allowedOrigins = process.env.ALLOWED_ORIGINS } = {}) {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  const origins = (allowedOrigins || "*")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: origins.includes("*") ? "*" : origins,
    })
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.get("/accounts", async (_req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, name, amount, due_date, whatsapp, telegram, email, created_at FROM accounts ORDER BY created_at DESC"
      );
      const accounts = await serializeAccounts(pool, result.rows);
      res.json(accounts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao listar contas" });
    }
  });

  app.post("/accounts", async (req, res) => {
    try {
      const { name, amount, dueDate, whatsapp, telegram, email, password } = req.body;
      if (!name || !amount || !dueDate || !password) {
        return res.status(400).json({ error: "Campos obrigatórios: name, amount, dueDate, password" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const insert = await pool.query(
        `INSERT INTO accounts (name, amount, due_date, whatsapp, telegram, email, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, amount, due_date, whatsapp, telegram, email, created_at`,
        [name, amount, dueDate, whatsapp, telegram, email, passwordHash]
      );
      const accounts = await serializeAccounts(pool, insert.rows);
      res.status(201).json(accounts[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao criar conta" });
    }
  });

  app.post("/accounts/:id/payments", async (req, res) => {
    try {
      const { password, proofName, proofBase64 } = req.body;
      const accountId = Number(req.params.id);
      if (!password || !proofName || !proofBase64) {
        return res.status(400).json({ error: "Campos obrigatórios: password, proofName, proofBase64" });
      }
      const accountResult = await pool.query("SELECT id, password_hash FROM accounts WHERE id=$1", [accountId]);
      const account = accountResult.rows[0];
      if (!account) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      const match = await bcrypt.compare(password, account.password_hash);
      if (!match) {
        return res.status(403).json({ error: "Senha incorreta" });
      }
      await pool.query(
        `INSERT INTO payments (account_id, proof_name, proof_base64)
         VALUES ($1, $2, $3)`,
        [accountId, proofName, proofBase64]
      );
      const refreshed = await pool.query(
        "SELECT id, name, amount, due_date, whatsapp, telegram, email, created_at FROM accounts WHERE id=$1",
        [accountId]
      );
      const accounts = await serializeAccounts(pool, refreshed.rows);
      res.status(201).json(accounts[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao registrar pagamento" });
    }
  });

  return app;
}

function isMainModule() {
  const currentFile = fileURLToPath(import.meta.url);
  const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return currentFile === entryFile;
}

async function bootstrap() {
  const pool = createPoolFromEnv();
  await ensureSchema(pool);
  const app = createApp(pool);
  app.listen(DEFAULT_PORT, () => {
    console.log(`API Finatial Control ouvindo na porta ${DEFAULT_PORT}`);
  });
}

if (isMainModule()) {
  bootstrap().catch((err) => {
    console.error("Falha ao iniciar a API", err);
    process.exit(1);
  });
}

export default createApp;
