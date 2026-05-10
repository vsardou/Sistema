import { invoke, isTauri } from '@tauri-apps/api/core'
import { marcarThreadResolvida } from './emailLogs'

function erroAplicativoDesktop() {
  return new Error('A caixa de e-mail IBC funciona no aplicativo instalado, com Gmail API.')
}

function normalizarErro(erro, fallback) {
  const mensagem = erro && typeof erro === 'string' ? erro : erro?.message || fallback

  if (/insufficient|scope|PERMISSION_DENIED|ACCESS_TOKEN_SCOPE/i.test(mensagem)) {
    return new Error(
      'A conta IBC envia e-mails, mas ainda falta autorizar leitura/resposta na Gmail API.',
    )
  }

  if (/Gmail API nao configurado/i.test(mensagem)) {
    return new Error('A conta de e-mail IBC ainda nao esta configurada neste computador.')
  }

  return new Error(mensagem)
}

function exigirTauri() {
  if (!isTauri()) {
    throw erroAplicativoDesktop()
  }
}

export async function listInbox({ query = 'in:inbox newer_than:30d', maxResults = 30 } = {}) {
  exigirTauri()

  try {
    return await invoke('listar_emails_gmail', { query, maxResults })
  } catch (erro) {
    throw normalizarErro(erro, 'Nao foi possivel carregar os e-mails.')
  }
}

export async function getThread(threadId) {
  exigirTauri()

  try {
    return await invoke('buscar_thread_gmail', { threadId })
  } catch (erro) {
    throw normalizarErro(erro, 'Nao foi possivel abrir a conversa.')
  }
}

export async function replyToThread({
  threadId,
  destinatarioEmail,
  assunto,
  mensagem,
  inReplyTo = '',
  references = '',
  anexos = [],
} = {}) {
  exigirTauri()

  try {
    return await invoke('responder_thread_gmail', {
      payload: {
        threadId,
        destinatarioEmail,
        assunto,
        mensagem,
        inReplyTo,
        references,
        anexos,
      },
    })
  } catch (erro) {
    throw normalizarErro(erro, 'Nao foi possivel responder o e-mail.')
  }
}

export async function sendNewEmail({
  destinatarioEmail,
  assunto,
  mensagem,
  anexos = [],
} = {}) {
  exigirTauri()

  try {
    return await invoke('enviar_email_simples_gmail', {
      payload: {
        destinatarioEmail,
        assunto,
        mensagem,
        anexos,
      },
    })
  } catch (erro) {
    throw normalizarErro(erro, 'Nao foi possivel enviar o e-mail.')
  }
}

export async function markAsRead(messageId) {
  exigirTauri()

  try {
    return await invoke('marcar_email_lido_gmail', { messageId })
  } catch (erro) {
    throw normalizarErro(erro, 'Nao foi possivel marcar o e-mail como lido.')
  }
}

export async function applyResolvedLabel(threadId) {
  return marcarThreadResolvida(threadId)
}
