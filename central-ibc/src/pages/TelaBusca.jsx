import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  abrirPdfDocumentoEmitido,
  listarDocumentosEmitidos,
} from '../features/documentos/utils/documentosEmitidos'
import {
  criarAssuntoSugeridoEmail,
  criarMensagemSugeridaEmail,
} from '../features/email/utils/emailComposer'
import {
  botaoPrimarioClass,
  botaoSecundarioCompactoClass,
  cartaoPrincipalClass,
} from '../features/programacao/constants'

function formatarDataHora(valor) {
  if (!valor) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor))
}

function getStatusEnvio(documento) {
  if (documento.statusEnvio === 'enviado') {
    return 'Enviado'
  }

  if (documento.statusEnvio === 'erro') {
    return 'Erro no envio'
  }

  return 'Não enviado'
}

export default function TelaBusca({
  onVoltar,
  onAbrirEnvioEmail,
  titulo = 'Documentos emitidos',
  subtitulo,
}) {
  const [termo, setTermo] = useState('')
  const termoDiferido = useDeferredValue(termo)
  const [documentos, setDocumentos] = useState([])
  const [mensagem, setMensagem] = useState('Carregando documentos emitidos...')

  useEffect(() => {
    let ativo = true

    async function carregarDocumentos() {
      try {
        const lista = await listarDocumentosEmitidos()

        if (!ativo) {
          return
        }

        setDocumentos(lista)
        setMensagem(lista.length > 0 ? '' : 'Nenhum documento emitido ainda.')
      } catch {
        if (ativo) {
          setMensagem('Não foi possível carregar o histórico de documentos.')
        }
      }
    }

    carregarDocumentos()

    return () => {
      ativo = false
    }
  }, [])

  const resultados = useMemo(() => {
    const valor = termoDiferido.toLowerCase().trim()
    if (!valor) return documentos

    return documentos.filter((item) =>
      [
        item.tipo,
        item.aluno,
        item.nomeDocumento,
        item.nomeArquivoPdf,
        item.emailDestinatario,
        item.statusEnvio,
      ]
        .join(' ')
        .toLowerCase()
        .includes(valor),
    )
  }, [documentos, termoDiferido])

  function handleAbrirPdf(documento) {
    const abriu = abrirPdfDocumentoEmitido(documento)

    if (!abriu) {
      setMensagem('Não foi possível abrir o PDF deste documento.')
    }
  }

  function handleReenviar(documento) {
    if (!onAbrirEnvioEmail || !documento?.anexoPrincipal?.base64) {
      setMensagem('Este documento não possui PDF disponível para reenvio.')
      return
    }

    onAbrirEnvioEmail({
      documentoEmitidoId: documento.id,
      tipoDocumento: documento.tipo,
      nomeDocumento: documento.nomeDocumento,
      nomePessoa: documento.aluno,
      destinatarioEmail: documento.emailDestinatario,
      assuntoSugerido: criarAssuntoSugeridoEmail({
        tipoDocumento: documento.tipo,
        nomePessoa: documento.aluno,
      }),
      mensagemSugerida: criarMensagemSugeridaEmail({
        tipoDocumento: documento.tipo,
        nomePessoa: documento.aluno,
      }),
      nomeArquivoPdf: documento.nomeArquivoPdf,
      anexoPrincipal: documento.anexoPrincipal,
    })
  }

  return (
    <>
      <BarraTopo
        titulo={titulo}
        subtitulo={
          subtitulo ||
          'Histórico local dos PDFs gerados nesta instalação, com status de envio e reenvio por e-mail.'
        }
        voltar
        onVoltar={onVoltar}
      />

      <div className={cartaoPrincipalClass}>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#4B5563]">Buscar documento</span>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            className="w-full rounded-lg border border-[#CFCFCF] px-4 py-4 text-xl text-[#222222]"
            placeholder="Ex.: declaração, Pablo, prestação, abril"
          />
        </label>

        {mensagem ? (
          <div className="mt-6 rounded-lg border border-[#CFCFCF] bg-[#F6F6F6] px-4 py-4 text-base font-semibold text-[#334155]">
            {mensagem}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {resultados.map((item) => (
            <div
              key={item.id}
              className="grid gap-4 rounded-lg bg-[#F6F6F6] px-4 py-4 ring-1 ring-[#CFCFCF] xl:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-[#222222]">{item.aluno}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4B5563] ring-1 ring-[#CFCFCF]">
                    {item.tipo}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4B5563] ring-1 ring-[#CFCFCF]">
                    {getStatusEnvio(item)}
                  </span>
                </div>
                <p className="mt-2 break-all text-sm font-semibold text-[#374151]">
                  {item.nomeArquivoPdf}
                </p>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Emitido em {formatarDataHora(item.emitidoEm)}
                  {item.emailDestinatario
                    ? ` | Destinatário: ${item.emailDestinatario}`
                    : ' | Sem envio registrado'}
                  {item.enviadoEm ? ` | Envio: ${formatarDataHora(item.enviadoEm)}` : ''}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row xl:items-center">
                <button
                  type="button"
                  onClick={() => handleAbrirPdf(item)}
                  className={botaoPrimarioClass}
                >
                  Abrir PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleReenviar(item)}
                  className={botaoSecundarioCompactoClass}
                >
                  Reenviar e-mail
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
