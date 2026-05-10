# REGRAS_DE_INTERACAO

## Objetivo de UX

O sistema deve operar com baixa ambiguidade para usuario 70+:

- hit areas grandes
- poucos comandos concorrentes na mesma area
- botao principal visivel
- acao de incluir novo aluno evidente
- estados previsiveis entre clique simples e clique duplo

## Contrato de interacao da Programacao

### Dia no calendario

Contrato alvo:

- 1 clique no dia: carrega o detalhe do dia
- 2 cliques no dia vazio: abre modal de novo aluno com dia pre-selecionado
- 2 cliques no dia com movimentacao: abre painel de trabalho do dia com lista dos alunos e foco em incluir novo aluno

### Bloco ou linha de aluno

Contrato alvo:

- 1 clique no aluno: abre/seleciona o treinamento daquele `grupoId`
- 2 cliques no aluno: abre edicao do treinamento daquele `grupoId`

### Regras tecnicas obrigatorias

- nao deixar `onClick` simples disparar e depois o `onDoubleClick` disparar outra acao por cima
- usar debounce/cancelamento explicito entre clique simples e duplo
- nunca basear a decisao em heuristica invisivel para o usuario

## Prioridades de interface

- "Novo aluno" forte no detalhe do dia
- detalhes do dia devem explicar rapidamente quantos alunos, aparelhos e hospedagens existem
- edicao e inclusao nao podem depender do usuario entender a estrutura interna de segmentacao por mes

## Contrato de interacao da Prestacao

- calendario da prestacao comanda a grade financeira
- marcar/desmarcar precisa refletir linha correspondente
- ocultar/adicionar dias precisa ficar visivel na interface
- tipo da linha nao pode ser apenas cosmetico

## Contrato de interacao das Declaracoes

- familia de Treinamento/Retreinamento separada da familia ABENDI
- V1 opera apenas com duas familias declaratorias: Treinamento/Retreinamento por periodo e ABENDI
- template institucional fixo
- corpo do texto variavel

## Status deste documento

Este arquivo registra o contrato arquitetural que deve guiar os proximos lotes.

Parte da base de dominio ja esta consolidada no codigo. O enforcement completo do clique simples/duplo na Programacao deve entrar em lote comportamental dedicado, para evitar regressao silenciosa.
