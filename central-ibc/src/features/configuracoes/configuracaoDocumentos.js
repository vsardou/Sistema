const STORAGE_CHAVE_DOCUMENTOS = 'ibc.configuracao.documentos.v1'
const HORAS_POR_DIA_DECLARACAO_PADRAO = 8

function normalizarNumeroPositivo(valor, fallback) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero <= 0) {
    return fallback
  }

  return numero
}

export function criarConfiguracaoDocumentosInicial(configuracao = {}) {
  return {
    versao: 1,
    horasPorDiaDeclaracao: normalizarNumeroPositivo(
      configuracao.horasPorDiaDeclaracao,
      HORAS_POR_DIA_DECLARACAO_PADRAO,
    ),
    atualizadoEm: typeof configuracao.atualizadoEm === 'string' ? configuracao.atualizadoEm : '',
  }
}

export function getConfiguracaoDocumentosPadrao() {
  return criarConfiguracaoDocumentosInicial({
    horasPorDiaDeclaracao: HORAS_POR_DIA_DECLARACAO_PADRAO,
  })
}

export function carregarConfiguracaoDocumentos() {
  if (typeof window === 'undefined') {
    return getConfiguracaoDocumentosPadrao()
  }

  try {
    const conteudo = window.localStorage.getItem(STORAGE_CHAVE_DOCUMENTOS)
    return criarConfiguracaoDocumentosInicial(conteudo ? JSON.parse(conteudo) : {})
  } catch {
    return getConfiguracaoDocumentosPadrao()
  }
}

export function salvarConfiguracaoDocumentos(configuracao) {
  const configuracaoNormalizada = criarConfiguracaoDocumentosInicial({
    ...configuracao,
    atualizadoEm: new Date().toISOString(),
  })

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      STORAGE_CHAVE_DOCUMENTOS,
      JSON.stringify(configuracaoNormalizada),
    )
  }

  return configuracaoNormalizada
}
