import { carregarConfiguracaoInstitucional } from '../../configuracoes/configuracaoInstitucional'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function removerAcentos(texto) {
  return normalizarTexto(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function slugificar(texto) {
  const textoNormalizado = removerAcentos(texto).toUpperCase()

  if (!textoNormalizado) {
    return ''
  }

  return textoNormalizado
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+/g, '')
    .replace(/_+$/g, '')
}

export function normalizarEmail(valor) {
  return normalizarTexto(valor).toLowerCase()
}

export function validarEmailBasico(valor) {
  const email = normalizarEmail(valor)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function criarAssuntoSugeridoEmail({ tipoDocumento = '', nomePessoa = '' } = {}) {
  const tipo = normalizarTexto(tipoDocumento) || 'Documento'
  const nome = normalizarTexto(nomePessoa)
  return nome ? `${tipo} - ${nome}` : tipo
}

export function criarMensagemSugeridaEmail({ tipoDocumento = '', nomePessoa = '' } = {}) {
  const tipo = normalizarTexto(tipoDocumento) || 'documento'
  const nome = normalizarTexto(nomePessoa)
  const saudacao = nome ? `Ola, ${nome}.` : 'Ola,'
  const identidadeInstitucional = carregarConfiguracaoInstitucional()
  const [endereco, telefone, celular, email, site] = identidadeInstitucional.rodapeLinhas

  return [
    saudacao,
    '',
    `Segue em anexo o ${tipo} solicitado.`,
    '',
    'Qualquer ajuste, estamos a disposicao.',
    '',
    'Atenciosamente,',
    identidadeInstitucional.empresa,
    telefone,
    celular,
    email,
    site,
    endereco,
  ].join('\n')
}

export function criarNomeArquivoPdf({ tipoDocumento = '', nomePessoa = '', data = new Date() } = {}) {
  const tipoSlug = slugificar(tipoDocumento) || 'DOCUMENTO'
  const nomeSlug = slugificar(nomePessoa) || 'SEM_NOME'
  const ano = String(data.getFullYear())
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${tipoSlug}_${nomeSlug}_${ano}-${mes}-${dia}.pdf`
}
