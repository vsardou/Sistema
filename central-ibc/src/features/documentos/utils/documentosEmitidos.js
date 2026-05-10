import {
  carregarBancoSqliteLocal,
  marcarSqliteIndisponivel,
} from '../../localFirst/sqliteDatabase'

const DB_NOME = 'sistema-ibc-documentos'
const DB_VERSAO = 1
const STORE_DOCUMENTOS = 'documentos'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function abrirBancoDocumentos() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponivel neste ambiente.'))
      return
    }

    const request = indexedDB.open(DB_NOME, DB_VERSAO)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_DOCUMENTOS)) {
        const store = db.createObjectStore(STORE_DOCUMENTOS, { keyPath: 'id' })
        store.createIndex('emitidoEm', 'emitidoEm')
        store.createIndex('aluno', 'aluno')
        store.createIndex('tipo', 'tipo')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function executarStore(modo, callback) {
  const db = await abrirBancoDocumentos()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_DOCUMENTOS, modo)
    const store = transaction.objectStore(STORE_DOCUMENTOS)
    const resultado = callback(store)

    transaction.oncomplete = () => {
      db.close()
      resolve(resultado)
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

function requestParaPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function criarIdDocumento() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function salvarDocumentoEmitidoSqlite(documento) {
  const db = await carregarBancoSqliteLocal()

  if (!db) {
    return null
  }

  await db.execute(
    `INSERT INTO documentos_emitidos (
       id,
       tipo,
       aluno,
       nome_documento,
       nome_arquivo_pdf,
       caminho_pdf,
       status_documento,
       enviado_por_email,
       email_destinatario,
       enviado_em,
       status_envio,
       emitido_em,
       atualizado_em,
       origem,
       dados_json
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT(id) DO UPDATE SET
       tipo = excluded.tipo,
       aluno = excluded.aluno,
       nome_documento = excluded.nome_documento,
       nome_arquivo_pdf = excluded.nome_arquivo_pdf,
       caminho_pdf = excluded.caminho_pdf,
       status_documento = excluded.status_documento,
       enviado_por_email = excluded.enviado_por_email,
       email_destinatario = excluded.email_destinatario,
       enviado_em = excluded.enviado_em,
       status_envio = excluded.status_envio,
       atualizado_em = excluded.atualizado_em,
       origem = excluded.origem,
       dados_json = excluded.dados_json`,
    [
      documento.id,
      documento.tipo,
      documento.aluno,
      documento.nomeDocumento,
      documento.nomeArquivoPdf,
      documento.caminhoPdf,
      documento.statusDocumento,
      documento.enviadoPorEmail ? 1 : 0,
      documento.emailDestinatario,
      documento.enviadoEm,
      documento.statusEnvio,
      documento.emitidoEm,
      documento.atualizadoEm,
      documento.origem,
      JSON.stringify(documento),
    ],
  )

  return documento
}

function linhaDocumentoSqliteParaDocumento(linha) {
  if (!linha?.dados_json) {
    return null
  }

  return JSON.parse(linha.dados_json)
}

async function listarDocumentosEmitidosSqlite() {
  const db = await carregarBancoSqliteLocal()

  if (!db) {
    return null
  }

  const linhas = await db.select(
    'SELECT dados_json FROM documentos_emitidos ORDER BY emitido_em DESC',
  )

  return linhas.map(linhaDocumentoSqliteParaDocumento).filter(Boolean)
}

async function buscarDocumentoEmitidoPorIdSqlite(id) {
  const db = await carregarBancoSqliteLocal()

  if (!db) {
    return null
  }

  const linhas = await db.select(
    'SELECT dados_json FROM documentos_emitidos WHERE id = $1 LIMIT 1',
    [id],
  )

  return linhaDocumentoSqliteParaDocumento(linhas[0])
}

async function registrarDocumentoEmitidoIndexedDb(documento) {
  await executarStore('readwrite', (store) => store.put(documento))
  return documento
}

export async function registrarDocumentoEmitido({
  tipo = '',
  aluno = '',
  nomeDocumento = '',
  nomeArquivoPdf = '',
  anexoPrincipal = null,
  origem = '',
} = {}) {
  const agora = new Date().toISOString()
  const documento = {
    id: criarIdDocumento(),
    tipo: normalizarTexto(tipo) || 'Documento',
    aluno: normalizarTexto(aluno) || 'Sem nome',
    nomeDocumento: normalizarTexto(nomeDocumento) || normalizarTexto(tipo) || 'Documento',
    nomeArquivoPdf: normalizarTexto(nomeArquivoPdf),
    caminhoPdf: normalizarTexto(nomeArquivoPdf),
    statusDocumento: anexoPrincipal?.base64 ? 'gerado' : 'sem_pdf',
    enviadoPorEmail: false,
    emailDestinatario: '',
    enviadoEm: '',
    statusEnvio: 'nao_enviado',
    mensagemEnvio: '',
    emitidoEm: agora,
    atualizadoEm: agora,
    origem: normalizarTexto(origem),
    anexoPrincipal,
  }

  try {
    const documentoSqlite = await salvarDocumentoEmitidoSqlite(documento)

    if (documentoSqlite) {
      return documentoSqlite
    }
  } catch {
    marcarSqliteIndisponivel()
  }

  return registrarDocumentoEmitidoIndexedDb(documento)
}

export async function listarDocumentosEmitidos() {
  try {
    const documentosSqlite = await listarDocumentosEmitidosSqlite()

    if (documentosSqlite?.length > 0) {
      return documentosSqlite
    }
  } catch {
    marcarSqliteIndisponivel()
  }

  const documentos = await executarStore('readonly', (store) => requestParaPromise(store.getAll()))

  return [...documentos].sort((a, b) => normalizarTexto(b.emitidoEm).localeCompare(a.emitidoEm))
}

export async function buscarDocumentoEmitidoPorId(id) {
  if (!id) {
    return null
  }

  try {
    const documentoSqlite = await buscarDocumentoEmitidoPorIdSqlite(id)

    if (documentoSqlite) {
      return documentoSqlite
    }
  } catch {
    marcarSqliteIndisponivel()
  }

  return executarStore('readonly', (store) => requestParaPromise(store.get(id)))
}

export async function atualizarEnvioDocumentoEmitido(id, atualizacao = {}) {
  const documentoAtual = await buscarDocumentoEmitidoPorId(id)

  if (!documentoAtual) {
    return null
  }

  const documentoAtualizado = {
    ...documentoAtual,
    ...atualizacao,
    atualizadoEm: new Date().toISOString(),
  }

  try {
    const documentoSqlite = await salvarDocumentoEmitidoSqlite(documentoAtualizado)

    if (documentoSqlite) {
      return documentoSqlite
    }
  } catch {
    marcarSqliteIndisponivel()
  }

  await registrarDocumentoEmitidoIndexedDb(documentoAtualizado)

  return documentoAtualizado
}

export function abrirPdfDocumentoEmitido(documento) {
  const base64 = documento?.anexoPrincipal?.base64
  const mimeType = documento?.anexoPrincipal?.mimeType || 'application/pdf'

  if (!base64 || typeof window === 'undefined') {
    return false
  }

  const bytes = Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0))
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)

  return true
}
