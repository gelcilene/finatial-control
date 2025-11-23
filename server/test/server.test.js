import { describe, before, beforeEach, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { newDb } from "pg-mem";
import { createApp, ensureSchema } from "../src/server.js";

function createMemoryPool() {
  const db = newDb();
  const pg = db.adapters.createPg();
  const pool = new pg.Pool();
  return { pool };
}

describe("Finatial Control API", () => {
  const { pool } = createMemoryPool();
  const app = createApp(pool, { allowedOrigins: "*" });

  before(async () => {
    await ensureSchema(pool);
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM payments");
    await pool.query("DELETE FROM accounts");
  });

  it("should create an account when required fields are provided", async () => {
    const response = await request(app)
      .post("/accounts")
      .send({ name: "Internet", amount: 150, dueDate: "10", password: "123" });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.name, "Internet");
    assert.equal(Number(response.body.amount), 150);
    assert.equal(response.body.due_date, "10");
    assert.ok(response.body.id);
  });

  it("should reject account creation when mandatory fields are missing", async () => {
    const response = await request(app).post("/accounts").send({ name: "Luz" });

    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, /Campos obrigat/);
  });

  it("should reject payments with wrong password", async () => {
    const created = await request(app)
      .post("/accounts")
      .send({ name: "Água", amount: 90, dueDate: "05", password: "segredo" });

    const response = await request(app)
      .post(`/accounts/${created.body.id}/payments`)
      .send({ password: "errada", proofName: "comprovante.pdf", proofBase64: "ZmlsZQ==" });

    assert.equal(response.statusCode, 403);
    assert.match(response.body.error, /Senha incorreta/);
  });

  it("should accept payment with correct password and return updated account", async () => {
    const created = await request(app)
      .post("/accounts")
      .send({ name: "Cartão", amount: 250, dueDate: "15", password: "senha!" });

    const payment = await request(app)
      .post(`/accounts/${created.body.id}/payments`)
      .send({ password: "senha!", proofName: "comprovante.png", proofBase64: "YmFzZTY0" });

    assert.equal(payment.statusCode, 201);
    assert.equal(payment.body.id, created.body.id);
    assert.equal(payment.body.payments.length, 1);
    assert.equal(payment.body.payments[0].proof_name, "comprovante.png");
  });
});
