import { invoke, isTauri } from '@tauri-apps/api/core'
import {
  garantirPastaBaseSistema,
  carregarConfiguracaoSistema,
  prepararPastasCompartilhadas,
} from '../../configuracoes/configuracaoSistema'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function resolverPastaRaizConfigurada() {
  const configuracao = carregarConfiguracaoSistema()
  return normalizarTexto(configuracao?.pastaRaiz)
}

async function garantirPastasBase(pastaRaiz) {
  if (!pastaRaiz) {
    return
  }

  try {
    await prepararPastasCompartilhadas(pastaRaiz)
  } catch {
    // A gravação do PDF tenta recriar a estrutura no backend de qualquer forma.
  }
}

async function garantirPastaRaizConfigurada() {
  const configuracao = await garantirPastaBaseSistema()
  return normalizarTexto(configuracao?.pastaRaiz)
}

export async function salvarPdfOficial({
  nomeArquivo = '',
  base64 = '',
  categoria = 'declaracoes',
} = {}) {
  if (!isTauri()) {
    throw new Error('O salvamento oficial de PDF funciona apenas no aplicativo instalado.')
  }

  const pastaRaiz = resolverPastaRaizConfigurada() || (await garantirPastaRaizConfigurada())
  await garantirPastasBase(pastaRaiz)

  return invoke('salvar_pdf_oficial', {
    payload: {
      nomeArquivo,
      base64,
      categoria,
      pastaRaiz,
    },
  })
}

export async function abrirCaminhoSistema(caminho, { selecionarArquivo = false } = {}) {
  if (!isTauri()) {
    throw new Error('Abrir caminho automaticamente funciona apenas no aplicativo instalado.')
  }

  return invoke('abrir_caminho_sistema', {
    payload: {
      caminho,
      selecionarArquivo,
    },
  })
}

export async function abrirUltimoPdfOficial(categoria = 'programacoes') {
  if (!isTauri()) {
    throw new Error('Abrir PDFs oficiais automaticamente funciona apenas no aplicativo instalado.')
  }

  const configuracao = carregarConfiguracaoSistema()
  const pastaRaiz = normalizarTexto(configuracao?.pastaRaiz)

  const caminho = await invoke('obter_ultimo_pdf_oficial', {
    payload: {
      categoria,
      pastaRaiz,
    },
  })

  await abrirCaminhoSistema(caminho)
  return caminho
}
