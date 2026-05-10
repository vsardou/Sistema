import { Buffer } from 'node:buffer'
import { google } from 'googleapis'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function normalizarBase64(valor) {
  return normalizarTexto(valor).replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '')
}

function quebrarLinhas(texto, tamanho = 76) {
  return texto.match(new RegExp(`.{1,${tamanho}}`, 'g'))?.join('\r\n') ?? ''
}

function codificarBase64Url(valor) {
  return Buffer.from(valor, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function codificarAssuntoEmail(assunto) {
  const assuntoBase64 = Buffer.from(assunto, 'utf-8').toString('base64')
  return `=?UTF-8?B?${assuntoBase64}?=`
}

function construirEmailMime({
  remetenteEmail,
  destinatarioEmail,
  assunto,
  mensagem,
  nomeArquivo,
  mimeTypeArquivo,
  base64Arquivo,
}) {
  const separador = `ibc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const corpoBase64 = Buffer.from(mensagem, 'utf-8').toString('base64')
  const assuntoCodificado = codificarAssuntoEmail(assunto)
  const nomeArquivoSeguro = nomeArquivo.replace(/[\r\n"]/g, '_')

  const linhas = [
    `From: ${remetenteEmail}`,
    `To: ${destinatarioEmail}`,
    `Subject: ${assuntoCodificado}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${separador}"`,
    '',
    `--${separador}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    quebrarLinhas(corpoBase64),
    '',
    `--${separador}`,
    `Content-Type: ${mimeTypeArquivo}; name="${nomeArquivoSeguro}"`,
    `Content-Disposition: attachment; filename="${nomeArquivoSeguro}"`,
    'Content-Transfer-Encoding: base64',
    '',
    quebrarLinhas(base64Arquivo),
    '',
    `--${separador}--`,
    '',
  ]

  return codificarBase64Url(linhas.join('\r\n'))
}

function extrairMensagemErroGmail(erro) {
  const mensagemResposta = erro?.response?.data?.error?.message
  const mensagemPadrao = erro?.message
  return mensagemResposta || mensagemPadrao || 'Falha no envio com Gmail API.'
}

function criarConfiguracaoGmail(env) {
  return {
    provider: normalizarTexto(env.EMAIL_PROVIDER).toLowerCase(),
    clientId: normalizarTexto(env.GMAIL_CLIENT_ID),
    clientSecret: normalizarTexto(env.GMAIL_CLIENT_SECRET),
    refreshToken: normalizarTexto(env.GMAIL_REFRESH_TOKEN),
    senderEmail: normalizarTexto(env.GMAIL_SENDER_EMAIL),
  }
}

function gmailConfigurado(config) {
  return Boolean(
    config.clientId && config.clientSecret && config.refreshToken && config.senderEmail,
  )
}

async function enviarComGmailApi(config, payload) {
  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret)
  auth.setCredentials({ refresh_token: config.refreshToken })

  const gmail = google.gmail({ version: 'v1', auth })
  const raw = construirEmailMime({
    remetenteEmail: config.senderEmail,
    destinatarioEmail: payload.destinatarioEmail,
    assunto: payload.assunto,
    mensagem: payload.mensagem,
    nomeArquivo: payload.arquivoPrincipal.nomeArquivo,
    mimeTypeArquivo: payload.arquivoPrincipal.mimeType,
    base64Arquivo: payload.arquivoPrincipal.base64,
  })

  const resultado = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })

  return {
    ok: true,
    mensagem: 'E-mail enviado com sucesso.',
    protocolo: resultado.data.id || `gmail-${Date.now()}`,
    enviadoEm: new Date().toISOString(),
    modo: 'gmail-api',
  }
}

function criarApiEnvioEmailDev(configGmail) {
  return {
    name: 'ibc-api-envio-email-dev',
    configureServer(server) {
      server.middlewares.use('/api/email/enviar', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        const chunks = []

        req.on('data', (chunk) => {
          chunks.push(chunk)
        })

        req.on('end', async () => {
          let payload = {}

          try {
            const corpo = Buffer.concat(chunks).toString('utf-8')
            payload = corpo ? JSON.parse(corpo) : {}
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, mensagem: 'JSON invalido no envio de e-mail.' }))
            return
          }

          const destinatarioEmail =
            typeof payload.destinatarioEmail === 'string' ? payload.destinatarioEmail.trim() : ''
          const assunto = typeof payload.assunto === 'string' ? payload.assunto.trim() : ''
          const mensagem = normalizarTexto(payload.mensagem)
          const base64Anexo = normalizarBase64(payload.arquivoPrincipal?.base64)
          const nomeArquivo = normalizarTexto(payload.arquivoPrincipal?.nomeArquivo) || 'documento.pdf'
          const mimeTypeArquivo =
            normalizarTexto(payload.arquivoPrincipal?.mimeType) || 'application/pdf'

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatarioEmail)) {
            res.statusCode = 422
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, mensagem: 'Digite um e-mail valido.' }))
            return
          }

          if (!assunto) {
            res.statusCode = 422
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, mensagem: 'Informe o assunto do e-mail.' }))
            return
          }

          if (!mensagem) {
            res.statusCode = 422
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, mensagem: 'Digite a mensagem do e-mail.' }))
            return
          }

          if (!base64Anexo) {
            res.statusCode = 422
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, mensagem: 'PDF principal ausente no envio.' }))
            return
          }

          const payloadEmail = {
            destinatarioEmail,
            assunto,
            mensagem,
            arquivoPrincipal: {
              nomeArquivo,
              mimeType: mimeTypeArquivo,
              base64: base64Anexo,
            },
          }

          if (configGmail.provider === 'gmail') {
            if (!gmailConfigurado(configGmail)) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  ok: false,
                  mensagem:
                    'Gmail API ativo, mas faltam credenciais. Configure .env e reinicie o Vite.',
                }),
              )
              return
            }

            try {
              const respostaGmail = await enviarComGmailApi(configGmail, payloadEmail)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(respostaGmail))
            } catch (erro) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  ok: false,
                  mensagem: extrairMensagemErroGmail(erro),
                }),
              )
            }
            return
          }

          if (destinatarioEmail.toLowerCase().includes('erro-email')) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                ok: false,
                mensagem: 'Falha simulada do servico de e-mail. Tente novamente.',
              }),
            )
            return
          }

          const resposta = {
            ok: true,
            mensagem: 'E-mail enviado com sucesso.',
            protocolo: `email-${Date.now()}`,
            enviadoEm: new Date().toISOString(),
            modo: 'simulado-dev',
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          setTimeout(() => {
            res.end(JSON.stringify(resposta))
          }, 700)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configGmail = criarConfiguracaoGmail(env)

  return {
    plugins: [react(), tailwindcss(), criarApiEnvioEmailDev(configGmail)],
  }
})
