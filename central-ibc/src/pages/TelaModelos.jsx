import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import { modelosImpressao } from '../data/mockData'
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

function formatarData(valor) {
  if (!valor) return '-'

  return new Intl.DateTimeFormat('pt-BR').format(new Date(valor))
}

function formatarDataHora(valor) {
  if (!valor) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor))
}

function getStatusEnvio(documento) {
  if (documento.statusDocumento === 'enviado') return 'Enviado'
  if (documento.statusDocumento === 'erro') return 'Erro'
  if (documento.statusEnvio === 'enviado') return 'Enviado'
  if (documento.statusEnvio === 'erro') return 'Erro no envio'
  return 'Não enviado'
}

export default function TelaModelos({ onVoltar, onAbrirEnvioEmail }) {
  const [abaAtiva, setAbaAtiva] = useState('emitidos')
  const [termo, setTermo] = useState('')
  const termoDiferido = useDeferredValue(termo)
  const [documentos, setDocumentos] = useState([])
  const [mensagem, setMensagem] = useState('Carregando documentos emitidos...')

  useEffect(() => {
    let ativo = true

    async function carregarDocumentos() {
      try {
        const lista = await listarDocumentosEmitidos()

        if (!ativo) return

        setDocumentos(lista)
        setMensagem(lista.length > 0 ? '' : 'Nenhum PDF emitido ainda.')
      } catch {
        if (ativo) {
          setMensagem('Não foi possível carregar os PDFs emitidos.')
        }
      }
    }

    carregarDocumentos()

    return () => {
      ativo = false
    }
  }, [])

  const documentosFiltrados = useMemo(() => {
    const valor = termoDiferido.toLowerCase().trim()
    if (!valor) return documentos

    return documentos.filter((item) =>
      [item.tipo, item.aluno, item.nomeArquivoPdf, item.emailDestinatario, item.statusEnvio]
        .join(' ')
        .toLowerCase()
        .includes(valor),
    )
  }, [documentos, termoDiferido])

  const modelosFiltrados = useMemo(() => {
    const valor = termoDiferido.toLowerCase().trim()
    if (!valor) return modelosImpressao

    return modelosImpressao.filter((item) =>
      [
        item.nome,
        item.tipo,
        item.categoria,
        item.revisao,
        item.dataRevisao,
        item.arquivoAtual,
        item.status,
        item.observacao,
      ]
        .join(' ')
        .toLowerCase()
        .includes(valor),
    )
  }, [termoDiferido])

  function handleReenviar(documento) {
    if (!onAbrirEnvioEmail || !documento?.anexoPrincipal?.base64) {
      setMensagem('Este PDF não está disponível para reenvio.')
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
        titulo="Biblioteca IBC"
        subtitulo="Central simples para PDFs emitidos, modelos base e procedimentos com controle de revisão."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setAbaAtiva('emitidos')}
              className={`min-h-[52px] rounded-lg px-5 py-4 text-lg font-semibold ${
                abaAtiva === 'emitidos'
                  ? 'bg-[#B40105] text-white'
                  : 'border border-[#CFCFCF] bg-white text-[#222222]'
              }`}
            >
              PDFs emitidos
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('modelos')}
              className={`min-h-[52px] rounded-lg px-5 py-4 text-lg font-semibold ${
                abaAtiva === 'modelos'
                  ? 'bg-[#B40105] text-white'
                  : 'border border-[#CFCFCF] bg-white text-[#222222]'
              }`}
            >
              Modelos e procedimentos
            </button>
          </div>

          <label className="grid w-full gap-2 lg:max-w-md">
            <span className="text-sm font-bold text-[#4B5563]">Buscar</span>
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              className="w-full rounded-lg border border-[#CFCFCF] px-4 py-4 text-lg"
              placeholder="Aluno, tipo, revisão, arquivo..."
            />
          </label>
        </div>

        {abaAtiva === 'emitidos' ? (
          <div className="mt-6 space-y-3">
            {mensagem ? (
              <div className="rounded-lg border border-[#CFCFCF] bg-[#F6F6F6] px-4 py-4 text-base font-semibold text-[#334155]">
                {mensagem}
              </div>
            ) : null}

            {documentosFiltrados.map((item) => (
              <div
                key={item.id}
                className="grid gap-4 rounded-lg bg-[#F6F6F6] px-4 py-4 ring-1 ring-[#CFCFCF] xl:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-[#222222]">{item.aluno}</span>
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
                  {item.caminhoPdf ? (
                    <p className="mt-1 break-all text-xs text-[#64748B]">{item.caminhoPdf}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-[#4B5563]">
                    Emitido em {formatarDataHora(item.emitidoEm)}
                    {item.acaoGeradora ? ` | Ação: ${item.acaoGeradora}` : ''}
                    {item.emailDestinatario
                      ? ` | Destinatário: ${item.emailDestinatario}`
                      : ' | Sem envio registrado'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row xl:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      void abrirPdfDocumentoEmitido(item)
                    }}
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
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {modelosFiltrados.map((item) => (
              <div key={item.id} className="rounded-lg bg-[#F6F6F6] p-5 ring-1 ring-[#CFCFCF]">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-[#222222]">{item.nome}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === 'ativo'
                        ? 'bg-[#EEF7F2] text-[#166534] ring-1 ring-[#CDE6D5]'
                        : 'bg-white text-[#4B5563] ring-1 ring-[#CFCFCF]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm text-[#4B5563] sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[#767676]">Tipo</dt>
                    <dd className="mt-1 font-semibold text-[#222222]">{item.tipo}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#767676]">Categoria</dt>
                    <dd className="mt-1 font-semibold text-[#222222]">{item.categoria}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#767676]">Revisão</dt>
                    <dd className="mt-1 font-semibold text-[#222222]">{item.revisao}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#767676]">Data da revisão</dt>
                    <dd className="mt-1 font-semibold text-[#222222]">
                      {formatarData(item.dataRevisao)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 break-all rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#374151] ring-1 ring-[#CFCFCF]">
                  {item.arquivoAtual}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">{item.observacao}</p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled
                    className="min-h-[52px] rounded-lg bg-[#E5E7EB] px-5 py-4 text-base font-semibold text-[#64748B]"
                  >
                    Abrir na V1 desktop
                  </button>
                  <button
                    type="button"
                    disabled
                    className="min-h-[52px] rounded-lg bg-white px-5 py-4 text-base font-semibold text-[#64748B] ring-1 ring-[#CFCFCF]"
                  >
                    Anexar depois
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
