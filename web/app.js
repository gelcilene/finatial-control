const state = {
  bills: JSON.parse(localStorage.getItem("bills") || "[]"),
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

function persist() {
  localStorage.setItem("bills", JSON.stringify(state.bills));
  localStorage.setItem("audit", JSON.stringify(state.audit));
  localStorage.setItem("config", JSON.stringify(state.config));
}

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function log(message) {
  const entry = `${new Date().toLocaleString()} - ${message}`;
  state.audit.unshift(entry);
  persist();
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

function renderBills() {
  billContainer.innerHTML = "";
  state.bills.forEach((bill, index) => {
    const fragment = billTemplate.content.cloneNode(true);
    fragment.querySelector(".bill-title").textContent = bill.name;
    fragment.querySelector(".bill-details").textContent = `${formatCurrency(bill.amount)} | Vence em ${bill.dueDate}`;
    const statusLabel = fragment.querySelector(".bill-status");
    statusLabel.textContent = bill.paid
      ? `Pago em ${bill.paidAt} | Comprovante: ${bill.proofName}`
      : "Pendente";

    fragment.querySelector(".mark-paid").addEventListener("click", () => markAsPaid(index));
    fragment.querySelector(".simulate-reminder").addEventListener("click", () => simulateReminder(index));
    fragment.querySelector(".password-check").addEventListener("input", (ev) =>
      (bill.__passwordCandidate = ev.target.value)
    );
    fragment.querySelector(".proof-input").addEventListener("change", (ev) => {
      const file = ev.target.files?.[0];
      bill.__proof = file;
    });

    billContainer.appendChild(fragment);
  });
}

function markAsPaid(index) {
  const bill = state.bills[index];
  const password = bill.__passwordCandidate || "";
  if (password !== bill.password) {
    alert("Senha incorreta para este registro.");
    return;
  }
  if (!bill.__proof) {
    alert("É necessário anexar um comprovante para marcar como pago.");
    return;
  }
  bill.paid = true;
  bill.paidAt = new Date().toLocaleDateString();
  bill.proofName = bill.__proof.name;
  bill.auditTrail.push({ at: new Date().toISOString(), action: "paid", proof: bill.proofName });
  log(`Pagamento confirmado de ${bill.name} com comprovante ${bill.proofName}.`);
  persist();
  renderBills();
}

function simulateReminder(index) {
  const bill = state.bills[index];
  const { reminderDay, whatsapp, telegram, email } = state.config;
  const channels = [
    whatsapp && `WhatsApp ${whatsapp}`,
    telegram && `Telegram ${telegram}`,
    email && `Email ${email}`,
  ].filter(Boolean);
  const message = `Lembrete do dia ${reminderDay || "?"}: ${bill.name} vence em ${bill.dueDate} no valor de ${formatCurrency(
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

function bootstrap() {
  hydrateConfig();
  renderBills();
  renderAudit();

  document.getElementById("billForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const formData = new FormData(ev.target);
    const bill = Object.fromEntries(formData.entries());
    bill.amount = Number(bill.amount);
    bill.paid = false;
    bill.auditTrail = [{ at: new Date().toISOString(), action: "created" }];
    state.bills.push(bill);
    log(`Conta adicionada: ${bill.name}, valor ${formatCurrency(bill.amount)}, vence em ${bill.dueDate}.`);
    ev.target.reset();
    persist();
    renderBills();
  });

  document.getElementById("saveConfig").addEventListener("click", () => {
    const newConfig = Object.entries(configInputs).reduce((acc, [key, input]) => {
      acc[key] = input.value;
      return acc;
    }, {});
    state.config = newConfig;
    persist();
    log(`Configuração salva: lembrete no dia ${newConfig.reminderDay}.`);
  });
}

bootstrap();
