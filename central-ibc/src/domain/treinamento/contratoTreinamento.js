export const VERSAO_CONTRATO_TREINAMENTO = 2

export const camposContratoTreinamento = [
  'grupoId',
  'aluno',
  'email',
  'tipoTreinamento',
  'status',
  'dataInicial',
  'dataFinal',
  'diasTreinamento',
  'diasEmProva',
  'diasHospedagem',
  'dias',
  'aluguelAparelho',
]

export const camposDerivadosContratoTreinamento = ['dias', 'dataInicial', 'dataFinal']

export const rotulosCamposContratoTreinamento = {
  grupoId: 'grupoId',
  aluno: 'aluno',
  email: 'e-mail',
  tipoTreinamento: 'tipo de treinamento',
  status: 'status',
  dataInicial: 'data inicial',
  dataFinal: 'data final',
  diasTreinamento: 'dias de treinamento',
  diasEmProva: 'dias em prova',
  diasHospedagem: 'dias de hospedagem',
  dias: 'dias operacionais',
  aluguelAparelho: 'aluguel de aparelho',
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor : ''
}

function normalizarData(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : ''
}

function arraysIguais(listaA = [], listaB = []) {
  if (listaA.length !== listaB.length) {
    return false
  }

  return listaA.every((item, indice) => item === listaB[indice])
}

export function normalizarListaDatasContrato(datas = []) {
  return [...new Set((datas ?? []).filter((data) => /^\d{4}-\d{2}-\d{2}$/.test(data)))].sort()
}

export function criarDiasDerivadosTreinamento({
  diasTreinamento = [],
  diasEmProva = [],
  diasHospedagem = [],
}) {
  return normalizarListaDatasContrato([
    ...normalizarListaDatasContrato(diasTreinamento),
    ...normalizarListaDatasContrato(diasEmProva),
    ...normalizarListaDatasContrato(diasHospedagem),
  ])
}

export function criarCamposDerivadosTreinamento({
  diasTreinamento = [],
  diasEmProva = [],
  diasHospedagem = [],
  dataInicial = '',
  dataFinal = '',
}) {
  const diasTreinamentoNormalizados = normalizarListaDatasContrato(diasTreinamento)
  const diasEmProvaNormalizados = normalizarListaDatasContrato(diasEmProva)
  const diasHospedagemNormalizados = normalizarListaDatasContrato(diasHospedagem)
  const dias = criarDiasDerivadosTreinamento({
    diasTreinamento: diasTreinamentoNormalizados,
    diasEmProva: diasEmProvaNormalizados,
    diasHospedagem: diasHospedagemNormalizados,
  })

  return {
    diasTreinamento: diasTreinamentoNormalizados,
    diasEmProva: diasEmProvaNormalizados,
    diasHospedagem: diasHospedagemNormalizados,
    dias,
    dataInicial: diasTreinamentoNormalizados[0] ?? dias[0] ?? normalizarData(dataInicial),
    dataFinal: diasTreinamentoNormalizados.at(-1) ?? dias.at(-1) ?? normalizarData(dataFinal),
  }
}

export function normalizarTreinamentoCompartilhado(
  treinamento = {},
  { manterExtras = true } = {},
) {
  const diasTreinamento = normalizarListaDatasContrato(treinamento.diasTreinamento ?? [])
  const diasEmProvaOriginais = normalizarListaDatasContrato(
    treinamento.diasEmProva ?? (treinamento.dataProva ? [treinamento.dataProva] : []),
  )
  const diasHospedagem = normalizarListaDatasContrato(treinamento.diasHospedagem ?? [])
  const aluguelAparelho = Boolean(treinamento.aluguelAparelho ?? diasEmProvaOriginais.length > 0)
  const diasEmProva = aluguelAparelho ? diasEmProvaOriginais : []
  const camposDerivados = criarCamposDerivadosTreinamento({
    diasTreinamento,
    diasEmProva,
    diasHospedagem,
    dataInicial: treinamento.dataInicial,
    dataFinal: treinamento.dataFinal,
  })
  const base = {
    grupoId: normalizarTexto(treinamento.grupoId),
    aluno: normalizarTexto(treinamento.aluno),
    email: normalizarTexto(treinamento.email),
    tipoTreinamento: normalizarTexto(treinamento.tipoTreinamento),
    status: normalizarTexto(treinamento.status) || 'planejado',
    ...camposDerivados,
    aluguelAparelho,
  }

  if (!manterExtras) {
    return base
  }

  return {
    ...treinamento,
    ...base,
  }
}

export function criarSnapshotTreinamentoCompartilhado(treinamento) {
  return normalizarTreinamentoCompartilhado(treinamento, { manterExtras: false })
}

export function listarDivergenciasTreinamentoCompartilhado(
  treinamentoBase,
  treinamentoComparado,
  campos = [
    'aluno',
    'email',
    'tipoTreinamento',
    'status',
    'dataInicial',
    'dataFinal',
    'diasTreinamento',
    'diasEmProva',
    'diasHospedagem',
    'aluguelAparelho',
  ],
) {
  const base = criarSnapshotTreinamentoCompartilhado(treinamentoBase)
  const comparado = criarSnapshotTreinamentoCompartilhado(treinamentoComparado)

  if (!base.grupoId || !comparado.grupoId) {
    return []
  }

  return campos.reduce((divergencias, campo) => {
    const valorBase = base[campo]
    const valorComparado = comparado[campo]
    const mudou = Array.isArray(valorBase) || Array.isArray(valorComparado)
      ? !arraysIguais(valorBase ?? [], valorComparado ?? [])
      : valorBase !== valorComparado

    if (mudou) {
      divergencias.push(rotulosCamposContratoTreinamento[campo] ?? campo)
    }

    return divergencias
  }, [])
}
