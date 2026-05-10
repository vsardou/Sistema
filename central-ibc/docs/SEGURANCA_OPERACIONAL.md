# Seguranca operacional

## Credenciais

O arquivo `.env` nunca deve entrar em ZIP de codigo, commit, anexo de e-mail ou pasta compartilhada.
O repositorio deve manter apenas `.env.example`.

Se um ZIP com `.env` sair da maquina autorizada, considerar o segredo exposto e gerar novas credenciais:

- novo `GMAIL_REFRESH_TOKEN`;
- revisar ou trocar `GMAIL_CLIENT_SECRET`, se necessario;
- atualizar somente o `.env` local da maquina de uso.

## Pacotes

Para pacote de codigo-fonte, excluir:

- `.env`;
- `node_modules`;
- `dist`;
- arquivos `.zip` e `.rar` antigos.

Para distribuicao final da V1 desktop, o ideal e gerar instalador pelo empacotador escolhido, sem expor codigo-fonte nem `.env`.

## E-mail

O envio real por Gmail hoje depende do middleware do Vite em desenvolvimento.
Esse caminho serve para desenvolvimento e CQ, mas nao deve ser tratado como arquitetura final de producao.

Quando a V1 virar desktop local-first, o envio deve migrar para comando nativo do Tauri ou ficar fora do escopo da V1, conforme decisao operacional.
