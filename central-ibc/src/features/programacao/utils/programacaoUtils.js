import {
  TOTAL_APARELHOS_DISPONIVEIS,
  TOTAL_VAGAS_HOSPEDAGEM,
  coresAutomaticas,
} from '../constants'
import { criarDiasDerivadosTreinamento } from '../../../domain/treinamento/contratoTreinamento'
import { formatarDataCurta, getDatasDoMes, ordenarDatas } from './dateUtils'
import { normalizarTreinamentoProgramacao } from './programacaoNormalization'

export function getMesInicial(agendaMensal) {
  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()
  const mesExiste = agendaMensal.some((item) => item.mes === mesAtual && item.ano === anoAtual)

  if (mesExiste) {
    return { mes: mesAtual, ano: anoAtual }
  }

  return {
    mes: agendaMensal[0]?.mes ?? mesAtual,
    ano: agendaMensal[0]?.ano ?? anoAtual,
  }
}

export function getProgramacoesDoDia(programacoes, data) {
  return programacoes.filter((item) => item.dias.includes(data))
}

export function getContagemPrincipal(programacoes) {
  return programacoes.filter((item) => item.status !== 'cancelado').length
}

export function getCorAutomatica(chave) {
  const base = (chave || 'treinamento').trim().toLowerCase()
  let hash = 5381

  for (let indice = 0; indice < base.length; indice += 1) {
    hash = (hash * 33 + base.charCodeAt(indice)) >>> 0
  }

  return coresAutomaticas[hash % coresAutomaticas.length]
}

export function normalizarProgramacao(programacao) {
  return normalizarTreinamentoProgramacao(programacao)
}

function formatarQuantidadeSelecao(quantidade, singular, plural) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

export function getRotuloSelecaoProgramacao(programacaoBruta) {
  const programacao = normalizarProgramacao(programacaoBruta)
  const periodo =
    programacao.dataInicial === programacao.dataFinal
      ? formatarDataCurta(programacao.dataInicial)
      : `${formatarDataCurta(programacao.dataInicial)} a ${formatarDataCurta(programacao.dataFinal)}`
  const detalhes = [
    formatarQuantidadeSelecao(programacao.diasTreinamento.length, 'dia', 'dias'),
  ]

  if (programacao.diasEmProva.length > 0) {
    detalhes.push(
      formatarQuantidadeSelecao(programacao.diasEmProva.length, 'prova', 'provas'),
    )
  }

  if (programacao.diasHospedagem.length > 0) {
    detalhes.push(
      formatarQuantidadeSelecao(
        programacao.diasHospedagem.length,
        'hospedagem',
        'hospedagens',
      ),
    )
  }

  if (programacao.status === 'cancelado') {
    detalhes.push('cancelado')
  }

  if (programacao.status === 'concluido') {
    detalhes.push('concluido')
  }

  return `${programacao.aluno || 'Aluno sem nome'} | ${programacao.tipoTreinamento || 'Sem tipo'} | ${periodo} | ${detalhes.join(' | ')}`
}

export function normalizarAgendaMensal(agendaMensal) {
  return agendaMensal.map((mesItem) => ({
    ...mesItem,
    programacoes: mesItem.programacoes.map((programacao) => normalizarProgramacao(programacao)),
  }))
}

export function agruparProgramacoesPorGrupo(agendaMensal) {
  const mapa = new Map()
  const agendaOrdenada = [...agendaMensal].sort((a, b) => a.ano - b.ano || a.mes - b.mes)

  agendaOrdenada.forEach((mesItem) => {
    mesItem.programacoes.forEach((programacaoBruta) => {
      const programacao = normalizarProgramacao(programacaoBruta)
      const existente = mapa.get(programacao.grupoId)

      if (existente) {
        existente.dias.push(...programacao.dias)
        existente.diasTreinamento.push(...programacao.diasTreinamento)
        existente.diasEmProva.push(...programacao.diasEmProva)
        existente.diasHospedagem.push(...programacao.diasHospedagem)
        existente.segmentos.push(programacao)
        return
      }

      mapa.set(programacao.grupoId, {
        ...programacao,
        dias: [...programacao.dias],
        diasTreinamento: [...programacao.diasTreinamento],
        diasEmProva: [...programacao.diasEmProva],
        diasHospedagem: [...programacao.diasHospedagem],
        segmentos: [programacao],
      })
    })
  })

  return [...mapa.values()].map((item) => normalizarProgramacao(item))
}

export function removerProgramacaoGrupo(agendaMensal, grupoId) {
  return agendaMensal.map((mesItem) => ({
    ...mesItem,
    programacoes: mesItem.programacoes.filter((programacao) => programacao.grupoId !== grupoId),
  }))
}

export function atualizarStatusGrupo(agendaMensal, grupoId, novoStatus) {
  return agendaMensal.map((mesItem) => ({
    ...mesItem,
    programacoes: mesItem.programacoes.map((programacao) =>
      programacao.grupoId === grupoId ? { ...programacao, status: novoStatus } : programacao,
    ),
  }))
}

export function salvarProgramacaoAgrupada(agendaMensal, programacaoBase) {
  const programacaoNormalizada = normalizarProgramacao(programacaoBase)
  const dias = ordenarDatas(programacaoNormalizada.dias)

  if (dias.length === 0) {
    return agendaMensal
  }

  const agendaSemGrupo = removerProgramacaoGrupo(agendaMensal, programacaoNormalizada.grupoId)
  const agendaAtualizada = agendaSemGrupo.map((item) => ({
    ...item,
    programacoes: [...item.programacoes],
  }))

  const diasPorMes = dias.reduce((acumulado, data) => {
    const [ano, mes] = data.split('-')
    const chave = `${ano}-${mes}`

    if (!acumulado.has(chave)) {
      acumulado.set(chave, [])
    }

    acumulado.get(chave).push(data)
    return acumulado
  }, new Map())

  for (const chave of diasPorMes.keys()) {
    const [anoTexto, mesTexto] = chave.split('-')
    const ano = Number(anoTexto)
    const mes = Number(mesTexto)
    const indiceMes = agendaAtualizada.findIndex((item) => item.mes === mes && item.ano === ano)
    const diasTreinamento = getDatasDoMes(programacaoNormalizada.diasTreinamento, ano, mes)
    const diasEmProva = getDatasDoMes(programacaoNormalizada.diasEmProva, ano, mes)
    const diasHospedagem = getDatasDoMes(programacaoNormalizada.diasHospedagem, ano, mes)
    const segmento = {
      ...programacaoNormalizada,
      id: `${programacaoNormalizada.grupoId}-${ano}-${mes}`,
      dias: criarDiasDerivadosTreinamento({
        diasTreinamento,
        diasEmProva,
        diasHospedagem,
      }),
      diasTreinamento,
      diasEmProva,
      diasHospedagem,
    }

    if (indiceMes >= 0) {
      agendaAtualizada[indiceMes] = {
        ...agendaAtualizada[indiceMes],
        programacoes: [segmento, ...agendaAtualizada[indiceMes].programacoes],
      }
      continue
    }

    agendaAtualizada.push({
      mes,
      ano,
      programacoes: [segmento],
    })
  }

  return agendaAtualizada.sort((a, b) => a.ano - b.ano || a.mes - b.mes)
}

export function criarFormularioInicial(dataBase = '') {
  return {
    nomeAluno: '',
    emailAluno: '',
    tipoTreinamento: '',
    observacoes: '',
    diasSelecionados: dataBase ? [dataBase] : [],
    aluguelAparelho: false,
    diasEmProvaSelecionados: [],
    diasHospedagemSelecionados: [],
    modoSelecaoCalendario: 'treinamento',
  }
}

export function criarFormularioEdicao(programacaoBruta) {
  const programacao = normalizarProgramacao(programacaoBruta)

  return {
    nomeAluno: programacao.aluno,
    emailAluno: programacao.email ?? '',
    tipoTreinamento: programacao.tipoTreinamento,
    observacoes: programacao.observacoes,
    diasSelecionados: [...programacao.diasTreinamento],
    aluguelAparelho: programacao.aluguelAparelho,
    diasEmProvaSelecionados: [...programacao.diasEmProva],
    diasHospedagemSelecionados: [...programacao.diasHospedagem],
    modoSelecaoCalendario: 'treinamento',
  }
}

function calcularResumoDatasDoMes(datasPorProgramacao, capacidadeDisponivel) {
  const consumoPorDia = new Map()

  datasPorProgramacao.forEach((datas) => {
    datas.forEach((data) => {
      consumoPorDia.set(data, (consumoPorDia.get(data) ?? 0) + 1)
    })
  })

  const consumoOrdenado = [...consumoPorDia.entries()].sort(([a], [b]) => a.localeCompare(b))
  const picoUso = consumoOrdenado.reduce(
    (maiorConsumo, [, quantidade]) => Math.max(maiorConsumo, quantidade),
    0,
  )
  const diasInsuficientes = consumoOrdenado
    .filter(([, quantidade]) => quantidade > capacidadeDisponivel)
    .map(([data, quantidade]) => ({ data, quantidade }))

  return {
    picoUso,
    totalDiasComUso: consumoOrdenado.length,
    diasInsuficientes,
  }
}

export function calcularResumoAparelhosDoMes(
  programacoes,
  estoqueDisponivel = TOTAL_APARELHOS_DISPONIVEIS,
) {
  const datasPorProgramacao = programacoes
    .filter((programacao) => programacao.status !== 'cancelado' && programacao.aluguelAparelho)
    .map((programacao) => programacao.diasEmProva)
  const resumo = calcularResumoDatasDoMes(datasPorProgramacao, estoqueDisponivel)

  return {
    estoqueDisponivel,
    picoUso: resumo.picoUso,
    totalDiasComReserva: resumo.totalDiasComUso,
    diasInsuficientes: resumo.diasInsuficientes,
  }
}

export function calcularResumoHospedagemDoMes(
  programacoes,
  vagasDisponiveis = TOTAL_VAGAS_HOSPEDAGEM,
) {
  const datasPorProgramacao = programacoes
    .filter((programacao) => programacao.status !== 'cancelado')
    .map((programacao) => programacao.diasHospedagem)
    .filter((datas) => datas.length > 0)
  const resumo = calcularResumoDatasDoMes(datasPorProgramacao, vagasDisponiveis)

  return {
    vagasDisponiveis,
    picoOcupacao: resumo.picoUso,
    totalDiasComHospedagem: resumo.totalDiasComUso,
    diasInsuficientes: resumo.diasInsuficientes,
  }
}
