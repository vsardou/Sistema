import fs from 'node:fs'
import os from 'node:os'
import readline from 'node:readline/promises'
import { execFile } from 'node:child_process'
import { google } from 'googleapis'

const REDIRECT_URI = 'http://localhost'
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
]

function carregarEnvLocal() {
  if (!fs.existsSync('.env')) {
    return {}
  }

  return Object.fromEntries(
    fs
      .readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter((linha) => linha && !linha.startsWith('#'))
      .map((linha) => {
        const separador = linha.indexOf('=')
        return [linha.slice(0, separador), linha.slice(separador + 1)]
      }),
  )
}

function abrirUrlNoNavegador(url) {
  const plataforma = os.platform()

  if (plataforma === 'win32') {
    execFile('cmd', ['/c', 'start', '', url])
    return
  }

  if (plataforma === 'darwin') {
    execFile('open', [url])
    return
  }

  execFile('xdg-open', [url])
}

function extrairCodigo(valorDigitado) {
  const valor = valorDigitado.trim()

  if (!valor) {
    return ''
  }

  try {
    const url = new URL(valor)
    return url.searchParams.get('code') ?? ''
  } catch {
    return valor
  }
}

const envLocal = carregarEnvLocal()
const clientId = process.env.GMAIL_CLIENT_ID || envLocal.GMAIL_CLIENT_ID
const clientSecret = process.env.GMAIL_CLIENT_SECRET || envLocal.GMAIL_CLIENT_SECRET
const codigoPorParametro =
  process.argv.find((argumento) => argumento.startsWith('--code='))?.slice('--code='.length) ||
  process.env.GMAIL_AUTH_CODE ||
  ''
const deveAtualizarEnv = process.argv.includes('--write-env')

if (!clientId || !clientSecret) {
  console.error('Preencha GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no .env antes de rodar.')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: GMAIL_SCOPES,
})

console.log('\nAbra esta URL e autorize com a conta institucional do Gmail:\n')
console.log(authUrl)
console.log('\nPermissoes solicitadas: enviar e-mails, ler conversas e marcar mensagens como lidas.\n')
console.log('\nDepois cole aqui o valor de code= ou a URL completa de retorno.\n')

try {
  abrirUrlNoNavegador(authUrl)
} catch {
  console.log('Nao foi possivel abrir o navegador automaticamente. Copie a URL acima.')
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

let resposta = codigoPorParametro

if (!resposta) {
  resposta = await rl.question('Codigo de autorizacao: ')
}

rl.close()

const code = extrairCodigo(resposta)

if (!code) {
  console.error('Codigo de autorizacao vazio.')
  process.exit(1)
}

const { tokens } = await oauth2Client.getToken(code)

if (!tokens.refresh_token) {
  console.error(
    'O Google nao retornou refresh_token. Rode novamente e confirme que prompt=consent foi usado.',
  )
  process.exit(1)
}

if (deveAtualizarEnv) {
  const envAtual = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : ''
  const linhas = envAtual.split(/\r?\n/)
  let encontrouToken = false
  const linhasAtualizadas = linhas.map((linha) => {
    if (linha.startsWith('GMAIL_REFRESH_TOKEN=')) {
      encontrouToken = true
      return `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`
    }

    return linha
  })

  if (!encontrouToken) {
    linhasAtualizadas.push(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`)
  }

  fs.writeFileSync('.env', linhasAtualizadas.join('\n'))
  console.log('\n.env atualizado com o novo GMAIL_REFRESH_TOKEN.\n')
  process.exit(0)
}

console.log('\nGMAIL_REFRESH_TOKEN=\n')
console.log(tokens.refresh_token)
console.log('\nCole esse valor no .env. Nao exponha esse token no front nem em arquivo publico.\n')
