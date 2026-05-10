# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Gmail API (envio real de e-mail)

O endpoint `POST /api/email/enviar` em `vite.config.js` suporta 2 modos:

- `EMAIL_PROVIDER=gmail`: envia de verdade pela Gmail API.
- Qualquer outro valor (ou vazio): usa resposta simulada para desenvolvimento.

### 1) Configure variaveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_SENDER_EMAIL=...
```

### 2) Reinicie o Vite

Depois de salvar o `.env`, reinicie `npm run dev`.

### 3) Observacoes importantes

- As credenciais ficam apenas no backend do Vite (nao enviar para o front).
- O `GMAIL_REFRESH_TOKEN` precisa ter escopos Gmail para enviar mensagens, ler conversas e marcar e-mails como lidos.
- O `GMAIL_SENDER_EMAIL` deve ser a conta autorizada no OAuth usado.

### 4) Gerar novo refresh token para a caixa de e-mail

Rode:

```bash
node scripts/get-gmail-refresh-token.js
```

Entre com a conta institucional da IBC, aceite as permissoes e cole no terminal a URL final ou o `code`.
Depois substitua o valor de `GMAIL_REFRESH_TOKEN` no `.env` pelo token gerado.
