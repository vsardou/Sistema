import { useMemo, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
} from '../features/programacao/constants'
import { enviarDocumentoPorEmail } from '../features/email/utils/emailApi'
import { normalizarEmail, validarEmailBasico } from '../features/email/utils/emailComposer'
import { atualizarEnvioDocumentoEmitido } from '../features/documentos/utils/documentosEmitidos'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor : ''
}

function criarFormularioInicial(contextoEmail) {
  return {
    destinatarioEmail: normalizarTexto(contextoEmail?.destinatarioEmail),
    assunto: normalizarTexto(contextoEmail?.assuntoSugerido),
    mensagem: normalizarTexto(contextoEmail?.mensagemSugerida),
  }
}

const estilosStatus = {
  enviando: 'border-[#D9D9D9] bg-[#F6F6F6] text-[#334155]',
  sucesso: 'border-[#CDE6D5] bg-[#EEF7F2] text-[#166534]',
  erro: 'border-[#E5B5B8] bg-[#FFF5F5] text-[#991B1B]',
}

export default function TelaEnvioEmail({ onVoltar, contextoEmail = null }) {
  const [formulario, setFormulario] = useState(() => criarFormularioInicial(contextoEmail))
  const [statusEnvio, setStatusEnvio] = useState('ocioso')
  const [mensagemStatus, setMensagemStatus] = useState('')

  const documentoNome = useMemo(
    () => normalizarTexto(contextoEmail?.nomeDocumento) || 'Documento não selecionado',
    [contextoEmail],
  )
  const arquivoNome = useMemo(
    () => normalizarTexto(contextoEmail?.nomeArquivoPdf) || 'Sem anexo PDF',
    [contextoEmail],
  )
  const anexoPrincipal = contextoEmail?.anexoPrincipal ?? null
  const envioEmAndamento = statusEnvio === 'enviando'

  function handleAtualizarCampo(campo, valor) {
    if (statusEnvio !== 'ocioso') {
      setStatusEnvio('ocioso')
      setMensagemStatus('')
    }

    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }))
  }

  async function handleEnviarEmail(event) {
    event.preventDefault()
    setMensagemStatus('')

    const destinatarioEmail = normalizarEmail(formulario.destinatarioEmail)
    const assunto = normalizarTexto(formulario.assunto).trim()
    const mensagem = normalizarTexto(formulario.mensagem).trim()

    if (!anexoPrincipal?.base64) {
      setStatusEnvio('erro')
      setMensagemStatus('Não foi possível identificar o PDF principal deste documento.')
      return
    }

    if (!destinatarioEmail) {
      setStatusEnvio('erro')
      setMensagemStatus('Informe o e-mail do destinatário para enviar.')
      return
    }

    if (!validarEmailBasico(destinatarioEmail)) {
      setStatusEnvio('erro')
      setMensagemStatus('Digite um e-mail válido.')
      return
    }

    if (!assunto) {
      setStatusEnvio('erro')
      setMensagemStatus('Informe o assunto do e-mail.')
      return
    }

    if (!mensagem) {
      setStatusEnvio('erro')
      setMensagemStatus('Digite a mensagem do e-mail.')
      return
    }

    setStatusEnvio('enviando')
    setMensagemStatus('Enviando e-mail...')

    try {
      const retorno = await enviarDocumentoPorEmail({
        destinatarioEmail,
        assunto,
        mensagem,
        documentoTipo: contextoEmail?.tipoDocumento || '',
        nomePessoa: contextoEmail?.nomePessoa || '',
        arquivoPrincipal: {
          nomeArquivo: anexoPrincipal.nomeArquivo,
          mimeType: anexoPrincipal.mimeType,
          base64: anexoPrincipal.base64,
        },
      })

      setStatusEnvio('sucesso')
      setMensagemStatus(
        retorno?.mensagem || 'E-mail enviado com sucesso. O documento foi encaminhado.',
      )
      await atualizarEnvioDocumentoEmitido(contextoEmail?.documentoEmitidoId, {
        enviadoPorEmail: true,
        emailDestinatario: destinatarioEmail,
        enviadoEm: new Date().toISOString(),
        statusEnvio: 'enviado',
        mensagemEnvio: retorno?.mensagem || 'E-mail enviado com sucesso.',
      })
    } catch (erro) {
      setStatusEnvio('erro')
      setMensagemStatus(erro?.message || 'Erro no envio do e-mail.')
      await atualizarEnvioDocumentoEmitido(contextoEmail?.documentoEmitidoId, {
        enviadoPorEmail: false,
        emailDestinatario: destinatarioEmail,
        enviadoEm: new Date().toISOString(),
        statusEnvio: 'erro',
        mensagemEnvio: erro?.message || 'Erro no envio do e-mail.',
      })
    }
  }

  return (
    <>
      <BarraTopo
        titulo="Comunicação IBC"
        subtitulo="Envio simples de documentos com assunto, mensagem e assinatura institucional padronizados."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cartaoSecundarioClass}>
            <span className="text-sm font-semibold text-[#767676]">Documento</span>
            <p className="mt-2 text-lg font-semibold text-slate-900">{documentoNome}</p>
          </div>
          <div className={cartaoSecundarioClass}>
            <span className="text-sm font-semibold text-[#767676]">Arquivo PDF</span>
            <p className="mt-2 break-all text-lg font-semibold text-slate-900">{arquivoNome}</p>
          </div>
        </div>

        {statusEnvio !== 'ocioso' ? (
          <div
            className={`mt-6 rounded-lg border px-5 py-5 text-lg font-semibold ${estilosStatus[statusEnvio]}`}
          >
            {mensagemStatus}
          </div>
        ) : null}

        {!anexoPrincipal?.base64 ? (
          <div className="mt-6 rounded-lg border border-[#E5B5B8] bg-[#FFF5F5] px-4 py-4 text-sm font-semibold text-[#991B1B]">
            Este envio precisa de um PDF principal. Abra o envio a partir de Declarações ou
            Prestação de contas.
          </div>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleEnviarEmail}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#4B5563]">E-mail do destinatário</span>
            <input
              type="email"
              value={formulario.destinatarioEmail}
              onChange={(e) => handleAtualizarCampo('destinatarioEmail', e.target.value)}
              className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
              placeholder="nome@empresa.com.br"
              autoComplete="email"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#4B5563]">Assunto</span>
            <input
              value={formulario.assunto}
              onChange={(e) => handleAtualizarCampo('assunto', e.target.value)}
              className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
              placeholder="Assunto do e-mail"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#4B5563]">Mensagem</span>
            <textarea
              rows={10}
              value={formulario.mensagem}
              onChange={(e) => handleAtualizarCampo('mensagem', e.target.value)}
              className="min-h-[240px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-lg leading-relaxed text-[#222222]"
              placeholder="Escreva a mensagem que será enviada junto com o PDF."
            />
          </label>

          <div className="mt-2 flex flex-col gap-3 md:flex-row">
            <button type="button" onClick={onVoltar} className={botaoSecundarioClass}>
              Voltar
            </button>
            <button
              type="submit"
              disabled={envioEmAndamento || !anexoPrincipal?.base64}
              className={`${botaoPrimarioClass} text-lg`}
            >
              {envioEmAndamento ? 'Enviando...' : 'Enviar e-mail'}
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
