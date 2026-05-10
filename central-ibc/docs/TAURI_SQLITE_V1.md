# Tauri + SQLite na V1

## Decisao

A V1 passa a ter uma base desktop com Tauri 2 e SQLite local.
O React continua sendo a interface principal.

Enquanto o app roda no navegador/Vite, a persistencia atual em IndexedDB continua funcionando.
Quando roda dentro do Tauri, o sistema usa o arquivo SQLite local:

```txt
ibc.sqlite
```

## O que ja esta ligado ao SQLite

- Programacao principal;
- documentos emitidos;
- status basico de documento/envio;
- metadados e PDF em base64 enquanto a etapa de pasta local de PDFs nao estiver concluida.

## Estrutura inicial do banco

```txt
kv_store
  chave
  valor_json
  atualizado_em

documentos_emitidos
  id
  tipo
  aluno
  nome_documento
  nome_arquivo_pdf
  caminho_pdf
  status_documento
  enviado_por_email
  email_destinatario
  enviado_em
  status_envio
  emitido_em
  atualizado_em
  origem
  dados_json
```

## Regra de transicao

O app tenta usar SQLite primeiro.
Se nao estiver rodando dentro do Tauri, ou se o SQLite falhar, usa IndexedDB.

Isso permite continuar fazendo CQ no navegador enquanto a versao desktop amadurece.

## Pendente para fechar local-first real

- instalar Rust/Cargo na maquina de build;
- rodar `npm run desktop:dev`;
- gerar instalador com `npm run desktop:build`;
- salvar PDFs em pasta local real;
- mover Prestacao/Declaracoes rascunho para SQLite;
- backup automatico do `ibc.sqlite`;
- escolha de pasta de dados para uso com Drive/OneDrive.
