# Finatial Control

Aplicação proposta para controle de contabilidade com versões web e mobile. O projeto oferece cadastro de contas, lembretes mensais via múltiplos canais e registro rígido de pagamentos com comprovantes e proteção por senha.

## Estrutura
- `web/`: aplicação web em JavaScript vanilla para cadastro, alerta e gestão de comprovantes. Agora consome uma API com Postgres para persistir os dados.
- `mobile/`: aplicativo React Native (Expo) com estado persistido em `AsyncStorage` e componentes prontos para uso em Android/iOS/web.
- `server/`: API Express + Postgres para contas, comprovantes e verificação de senha.
- `docker-compose.yml`: orquestra Postgres + API para uso local ou deploy containerizado.
- `.gitignore`: ignora caches, ambientes locais e artefatos temporários nas pastas web/mobile/server.

## Como executar (API + banco)
1. Copie o arquivo de variáveis de ambiente: `cp server/.env.example server/.env` (ajuste `DATABASE_URL`/origens conforme necessário).
2. Suba o Postgres (e opcionalmente a API) via Docker: `docker compose up db -d` para apenas o banco ou `docker compose up -d` para banco + API.
3. Para rodar a API localmente sem Docker: instale dependências em `server/` com `npm install` e execute `npm start`. A API cria as tabelas automaticamente.
4. A API expõe os endpoints:
   - `GET /health` — status.
   - `GET /accounts` — lista contas com histórico de comprovantes.
   - `POST /accounts` — cria conta (campos obrigatórios: `name`, `amount`, `dueDate`, `password`).
   - `POST /accounts/:id/payments` — registra pagamento com senha e comprovante (`proofName`, `proofBase64`).

## Como executar (web)
1. Certifique-se de que a API está rodando (ex.: `http://localhost:4000`).
2. Abra `web/index.html` em um navegador moderno (pode ser servido por um server estático ou diretamente via arquivo). Ao hospedar web e API no mesmo domínio, a aplicação usa `/api` automaticamente; para apontar para outra URL de API, defina `window.BACKEND_URL` antes de carregar `app.js`.
3. Cadastre contas, configure o dia de lembrete e informe contatos de WhatsApp, Telegram e e-mail. Os pagamentos requerem a senha cadastrada e envio de comprovante (base64) para persistir no banco.

## Como executar (mobile)
1. Instale as dependências da pasta `mobile` com `npm install` (requer o CLI do Expo).
2. Execute `npm start` dentro de `mobile` e abra no aplicativo Expo Go ou emulador.

## Funcionalidades principais
- Cadastro de contas com valor, vencimento, contatos e senha para validação.
- Programação mensal de avisos com simulação de envio para WhatsApp, Telegram e e-mail.
- Controle de pagamento exigindo comprovante (upload no web, URI no mobile) e senha correta para marcar como pago.
- Histórico de faturas e auditoria de ações (logs) persistidos no Postgres para a web e armazenamento local no mobile.

## Testes automatizados
- A API possui testes de integração em `server/test/server.test.js`, usando `pg-mem` para simular um banco Postgres em memória e `supertest` para exercitar os endpoints.
- Para rodar, instale as dependências em `server/` e execute `npm test` (requer Node 18+). Nenhum serviço externo é necessário.

### Corrigindo erro 403 ao instalar dependências
- Se o ambiente aplica proxies por padrão (gerando `E403` ao baixar pacotes), use o script preparado para limpar variáveis de proxy e fixar o registry oficial: `npm run deps` dentro de `server/`.
- Alternativamente, execute manualmente com as variáveis limpas: `HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= npm_config_proxy= npm_config_http_proxy= npm_config_https_proxy= npm install --no-progress --registry=https://registry.npmjs.org`.

## Deploy na Vercel
- O projeto possui `vercel.json` que publica a API Express como função serverless em `/api` (via `api/index.js`) e serve o front-end estático a partir de `web/`.
- Antes do deploy, configure no painel da Vercel as variáveis de ambiente `DATABASE_URL` (Postgres acessível pela Vercel) e, opcionalmente, `ALLOWED_ORIGINS`.
- Rode `npm install` na raiz (usa workspaces para `server/`) e execute `vercel --prod` ou conecte o repositório ao GitHub para builds automáticos.
- Para ambientes locais com Vercel CLI, o comando `npm run vercel-build` é um no-op (frontend não requer build); a API cria/valida o schema na primeira invocação.

## Observações
- Integrações reais com WhatsApp, Telegram e e-mail devem ser conectadas a webhooks ou serviços externos; no exemplo são simuladas.
- Para produção, armazene senhas de forma segura (hash) e use backend para envios e armazenamento de comprovantes (já previsto na API Express). Para Vercel ou outra cloud, adapte as variáveis de ambiente e o container Postgres conforme o provedor.
