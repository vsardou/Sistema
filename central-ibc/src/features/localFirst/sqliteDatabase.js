import { isTauri } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'

const SQLITE_URL = 'sqlite:ibc.sqlite'

let bancoPromise = null
let sqliteIndisponivel = false

export function ambienteTauriDisponivel() {
  try {
    return isTauri()
  } catch {
    return false
  }
}

export function deveUsarSqliteLocal() {
  return ambienteTauriDisponivel() && !sqliteIndisponivel
}

async function aplicarSchemaInicial(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS kv_store (
      chave TEXT PRIMARY KEY NOT NULL,
      valor_json TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS documentos_emitidos (
      id TEXT PRIMARY KEY NOT NULL,
      tipo TEXT NOT NULL,
      aluno TEXT NOT NULL,
      nome_documento TEXT NOT NULL,
      nome_arquivo_pdf TEXT NOT NULL,
      caminho_pdf TEXT NOT NULL,
      status_documento TEXT NOT NULL,
      enviado_por_email INTEGER NOT NULL DEFAULT 0,
      email_destinatario TEXT NOT NULL DEFAULT '',
      enviado_em TEXT NOT NULL DEFAULT '',
      status_envio TEXT NOT NULL DEFAULT 'nao_enviado',
      emitido_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      origem TEXT NOT NULL DEFAULT '',
      dados_json TEXT NOT NULL
    )
  `)

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_emitido_em
      ON documentos_emitidos (emitido_em)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_aluno
      ON documentos_emitidos (aluno)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_tipo
      ON documentos_emitidos (tipo)
  `)
}

export async function carregarBancoSqliteLocal() {
  if (!deveUsarSqliteLocal()) {
    return null
  }

  if (!bancoPromise) {
    bancoPromise = Database.load(SQLITE_URL)
      .then(async (db) => {
        await aplicarSchemaInicial(db)
        return db
      })
      .catch((erro) => {
        sqliteIndisponivel = true
        bancoPromise = null
        throw erro
      })
  }

  return bancoPromise
}

export function marcarSqliteIndisponivel() {
  sqliteIndisponivel = true
  bancoPromise = null
}
