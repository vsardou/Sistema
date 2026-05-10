const STORAGE_CHAVE_CONFIGURACAO = 'ibc.configuracao.sistema.v1'

export const pastasSistemaIbc = [
  { chave: 'dados', rotulo: 'Dados', caminhoRelativo: 'Dados' },
  { chave: 'documentos', rotulo: 'Documentos', caminhoRelativo: 'Documentos' },
  { chave: 'declaracoes', rotulo: 'Declarações', caminhoRelativo: 'Documentos/Declaracoes' },
  { chave: 'prestacoes', rotulo: 'Prestações', caminhoRelativo: 'Documentos/Prestacoes' },
  { chave: 'emails', rotulo: 'E-mails', caminhoRelativo: 'Documentos/Emails' },
  { chave: 'backups', rotulo: 'Backups', caminhoRelativo: 'Backups' },
  { chave: 'modelos', rotulo: 'Modelos', caminhoRelativo: 'Modelos' },
  { chave: 'assinaturas', rotulo: 'Assinaturas', caminhoRelativo: 'Assinaturas' },
  { chave: 'logs', rotulo: 'Logs', caminhoRelativo: 'Logs' },
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
