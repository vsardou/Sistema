import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

function limparListaTextos(lista) {
  if (!Array.isArray(lista)) {
    return []
  }

  return lista
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function quebrarTextoEmLinhas(doc, texto, larguraMaxima) {
  const valor = typeof texto === 'string' ? texto.trim() : ''

  if (!valor) {
    return []
  }

  return doc.splitTextToSize(valor, larguraMaxima)
}

function adicionarBlocoTexto(doc, linhas, cursorY, configuracao) {
  const {
    margemEsquerda,
    margemInferior,
    alturaPagina,
    alturaLinha = 6,
    tamanhoFonte = 12,
    estiloFonte = 'normal',
  } = configuracao

  doc.setFont('times', estiloFonte)
  doc.setFontSize(tamanhoFonte)

  let y = cursorY

  linhas.forEach((linha) => {
    if (y > alturaPagina - margemInferior) {
      doc.addPage()
      y = configuracao.margemSuperior
      doc.setFont('times', estiloFonte)
      doc.setFontSize(tamanhoFonte)
    }

    doc.text(linha, margemEsquerda, y)
    y += alturaLinha
  })

  return y
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

function criarCanvasPagina(canvasOrigem, yOrigem, alturaOrigem) {
  const canvasPagina = document.createElement('canvas')
  canvasPagina.width = canvasOrigem.width
  canvasPagina.height = alturaOrigem

  const contexto = canvasPagina.getContext('2d')
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, canvasPagina.width, canvasPagina.height)
  contexto.drawImage(
    canvasOrigem,
    0,
    yOrigem,
    canvasOrigem.width,
    alturaOrigem,
    0,
    0,
    canvasOrigem.width,
    alturaOrigem,
  )

  return canvasPagina
}

function aplicarEstilosTextoExportacao(textarea, containerTexto) {
  const estilos = window.getComputedStyle(textarea)

  containerTexto.style.whiteSpace = 'pre-wrap'
  containerTexto.style.wordBreak = 'break-word'
  containerTexto.style.minHeight = estilos.minHeight
  containerTexto.style.fontFamily = estilos.fontFamily
  containerTexto.style.fontSize = estilos.fontSize
  containerTexto.style.fontWeight = estilos.fontWeight
  containerTexto.style.lineHeight = estilos.lineHeight
  containerTexto.style.letterSpacing = estilos.letterSpacing
  containerTexto.style.color = estilos.color
  containerTexto.style.textAlign = estilos.textAlign
  containerTexto.style.padding = '0'
  containerTexto.style.margin = '0'
}

function substituirTextareasPorTextoEstatico(elementoOriginal, clone) {
  const textareasOriginais = elementoOriginal.querySelectorAll('textarea')
  const textareasClone = clone.querySelectorAll('textarea')

  textareasClone.forEach((textareaClone, indice) => {
    const textareaOriginal = textareasOriginais[indice]
    const containerTexto = document.createElement('div')

    aplicarEstilosTextoExportacao(textareaOriginal ?? textareaClone, containerTexto)
    containerTexto.textContent = textareaOriginal?.value ?? textareaClone.value ?? ''
    textareaClone.replaceWith(containerTexto)
  })
}

export function criarCloneDocumentoExportacao({
  seletor = '.ibc-declaracao-documento-print',
  classePortal = 'ibc-declaracao-documento-print-portal',
} = {}) {
  if (typeof document === 'undefined') {
    return null
  }

  const elementoOriginal = document.querySelector(seletor)

  if (!elementoOriginal) {
    return null
  }

  const portal = document.createElement('div')
  portal.className = classePortal
  portal.setAttribute('aria-hidden', 'true')
  portal.style.position = 'fixed'
  portal.style.left = '-20000px'
  portal.style.top = '0'
  portal.style.width = '210mm'
  portal.style.padding = '0'
  portal.style.margin = '0'
  portal.style.background = '#ffffff'
  portal.style.zIndex = '-1'

  const clone = elementoOriginal.cloneNode(true)
  substituirTextareasPorTextoEstatico(elementoOriginal, clone)
  portal.appendChild(clone)
  document.body.appendChild(portal)

  const elementoCaptura =
    clone.querySelector('.ibc-declaracao-documento-surface') ?? clone

  return {
    portal,
    clone,
    elementoCaptura,
    limpar: () => portal.remove(),
  }
}

export async function gerarAnexoPdfVisualBase64({
  nomeArquivo = 'documento.pdf',
  seletor = '.ibc-declaracao-documento-print',
} = {}) {
  if (typeof document === 'undefined') {
    return null
  }

  const cloneExportacao = criarCloneDocumentoExportacao({ seletor })

  if (!cloneExportacao?.elementoCaptura) {
    return null
  }

  const canvas = await html2canvas(cloneExportacao.elementoCaptura, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: cloneExportacao.elementoCaptura.scrollWidth,
    height: cloneExportacao.elementoCaptura.scrollHeight,
    windowWidth: cloneExportacao.elementoCaptura.scrollWidth,
    windowHeight: cloneExportacao.elementoCaptura.scrollHeight,
  })

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  const larguraPagina = doc.internal.pageSize.getWidth()
  const alturaPagina = doc.internal.pageSize.getHeight()
  const alturaCanvasPorPagina = Math.floor((canvas.width * alturaPagina) / larguraPagina)
  let yOrigem = 0
  let pagina = 0

  while (yOrigem < canvas.height) {
    const alturaFatia = Math.min(alturaCanvasPorPagina, canvas.height - yOrigem)
    const canvasPagina = criarCanvasPagina(canvas, yOrigem, alturaFatia)
    const imagem = canvasPagina.toDataURL('image/png')
    const alturaImagemMm = (alturaFatia * larguraPagina) / canvas.width

    if (pagina > 0) {
      doc.addPage()
    }

    doc.addImage(imagem, 'PNG', 0, 0, larguraPagina, alturaImagemMm)
    yOrigem += alturaFatia
    pagina += 1
  }

  const arrayBuffer = doc.output('arraybuffer')
  const base64 = arrayBufferParaBase64(arrayBuffer)
  cloneExportacao.limpar()

  return {
    nomeArquivo,
    mimeType: 'application/pdf',
    base64,
    tamanhoBytes: arrayBuffer.byteLength,
  }
}

export function gerarAnexoPdfBase64({
  nomeArquivo = 'documento.pdf',
  titulo = 'Documento',
  subtitulo = '',
  linhasCabecalho = [],
  paragrafos = [],
  localData = '',
  rodapeLinhas = [],
} = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const margemEsquerda = 20
  const margemDireita = 20
  const margemSuperior = 20
  const margemInferior = 18
  const larguraPagina = doc.internal.pageSize.getWidth()
  const alturaPagina = doc.internal.pageSize.getHeight()
  const larguraTexto = larguraPagina - margemEsquerda - margemDireita
  let y = margemSuperior

  const cabecalho = limparListaTextos(linhasCabecalho)
  const paragrafosLimpos = limparListaTextos(paragrafos)
  const rodape = limparListaTextos(rodapeLinhas)

  if (cabecalho.length > 0) {
    y = adicionarBlocoTexto(doc, cabecalho, y, {
      margemEsquerda,
      margemSuperior,
      margemInferior,
      alturaPagina,
      alturaLinha: 4.5,
      tamanhoFonte: 10,
      estiloFonte: 'normal',
    })
    y += 4
  }

  y = adicionarBlocoTexto(doc, quebrarTextoEmLinhas(doc, titulo, larguraTexto), y, {
    margemEsquerda,
    margemSuperior,
    margemInferior,
    alturaPagina,
    alturaLinha: 7,
    tamanhoFonte: 16,
    estiloFonte: 'bold',
  })

  if (subtitulo) {
    y += 1
    y = adicionarBlocoTexto(doc, quebrarTextoEmLinhas(doc, subtitulo, larguraTexto), y, {
      margemEsquerda,
      margemSuperior,
      margemInferior,
      alturaPagina,
      alturaLinha: 5,
      tamanhoFonte: 11,
      estiloFonte: 'normal',
    })
  }

  y += 6
  paragrafosLimpos.forEach((paragrafo) => {
    y = adicionarBlocoTexto(doc, quebrarTextoEmLinhas(doc, paragrafo, larguraTexto), y, {
      margemEsquerda,
      margemSuperior,
      margemInferior,
      alturaPagina,
      alturaLinha: 6,
      tamanhoFonte: 12,
      estiloFonte: 'normal',
    })
    y += 3
  })

  if (localData) {
    y += 3
    y = adicionarBlocoTexto(doc, quebrarTextoEmLinhas(doc, localData, larguraTexto), y, {
      margemEsquerda,
      margemSuperior,
      margemInferior,
      alturaPagina,
      alturaLinha: 6,
      tamanhoFonte: 12,
      estiloFonte: 'normal',
    })
  }

  if (rodape.length > 0) {
    const yRodape = alturaPagina - margemInferior + 2
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    rodape.forEach((linha, indice) => {
      doc.text(linha, larguraPagina / 2, yRodape + indice * 4, { align: 'center' })
    })
  }

  const arrayBuffer = doc.output('arraybuffer')
  const base64 = arrayBufferParaBase64(arrayBuffer)

  return {
    nomeArquivo,
    mimeType: 'application/pdf',
    base64,
    tamanhoBytes: arrayBuffer.byteLength,
  }
}
