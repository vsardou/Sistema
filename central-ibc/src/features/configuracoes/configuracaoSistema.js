const STORAGE_CHAVE_CONFIGURACAO = 'ibc.configuracao.sistema.v1'

export const pastasSistemaIbc = [
  { chave: 'dados', rotulo: 'Dados', caminhoRelativo: 'dados' },
  { chave: 'documentos', rotulo: 'Documentos', caminhoRelativo: 'documentos' },
  { chave: 'declaracoes', rotulo: 'Declarações', caminhoRelativo: 'documentos/declaracoes' },
  { chave: 'prestacoes', rotulo: 'Prestações', caminhoRelativo: 'documentos/prestacoes' },
  { chave: 'programacoes', rotulo: 'Programações', caminhoRelativo: 'documentos/programacoes' },
  { chave: 'emails', rotulo: 'E-mails', caminhoRelativo: 'documentos/emails' },
  { chave: 'backups', rotulo: 'Backups', caminhoRelativo: 'backups' },
  { chave: 'modelos', rotulo: 'Modelos', caminhoRelativo: 'modelos' },
  { chave: 'assinaturas', rotulo: 'Assinaturas', caminhoRelativo: 'assinaturas' },
  { chave: 'logs', rotulo: 'Logs', caminhoRelativo: 'logs' },
]

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

export function criarConfiguracaoSistemaInicial(configuracao = {}) {
  const pastaRaiz = normalizarTexto(configuracao.pastaRaiz)

  return {
    versao: 1,
    pastaRaiz,
    modoArmazenamento: pastaRaiz ? 'compartilhado' : 'local',
    atualizadoEm: normalizarTexto(configuracao.atualizadoEm),
    computador: normalizarTexto(configuracao.computador),
    ultimoResultadoPreparacao: configuracao.ultimoResultadoPreparacao ?? null,
  }
}

export function carregarConfiguracaoSistema() {
  if (typeof window === 'undefined') {
    return criarConfiguracaoSistemaInicial()
  }

  try {
    const conteudo = window.localStorage.getItem(STORAGE_CHAVE_CONFIGURACAO)
    return criarConfiguracaoSistemaInicial(conteudo ? JSON.parse(conteudo) : {})
  } catch {
    return criarConfiguracaoSistemaInicial()
  }
}

export function salvarConfiguracaoSistema(configuracao) {
  const configuracaoNormalizada = criarConfiguracaoSistemaInicial({
    ...configuracao,
    atualizadoEm: new Date().toISOString(),
  })

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      STORAGE_CHAVE_CONFIGURACAO,
      JSON.stringify(configuracaoNormalizada),
    )
  }

  return configuracaoNormalizada
}

export async function selecionarPastaRaizCompartilhada() {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) {
    return null
  }

  const { open } = await import('@tauri-apps/plugin-dialog')
  const pasta = await open({
    directory: true,
    multiple: false,
    title: 'Escolher pasta compartilhada do Sistema IBC',
  })

  return typeof pasta === 'string' ? pasta : null
}

export async function prepararPastasCompartilhadas(pastaRaiz) {
  const pastaRaizNormalizada = normalizarTexto(pastaRaiz)

  if (!pastaRaizNormalizada) {
    throw new Error('Informe a pasta raiz compartilhada.')
  }

  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) {
    return {
      pasta_raiz: pastaRaizNormalizada,
      computador: 'Navegador',
      arquivos_criados: [],
      pastas_criadas: pastasSistemaIbc.map((pasta) => pasta.caminhoRelativo),
      modoSimulado: true,
    }
  }

  const { invoke } = await import('@tauri-apps/api/core')

  return invoke('preparar_pastas_compartilhadas', {
    configuracao: {
      pasta_raiz: pastaRaizNormalizada,
    },
  })
}

export async function garantirPastaBaseSistema() {
  const configuracaoAtual = carregarConfiguracaoSistema()
  const pastaExistente = normalizarTexto(configuracaoAtual?.pastaRaiz)

  if (pastaExistente) {
    return configuracaoAtual
  }

  const pastaSelecionada = await selecionarPastaRaizCompartilhada()

  if (!pastaSelecionada) {
    throw new Error('A pasta base do sistema ainda não foi configurada.')
  }

  const resultado = await prepararPastasCompartilhadas(pastaSelecionada)

  return salvarConfiguracaoSistema({
    pastaRaiz: resultado.pasta_raiz ?? pastaSelecionada,
    computador: resultado.computador ?? '',
    ultimoResultadoPreparacao: resultado,
  })
}

export function getStatusConfiguracaoSistema(configuracao) {
  if (!configuracao?.pastaRaiz) {
    return {
      estado: 'local',
      titulo: 'Modo local',
      descricao: 'Os dados continuam neste computador até uma pasta compartilhada ser definida.',
    }
  }

  return {
    estado: 'compartilhado',
    titulo: 'Pasta compartilhada ativa',
    descricao: configuracao.pastaRaiz,
  }
}
