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

export async function gerarAnexoPdfVisualBase64({
  nomeArquivo = 'documento.pdf',
  seletor = '.ibc-declaracao-documento-surface',
} = {}) {
  if (typeof document === 'undefined') {
    return null
  }

  const elemento = document.querySelector(seletor)

  if (!elemento) {
    return null
  }

  const canvas = await html2canvas(elemento, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
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
