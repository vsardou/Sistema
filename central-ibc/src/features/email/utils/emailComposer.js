import { carregarConfiguracaoInstitucional } from '../../configuracoes/configuracaoInstitucional'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function removerAcentos(texto) {
  return normalizarTexto(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function limparTrechoNomeArquivo(texto, fallback = '') {
  const textoNormalizado = removerAcentos(texto)
    .toUpperCase()
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return textoNormalizado || fallback
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
  const tipo = normalizarTexto(tipoDocumento).toLowerCase()
  const nome = normalizarTexto(nomePessoa) || 'aluno'
  const identidadeInstitucional = carregarConfiguracaoInstitucional()

  const corpoPrincipal = tipo.includes('prestação')
    ? `Segue em anexo a prestação de contas referente ao treinamento de ${nome}.`
    : `Segue em anexo a declaração referente ao treinamento de ${nome}.`

  return [
    'Prezados,',
    '',
    corpoPrincipal,
    '',
    'Atenciosamente,',
    identidadeInstitucional.empresa || 'IBC',
  ].join('\n')
}

export function criarNomeArquivoPdf({
  tipoDocumento = '',
  nomePessoa = '',
  subnivel = '',
  data = new Date(),
} = {}) {
  const tipoBase = limparTrechoNomeArquivo(tipoDocumento, 'DOCUMENTO')
  const nomeBase = limparTrechoNomeArquivo(nomePessoa, 'SEM NOME')
  const subnivelBase = limparTrechoNomeArquivo(subnivel)
  const ano = String(data.getFullYear())
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')

  const partes = [tipoBase, nomeBase]

  if (subnivelBase) {
    partes.push(subnivelBase)
  }

  partes.push(`${ano}-${mes}-${dia} ${hora}${minuto}`)

  return `${partes.join(' - ')}.pdf`
}
