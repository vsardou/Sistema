import { normalizarTreinamentoCompartilhado } from '../domain/treinamento/contratoTreinamento'

export const fixturesTreinamentoCriticos = {
  diaUnico: normalizarTreinamentoCompartilhado({
    id: 'fixture-dia-unico',
    grupoId: 'fixture-dia-unico',
    aluno: 'Aluno Dia Unico',
    email: 'dia.unico@exemplo.com.br',
    tipoTreinamento: 'Treinamento pontual',
    status: 'planejado',
    diasTreinamento: ['2026-04-22'],
    diasEmProva: [],
    diasHospedagem: [],
    aluguelAparelho: false,
  }),
  variosDias: normalizarTreinamentoCompartilhado({
    id: 'fixture-varios-dias',
    grupoId: 'fixture-varios-dias',
    aluno: 'Aluno Varios Dias',
    email: 'varios.dias@exemplo.com.br',
    tipoTreinamento: 'Treinamento continuo',
    status: 'confirmado',
    diasTreinamento: ['2026-04-22', '2026-04-23', '2026-04-24'],
    diasEmProva: ['2026-04-25'],
    diasHospedagem: ['2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24', '2026-04-25'],
    aluguelAparelho: true,
  }),
  atravessaMes: normalizarTreinamentoCompartilhado({
    id: 'fixture-atravessa-mes',
    grupoId: 'fixture-atravessa-mes',
    aluno: 'Aluno Multi Mes',
    email: 'multi.mes@exemplo.com.br',
    tipoTreinamento: 'Treinamento intermensal',
    status: 'planejado',
    diasTreinamento: ['2026-04-29', '2026-04-30', '2026-05-02'],
    diasEmProva: ['2026-05-03'],
    diasHospedagem: ['2026-04-28', '2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02'],
    aluguelAparelho: true,
  }),
  cancelado: normalizarTreinamentoCompartilhado({
    id: 'fixture-cancelado',
    grupoId: 'fixture-cancelado',
    aluno: 'Aluno Cancelado',
    email: 'cancelado@exemplo.com.br',
    tipoTreinamento: 'Treinamento cancelado',
    status: 'cancelado',
    diasTreinamento: ['2026-05-10', '2026-05-11'],
    diasEmProva: [],
    diasHospedagem: ['2026-05-10'],
    aluguelAparelho: false,
  }),
}

export const cenariosCriticosManuais = [
  {
    id: 'programacao-cadastro-1-dia',
    modulo: 'Programacao',
    objetivo: 'Cadastrar 1 dia',
    grupoIdReferencia: fixturesTreinamentoCriticos.diaUnico.grupoId,
    expectativa:
      'O treinamento deve existir com grupoId estavel, dias derivados iguais a diasTreinamento e exibicao correta no detalhe do dia.',
  },
  {
    id: 'programacao-cadastro-varios-dias',
    modulo: 'Programacao',
    objetivo: 'Cadastrar varios dias',
    grupoIdReferencia: fixturesTreinamentoCriticos.variosDias.grupoId,
    expectativa:
      'Treino, prova e hospedagem devem compor o mesmo treinamento sem criar entidades paralelas.',
  },
  {
    id: 'programacao-atravessa-mes',
    modulo: 'Programacao',
    objetivo: 'Atravessar meses',
    grupoIdReferencia: fixturesTreinamentoCriticos.atravessaMes.grupoId,
    expectativa:
      'O mesmo grupoId deve atravessar abril e maio, gerando apenas segmentos visuais por mes.',
  },
  {
    id: 'programacao-cancelado',
    modulo: 'Programacao',
    objetivo: 'Cancelar',
    grupoIdReferencia: fixturesTreinamentoCriticos.cancelado.grupoId,
    expectativa:
      'O treinamento continua visivel, mas recursos operacionais nao entram no consumo do mes.',
  },
  {
    id: 'prestacao-abertura-derivada',
    modulo: 'Prestacao',
    objetivo: 'Abrir prestacao a partir da programacao',
    grupoIdReferencia: fixturesTreinamentoCriticos.variosDias.grupoId,
    expectativa:
      'A prestacao deve abrir com snapshot do treinamento, sem sobrescrever a Programacao automaticamente.',
  },
  {
    id: 'prestacao-edicao-calendario',
    modulo: 'Prestacao',
    objetivo: 'Editar calendario da prestacao',
    grupoIdReferencia: fixturesTreinamentoCriticos.variosDias.grupoId,
    expectativa:
      'Marcar e desmarcar dias altera o fechamento declaratorio e a grade financeira correspondente.',
  },
  {
    id: 'prestacao-divergencia-rascunho',
    modulo: 'Prestacao',
    objetivo: 'Preservar ou alertar divergencia de rascunho',
    grupoIdReferencia: fixturesTreinamentoCriticos.atravessaMes.grupoId,
    expectativa:
      'O sistema deve comparar o snapshot salvo com a Programacao atual e avisar divergencias relevantes.',
  },
  {
    id: 'declaracao-treinamento',
    modulo: 'Declaracoes',
    objetivo: 'Gerar declaracao de treinamento',
    grupoIdReferencia: fixturesTreinamentoCriticos.variosDias.grupoId,
    expectativa:
      'A familia de treinamento deve usar template institucional fixo e corpo variavel com base no treinamento.',
  },
  {
    id: 'declaracao-abendi',
    modulo: 'Declaracoes',
    objetivo: 'Gerar declaracao ABENDI',
    grupoIdReferencia: fixturesTreinamentoCriticos.variosDias.grupoId,
    expectativa:
      'A familia ABENDI deve manter dados institucionais fixos apenas no template, com empresa de atuacao editavel.',
  },
]
