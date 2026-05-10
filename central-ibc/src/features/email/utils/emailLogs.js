const CHAVE_LOGS_EMAIL = 'ibc.email.logs.v1'
const CHAVE_ESTADO_EMAIL = 'ibc.email.estado.v1'
const LIMITE_LOGS = 200

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function lerJsonLocalStorage(chave, fallback) {
  if (typeof localStorage === 'undefined') {
    return fallback
  }

  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? JSON.parse(bruto) : fallback
  } catch {
    return fallback
  }
}

function salvarJsonLocalStorage(chave, valor) {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(chave, JSON.stringify(valor))
}

export function listarLogsEmail() {
  const logs = lerJsonLocalStorage(CHAVE_LOGS_EMAIL, [])
  return Array.isArray(logs) ? logs : []
}

export function registrarLogEmail({ acao = '', detalhe = '', threadId = '', email = '' } = {}) {
  const log = {
    id: `email-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    acao: normalizarTexto(acao) || 'Acao de e-mail',
    detalhe: normalizarTexto(detalhe),
    threadId: normalizarTexto(threadId),
    email: normalizarTexto(email),
    criadoEm: new Date().toISOString(),
  }
  const logsAtualizados = [log, ...listarLogsEmail()].slice(0, LIMITE_LOGS)
  salvarJsonLocalStorage(CHAVE_LOGS_EMAIL, logsAtualizados)

  return log
}

export function carregarEstadoEmails() {
  const estado = lerJsonLocalStorage(CHAVE_ESTADO_EMAIL, {
    respondidos: [],
    resolvidos: [],
  })

  return {
    respondidos: Array.isArray(estado.respondidos) ? estado.respondidos : [],
    resolvidos: Array.isArray(estado.resolvidos) ? estado.resolvidos : [],
  }
}

function salvarEstadoEmails(estado) {
  salvarJsonLocalStorage(CHAVE_ESTADO_EMAIL, carregarEstadoNormalizado(estado))
}

function carregarEstadoNormalizado(estado) {
  return {
    respondidos: Array.from(new Set(estado.respondidos || [])).filter(Boolean),
    resolvidos: Array.from(new Set(estado.resolvidos || [])).filter(Boolean),
  }
}

export function marcarThreadRespondida(threadId) {
  const id = normalizarTexto(threadId)

  if (!id) {
    return carregarEstadoEmails()
  }

  const estado = carregarEstadoEmails()
  const atualizado = carregarEstadoNormalizado({
    ...estado,
    respondidos: [...estado.respondidos, id],
  })
  salvarEstadoEmails(atualizado)

  return atualizado
}

export function marcarThreadResolvida(threadId) {
  const id = normalizarTexto(threadId)

  if (!id) {
    return carregarEstadoEmails()
  }

  const estado = carregarEstadoEmails()
  const atualizado = carregarEstadoNormalizado({
    ...estado,
    resolvidos: [...estado.resolvidos, id],
  })
  salvarEstadoEmails(atualizado)

  return atualizado
}
