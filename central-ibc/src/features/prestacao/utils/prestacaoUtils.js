import { criarChaveData } from '../../programacao/utils/dateUtils'
import {
  listarDivergenciasOrigemPrestacao,
  normalizarOrigemPrestacao,
} from './prestacaoNormalization'

const STORAGE_VERSAO_ATUAL = 2
const STORAGE_PREFIX = `ibc-prestacao-v${STORAGE_VERSAO_ATUAL}:`
const STORAGE_PREFIXES_LEGADOS = ['ibc-prestacao-v1:']
const STORAGE_CHAVE_TABELA_VALORES = 'ibc-prestacao-tabela-valores-v1'
const diasSemanaPrestacao = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const camposFinanceirosPrestacao = ['diarias', 'hospedagem', 'aluguelAparelho']

export const tiposLinhaPrestacao = ['treinamento', 'prova', 'hospedagem', 'vazio']

export const modosCalendarioPrestacao = [
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'prova', label: 'Em prova' },
  { value: 'hospedagem', label: 'Hospedagem' },
  { value: 'ocultar', label: 'Ocultar dia' },
  { value: 'adicionar', label: 'Adicionar dia' },
]

export const presetsPrestacao = [
  {
    id: 'padrao_600_850',
    label: 'Padrao 600/850',
    descricao: 'Diaria util 600, fim de semana 850, hospedagem 100, aparelho 250',
    valores: {
      valorDiariaUtil: 600,
      valorDiariaFimDeSemana: 850,
      valorHospedagemDia: 100,
      valorAluguelAparelho: 250,
    },
  },
  {
    id: 'alternativo_500_700',
    label: 'Alternativo 500/700',
    descricao: 'Diaria util 500, fim de semana 700, hospedagem 100, aparelho 250',
    valores: {
      valorDiariaUtil: 500,
      valorDiariaFimDeSemana: 700,
      valorHospedagemDia: 100,
      valorAluguelAparelho: 250,
    },
  },
]

export const parametrosPrestacaoIniciais = {
  presetSelecionado: 'padrao_600_850',
  valorDiariaUtil: 600,
  valorDiariaFimDeSemana: 850,
  valorHospedagemDia: 100,
  valorAluguelAparelho: 250,
  desconto: 0,
  acrescimo: 0,
  ajusteManual: 0,
  pagamentoEmpresa: 0,
  pagamentoAluno: 0,
  observacaoFinanceira: '',
  cidadeEmissao: '',
  dataEmissao: '',
  observacoes: '',
}

function normalizarTabelaValoresPrestacao(valores = {}) {
  return {
    valorDiariaUtil: normalizarNumero(
      valores.valorDiariaUtil ?? parametrosPrestacaoIniciais.valorDiariaUtil,
    ),
    valorDiariaFimDeSemana: normalizarNumero(
      valores.valorDiariaFimDeSemana ?? parametrosPrestacaoIniciais.valorDiariaFimDeSemana,
    ),
    valorHospedagemDia: normalizarNumero(
      valores.valorHospedagemDia ?? parametrosPrestacaoIniciais.valorHospedagemDia,
    ),
    valorAluguelAparelho: normalizarNumero(
      valores.valorAluguelAparelho ?? parametrosPrestacaoIniciais.valorAluguelAparelho,
    ),
  }
}

export function getTabelaValoresPadraoPrestacao() {
  return normalizarTabelaValoresPrestacao(parametrosPrestacaoIniciais)
}

export function carregarTabelaValoresPrestacao() {
  if (typeof window === 'undefined') {
    return getTabelaValoresPadraoPrestacao()
  }

  try {
    const conteudo = window.localStorage.getItem(STORAGE_CHAVE_TABELA_VALORES)

    if (!conteudo) {
      return getTabelaValoresPadraoPrestacao()
    }

    const tabela = JSON.parse(conteudo)
    return normalizarTabelaValoresPrestacao(tabela)
  } catch {
    return getTabelaValoresPadraoPrestacao()
  }
}

export function salvarTabelaValoresPrestacao(valores) {
  if (typeof window === 'undefined') {
    return null
  }

  const tabela = normalizarTabelaValoresPrestacao(valores)

  try {
    window.localStorage.setItem(STORAGE_CHAVE_TABELA_VALORES, JSON.stringify(tabela))
    return tabela
  } catch {
    return null
  }
}

export function aplicarTabelaValoresEmParametros(parametrosAtuais, tabelaValores) {
  return {
    ...parametrosAtuais,
    ...normalizarTabelaValoresPrestacao(tabelaValores),
    presetSelecionado: 'personalizado',
  }
}

function normalizarNumero(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

function ordenarDatas(datas = []) {
  return [...new Set((datas ?? []).filter(Boolean))].sort()
}

function criarOverridesManuais(overridesManuais = {}) {
  return {
    diarias: Boolean(overridesManuais?.diarias),
    hospedagem: Boolean(overridesManuais?.hospedagem),
    aluguelAparelho: Boolean(overridesManuais?.aluguelAparelho),
  }
}

function normalizarPresetSelecionado(presetSelecionado) {
  if (presetSelecionado === 'preset_a') {
    return 'padrao_600_850'
  }

  if (presetSelecionado === 'preset_b') {
    return 'alternativo_500_700'
  }

  if (
    presetSelecionado === 'personalizado' ||
    presetsPrestacao.some((preset) => preset.id === presetSelecionado)
  ) {
    return presetSelecionado
  }

  return parametrosPrestacaoIniciais.presetSelecionado
}

function getDateObject(data) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function isCampoFinanceiroAplicavel(linha, campo, origemProgramacao) {
  if (campo === 'diarias') {
    return linha.ehTreinamento || linha.ehProva
  }

  if (campo === 'hospedagem') {
    return linha.ehHospedagem
  }

  if (campo === 'aluguelAparelho') {
    return origemProgramacao.aluguelAparelho && linha.ehProva
  }

  return false
}

function inferirOverridesManuais(linha, sugestoes) {
  if (!linha) {
    return criarOverridesManuais()
  }

  if (linha.overridesManuais) {
    return criarOverridesManuais(linha.overridesManuais)
  }

  return {
    diarias: normalizarNumero(linha.diarias) !== sugestoes.diarias,
    hospedagem: normalizarNumero(linha.hospedagem) !== sugestoes.hospedagem,
    aluguelAparelho: normalizarNumero(linha.aluguelAparelho) !== sugestoes.aluguelAparelho,
  }
}

function criarLinhaBaseAPartirDaLinhaAtual(linha) {
  const ehTreinamento = Boolean(linha.ehTreinamento)
  const ehProva = Boolean(linha.ehProva)
  const ehHospedagem = Boolean(linha.ehHospedagem)

  return {
    id: linha.id,
    data: linha.data,
    dia: linha.dia ?? getRotuloDia(linha.data),
    visivel: Boolean(linha.visivel),
    tipoLinha: inferirTipoLinhaPorMarcacoes({
      ehTreinamento,
      ehProva,
      ehHospedagem,
    }),
    ehTreinamento,
    ehProva,
    ehHospedagem,
    ehAdicionado: Boolean(linha.ehAdicionado),
    overridesManuais: criarOverridesManuais(linha.overridesManuais),
    diarias: 0,
    hospedagem: 0,
    aluguelAparelho: 0,
    totalDia: 0,
  }
}

export function listarDatasEntre(dataInicial, dataFinal) {
  if (!dataInicial || !dataFinal) {
    return []
  }

  const datas = []
  const dataAtual = getDateObject(dataInicial)
  const dataFim = getDateObject(dataFinal)

  while (dataAtual <= dataFim) {
    datas.push(
      criarChaveData(dataAtual.getFullYear(), dataAtual.getMonth() + 1, dataAtual.getDate()),
    )
    dataAtual.setDate(dataAtual.getDate() + 1)
  }

  return datas
}

export function getRotuloDia(data) {
  return diasSemanaPrestacao[getDateObject(data).getDay()]
}

export function isFimDeSemana(data) {
  const diaSemana = getDateObject(data).getDay()
  return diaSemana === 0 || diaSemana === 6
}

export function clonarOrigemProgramacao(programacao) {
  return normalizarOrigemPrestacao(programacao)
}

export function getDatasBasePeriodoPrestacao(origemProgramacao) {
  const origemNormalizada = origemProgramacao ? clonarOrigemProgramacao(origemProgramacao) : null

  if (!origemNormalizada) {
    return []
  }

  const { dataInicial, dataFinal } = origemNormalizada

  if (!dataInicial && !dataFinal) {
    return []
  }

  return listarDatasEntre(dataInicial ?? dataFinal, dataFinal ?? dataInicial)
}

export function getDatasCandidatasPrestacao(origemProgramacao, fechamento) {
  return ordenarDatas([
    ...getDatasBasePeriodoPrestacao(origemProgramacao),
    ...(fechamento?.diasTreinamento ?? []),
    ...(fechamento?.diasEmProva ?? []),
    ...(fechamento?.diasHospedagem ?? []),
    ...(fechamento?.diasAdicionados ?? []),
  ])
}

export function inferirTipoLinhaPorMarcacoes({ ehTreinamento, ehProva, ehHospedagem }) {
  if (ehTreinamento) {
    return 'treinamento'
  }

  if (ehProva) {
    return 'prova'
  }

  if (ehHospedagem) {
    return 'hospedagem'
  }

  return 'vazio'
}

function criarLinhaBase(origemProgramacao, fechamento, data) {
  const ehTreinamento = fechamento.diasTreinamento.includes(data)
  const ehProva = fechamento.diasEmProva.includes(data)
  const ehHospedagem = fechamento.diasHospedagem.includes(data)

  return {
    id: `${origemProgramacao.grupoId}-${data}`,
    data,
    dia: getRotuloDia(data),
    visivel: !fechamento.diasOcultos.includes(data),
    tipoLinha: inferirTipoLinhaPorMarcacoes({
      ehTreinamento,
      ehProva,
      ehHospedagem,
    }),
    ehTreinamento,
    ehProva,
    ehHospedagem,
    ehAdicionado: fechamento.diasAdicionados.includes(data),
    overridesManuais: criarOverridesManuais(),
    diarias: 0,
    hospedagem: 0,
    aluguelAparelho: 0,
    totalDia: 0,
  }
}

export function calcularTotalDia(linha) {
  return (
    normalizarNumero(linha.diarias) +
    normalizarNumero(linha.hospedagem) +
    normalizarNumero(linha.aluguelAparelho)
  )
}

export function getSugestoesFinanceirasLinha(linha, parametros, origemProgramacao) {
  const valorDiaria = isFimDeSemana(linha.data)
    ? normalizarNumero(parametros.valorDiariaFimDeSemana)
    : normalizarNumero(parametros.valorDiariaUtil)
  const valorHospedagem = normalizarNumero(parametros.valorHospedagemDia)
  const valorAluguelAparelho = normalizarNumero(parametros.valorAluguelAparelho)

  return {
    diarias: isCampoFinanceiroAplicavel(linha, 'diarias', origemProgramacao) ? valorDiaria : 0,
    hospedagem: isCampoFinanceiroAplicavel(linha, 'hospedagem', origemProgramacao)
      ? valorHospedagem
      : 0,
    aluguelAparelho: isCampoFinanceiroAplicavel(linha, 'aluguelAparelho', origemProgramacao)
      ? valorAluguelAparelho
      : 0,
  }
}

function aplicarRegrasFinanceirasNaLinha(linhaBase, linhaExistente, parametros, origemProgramacao) {
  const sugestoes = getSugestoesFinanceirasLinha(linhaBase, parametros, origemProgramacao)
  const overridesManuais = inferirOverridesManuais(linhaExistente, sugestoes)
  const linhaAtualizada = {
    ...linhaBase,
    overridesManuais: criarOverridesManuais(overridesManuais),
  }

  camposFinanceirosPrestacao.forEach((campo) => {
    const aplicavel = isCampoFinanceiroAplicavel(linhaBase, campo, origemProgramacao)

    if (!aplicavel) {
      linhaAtualizada[campo] = 0
      linhaAtualizada.overridesManuais[campo] = false
      return
    }

    if (linhaExistente && linhaAtualizada.overridesManuais[campo]) {
      linhaAtualizada[campo] = normalizarNumero(linhaExistente[campo])
      return
    }

    linhaAtualizada[campo] = sugestoes[campo]
    linhaAtualizada.overridesManuais[campo] = false
  })

  return {
    ...linhaAtualizada,
    totalDia: calcularTotalDia(linhaAtualizada),
  }
}

export function atualizarLinhaFinanceiraManual(linha, campo, valor, parametros, origemProgramacao) {
  const linhaBase = criarLinhaBaseAPartirDaLinhaAtual(linha)
  const sugestoes = getSugestoesFinanceirasLinha(linhaBase, parametros, origemProgramacao)
  const campoAplicavel = isCampoFinanceiroAplicavel(linhaBase, campo, origemProgramacao)
  const valorNormalizado = campoAplicavel ? normalizarNumero(valor) : 0
  const overridesManuais = criarOverridesManuais(linha.overridesManuais)
  const linhaAtualizada = {
    ...linhaBase,
    ...linha,
    overridesManuais,
    [campo]: valorNormalizado,
  }

  camposFinanceirosPrestacao.forEach((campoAtual) => {
    const aplicavel = isCampoFinanceiroAplicavel(linhaBase, campoAtual, origemProgramacao)

    if (!aplicavel) {
      linhaAtualizada[campoAtual] = 0
      linhaAtualizada.overridesManuais[campoAtual] = false
      return
    }

    linhaAtualizada[campoAtual] = normalizarNumero(linhaAtualizada[campoAtual])

    if (campoAtual === campo) {
      linhaAtualizada.overridesManuais[campoAtual] =
        linhaAtualizada[campoAtual] !== sugestoes[campoAtual]
      return
    }

    linhaAtualizada.overridesManuais[campoAtual] = Boolean(
      linhaAtualizada.overridesManuais[campoAtual],
    )
  })

  return {
    ...linhaAtualizada,
    tipoLinha: linhaBase.tipoLinha,
    totalDia: calcularTotalDia(linhaAtualizada),
  }
}

export function linhaTemOverrideManual(linha) {
  const overridesManuais = criarOverridesManuais(linha?.overridesManuais)
  return (
    overridesManuais.diarias ||
    overridesManuais.hospedagem ||
    overridesManuais.aluguelAparelho
  )
}

function normalizarLinhaRascunho(linha) {
  if (!linha?.data) {
    return null
  }

  const ehTreinamento = Boolean(linha.ehTreinamento)
  const ehProva = Boolean(linha.ehProva)
  const ehHospedagem = Boolean(linha.ehHospedagem)
  const linhaAtualizada = {
    id: linha.id ?? `prestacao-${linha.data}`,
    data: linha.data,
    dia: linha.dia ?? getRotuloDia(linha.data),
    visivel: linha.visivel !== false,
    tipoLinha: inferirTipoLinhaPorMarcacoes({
      ehTreinamento,
      ehProva,
      ehHospedagem,
    }),
    ehTreinamento,
    ehProva,
    ehHospedagem,
    ehAdicionado: Boolean(linha.ehAdicionado),
    overridesManuais: criarOverridesManuais(linha.overridesManuais),
    diarias: normalizarNumero(linha.diarias),
    hospedagem: normalizarNumero(linha.hospedagem),
    aluguelAparelho: normalizarNumero(linha.aluguelAparelho),
  }

  return {
    ...linhaAtualizada,
    totalDia: calcularTotalDia(linhaAtualizada),
  }
}

function normalizarRascunhoPrestacao(rascunho) {
  if (!rascunho || typeof rascunho !== 'object') {
    return null
  }

  const origemProgramacao = rascunho.origemProgramacao
    ? clonarOrigemProgramacao(rascunho.origemProgramacao)
    : null

  if (!origemProgramacao?.grupoId) {
    return null
  }

  return {
    versaoSchema: normalizarNumero(rascunho.versaoSchema) || 1,
    grupoIdProgramacao: rascunho.grupoIdProgramacao ?? origemProgramacao.grupoId,
    origemProgramacao,
    fechamento: {
      diasTreinamento: ordenarDatas(
        rascunho.fechamento?.diasTreinamento ?? origemProgramacao.diasTreinamento,
      ),
      diasEmProva: ordenarDatas(rascunho.fechamento?.diasEmProva ?? origemProgramacao.diasEmProva),
      diasHospedagem: ordenarDatas(
        rascunho.fechamento?.diasHospedagem ?? origemProgramacao.diasHospedagem,
      ),
      diasOcultos: ordenarDatas(rascunho.fechamento?.diasOcultos ?? []),
      diasAdicionados: ordenarDatas(rascunho.fechamento?.diasAdicionados ?? []),
    },
    parametros: {
      ...parametrosPrestacaoIniciais,
      ...(rascunho.parametros ?? {}),
      cidadeEmissao: rascunho.parametros?.cidadeEmissao ?? '',
      dataEmissao: rascunho.parametros?.dataEmissao ?? '',
      presetSelecionado: normalizarPresetSelecionado(
        rascunho.parametros?.presetSelecionado ?? rascunho.presetSelecionado,
      ),
    },
    linhas: Array.isArray(rascunho.linhas)
      ? rascunho.linhas.map(normalizarLinhaRascunho).filter(Boolean)
      : [],
    geradaEm: rascunho.geradaEm ?? '',
    atualizadoEm: rascunho.atualizadoEm ?? '',
  }
}

export function criarLinhasPrestacao(
  origemProgramacao,
  fechamento,
  parametros = parametrosPrestacaoIniciais,
) {
  return getDatasCandidatasPrestacao(origemProgramacao, fechamento).map((data) =>
    aplicarRegrasFinanceirasNaLinha(
      criarLinhaBase(origemProgramacao, fechamento, data),
      null,
      parametros,
      origemProgramacao,
    ),
  )
}

export function sincronizarLinhasComFechamento(
  origemProgramacao,
  fechamento,
  linhasAtuais,
  parametros,
) {
  const linhasPorData = new Map((linhasAtuais ?? []).map((linha) => [linha.data, linha]))

  return getDatasCandidatasPrestacao(origemProgramacao, fechamento).map((data) =>
    aplicarRegrasFinanceirasNaLinha(
      criarLinhaBase(origemProgramacao, fechamento, data),
      linhasPorData.get(data),
      parametros,
      origemProgramacao,
    ),
  )
}

export function recalcularLinhasPrestacao(linhas, parametros, origemProgramacao) {
  return (linhas ?? []).map((linha) =>
    aplicarRegrasFinanceirasNaLinha(
      criarLinhaBaseAPartirDaLinhaAtual(linha),
      linha,
      parametros,
      origemProgramacao,
    ),
  )
}

export function atualizarTotaisDasLinhas(linhas) {
  return (linhas ?? []).map((linha) => {
    const ehTreinamento = Boolean(linha.ehTreinamento)
    const ehProva = Boolean(linha.ehProva)
    const ehHospedagem = Boolean(linha.ehHospedagem)
    const linhaAtualizada = {
      ...linha,
      dia: linha.dia ?? getRotuloDia(linha.data),
      visivel: Boolean(linha.visivel),
      tipoLinha: inferirTipoLinhaPorMarcacoes({
        ehTreinamento,
        ehProva,
        ehHospedagem,
      }),
      ehTreinamento,
      ehProva,
      ehHospedagem,
      ehAdicionado: Boolean(linha.ehAdicionado),
      overridesManuais: criarOverridesManuais(linha.overridesManuais),
      diarias: normalizarNumero(linha.diarias),
      hospedagem: normalizarNumero(linha.hospedagem),
      aluguelAparelho: normalizarNumero(linha.aluguelAparelho),
    }

    return {
      ...linhaAtualizada,
      totalDia: calcularTotalDia(linhaAtualizada),
    }
  })
}

export function calcularResumoFinanceiro(linhas) {
  const linhasVisiveis = linhas.filter((linha) => linha.visivel)
  const subtotalDiarias = linhasVisiveis.reduce(
    (total, linha) => total + normalizarNumero(linha.diarias),
    0,
  )
  const subtotalHospedagem = linhasVisiveis.reduce(
    (total, linha) => total + normalizarNumero(linha.hospedagem),
    0,
  )
  const subtotalAluguelAparelho = linhasVisiveis.reduce(
    (total, linha) => total + normalizarNumero(linha.aluguelAparelho),
    0,
  )
  const totalGeral = subtotalDiarias + subtotalHospedagem + subtotalAluguelAparelho

  return {
    subtotalDiarias,
    subtotalHospedagem,
    subtotalAluguelAparelho,
    totalGeral,
  }
}

export function aplicarPresetPrestacao(parametrosAtuais, presetId) {
  const preset =
    presetsPrestacao.find((item) => item.id === presetId) ??
    presetsPrestacao.find((item) => item.id === parametrosPrestacaoIniciais.presetSelecionado)

  if (!preset) {
    return parametrosAtuais
  }

  return {
    ...parametrosAtuais,
    ...preset.valores,
    presetSelecionado: preset.id,
  }
}

function criarFechamentoInicial(origemProgramacao, fechamentoRascunho = null) {
  return {
    diasTreinamento: ordenarDatas(
      fechamentoRascunho?.diasTreinamento ?? origemProgramacao.diasTreinamento,
    ),
    diasEmProva: ordenarDatas(fechamentoRascunho?.diasEmProva ?? origemProgramacao.diasEmProva),
    diasHospedagem: ordenarDatas(
      fechamentoRascunho?.diasHospedagem ?? origemProgramacao.diasHospedagem,
    ),
    diasOcultos: ordenarDatas(fechamentoRascunho?.diasOcultos ?? []),
    diasAdicionados: ordenarDatas(fechamentoRascunho?.diasAdicionados ?? []),
  }
}

export function criarPrestacaoInicial(programacao, rascunho = null) {
  const rascunhoNormalizado = normalizarRascunhoPrestacao(rascunho)
  const origemProgramacaoAtual = clonarOrigemProgramacao(programacao)
  const origemProgramacao = rascunhoNormalizado?.origemProgramacao ?? origemProgramacaoAtual
  const fechamento = criarFechamentoInicial(origemProgramacao, rascunhoNormalizado?.fechamento)
  const tabelaValores = carregarTabelaValoresPrestacao()
  const parametros = {
    ...parametrosPrestacaoIniciais,
    ...tabelaValores,
    ...(rascunhoNormalizado?.parametros ?? {}),
    cidadeEmissao: rascunhoNormalizado?.parametros?.cidadeEmissao ?? '',
    dataEmissao: rascunhoNormalizado?.parametros?.dataEmissao ?? '',
  }
  const linhas = sincronizarLinhasComFechamento(
    origemProgramacao,
    fechamento,
    rascunhoNormalizado?.linhas ?? [],
    parametros,
  )

  return {
    versaoSchema: STORAGE_VERSAO_ATUAL,
    grupoIdProgramacao: origemProgramacao.grupoId,
    origemProgramacao,
    fechamento,
    parametros,
    linhas,
    geradaEm: rascunhoNormalizado?.geradaEm ?? '',
    atualizadoEm: rascunhoNormalizado?.atualizadoEm ?? '',
    meta: {
      versaoRascunho: rascunhoNormalizado?.versaoSchema ?? STORAGE_VERSAO_ATUAL,
      divergenciasOrigem: rascunhoNormalizado?.origemProgramacao
        ? listarDivergenciasOrigemPrestacao(origemProgramacao, origemProgramacaoAtual)
        : [],
      origemProgramacaoAtual,
    },
  }
}

export function getChaveRascunhoPrestacao(grupoIdProgramacao) {
  return `${STORAGE_PREFIX}${grupoIdProgramacao}`
}

export function carregarRascunhoPrestacao(grupoIdProgramacao) {
  if (!grupoIdProgramacao || typeof window === 'undefined') {
    return null
  }

  const chaves = [
    getChaveRascunhoPrestacao(grupoIdProgramacao),
    ...STORAGE_PREFIXES_LEGADOS.map((prefix) => `${prefix}${grupoIdProgramacao}`),
  ]

  for (const chave of chaves) {
    try {
      const conteudo = window.localStorage.getItem(chave)

      if (!conteudo) {
        continue
      }

      const rascunho = normalizarRascunhoPrestacao(JSON.parse(conteudo))

      if (rascunho) {
        return rascunho
      }
    } catch {
      continue
    }
  }

  return null
}

export function salvarRascunhoPrestacao(grupoIdProgramacao, prestacao) {
  if (!grupoIdProgramacao || typeof window === 'undefined' || !prestacao?.origemProgramacao) {
    return null
  }

  const payload = {
    versaoSchema: STORAGE_VERSAO_ATUAL,
    grupoIdProgramacao: prestacao.grupoIdProgramacao ?? grupoIdProgramacao,
    origemProgramacao: clonarOrigemProgramacao(prestacao.origemProgramacao),
    fechamento: {
      diasTreinamento: ordenarDatas(prestacao.fechamento?.diasTreinamento ?? []),
      diasEmProva: ordenarDatas(prestacao.fechamento?.diasEmProva ?? []),
      diasHospedagem: ordenarDatas(prestacao.fechamento?.diasHospedagem ?? []),
      diasOcultos: ordenarDatas(prestacao.fechamento?.diasOcultos ?? []),
      diasAdicionados: ordenarDatas(prestacao.fechamento?.diasAdicionados ?? []),
    },
    parametros: {
      ...parametrosPrestacaoIniciais,
      ...(prestacao.parametros ?? {}),
      cidadeEmissao: prestacao.parametros?.cidadeEmissao ?? '',
      dataEmissao: prestacao.parametros?.dataEmissao ?? '',
      presetSelecionado: normalizarPresetSelecionado(prestacao.parametros?.presetSelecionado),
    },
    linhas: atualizarTotaisDasLinhas(prestacao.linhas ?? []),
    geradaEm: prestacao.geradaEm ?? '',
    atualizadoEm: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(
      getChaveRascunhoPrestacao(grupoIdProgramacao),
      JSON.stringify(payload),
    )
    STORAGE_PREFIXES_LEGADOS.forEach((prefix) =>
      window.localStorage.removeItem(`${prefix}${grupoIdProgramacao}`),
    )
    return payload
  } catch {
    return null
  }
}
