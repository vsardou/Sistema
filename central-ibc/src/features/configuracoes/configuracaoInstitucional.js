import { identidadeInstitucionalIbc } from '../../domain/institucional/constantesInstitucionais'

const STORAGE_CHAVE_INSTITUCIONAL = 'ibc.configuracao.institucional.v1'
const WEBMAIL_URL_PADRAO = 'https://mail.google.com/'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function normalizarTextoComFallback(valor, fallback) {
  return normalizarTexto(valor) || fallback
}

function normalizarRodapeLinhas(linhas) {
  const linhasOriginais =
    Array.isArray(linhas) && linhas.length > 0 ? linhas : identidadeInstitucionalIbc.rodapeLinhas

  return identidadeInstitucionalIbc.rodapeLinhas.map(
    (linhaPadrao, indice) => normalizarTexto(linhasOriginais[indice]) || linhaPadrao,
  )
}

function normalizarAssinaturas(assinaturas) {
  const assinaturasEntrada = Array.isArray(assinaturas) ? assinaturas : []

  return identidadeInstitucionalIbc.assinaturasV1.map((assinaturaPadrao, indice) => {
    const assinaturaEntrada =
      assinaturasEntrada.find((assinatura) => assinatura?.id === assinaturaPadrao.id) ??
      assinaturasEntrada[indice] ??
      {}

    return {
      id: assinaturaPadrao.id,
      nome: normalizarTextoComFallback(assinaturaEntrada.nome, assinaturaPadrao.nome),
      cargo: normalizarTextoComFallback(assinaturaEntrada.cargo, assinaturaPadrao.cargo),
      imagem: normalizarTextoComFallback(assinaturaEntrada.imagem, assinaturaPadrao.imagem),
    }
  })
}

function getLinhaCidadeBlocoInstitucional(empresa, cnpj, cidadePadraoTreinamento) {
  const usaCidadePadrao =
    empresa === identidadeInstitucionalIbc.empresa &&
    cnpj === identidadeInstitucionalIbc.cnpj &&
    cidadePadraoTreinamento === identidadeInstitucionalIbc.cidadePadraoTreinamento

  return usaCidadePadrao
    ? identidadeInstitucionalIbc.blocoInstitucional[2]
    : cidadePadraoTreinamento
}

export function criarConfiguracaoInstitucionalInicial(configuracao = {}) {
  const supervisorEntrada = configuracao.supervisor ?? {}
  const supervisor = {
    nome: normalizarTextoComFallback(
      supervisorEntrada.nome ?? configuracao.supervisorNome,
      identidadeInstitucionalIbc.supervisor.nome,
    ),
    cpf: normalizarTextoComFallback(
      supervisorEntrada.cpf ?? configuracao.supervisorCpf,
      identidadeInstitucionalIbc.supervisor.cpf,
    ),
    snqc: normalizarTextoComFallback(
      supervisorEntrada.snqc ?? configuracao.supervisorSnqc,
      identidadeInstitucionalIbc.supervisor.snqc,
    ),
    qualificacoes: normalizarTextoComFallback(
      supervisorEntrada.qualificacoes ?? configuracao.supervisorQualificacoes,
      identidadeInstitucionalIbc.supervisor.qualificacoes,
    ),
  }
  const empresa = normalizarTextoComFallback(configuracao.empresa, identidadeInstitucionalIbc.empresa)
  const cnpj = normalizarTextoComFallback(configuracao.cnpj, identidadeInstitucionalIbc.cnpj)
  const cidadePadraoTreinamento = normalizarTextoComFallback(
    configuracao.cidadePadraoTreinamento,
    identidadeInstitucionalIbc.cidadePadraoTreinamento,
  )
  const rodapeLinhas = normalizarRodapeLinhas(configuracao.rodapeLinhas)
  const assinaturas = normalizarAssinaturas(configuracao.assinaturas ?? configuracao.assinaturasV1)
  const webmailUrl = normalizarTextoComFallback(configuracao.webmailUrl, WEBMAIL_URL_PADRAO)
  const emailAvisoProgramacao = normalizarTexto(configuracao.emailAvisoProgramacao)
  const nomeAvisoProgramacao = normalizarTexto(configuracao.nomeAvisoProgramacao)

  return {
    versao: 1,
    empresa,
    cnpj,
    cidadePadraoTreinamento,
    supervisor,
    supervisorNome: supervisor.nome,
    supervisorCpf: supervisor.cpf,
    supervisorSnqc: supervisor.snqc,
    supervisorQualificacoes: supervisor.qualificacoes,
    blocoInstitucional: [
      empresa,
      `CNPJ ${cnpj}`,
      getLinhaCidadeBlocoInstitucional(empresa, cnpj, cidadePadraoTreinamento),
    ],
    rodapeLinhas,
    rodape: rodapeLinhas.join(' | '),
    webmailUrl,
    emailAvisoProgramacao,
    nomeAvisoProgramacao,
    assinaturas,
    assinaturasV1: assinaturas,
    atualizadoEm: normalizarTexto(configuracao.atualizadoEm),
  }
}

export function getConfiguracaoInstitucionalPadrao() {
  return criarConfiguracaoInstitucionalInicial(identidadeInstitucionalIbc)
}

export function carregarConfiguracaoInstitucional() {
  if (typeof window === 'undefined') {
    return getConfiguracaoInstitucionalPadrao()
  }

  try {
    const conteudo = window.localStorage.getItem(STORAGE_CHAVE_INSTITUCIONAL)
    return criarConfiguracaoInstitucionalInicial(conteudo ? JSON.parse(conteudo) : {})
  } catch {
    return getConfiguracaoInstitucionalPadrao()
  }
}

export function salvarConfiguracaoInstitucional(configuracao) {
  const configuracaoNormalizada = criarConfiguracaoInstitucionalInicial({
    ...configuracao,
    atualizadoEm: new Date().toISOString(),
  })

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      STORAGE_CHAVE_INSTITUCIONAL,
      JSON.stringify(configuracaoNormalizada),
    )
  }

  return configuracaoNormalizada
}

export function carregarCamposInstitucionaisDeclaracao() {
  const configuracao = carregarConfiguracaoInstitucional()

  return {
    empresa: configuracao.empresa,
    cnpj: configuracao.cnpj,
    cidadePadraoTreinamento: configuracao.cidadePadraoTreinamento,
    supervisorNome: configuracao.supervisor.nome,
    supervisorCpf: configuracao.supervisor.cpf,
    supervisorSnqc: configuracao.supervisor.snqc,
    supervisorQualificacoes: configuracao.supervisor.qualificacoes,
    blocoInstitucional: configuracao.blocoInstitucional,
    rodape: configuracao.rodape,
    rodapeLinhas: configuracao.rodapeLinhas,
    webmailUrl: configuracao.webmailUrl,
    emailAvisoProgramacao: configuracao.emailAvisoProgramacao,
    nomeAvisoProgramacao: configuracao.nomeAvisoProgramacao,
    assinaturas: configuracao.assinaturas,
  }
}
