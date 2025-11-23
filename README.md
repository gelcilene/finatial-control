# Finatial Control

Aplicação proposta para controle de contabilidade com versões web e mobile. O projeto oferece cadastro de contas, lembretes mensais via múltiplos canais e registro rígido de pagamentos com comprovantes e proteção por senha.

## Estrutura
- `web/`: aplicação web em JavaScript vanilla para cadastro, alerta e gestão de comprovantes usando `localStorage`.
- `mobile/`: aplicativo React Native (Expo) com estado persistido em `AsyncStorage` e componentes prontos para uso em Android/iOS/web.

## Como executar (web)
1. Abra `web/index.html` em um navegador moderno.
2. Cadastre contas, configure o dia de lembrete e informe contatos de WhatsApp, Telegram e e-mail.

## Como executar (mobile)
1. Instale as dependências da pasta `mobile` com `npm install` (requere o CLI do Expo).
2. Execute `npm start` dentro de `mobile` e abra no aplicativo Expo Go ou emulador.

## Funcionalidades principais
- Cadastro de contas com valor, vencimento, contatos e senha para validação.
- Programação mensal de avisos com simulação de envio para WhatsApp, Telegram e e-mail.
- Controle de pagamento exigindo comprovante (upload no web, URI no mobile) e senha correta para marcar como pago.
- Histórico de faturas e auditoria de ações (logs) mantidos no armazenamento local de cada plataforma.

## Observações
- Integrações reais com WhatsApp, Telegram e e-mail devem ser conectadas a webhooks ou serviços externos; no exemplo são simuladas.
- Para produção, armazene senhas de forma segura (hash) e use backend para envios e armazenamento de comprovantes.
