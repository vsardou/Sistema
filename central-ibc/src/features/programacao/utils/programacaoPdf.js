import { jsPDF } from 'jspdf'
import { diasSemana } from '../constants'
import { criarChaveData, formatarDataCurta, formatarMesAno, getInfoMes } from './dateUtils'
import { getContagemPrincipal, getProgramacoesDoDia } from './programacaoUtils'

const CORES = {
  fundo: [248, 244, 235],
  tinta: [31, 41, 55],
  textoSuave: [75, 85, 99],
  borda: [216, 205, 190],
  vermelho: [180, 1, 5],
  vinho: [120, 25, 28],
  branco: [255, 255, 255],
  vazio: [244, 239, 230],
  cancelado: [148, 163, 184],
}

const CORES_TREINAMENTO = {
  emerald: [16, 185, 129],
  sky: [14, 165, 233],
  amber: [245, 158, 11],
  rose: [244, 63, 94],
  violet: [139, 92, 246],
  orange: [249, 115, 22],
  cyan: [6, 182, 212],
  lime: [132, 204, 22],
  pink: [236, 72, 153],
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function primeiroNome(nome) {
  return normalizarTexto(nome).split(/\s+/)[0] || 'Aluno'
}

function setCorTexto(doc, cor) {
  doc.setTextColor(cor[0], cor[1], cor[2])
}

function setCorPreenchimento(doc, cor) {
  doc.setFillColor(cor[0], cor[1], cor[2])
}

function setCorLinha(doc, cor) {
  doc.setDrawColor(cor[0], cor[1], cor[2])
}

function textoLarguraMaxima(doc, texto, larguraMaxima) {
  const valor = normalizarTexto(texto)

  if (!valor) {
    return ''
  }

  if (doc.getTextWidth(valor) <= larguraMaxima) {
    return valor
  }

  let cortado = valor

  while (cortado.length > 4 && doc.getTextWidth(`${cortado}...`) > larguraMaxima) {
    cortado = cortado.slice(0, -1)
  }

  return `${cortado.trim()}...`
}

function tagsDoDia(programacao, data) {
  const tags = []

  if (programacao.diasTreinamento?.includes(data)) {
    tags.push('T')
  }

  if (programacao.diasEmProva?.includes(data)) {
    tags.push('P')
  }

  if (programacao.diasHospedagem?.includes(data)) {
    tags.push('H')
  }

  return tags.length > 0 ? tags : ['T']
}

function descricaoTagsDoDia(programacao, data) {
  const descricoes = []

  if (programacao.diasTreinamento?.includes(data)) {
    descricoes.push('treinamento')
  }

  if (programacao.diasEmProva?.includes(data)) {
    descricoes.push(programacao.aluguelAparelho ? 'prova com aparelho' : 'prova')
  }

  if (programacao.diasHospedagem?.includes(data)) {
    descricoes.push('hospedagem')
  }

  return descricoes.length > 0 ? descricoes.join(', ') : 'treinamento'
}

function corProgramacao(programacao) {
  if (programacao.status === 'cancelado') {
    return CORES.cancelado
  }

  return CORES_TREINAMENTO[programacao.cor] ?? CORES_TREINAMENTO.emerald
}

function montarDiasCalendario({ agendaDoMes, ano, mes }) {
  const { totalDias, deslocamentoInicial } = getInfoMes(ano, mes)
  const dias = []

  for (let indice = 0; indice < deslocamentoInicial; indice += 1) {
    dias.push({ key: `vazio-inicio-${indice}`, vazio: true })
  }

  for (let dia = 1; dia <= totalDias; dia += 1) {
    const data = criarChaveData(ano, mes, dia)
    const programacoes = getProgramacoesDoDia(agendaDoMes.programacoes, data)

    dias.push({
      key: data,
      vazio: false,
      data,
      dia,
      programacoes,
    })
  }

  const espacosFinais = (7 - (dias.length % 7)) % 7

  for (let indice = 0; indice < espacosFinais; indice += 1) {
    dias.push({ key: `vazio-fim-${indice}`, vazio: true })
  }

  while (dias.length < 42) {
    dias.push({ key: `vazio-extra-${dias.length}`, vazio: true })
  }

  return dias.slice(0, 42)
}

function resumoDoMes(agendaDoMes) {
  const diasOcupados = new Set()
  const programacoesAtivas = agendaDoMes.programacoes.filter((item) => item.status !== 'cancelado')
  const programacoesCanceladas = agendaDoMes.programacoes.filter(
    (item) => item.status === 'cancelado',
  )

  programacoesAtivas.forEach((programacao) => {
    programacao.dias?.forEach((data) => diasOcupados.add(data))
  })

  return {
    diasOcupados: diasOcupados.size,
    ativos: programacoesAtivas.length,
    cancelados: programacoesCanceladas.length,
  }
}

function desenharCabecalho(doc, { mes, ano, emitidoEm, resumo }) {
  const largura = doc.internal.pageSize.getWidth()

  setCorPreenchimento(doc, CORES.fundo)
  doc.rect(0, 0, largura, doc.internal.pageSize.getHeight(), 'F')
  setCorPreenchimento(doc, CORES.tinta)
  doc.roundedRect(10, 9, largura - 20, 24, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  setCorTexto(doc, CORES.branco)
  doc.text(`Agenda mensal - ${formatarMesAno(mes, ano)}`, 16, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Emitido em ${emitidoEm}`, largura - 16, 17, { align: 'right' })
  doc.text('Visual para conferencia rapida da programacao IBC', largura - 16, 24, {
    align: 'right',
  })

  const cards = [
    ['Dias ocupados', resumo.diasOcupados],
    ['Treinamentos ativos', resumo.ativos],
    ['Cancelados', resumo.cancelados],
  ]

  cards.forEach(([rotulo, valor], indice) => {
    const x = 10 + indice * 47
    setCorPreenchimento(doc, CORES.branco)
    setCorLinha(doc, CORES.borda)
    doc.roundedRect(x, 36, 42, 13, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    setCorTexto(doc, CORES.textoSuave)
    doc.text(rotulo.toUpperCase(), x + 4, 41)
    doc.setFontSize(11)
    setCorTexto(doc, CORES.tinta)
    doc.text(String(valor), x + 4, 47)
  })

  setCorTexto(doc, CORES.textoSuave)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Legenda: T treinamento | P prova/aparelho | H hospedagem', largura - 10, 45, {
    align: 'right',
  })
}

function desenharCalendario(doc, diasCalendario) {
  const margem = 10
  const larguraPagina = doc.internal.pageSize.getWidth()
  const xInicial = margem
  const yInicial = 55
  const larguraCelula = (larguraPagina - margem * 2) / 7
  const alturaDiaSemana = 8
  const alturaCelula = 23.8
  const raio = 2.4

  diasSemana.forEach((diaSemana, indice) => {
    const x = xInicial + indice * larguraCelula
    setCorPreenchimento(doc, indice >= 5 ? CORES.vinho : CORES.vermelho)
    doc.roundedRect(x + 0.8, yInicial, larguraCelula - 1.6, alturaDiaSemana, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    setCorTexto(doc, CORES.branco)
    doc.text(diaSemana.toUpperCase(), x + larguraCelula / 2, yInicial + 5.2, { align: 'center' })
  })

  diasCalendario.forEach((dia, indice) => {
    const coluna = indice % 7
    const linha = Math.floor(indice / 7)
    const x = xInicial + coluna * larguraCelula
    const y = yInicial + alturaDiaSemana + 2 + linha * alturaCelula

    if (dia.vazio) {
      setCorPreenchimento(doc, CORES.vazio)
      setCorLinha(doc, CORES.borda)
      doc.roundedRect(x + 0.8, y, larguraCelula - 1.6, alturaCelula - 1.4, raio, raio, 'FD')
      return
    }

    const totalAtivos = getContagemPrincipal(dia.programacoes)
    setCorPreenchimento(doc, CORES.branco)
    setCorLinha(doc, CORES.borda)
    doc.roundedRect(x + 0.8, y, larguraCelula - 1.6, alturaCelula - 1.4, raio, raio, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    setCorTexto(doc, CORES.tinta)
    doc.text(String(dia.dia), x + 3.2, y + 5.8)

    doc.setFontSize(6.4)
    setCorTexto(doc, CORES.textoSuave)
    doc.text(totalAtivos ? `${totalAtivos} aluno(s)` : 'livre', x + larguraCelula - 3, y + 5.5, {
      align: 'right',
    })

    const itensVisiveis = dia.programacoes.slice(0, 3)
    let itemY = y + 10

    itensVisiveis.forEach((programacao) => {
      const cor = corProgramacao(programacao)
      const texto = `${primeiroNome(programacao.aluno)} ${tagsDoDia(programacao, dia.data).join('/')}`
      const textoCurto = textoLarguraMaxima(doc, texto, larguraCelula - 10)

      setCorPreenchimento(doc, cor)
      doc.roundedRect(x + 3, itemY - 2.5, 3.2, 3.2, 1, 1, 'F')
      doc.setFont('helvetica', programacao.status === 'cancelado' ? 'italic' : 'normal')
      doc.setFontSize(7)
      setCorTexto(doc, programacao.status === 'cancelado' ? CORES.textoSuave : CORES.tinta)
      doc.text(textoCurto, x + 7.6, itemY)
      itemY += 4.2
    })

    if (dia.programacoes.length > itensVisiveis.length) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.7)
      setCorTexto(doc, CORES.vermelho)
      doc.text(
        `+ ${dia.programacoes.length - itensVisiveis.length} no detalhe`,
        x + 3,
        y + alturaCelula - 4.3,
      )
    }
  })
}

function criarPaginaDetalhe(doc, { mes, ano, pagina }) {
  doc.addPage('a4', 'portrait')
  const largura = doc.internal.pageSize.getWidth()

  setCorPreenchimento(doc, CORES.fundo)
  doc.rect(0, 0, largura, doc.internal.pageSize.getHeight(), 'F')
  setCorPreenchimento(doc, CORES.tinta)
  doc.roundedRect(12, 10, largura - 24, 19, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setCorTexto(doc, CORES.branco)
  doc.text(`Detalhamento - ${formatarMesAno(mes, ano)}`, 18, 22)
  doc.setFontSize(8)
  doc.text(`Pagina ${pagina}`, largura - 18, 22, { align: 'right' })

  return 39
}

function garantirEspacoDetalhe(doc, contexto, y, alturaNecessaria) {
  const alturaPagina = doc.internal.pageSize.getHeight()

  if (y + alturaNecessaria <= alturaPagina - 16) {
    return y
  }

  contexto.pagina += 1
  return criarPaginaDetalhe(doc, contexto)
}

function desenharDetalhamento(doc, { diasCalendario, mes, ano }) {
  const diasComProgramacao = diasCalendario.filter((dia) => !dia.vazio && dia.programacoes.length > 0)

  if (diasComProgramacao.length === 0) {
    return
  }

  const contexto = { mes, ano, pagina: 2 }
  let y = criarPaginaDetalhe(doc, contexto)
  const margemX = 14
  const larguraTexto = doc.internal.pageSize.getWidth() - margemX * 2

  diasComProgramacao.forEach((dia) => {
    const alturaCabecalhoDia = 10
    y = garantirEspacoDetalhe(doc, contexto, y, alturaCabecalhoDia + 8)
    setCorPreenchimento(doc, CORES.branco)
    setCorLinha(doc, CORES.borda)
    doc.roundedRect(margemX, y - 5.5, larguraTexto, 9, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    setCorTexto(doc, CORES.vermelho)
    doc.text(formatarDataCurta(dia.data), margemX + 4, y)
    doc.setFontSize(8)
    setCorTexto(doc, CORES.textoSuave)
    doc.text(`${dia.programacoes.length} item(ns)`, margemX + larguraTexto - 4, y, {
      align: 'right',
    })
    y += 8

    dia.programacoes.forEach((programacao) => {
      const linhaPrincipal = `${normalizarTexto(programacao.aluno) || 'Aluno sem nome'} | ${
        normalizarTexto(programacao.tipoTreinamento) || 'Treinamento'
      } | ${descricaoTagsDoDia(programacao, dia.data)}`
      const complemento = [
        programacao.status === 'cancelado' ? 'Status: cancelado' : '',
        normalizarTexto(programacao.observacoes)
          ? `Obs.: ${normalizarTexto(programacao.observacoes)}`
          : '',
      ].filter(Boolean)
      const linhas = [
        ...doc.splitTextToSize(linhaPrincipal, larguraTexto - 16),
        ...complemento.flatMap((item) => doc.splitTextToSize(item, larguraTexto - 16)),
      ]
      const altura = Math.max(10, linhas.length * 4.2 + 5)

      y = garantirEspacoDetalhe(doc, contexto, y, altura + 2)
      const cor = corProgramacao(programacao)
      setCorPreenchimento(doc, CORES.branco)
      setCorLinha(doc, CORES.borda)
      doc.roundedRect(margemX + 4, y - 5, larguraTexto - 8, altura, 2, 2, 'FD')
      setCorPreenchimento(doc, cor)
      doc.roundedRect(margemX + 7, y - 1.8, 3.5, 3.5, 1, 1, 'F')
      doc.setFont('helvetica', programacao.status === 'cancelado' ? 'italic' : 'normal')
      doc.setFontSize(8.5)
      setCorTexto(doc, CORES.tinta)
      linhas.forEach((linha, indice) => {
        doc.text(linha, margemX + 13, y + indice * 4.2)
      })
      y += altura + 3
    })

    y += 2
  })
}

function nomeArquivoAgenda(mes, ano) {
  return `agenda-ibc-${ano}-${String(mes).padStart(2, '0')}.pdf`
}

function arrayBufferParaBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const tamanhoChunk = 0x8000
  let binario = ''

  for (let indice = 0; indice < bytes.length; indice += tamanhoChunk) {
    const chunk = bytes.subarray(indice, indice + tamanhoChunk)
    binario += String.fromCharCode(...chunk)
  }

  return btoa(binario)
}

export function gerarPdfAgendaMensal({
  agendaDoMes,
  mes,
  ano,
  emitidoEm = new Date(),
} = {}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })
  const diasCalendario = montarDiasCalendario({ agendaDoMes, ano, mes })
  const resumo = resumoDoMes(agendaDoMes)
  const emitidoEmFormatado = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(emitidoEm)

  desenharCabecalho(doc, {
    mes,
    ano,
    emitidoEm: emitidoEmFormatado,
    resumo,
  })
  desenharCalendario(doc, diasCalendario)
  desenharDetalhamento(doc, { diasCalendario, mes, ano })

  return {
    doc,
    nomeArquivo: nomeArquivoAgenda(mes, ano),
  }
}

export function abrirPdfAgendaMensal(opcoes = {}) {
  if (typeof window === 'undefined') {
    throw new Error('PDF disponivel apenas no navegador/aplicativo.')
  }

  const { doc, nomeArquivo } = gerarPdfAgendaMensal(opcoes)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const janela = window.open(url, '_blank', 'noopener,noreferrer')

  window.setTimeout(() => URL.revokeObjectURL(url), 60000)

  if (!janela) {
    doc.save(nomeArquivo)
  }

  return nomeArquivo
}

export function gerarAnexoPdfAgendaMensal(opcoes = {}) {
  const { doc, nomeArquivo } = gerarPdfAgendaMensal(opcoes)
  const arrayBuffer = doc.output('arraybuffer')

  return {
    nomeArquivo,
    mimeType: 'application/pdf',
    base64: arrayBufferParaBase64(arrayBuffer),
    tamanhoBytes: arrayBuffer.byteLength,
  }
}
