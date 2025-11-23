import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  password: string;
  paid: boolean;
  paidAt?: string;
  proofUri?: string;
  auditTrail: { at: string; action: string; proof?: string }[];
};

const storageKeys = {
  bills: "finatial:bills",
  audit: "finatial:audit",
  config: "finatial:config",
};

const usePersistentState = <T,>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (raw) setValue(JSON.parse(raw));
    });
  }, [key]);

  const save = async (next: T) => {
    setValue(next);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  };

  return [value, save] as const;
};

export default function App() {
  const [bills, setBills] = usePersistentState<Bill[]>(storageKeys.bills, []);
  const [audit, setAudit] = usePersistentState<string[]>(storageKeys.audit, []);
  const [config, setConfig] = usePersistentState<{ reminderDay?: string; whatsapp?: string; telegram?: string; email?: string }>(
    storageKeys.config,
    {}
  );
  const [draft, setDraft] = useState<Partial<Bill>>({});
  const [proofCandidate, setProofCandidate] = useState<Record<string, string>>({});
  const [passwordCheck, setPasswordCheck] = useState<Record<string, string>>({});

  const log = async (message: string) => {
    const entry = `${new Date().toLocaleString()} - ${message}`;
    const next = [entry, ...audit];
    setAudit(next);
  };

  const addBill = async () => {
    if (!draft.name || !draft.amount || !draft.dueDate || !draft.password) {
      Alert.alert("Preencha todos os campos e defina uma senha para o registro.");
      return;
    }
    const nextBill: Bill = {
      id: `${Date.now()}`,
      name: draft.name,
      amount: Number(draft.amount),
      dueDate: draft.dueDate,
      password: draft.password,
      paid: false,
      auditTrail: [{ at: new Date().toISOString(), action: "created" }],
    };
    const nextBills = [...bills, nextBill];
    setBills(nextBills);
    setDraft({});
    await log(`Conta ${nextBill.name} registrada para ${nextBill.dueDate} no valor de R$ ${nextBill.amount.toFixed(2)}.`);
  };

  const markAsPaid = async (bill: Bill) => {
    if ((passwordCheck[bill.id] || "") !== bill.password) {
      Alert.alert("Senha incorreta", "Informe a senha que protege este registro.");
      return;
    }
    const proof = proofCandidate[bill.id];
    if (!proof) {
      Alert.alert("Anexe o comprovante", "Informe o link ou caminho do comprovante.");
      return;
    }

    const next = bills.map((item) =>
      item.id === bill.id
        ? {
            ...item,
            paid: true,
            paidAt: new Date().toLocaleDateString(),
            proofUri: proof,
            auditTrail: [...item.auditTrail, { at: new Date().toISOString(), action: "paid", proof }],
          }
        : item
    );
    setBills(next);
    await log(`Pagamento confirmado de ${bill.name} com comprovante ${proof}.`);
  };

  const simulateReminder = async (bill: Bill) => {
    const channels = [
      config.whatsapp && `WhatsApp ${config.whatsapp}`,
      config.telegram && `Telegram ${config.telegram}`,
      config.email && `Email ${config.email}`,
    ].filter(Boolean);
    const message = `Lembrete ${config.reminderDay || "?"}: ${bill.name} vence em ${bill.dueDate} (R$ ${bill.amount.toFixed(2)}).`;
    await log(`Lembrete enviado para ${channels.join(", ")} => ${message}`);
    Alert.alert("Lembrete simulado", message);
  };

  const summary = useMemo(() => ({
    total: bills.reduce((acc, bill) => acc + bill.amount, 0),
    pending: bills.filter((b) => !b.paid).length,
    paid: bills.filter((b) => b.paid).length,
  }), [bills]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Finatial Control (mobile)</Text>
      <Text style={styles.subtitle}>Controle protegido por senha, lembretes mensais e comprovantes obrigatórios.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Configuração de Lembretes</Text>
        <View style={styles.row}>
          <TextInput
            placeholder="Dia do mês"
            placeholderTextColor="#8892a0"
            style={styles.input}
            value={config.reminderDay}
            onChangeText={(text) => setConfig({ ...config, reminderDay: text })}
          />
          <TextInput
            placeholder="WhatsApp"
            placeholderTextColor="#8892a0"
            style={styles.input}
            value={config.whatsapp}
            onChangeText={(text) => setConfig({ ...config, whatsapp: text })}
          />
          <TextInput
            placeholder="Telegram"
            placeholderTextColor="#8892a0"
            style={styles.input}
            value={config.telegram}
            onChangeText={(text) => setConfig({ ...config, telegram: text })}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#8892a0"
            style={styles.input}
            value={config.email}
            onChangeText={(text) => setConfig({ ...config, email: text })}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Registrar Conta</Text>
        <View style={styles.row}>
          <TextInput
            placeholder="Nome"
            placeholderTextColor="#8892a0"
            style={styles.input}
            value={draft.name}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, name: text }))}
          />
          <TextInput
            placeholder="Valor"
            placeholderTextColor="#8892a0"
            keyboardType="decimal-pad"
            style={styles.input}
            value={draft.amount?.toString()}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, amount: Number(text) }))}
          />
          <TextInput
            placeholder="Vencimento (YYYY-MM-DD)"
            placeholderTextColor="#8892a0"
            style={styles.input}
            value={draft.dueDate}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, dueDate: text }))}
          />
          <TextInput
            placeholder="Senha do registro"
            placeholderTextColor="#8892a0"
            secureTextEntry
            style={styles.input}
            value={draft.password}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, password: text }))}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={addBill}>
          <Text style={styles.buttonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        <Text style={styles.summary}>Total em faturas: R$ {summary.total.toFixed(2)}</Text>
        <Text style={styles.summary}>Pendentes: {summary.pending} | Pagas: {summary.paid}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contas</Text>
        <FlatList
          data={bills}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.billRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.billTitle}>{item.name}</Text>
                <Text style={styles.billDescription}>Vence em {item.dueDate} | R$ {item.amount.toFixed(2)}</Text>
                <Text style={styles.status}>
                  {item.paid ? `Pago em ${item.paidAt} • Comprovante: ${item.proofUri}` : "Pendente"}
                </Text>
              </View>
              <View style={styles.row}>
                <TextInput
                  placeholder="Comprovante (URL/arquivo)"
                  placeholderTextColor="#8892a0"
                  style={[styles.input, styles.smallInput]}
                  value={proofCandidate[item.id]}
                  onChangeText={(text) => setProofCandidate((prev) => ({ ...prev, [item.id]: text }))}
                />
                <TextInput
                  placeholder="Senha"
                  placeholderTextColor="#8892a0"
                  secureTextEntry
                  style={[styles.input, styles.smallInput]}
                  value={passwordCheck[item.id]}
                  onChangeText={(text) => setPasswordCheck((prev) => ({ ...prev, [item.id]: text }))}
                />
              </View>
              <View style={styles.row}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => simulateReminder(item)}>
                  <Text style={styles.buttonText}>Lembrete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => markAsPaid(item)}>
                  <Text style={styles.buttonText}>Marcar pago</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma conta cadastrada.</Text>}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Histórico</Text>
        <FlatList
          data={audit}
          keyExtractor={(item, idx) => `${idx}`}
          renderItem={({ item }) => <Text style={styles.audit}>{item}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>Sem eventos registrados.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1520",
    padding: 16,
  },
  title: {
    color: "#e8f1ff",
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: "#a9b4c2",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#0f1f2f",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1f3347",
  },
  sectionTitle: {
    color: "#dce6f7",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    backgroundColor: "#11263a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#304861",
    padding: 10,
    color: "#e8f1ff",
    minWidth: 160,
  },
  smallInput: {
    minWidth: 140,
  },
  button: {
    backgroundColor: "#35c2ff",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#9e7bff",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#0b1520",
    fontWeight: "800",
  },
  billRow: {
    gap: 8,
  },
  billTitle: {
    color: "#e8f1ff",
    fontSize: 16,
    fontWeight: "700",
  },
  billDescription: {
    color: "#a9b4c2",
  },
  status: {
    color: "#88efb0",
  },
  summary: {
    color: "#dce6f7",
    marginBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#1f3347",
    marginVertical: 8,
  },
  audit: {
    color: "#dce6f7",
    paddingVertical: 4,
  },
  empty: {
    color: "#6f7b8c",
    textAlign: "center",
    padding: 12,
  },
});
