import { normalizarAgendaMensal } from './programacaoUtils'
import {
  carregarBancoSqliteLocal,
  marcarSqliteIndisponivel,
} from '../../localFirst/sqliteDatabase'

const DB_NOME = 'sistema-ibc-programacao'
const DB_VERSAO = 1
const STORE_AGENDA = 'agenda'
const CHAVE_AGENDA_PRINCIPAL = 'agenda-principal'
const VERSAO_SCHEMA_AGENDA = 1

function abrirBancoProgramacao() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponivel neste ambiente.'))
      return
    }

    const request = indexedDB.open(DB_NOME, DB_VERSAO)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_AGENDA)) {
        db.createObjectStore(STORE_AGENDA, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function executarStore(modo, callback) {
  const db = await abrirBancoProgramacao()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_AGENDA, modo)
    const store = transaction.objectStore(STORE_AGENDA)
    const request = callback(store)

    transaction.oncomplete = () => {
      db.close()
      resolve(request?.result)
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

async function carregarAgendaProgramacaoIndexedDb() {
  const registro = await executarStore('readonly', (store) => store.get(CHAVE_AGENDA_PRINCIPAL))

  if (!registro?.agendaMensal) {
    return null
  }

  return {
    agendaMensal: normalizarAgendaMensal(registro.agendaMensal),
    atualizadoEm: registro.atualizadoEm ?? '',
    versaoSchema: registro.versaoSchema ?? 0,
  }
}

async function salvarAgendaProgramacaoIndexedDb(agendaMensal) {
  const agora = new Date().toISOString()
  const registro = {
    id: CHAVE_AGENDA_PRINCIPAL,
    versaoSchema: VERSAO_SCHEMA_AGENDA,
    agendaMensal: normalizarAgendaMensal(agendaMensal),
    atualizadoEm: agora,
  }

  await executarStore('readwrite', (store) => store.put(registro))

  return registro
}

async function carregarAgendaProgramacaoSqlite() {
  const db = await carregarBancoSqliteLocal()

  if (!db) {
    return null
  }

  const registros = await db.select(
    'SELECT valor_json, atualizado_em FROM kv_store WHERE chave = $1 LIMIT 1',
    [CHAVE_AGENDA_PRINCIPAL],
  )
  const registro = registros[0]

  if (!registro?.valor_json) {
    return null
  }

  const payload = JSON.parse(registro.valor_json)

  return {
    agendaMensal: normalizarAgendaMensal(payload.agendaMensal),
    atualizadoEm: payload.atualizadoEm ?? registro.atualizado_em ?? '',
    versaoSchema: payload.versaoSchema ?? 0,
  }
}

async function salvarAgendaProgramacaoSqlite(agendaMensal) {
  const db = await carregarBancoSqliteLocal()

  if (!db) {
    return null
  }

  const agora = new Date().toISOString()
  const registro = {
    id: CHAVE_AGENDA_PRINCIPAL,
    versaoSchema: VERSAO_SCHEMA_AGENDA,
    agendaMensal: normalizarAgendaMensal(agendaMensal),
    atualizadoEm: agora,
  }

  await db.execute(
    `INSERT INTO kv_store (chave, valor_json, atualizado_em)
     VALUES ($1, $2, $3)
     ON CONFLICT(chave) DO UPDATE SET
       valor_json = excluded.valor_json,
       atualizado_em = excluded.atualizado_em`,
    [CHAVE_AGENDA_PRINCIPAL, JSON.stringify(registro), agora],
  )

  return registro
}

export async function carregarAgendaProgramacao() {
  try {
    const registroSqlite = await carregarAgendaProgramacaoSqlite()

    if (registroSqlite) {
      return registroSqlite
    }
  } catch {
    marcarSqliteIndisponivel()
  }

  return carregarAgendaProgramacaoIndexedDb()
}

export async function salvarAgendaProgramacao(agendaMensal) {
  try {
    const registroSqlite = await salvarAgendaProgramacaoSqlite(agendaMensal)

    if (registroSqlite) {
      return registroSqlite
    }
  } catch {
    marcarSqliteIndisponivel()
  }

  return salvarAgendaProgramacaoIndexedDb(agendaMensal)
}
