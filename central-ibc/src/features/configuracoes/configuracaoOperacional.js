import {
  TOTAL_APARELHOS_DISPONIVEIS,
  TOTAL_VAGAS_HOSPEDAGEM,
} from '../programacao/constants'

const STORAGE_CHAVE_OPERACIONAL = 'ibc.configuracao.operacional.v1'

function normalizarNumeroInteiro(valor, fallback) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return fallback
  }

  return Math.max(0, Math.round(numero))
}

export function criarConfiguracaoOperacionalInicial(configuracao = {}) {
  return {
    versao: 1,
    totalAparelhosDisponiveis: normalizarNumeroInteiro(
      configuracao.totalAparelhosDisponiveis,
      TOTAL_APARELHOS_DISPONIVEIS,
    ),
    totalVagasHospedagem: normalizarNumeroInteiro(
      configuracao.totalVagasHospedagem,
      TOTAL_VAGAS_HOSPEDAGEM,
    ),
    atualizadoEm: typeof configuracao.atualizadoEm === 'string' ? configuracao.atualizadoEm : '',
  }
}

export function getConfiguracaoOperacionalPadrao() {
  return criarConfiguracaoOperacionalInicial({
    totalAparelhosDisponiveis: TOTAL_APARELHOS_DISPONIVEIS,
    totalVagasHospedagem: TOTAL_VAGAS_HOSPEDAGEM,
  })
}

export function carregarConfiguracaoOperacional() {
  if (typeof window === 'undefined') {
    return getConfiguracaoOperacionalPadrao()
  }

  try {
    const conteudo = window.localStorage.getItem(STORAGE_CHAVE_OPERACIONAL)
    return criarConfiguracaoOperacionalInicial(conteudo ? JSON.parse(conteudo) : {})
  } catch {
    return getConfiguracaoOperacionalPadrao()
  }
}

export function salvarConfiguracaoOperacional(configuracao) {
  const configuracaoNormalizada = criarConfiguracaoOperacionalInicial({
    ...configuracao,
    atualizadoEm: new Date().toISOString(),
  })

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      STORAGE_CHAVE_OPERACIONAL,
      JSON.stringify(configuracaoNormalizada),
    )
  }

  return configuracaoNormalizada
}
