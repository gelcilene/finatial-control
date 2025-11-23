const API_BASE =
  window.BACKEND_URL ||
  (window.location.origin.startsWith("file")
    ? "http://localhost:4000"
    : `${window.location.origin}/api`);

const state = {
  bills: [],
  audit: JSON.parse(localStorage.getItem("audit") || "[]"),
  config: JSON.parse(localStorage.getItem("config") || "{}"),
};

const billContainer = document.getElementById("bills");
const logContainer = document.getElementById("auditLog");
const billTemplate = document.getElementById("bill-template");

const configInputs = {
  reminderDay: document.getElementById("reminderDay"),
  whatsapp: document.getElementById("whatsapp"),
  telegram: document.getElementById("telegram"),
  email: document.getElementById("email"),
};

function persistLocal() {
  localStorage.setItem("audit", JSON.stringify(state.audit));
  localStorage.setItem("config", JSON.stringify(state.config));
}

async function fetchJSON(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Erro ${response.status}: ${detail}`);
  }
  return response.json();
}

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function log(message) {
  const entry = `${new Date().toLocaleString()} - ${message}`;
  state.audit.unshift(entry);
  persistLocal();
  renderAudit();
}

function renderAudit() {
  logContainer.innerHTML = "";
  state.audit.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    logContainer.appendChild(li);
  });
}

function latestPayment(bill) {
  return bill.payments?.[0];
}

function renderBills() {
  billContainer.innerHTML = "";
  state.bills.forEach((bill) => {
    const fragment = billTemplate.content.cloneNode(true);
    fragment.querySelector(".bill-title").textContent = bill.name;
    fragment.querySelector(".bill-details").textContent = `${formatCurrency(bill.amount)} | Vence em ${bill.due_date}`;
    const statusLabel = fragment.querySelector(".bill-status");
    const payment = latestPayment(bill);
    statusLabel.textContent = payment
      ? `Pago em ${new Date(payment.paid_at).toLocaleDateString()} | Comprovante: ${payment.proof_name}`
      : "Pendente";

    fragment.querySelector(".mark-paid").addEventListener("click", () => markAsPaid(bill.id, bill.name));
    fragment.querySelector(".simulate-reminder").addEventListener("click", () => simulateReminder(bill));
    fragment.querySelector(".password-check").addEventListener("input", (ev) => (bill.__passwordCandidate = ev.target.value));
    fragment.querySelector(".proof-input").addEventListener("change", (ev) => {
      const file = ev.target.files?.[0];
      bill.__proof = file;
    });

    billContainer.appendChild(fragment);
  });
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function markAsPaid(id, name) {
  const bill = state.bills.find((b) => b.id === id);
  const password = bill?.__passwordCandidate || "";
  if (!password) {
    alert("Informe a senha cadastrada para este registro.");
    return;
  }
  if (!bill.__proof) {
    alert("É necessário anexar um comprovante para marcar como pago.");
    return;
  }
  try {
    const proofBase64 = await fileToBase64(bill.__proof);
    const updated = await fetchJSON(`${API_BASE}/accounts/${id}/payments`, {
      method: "POST",
      body: JSON.stringify({
        password,
        proofName: bill.__proof.name,
        proofBase64,
      }),
    });
    const index = state.bills.findIndex((b) => b.id === id);
    state.bills[index] = updated;
    log(`Pagamento confirmado de ${name} com comprovante ${bill.__proof.name}.`);
    renderBills();
  } catch (err) {
    alert(err.message);
  }
}

function simulateReminder(bill) {
  const { reminderDay, whatsapp, telegram, email } = state.config;
  const channels = [
    whatsapp && `WhatsApp ${whatsapp}`,
    telegram && `Telegram ${telegram}`,
    email && `Email ${email}`,
  ].filter(Boolean);
  const message = `Lembrete do dia ${reminderDay || "?"}: ${bill.name} vence em ${bill.due_date} no valor de ${formatCurrency(
    bill.amount
  )}`;
  log(`Lembrete enviado para ${channels.join(", ")} => ${message}`);
  alert(message);
}

function hydrateConfig() {
  Object.entries(configInputs).forEach(([key, input]) => {
    input.value = state.config[key] || input.value || "";
  });
}

async function loadBills() {
  try {
    const bills = await fetchJSON(`${API_BASE}/accounts`);
    state.bills = bills;
    renderBills();
  } catch (err) {
    alert(`Erro ao buscar contas: ${err.message}`);
  }
}

function bootstrap() {
  hydrateConfig();
  renderAudit();
  loadBills();

  document.getElementById("billForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const formData = new FormData(ev.target);
    const bill = Object.fromEntries(formData.entries());
    bill.amount = Number(bill.amount);
    try {
      const created = await fetchJSON(`${API_BASE}/accounts`, {
        method: "POST",
        body: JSON.stringify({
          name: bill.name,
          amount: bill.amount,
          dueDate: bill.dueDate,
          whatsapp: bill.whatsapp,
          telegram: bill.telegram,
          email: bill.email,
          password: bill.password,
        }),
      });
      state.bills.unshift(created);
      log(`Conta adicionada: ${bill.name}, valor ${formatCurrency(bill.amount)}, vence em ${bill.dueDate}.`);
      ev.target.reset();
      renderBills();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById("saveConfig").addEventListener("click", () => {
    const newConfig = Object.entries(configInputs).reduce((acc, [key, input]) => {
      acc[key] = input.value;
      return acc;
    }, {});
    state.config = newConfig;
    persistLocal();
    log(`Configuração salva: lembrete no dia ${newConfig.reminderDay}.`);
  });
}

bootstrap();
