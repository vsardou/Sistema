import { invoke, isTauri } from '@tauri-apps/api/core'

const ENDPOINT_ENVIO_EMAIL = '/api/email/enviar'

export async function enviarDocumentoPorEmail(payload) {
  if (isTauri()) {
    try {
      return await invoke('enviar_email_documento', { payload })
    } catch (erro) {
      throw new Error(
        erro && typeof erro === 'string'
          ? erro
          : erro?.message || 'Nao foi possivel enviar o e-mail no aplicativo desktop.',
      )
    }
  }

  let resposta

  try {
    resposta = await fetch(ENDPOINT_ENVIO_EMAIL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Não foi possível conectar ao serviço de envio de e-mail.')
  }

  let dados = null

  try {
    dados = await resposta.json()
  } catch {
    dados = null
  }

  if (!resposta.ok) {
    const mensagemErro = dados?.mensagem || 'Falha no envio do e-mail.'
    throw new Error(mensagemErro)
  }

  return dados
}
