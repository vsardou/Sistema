# ARQUITETURA_SISTEMA_IBC

## Visao do sistema

O sistema IBC e organizado em torno de uma entidade central unica: o **TREINAMENTO**, identificado por `grupoId`.

O calendario mensal e apenas uma projeção visual e operacional dessa entidade. Mes, dia e celula nao sao fonte de verdade do dominio.

## Entidade central

### Treinamento

Contrato minimo compartilhado:

- `grupoId`
- `aluno`
- `email`
- `tipoTreinamento`
- `status`
- `dataInicial`
- `dataFinal`
- `diasTreinamento`
- `diasEmProva`
- `diasHospedagem`
- `dias`
- `aluguelAparelho`

### Regras estruturais

- `grupoId` e a identidade estavel do treinamento.
- Edicao nunca deve regenerar `grupoId`.
- Atravessar meses nao cria novo treinamento.
- Segmentos mensais existem apenas para armazenamento/projecao visual.
- `dias` e derivado da uniao de `diasTreinamento`, `diasEmProva` e `diasHospedagem`.
- `dataInicial` e `dataFinal` tambem sao derivados no contrato central, a partir dos subconjuntos operacionais.
- compatibilidade com payloads legados deve acontecer antes do contrato, em camada explicita de migracao.

## Fronteiras dos modulos

### Programacao

Papel:

- editar o **planejado**
- projetar treinamentos no calendario mensal
- reservar recursos operacionais planejados

Pode ler:

- contrato central do treinamento
- agenda mensal segmentada por mes

Pode escrever:

- apenas Programacao planejada

Nunca deve:

- sobrescrever Prestacao
- sobrescrever Declaracoes
- tratar mes como identidade do treinamento

### Prestacao

Papel:

- editar o **fechado/declarado**
- derivar fechamento a partir da Programacao
- manter divergencia controlada entre snapshot e estado atual da Programacao

Pode ler:

- snapshot do treinamento vindo da Programacao
- rascunho local versionado

Pode escrever:

- somente no rascunho/fechamento da Prestacao

Nunca deve:

- alterar Programacao silenciosamente
- consolidar sem persistencia confirmada

### Declaracoes

Papel:

- montar o **documentado**
- derivar textos institucionais a partir do treinamento
- permitir complementacao manual controlada

Pode ler:

- snapshot do treinamento
- constantes institucionais centralizadas
- rascunho local versionado do modulo

Pode escrever:

- somente rascunho declaratorio

Nunca deve:

- alterar Programacao silenciosamente
- tratar declaracao de treinamento e declaracao ABENDI como a mesma familia

### Busca e Modelos

Papel:

- apoio operacional

Nao sao centro do dominio:

- nao definem contrato do treinamento
- nao editam planejado, fechado ou documentado

## Planejado, fechado e documentado

### Planejado

- mantido na Programacao
- orientado a agenda operacional
- contem reserva planejada de recursos

### Fechado

- mantido na Prestacao
- representa o realizado/declarado
- pode divergir do planejado

### Documentado

- mantido em Declaracoes
- representa texto institucional emitivel
- usa template fixo com corpo variavel

## Arquivos de referencia

- Contrato do treinamento: `src/domain/treinamento/contratoTreinamento.js`
- Migracoes legadas do treinamento: `src/domain/treinamento/migracoesTreinamento.js`
- Constantes institucionais: `src/domain/institucional/constantesInstitucionais.js`
- Fixtures manuais: `src/data/fixturesCenariosCriticos.js`

## Direcao V1 local-first

Decisao de arquitetura da V1:

- app desktop local-first
- reaproveitar o React atual
- usar Tauri como empacotador preferencial
- SQLite como banco principal
- PDFs salvos em pastas locais organizadas
- pasta de dados sincronizada por Google Drive ou OneDrive
- backup automatico do banco
- regra operacional de 1 usuario escrevendo por vez
- sem backend obrigatorio

Objetivos:

- funcionar instalado no computador principal
- continuar simples
- nao depender de servidor para o sistema existir
- permitir recuperacao facil se o PC der problema
- manter possibilidade de abrir em outro notebook usando a mesma pasta sincronizada

### Empacotador

Recomendacao: Tauri.

Motivos:

- instalador mais leve que Electron
- menor consumo de memoria
- boa integracao com arquivos locais
- adequado para React + SQLite + PDFs locais
- mantem o app simples para a V1

Electron fica como alternativa apenas se surgir dependencia forte de APIs Node, bibliotecas especificas do ecossistema Electron, ou necessidade pratica que pese mais que o custo operacional.

### Estrutura de dados local

O app instalado nao deve ser a fonte dos dados. Os dados ficam em uma pasta escolhida pelo usuario, idealmente dentro do Google Drive ou OneDrive:

```text
Sistema IBC/
  dados/
    sistema.ibc.sqlite
    sistema.ibc.sqlite-wal
    sistema.ibc.sqlite-shm
  backups/
    sistema-YYYY-MM-DD-HHMM.sqlite
  pdfs/
    membros/
    eventos/
    financeiro/
  exports/
    relatorios/
    planilhas/
  config/
    app.json
    lock.json
```

### SQLite e backup

- usar um unico banco SQLite principal em `dados/sistema.ibc.sqlite`
- acessar o banco somente pelo app desktop
- usar migracoes versionadas
- usar transacoes nas operacoes criticas
- fazer backup automatico ao abrir, em intervalos configurados e antes de operacoes sensiveis
- manter rotacao de backups horarios, diarios e mensais
- criar backup consistente usando mecanismo apropriado do SQLite, nao copia simples do arquivo em uso

### Pasta sincronizada e trava operacional

Esta arquitetura nao e multiusuario real. A regra operacional da V1 e: apenas 1 computador pode escrever por vez.

Riscos conhecidos:

- Google Drive ou OneDrive podem gerar arquivos de conflito
- sincronizacao pode demorar e outro computador pode abrir dados antigos
- SQLite nao deve receber escrita simultanea a partir de varios PCs via pasta sincronizada
- arquivos `-wal` e `-shm` exigem cuidado no modo WAL
- PDFs grandes podem atrasar a sincronizacao

Mitigacao prevista:

- criar `config/lock.json` ao abrir o sistema para escrita
- bloquear ou abrir somente leitura se outro computador estiver com lock ativo
- permitir assumir o controle apenas se o lock estiver antigo, com aviso claro
- orientar fechamento do app e espera da sincronizacao antes de abrir em outro notebook

### Distribuicao inicial

Caminho simples para instalar no computador principal:

- gerar instalador Windows pelo Tauri (`.msi` ou `.exe`)
- instalar o app no computador do usuario principal
- na primeira abertura, escolher a pasta de dados dentro do Google Drive ou OneDrive
- o app cria automaticamente `dados`, `pdfs`, `backups`, `exports` e `config`
- outro notebook pode usar o mesmo instalador e apontar para a mesma pasta sincronizada, respeitando a regra de 1 usuario escrevendo por vez

### Padrao de emissao de PDF

Decisao de produto para documentos emitidos:

- o PDF deve representar a mesma superficie visual aprovada no preview do documento
- o tamanho compacto adotado em Declaracoes passa a ser referencia para novos modelos
- evitar legendas, tabelas operacionais, textos de sistema, status de rascunho ou explicacoes internas dentro do documento emitido
- campos estruturados mandam no texto final; ao alterar nome, CPF, SNQC, datas, carga horaria, finalidade ou campos equivalentes, preview, PDF e e-mail devem refletir a alteracao
- CPF e SNQC sao campos opcionais: se preenchidos aparecem no texto; se vazios, o texto continua natural sem placeholder
- anexo de e-mail e futuro salvamento local devem usar a mesma saida de PDF sempre que possivel
- quando houver `textoLivre`, ele deve ser tratado como edicao manual consciente e nao como fonte congelada involuntaria

## Diretriz de implementacao

- consolidar contrato antes de mudar comportamento
- toda tela deve declarar de quem le, o que pode editar e o que nunca sobrescreve
- toda persistencia local deve ser versionada
- regra de negocio compartilhada nao deve ser duplicada em tela e utilitario
