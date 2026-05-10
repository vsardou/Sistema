# MATRIZ_DE_REGRESSAO

Fixtures de apoio:

- `src/data/fixturesCenariosCriticos.js`

## Cenarios minimos

| ID | Modulo | Cenario | Resultado esperado |
| --- | --- | --- | --- |
| `programacao-cadastro-1-dia` | Programacao | cadastrar 1 dia | cria 1 treinamento com `grupoId` estavel e `dias` derivados corretamente |
| `programacao-cadastro-varios-dias` | Programacao | cadastrar varios dias | treino, prova e hospedagem compoem o mesmo treinamento |
| `programacao-atravessa-mes` | Programacao | atravessar meses | mesmo `grupoId`, segmentos visuais em mais de um mes, sem criar novo treinamento |
| `programacao-editar-grupo` | Programacao | editar grupo existente | mantem `grupoId` e atualiza projeções mensais |
| `programacao-cancelado` | Programacao | cancelar | continua visivel, mas sai do consumo de recursos |
| `programacao-remover` | Programacao | remover | elimina todos os segmentos do mesmo `grupoId` |
| `programacao-prova-aparelho` | Programacao | aluguel de aparelho com prova | dias em prova entram na reserva planejada de aparelhos |
| `programacao-hospedagem` | Programacao | hospedagem | dias de hospedagem entram na capacidade operacional do mes |
| `prestacao-abertura-derivada` | Prestacao | abrir a partir da Programacao | abre snapshot declaratorio sem sobrescrever o planejado |
| `prestacao-edicao-calendario` | Prestacao | editar calendario da prestacao | grade financeira acompanha calendario declaratorio |
| `prestacao-divergencia-rascunho` | Prestacao | preservar ou alertar divergencia | ao reabrir rascunho, sistema aponta diferenca entre snapshot e Programacao atual |
| `prestacao-geracao-confirmada` | Prestacao | gerar/consolidar | so mostra sucesso se gravacao local confirmar |
| `declaracao-treinamento` | Declaracoes | gerar declaracao de treinamento | usa template institucional fixo e corpo variavel |
| `declaracao-abendi` | Declaracoes | gerar declaracao ABENDI | mantem template institucional e empresa de atuacao editavel |

## Checklist manual por modulo

### Programacao

- cadastrar treinamento novo
- editar treinamento existente sem trocar `grupoId`
- validar resumo do mes
- validar alerta de aparelhos
- validar alerta de hospedagem
- validar cancelado fora do consumo

### Prestacao

- abrir por selecao direta
- abrir a partir da Programacao
- alterar calendario do fechamento
- recalcular preservando override manual
- salvar rascunho
- reabrir rascunho e checar divergencia

### Declaracoes

- aplicar base da Programacao
- completar campos manuais
- salvar rascunho
- validar preview institucional
- validar familia ABENDI com empresa editavel

## Critério de aprovacao

- nenhum modulo quebra o contrato minimo do treinamento
- nenhuma tela sobrescreve outra silenciosamente
- toda persistencia local relevante e versionada
- todo fluxo de sucesso depende de persistencia confirmada
