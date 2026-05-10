# CONTRATOS_DE_DADOS

## Contrato compartilhado do treinamento

Arquivo fonte:

- `src/domain/treinamento/contratoTreinamento.js`

Versao atual:

- `VERSAO_CONTRATO_TREINAMENTO = 2`

## Shape minimo

| Campo | Tipo | Obrigatorio | Origem |
| --- | --- | --- | --- |
| `grupoId` | `string` | sim | identidade estavel do treinamento |
| `aluno` | `string` | sim | cadastro/edicao da Programacao |
| `email` | `string` | sim | cadastro/edicao da Programacao |
| `tipoTreinamento` | `string` | sim | Programacao |
| `status` | `string` | sim | Programacao |
| `dataInicial` | `string YYYY-MM-DD` | sim | derivado dos subconjuntos operacionais |
| `dataFinal` | `string YYYY-MM-DD` | sim | derivado dos subconjuntos operacionais |
| `diasTreinamento` | `string[]` | sim | fonte operacional |
| `diasEmProva` | `string[]` | sim | fonte operacional |
| `diasHospedagem` | `string[]` | sim | fonte operacional |
| `dias` | `string[]` | sim | derivado |
| `aluguelAparelho` | `boolean` | sim | Programacao / contrato operacional |

## Campos derivados

Derivados no contrato:

- `dias`
- `dataInicial`
- `dataFinal`

Regra:

- `dias = uniao(diasTreinamento, diasEmProva, diasHospedagem)`
- `dataInicial = primeiro dia de treinamento, com fallback para o primeiro dia operacional`
- `dataFinal = ultimo dia de treinamento, com fallback para o ultimo dia operacional`

Compatibilidade legada:

- payloads historicos que trazem apenas `dias` devem passar por `src/domain/treinamento/migracoesTreinamento.js`
- o contrato canonico nao usa mais `dias` como fallback para `diasTreinamento`

## Regras de normalizacao

- listas de datas sao deduplicadas e ordenadas
- `diasEmProva` so permanece ativo se `aluguelAparelho = true`
- `status` sem valor cai para `planejado`
- `grupoId` nao e criado pelo contrato; a camada chamadora decide quando criar novo treinamento
- `camposDerivadosContratoTreinamento` precisa refletir exatamente os campos derivados pelo normalizador

## Contrato entre modulos

### Programacao -> Prestacao

Entrega um snapshot do treinamento com o contrato minimo completo.

Prestacao pode:

- ocultar dias
- adicionar dias
- divergir do planejado

Prestacao nao pode:

- sobrescrever Programacao sem comando explicito futuro

### Programacao -> Declaracoes

Entrega um snapshot do treinamento com contrato minimo completo.

Declaracoes pode:

- completar campos documentais ausentes
- ajustar texto final

Declaracoes nao pode:

- sobrescrever Programacao sem comando explicito futuro

## Versionamento local

Persistencias locais existentes:

- Prestacao: `ibc-prestacao-v2:*`
- Declaracoes: `ibc-declaracoes-v1`

Regras:

- nunca salvar payload sem `versaoSchema`
- migracoes devem preservar compatibilidade de leitura
- mensagens de sucesso so podem aparecer apos persistencia confirmada

## Constantes institucionais

Arquivo fonte:

- `src/domain/institucional/constantesInstitucionais.js`

Regra:

- dados institucionais nao podem ficar espalhados em telas
- template institucional e fixo na V1
- familia ABENDI usa template institucional fixo, mas empresa de atuacao permanece editavel
