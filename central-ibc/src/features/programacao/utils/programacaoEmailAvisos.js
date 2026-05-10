import { carregarConfiguracaoInstitucional } from '../../configuracoes/configuracaoInstitucional'
import { registrarLogEmail } from '../../email/utils/emailLogs'
import { sendNewEmail } from '../../email/utils/gmailService'
import { agruparProgramacoesPorGrupo, getRotuloSelecaoProgramacao } from './programacaoUtils'
import { gerarAnexoPdfAgendaMensal } from './programacaoPdf'

const CAMPOS_COMPARACAO = [
  'aluno',
  'email',
  'tipoTreinamento',
  'observacoes',
  'status',
  'aluguelAparelho',
  'diasTreinamento',
  'diasEmProva',
  'diasHospedagem',
]

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function ordenarLista(lista) {
  return Array.isArray(lista) ? [...lista].sort() : []
}

function formatarDataHora(data = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function resumirProgramacao(programacao) {
  return {
    aluno: normalizarTexto(programacao.aluno),
    email: normalizarTexto(programacao.email),
    tipoTreinamento: normalizarTexto(programacao.tipoTreinamento),
    observacoes: normalizarTexto(programacao.observacoes),
    status: normalizarTexto(programacao.status),
    aluguelAparelho: Boolean(programacao.aluguelAparelho),
    diasTreinamento: ordenarLista(programacao.diasTreinamento),
    diasEmProva: ordenarLista(programacao.diasEmProva),
    diasHospedagem: ordenarLista(programacao.diasHospedagem),
  }
}

function assinaturaProgramacao(programacao) {
  return JSON.stringify(resumirProgramacao(programacao))
}

function montarMapaProgramacoes(agendaMensal = []) {
  return new Map(
    agruparProgramacoesPorGrupo(agendaMensal).map((programacao) => [
      programacao.grupoId,
      programacao,
    ]),
  )
}

function formatarListaDatas(datas = []) {
  return ordenarLista(datas).join(', ') || 'nenhuma'
}

function descreverCamposAlterados(antes, depois) {
  const resumoAntes = resumirProgramacao(antes)
  const resumoDepois = resumirProgramacao(depois)

  return CAMPOS_COMPARACAO.filter(
    (campo) => JSON.stringify(resumoAntes[campo]) !== JSON.stringify(resumoDepois[campo]),
  )
}

function formatarBlocoProgramacao(programacao) {
  return [
    getRotuloSelecaoProgramacao(programacao),
    `Treinamento: ${formatarListaDatas(programacao.diasTreinamento)}`,
    `Prova: ${formatarListaDatas(programacao.diasEmProva)}`,
    `Hospedagem: ${formatarListaDatas(programacao.diasHospedagem)}`,
    `Aparelho: ${programacao.aluguelAparelho ? 'sim' : 'nao'}`,
    `Status: ${programacao.status || 'sem status'}`,
  ].join('\n')
}

function adicionarMesesDaProgramacao(meses, programacao) {
  const datas = [
    ...(programacao?.dias || []),
    ...(programacao?.diasTreinamento || []),
    ...(programacao?.diasEmProva || []),
    ...(programacao?.diasHospedagem || []),
  ]

  datas.forEach((data) => {
    const [ano, mes] = String(data).split('-')

    if (ano && mes) {
      meses.add(`${ano}-${mes}`)
    }
  })
}

function obterMesesAfetados(resumo) {
  const meses = new Set()

  resumo.novas.forEach((programacao) => adicionarMesesDaProgramacao(meses, programacao))
  resumo.removidas.forEach((programacao) => adicionarMesesDaProgramacao(meses, programacao))
  resumo.alteradas.forEach((alteracao) => {
    adicionarMesesDaProgramacao(meses, alteracao.antes)
    adicionarMesesDaProgramacao(meses, alteracao.depois)
  })

  return [...meses].sort().slice(0, 3)
}

function montarAnexosAgendaMensal(agendaAtual, mesesAfetados) {
  return mesesAfetados.map((chaveMes) => {
    const [anoTexto, mesTexto] = chaveMes.split('-')
    const ano = Number(anoTexto)
    const mes = Number(mesTexto)
    const agendaDoMes = agendaAtual.find((item) => item.ano === ano && item.mes === mes) ?? {
      ano,
      mes,
      programacoes: [],
    }

    return gerarAnexoPdfAgendaMensal({
      agendaDoMes,
      ano,
      mes,
    })
  })
}

export function criarAssinaturaAgendaProgramacao(agendaMensal = []) {
  return JSON.stringify(
    [...montarMapaProgramacoes(agendaMensal).values()]
      .map((programacao) => ({
        grupoId: programacao.grupoId,
        ...resumirProgramacao(programacao),
      }))
      .sort((a, b) => String(a.grupoId).localeCompare(String(b.grupoId))),
  )
}

export function criarResumoAlteracoesProgramacao(agendaAnterior = [], agendaAtual = []) {
  const anteriores = montarMapaProgramacoes(agendaAnterior)
  const atuais = montarMapaProgramacoes(agendaAtual)
  const novas = []
  const removidas = []
  const alteradas = []

  atuais.forEach((programacaoAtual, grupoId) => {
    const programacaoAnterior = anteriores.get(grupoId)

    if (!programacaoAnterior) {
      novas.push(programacaoAtual)
      return
    }

    if (assinaturaProgramacao(programacaoAnterior) !== assinaturaProgramacao(programacaoAtual)) {
      alteradas.push({
        antes: programacaoAnterior,
        depois: programacaoAtual,
        campos: descreverCamposAlterados(programacaoAnterior, programacaoAtual),
      })
    }
  })

  anteriores.forEach((programacaoAnterior, grupoId) => {
    if (!atuais.has(grupoId)) {
      removidas.push(programacaoAnterior)
    }
  })

  return {
    total: novas.length + alteradas.length + removidas.length,
    novas,
    alteradas,
    removidas,
  }
}

export function montarEmailAlteracaoProgramacao(agendaAnterior = [], agendaAtual = []) {
  const resumo = criarResumoAlteracoesProgramacao(agendaAnterior, agendaAtual)
  const configuracao = carregarConfiguracaoInstitucional()
  const nome = normalizarTexto(configuracao.nomeAvisoProgramacao)
  const saudacao = nome ? `Ola, ${nome}.` : 'Ola.'
  const linhas = [
    saudacao,
    '',
    'A programacao do Sistema IBC foi alterada.',
    '',
    `Resumo: ${resumo.novas.length} nova(s), ${resumo.alteradas.length} alterada(s), ${resumo.removidas.length} removida(s).`,
    `Horario do aviso: ${formatarDataHora()}`,
    '',
  ]

  if (resumo.novas.length > 0) {
    linhas.push('NOVAS PROGRAMACOES')
    resumo.novas.slice(0, 10).forEach((programacao, indice) => {
      linhas.push('', `${indice + 1}. ${formatarBlocoProgramacao(programacao)}`)
    })
    linhas.push('')
  }

  if (resumo.alteradas.length > 0) {
    linhas.push('PROGRAMACOES ALTERADAS')
    resumo.alteradas.slice(0, 10).forEach((alteracao, indice) => {
      linhas.push(
        '',
        `${indice + 1}. ${getRotuloSelecaoProgramacao(alteracao.depois)}`,
        `Campos alterados: ${alteracao.campos.join(', ') || 'dados da programacao'}`,
        '',
        'Antes:',
        formatarBlocoProgramacao(alteracao.antes),
        '',
        'Agora:',
        formatarBlocoProgramacao(alteracao.depois),
      )
    })
    linhas.push('')
  }

  if (resumo.removidas.length > 0) {
    linhas.push('PROGRAMACOES REMOVIDAS')
    resumo.removidas.slice(0, 10).forEach((programacao, indice) => {
      linhas.push('', `${indice + 1}. ${formatarBlocoProgramacao(programacao)}`)
    })
    linhas.push('')
  }

  if (resumo.total > 10) {
    linhas.push(`Obs.: foram encontradas ${resumo.total} alteracoes. Este e-mail mostra as primeiras 10 de cada grupo.`)
    linhas.push('')
  }

  linhas.push('Mensagem automatica do Sistema IBC.')

  return {
    resumo,
    assunto: `Programacao IBC alterada - ${formatarDataHora()}`,
    mensagem: linhas.join('\n'),
  }
}

export async function enviarAvisoAlteracaoProgramacao({ agendaAnterior = [], agendaAtual = [] } = {}) {
  const configuracao = carregarConfiguracaoInstitucional()
  const destinatarioEmail = normalizarTexto(configuracao.emailAvisoProgramacao)
  const { resumo, assunto, mensagem } = montarEmailAlteracaoProgramacao(agendaAnterior, agendaAtual)
  const mesesAfetados = obterMesesAfetados(resumo)

  if (!destinatarioEmail) {
    return {
      enviado: false,
      motivo: 'sem_destinatario',
      resumo,
    }
  }

  if (resumo.total === 0) {
    return {
      enviado: false,
      motivo: 'sem_alteracoes',
      resumo,
    }
  }

  await sendNewEmail({
    destinatarioEmail,
    assunto,
    mensagem,
    anexos: montarAnexosAgendaMensal(agendaAtual, mesesAfetados),
  })
  registrarLogEmail({
    acao: 'Aviso de programacao enviado',
    detalhe: assunto,
    email: destinatarioEmail,
  })

  return {
    enviado: true,
    destinatarioEmail,
    resumo,
  }
}
