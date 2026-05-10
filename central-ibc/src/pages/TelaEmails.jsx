import { useEffect, useMemo, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
} from '../features/programacao/constants'
import { listarDocumentosEmitidos } from '../features/documentos/utils/documentosEmitidos'
import { modelosEmailIbc } from '../features/email/utils/emailTemplates'
import {
  applyResolvedLabel,
  getThread,
  listInbox,
  markAsRead,
  replyToThread,
  sendNewEmail,
} from '../features/email/utils/gmailService'
import {
  carregarEstadoEmails,
  listarLogsEmail,
  marcarThreadRespondida,
  registrarLogEmail,
} from '../features/email/utils/emailLogs'

const ABAS_EMAIL = [
  { id: 'naoLidos', rotulo: 'Nao lidos' },
  { id: 'todos', rotulo: 'Todos' },
  { id: 'respondidos', rotulo: 'Respondidos' },
  { id: 'resolvidos', rotulo: 'Resolvidos' },
]

const QUERY_POR_ABA = {
  naoLidos: 'in:inbox is:unread newer_than:30d',
  todos: 'in:inbox newer_than:30d',
  respondidos: 'in:inbox newer_than:30d',
  resolvidos: 'in:inbox newer_than:30d',
}

const statusClass = {
  info: 'border-[#D9D9D9] bg-[#F6F6F6] text-[#334155]',
  sucesso: 'border-[#CDE6D5] bg-[#EEF7F2] text-[#166534]',
  erro: 'border-[#E5B5B8] bg-[#FFF5F5] text-[#991B1B]',
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function criarNovoEmailVazio() {
  return {
    aberto: false,
    destinatarioEmail: '',
    assunto: '',
    mensagem: '',
    anexos: [],
  }
}

function montarAssuntoResposta(assunto) {
  const assuntoLimpo = normalizarTexto(assunto)

  if (!assuntoLimpo) {
    return 'Resposta IBC'
  }

  return assuntoLimpo.toLowerCase().startsWith('re:') ? assuntoLimpo : `Re: ${assuntoLimpo}`
}

function formatarDataEmail(valor) {
  const texto = normalizarTexto(valor)

  if (!texto) {
    return 'Sem data'
  }

  const data = new Date(texto)

  if (Number.isNaN(data.getTime())) {
    return texto
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function documentoEhDeclaracao(documento) {
  const base = `${documento?.tipo || ''} ${documento?.origem || ''}`.toLowerCase()
  return base.includes('declara')
}

function documentoEhPrestacao(documento) {
  const base = `${documento?.tipo || ''} ${documento?.origem || ''}`.toLowerCase()
  return base.includes('presta')
}

function criarAnexoDocumento(documento) {
  const anexo = documento?.anexoPrincipal || {}
  const nomeArquivo = normalizarTexto(anexo.nomeArquivo || documento?.nomeArquivoPdf)

  return {
    id: documento?.id,
    rotulo: `${normalizarTexto(documento?.tipo) || 'Documento'} | ${
      normalizarTexto(documento?.aluno) || 'Sem aluno'
    } | ${nomeArquivo || 'PDF'}`,
    nomeArquivo: nomeArquivo || 'documento.pdf',
    mimeType: normalizarTexto(anexo.mimeType) || 'application/pdf',
    base64: normalizarTexto(anexo.base64),
  }
}

function prepararAnexosEnvio(anexos) {
  return anexos
    .map((anexo) => ({
      nomeArquivo: anexo.nomeArquivo,
      mimeType: anexo.mimeType,
      base64: anexo.base64,
    }))
    .filter((anexo) => anexo.base64)
}

function SeletorAnexos({ documentos, anexosSelecionados, onAdicionar, onRemover }) {
  const declaracoes = documentos.filter(documentoEhDeclaracao)
  const prestacoes = documentos.filter(documentoEhPrestacao)

  function handleSelecionar(documentoId) {
    const documento = documentos.find((item) => item.id === documentoId)

    if (documento) {
      onAdicionar(documento)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#4B5563]">Anexar declaracao</span>
          <select
            value=""
            onChange={(event) => handleSelecionar(event.target.value)}
            className="min-h-[52px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-base font-semibold text-[#222222]"
          >
            <option value="">Escolher PDF gerado</option>
            {declaracoes.map((documento) => (
              <option key={documento.id} value={documento.id}>
                {documento.aluno} | {documento.nomeArquivoPdf}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#4B5563]">Anexar prestacao</span>
          <select
            value=""
            onChange={(event) => handleSelecionar(event.target.value)}
            className="min-h-[52px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-base font-semibold text-[#222222]"
          >
            <option value="">Escolher PDF gerado</option>
            {prestacoes.map((documento) => (
              <option key={documento.id} value={documento.id}>
                {documento.aluno} | {documento.nomeArquivoPdf}
              </option>
            ))}
          </select>
        </label>
      </div>

      {anexosSelecionados.length > 0 ? (
        <div className="grid gap-2 rounded-lg border border-[#D9D9D9] bg-white p-3">
          {anexosSelecionados.map((anexo) => (
            <div
              key={`${anexo.id}:${anexo.nomeArquivo}`}
              className="flex flex-col gap-2 rounded-lg bg-[#F6F6F6] p-3 md:flex-row md:items-center md:justify-between"
            >
              <span className="break-all text-sm font-bold text-[#374151]">{anexo.rotulo}</span>
              <button
                type="button"
                onClick={() => onRemover(anexo.id)}
                className="min-h-[44px] rounded-lg border border-[#CFCFCF] bg-white px-4 py-2 text-sm font-bold text-[#991B1B]"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function BotaoModelo({ onAplicar }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-[#4B5563]">Usar modelo</span>
      <select
        value=""
        onChange={(event) => onAplicar(event.target.value)}
        className="min-h-[52px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-base font-semibold text-[#222222]"
      >
        <option value="">Escolher texto pronto</option>
        {modelosEmailIbc.map((modelo) => (
          <option key={modelo.id} value={modelo.id}>
            {modelo.titulo}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function TelaEmails({ onVoltar }) {
  const [abaAtiva, setAbaAtiva] = useState('naoLidos')
  const [emails, setEmails] = useState([])
  const [emailSelecionado, setEmailSelecionado] = useState(null)
  const [threadSelecionada, setThreadSelecionada] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [estadoEmails, setEstadoEmails] = useState(() => carregarEstadoEmails())
  const [status, setStatus] = useState(null)
  const [carregandoLista, setCarregandoLista] = useState(false)
  const [carregandoThread, setCarregandoThread] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [respostaMensagem, setRespostaMensagem] = useState('')
  const [respostaAnexos, setRespostaAnexos] = useState([])
  const [novoEmail, setNovoEmail] = useState(() => criarNovoEmailVazio())
  const [logsRecentes, setLogsRecentes] = useState(() => listarLogsEmail().slice(0, 4))
  const queryAtual = QUERY_POR_ABA[abaAtiva] || QUERY_POR_ABA.todos

  useEffect(() => {
    let ativo = true

    async function carregarDocumentos() {
      try {
        const lista = await listarDocumentosEmitidos()
        const documentosComPdf = lista
          .filter((documento) => documento?.anexoPrincipal?.base64)
          .slice(0, 120)

        if (ativo) {
          setDocumentos(documentosComPdf)
        }
      } catch {
        if (ativo) {
          setDocumentos([])
        }
      }
    }

    carregarDocumentos()

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    let ativo = true

    async function carregarListaInicial() {
      setCarregandoLista(true)
      setStatus({ tipo: 'info', mensagem: 'Carregando e-mails da conta IBC...' })

      try {
        const lista = await listInbox({ query: queryAtual, maxResults: 50 })

        if (ativo) {
          setEmails(lista)
          setStatus(null)
        }
      } catch (erro) {
        if (ativo) {
          setEmails([])
          setStatus({
            tipo: 'erro',
            mensagem: erro?.message || 'Nao foi possivel carregar os e-mails.',
          })
        }
      } finally {
        if (ativo) {
          setCarregandoLista(false)
        }
      }
    }

    carregarListaInicial()

    return () => {
      ativo = false
    }
  }, [queryAtual])

  const emailsFiltrados = useMemo(() => {
    const respondidos = new Set(estadoEmails.respondidos)
    const resolvidos = new Set(estadoEmails.resolvidos)

    if (abaAtiva === 'respondidos') {
      return emails.filter((email) => respondidos.has(email.threadId))
    }

    if (abaAtiva === 'resolvidos') {
      return emails.filter((email) => resolvidos.has(email.threadId))
    }

    return emails
  }, [abaAtiva, emails, estadoEmails.respondidos, estadoEmails.resolvidos])

  async function handleAtualizarLista() {
    setCarregandoLista(true)
    setStatus({ tipo: 'info', mensagem: 'Atualizando e-mails...' })

    try {
      const lista = await listInbox({ query: queryAtual, maxResults: 50 })
      setEmails(lista)
      setEstadoEmails(carregarEstadoEmails())
      setStatus({ tipo: 'sucesso', mensagem: 'Lista atualizada.' })
    } catch (erro) {
      setStatus({
        tipo: 'erro',
        mensagem: erro?.message || 'Nao foi possivel atualizar os e-mails.',
      })
    } finally {
      setCarregandoLista(false)
    }
  }

  function atualizarLogsRecentes() {
    setLogsRecentes(listarLogsEmail().slice(0, 4))
  }

  async function handleAbrirEmail(email) {
    setEmailSelecionado(email)
    setThreadSelecionada(null)
    setRespostaMensagem('')
    setRespostaAnexos([])
    setCarregandoThread(true)
    setStatus({ tipo: 'info', mensagem: 'Abrindo conversa...' })

    try {
      const thread = await getThread(email.threadId)
      setThreadSelecionada(thread)
      setStatus(null)

      if (email.naoLido) {
        try {
          await markAsRead(email.id)
          setEmails((atuais) =>
            atuais.map((item) =>
              item.id === email.id || item.threadId === email.threadId
                ? { ...item, naoLido: false }
                : item,
            ),
          )
          registrarLogEmail({
            acao: 'E-mail lido',
            detalhe: email.assunto,
            threadId: email.threadId,
            email: email.remetente,
          })
          atualizarLogsRecentes()
        } catch {
          // Leitura da conversa nao deve falhar se a permissao de marcar como lido nao existir.
        }
      }
    } catch (erro) {
      setStatus({
        tipo: 'erro',
        mensagem: erro?.message || 'Nao foi possivel abrir a conversa.',
      })
    } finally {
      setCarregandoThread(false)
    }
  }

  function handleAplicarModeloResposta(modeloId) {
    const modelo = modelosEmailIbc.find((item) => item.id === modeloId)

    if (modelo) {
      setRespostaMensagem(modelo.corpo)
    }
  }

  function handleAplicarModeloNovo(modeloId) {
    const modelo = modelosEmailIbc.find((item) => item.id === modeloId)

    if (modelo) {
      setNovoEmail((atual) => ({
        ...atual,
        assunto: atual.assunto || modelo.assuntoPadrao,
        mensagem: modelo.corpo,
      }))
    }
  }

  function adicionarAnexo(setter, documento) {
    const anexo = criarAnexoDocumento(documento)

    if (!anexo.base64) {
      setStatus({ tipo: 'erro', mensagem: 'Este documento nao tem PDF salvo para anexar.' })
      return
    }

    setter((atuais) => {
      if (atuais.some((item) => item.id === anexo.id)) {
        return atuais
      }

      return [...atuais, anexo]
    })
  }

  async function handleEnviarResposta(event) {
    event.preventDefault()

    if (!threadSelecionada) {
      setStatus({ tipo: 'erro', mensagem: 'Abra uma conversa antes de responder.' })
      return
    }

    const destinatarioEmail = normalizarTexto(threadSelecionada.replyTo || emailSelecionado?.remetente)
    const mensagem = normalizarTexto(respostaMensagem)

    if (!destinatarioEmail) {
      setStatus({ tipo: 'erro', mensagem: 'Nao foi possivel identificar o destinatario.' })
      return
    }

    if (!mensagem) {
      setStatus({ tipo: 'erro', mensagem: 'Digite a resposta antes de enviar.' })
      return
    }

    setEnviando(true)
    setStatus({ tipo: 'info', mensagem: 'Enviando resposta na conversa...' })

    try {
      const assunto = montarAssuntoResposta(threadSelecionada.assunto || emailSelecionado?.assunto)
      await replyToThread({
        threadId: threadSelecionada.id,
        destinatarioEmail,
        assunto,
        mensagem,
        inReplyTo: threadSelecionada.inReplyTo,
        references: threadSelecionada.references,
        anexos: prepararAnexosEnvio(respostaAnexos),
      })
      const estadoAtualizado = marcarThreadRespondida(threadSelecionada.id)
      setEstadoEmails(estadoAtualizado)
      registrarLogEmail({
        acao: 'Resposta enviada',
        detalhe: assunto,
        threadId: threadSelecionada.id,
        email: destinatarioEmail,
      })
      atualizarLogsRecentes()
      setRespostaMensagem('')
      setRespostaAnexos([])
      setStatus({ tipo: 'sucesso', mensagem: 'Resposta enviada na mesma conversa.' })
      setThreadSelecionada(await getThread(threadSelecionada.id))
    } catch (erro) {
      setStatus({
        tipo: 'erro',
        mensagem: erro?.message || 'Nao foi possivel enviar a resposta.',
      })
    } finally {
      setEnviando(false)
    }
  }

  async function handleEnviarNovoEmail(event) {
    event.preventDefault()

    const destinatarioEmail = normalizarTexto(novoEmail.destinatarioEmail)
    const assunto = normalizarTexto(novoEmail.assunto)
    const mensagem = normalizarTexto(novoEmail.mensagem)

    if (!destinatarioEmail || !assunto || !mensagem) {
      setStatus({ tipo: 'erro', mensagem: 'Preencha destinatario, assunto e mensagem.' })
      return
    }

    setEnviando(true)
    setStatus({ tipo: 'info', mensagem: 'Enviando novo e-mail...' })

    try {
      await sendNewEmail({
        destinatarioEmail,
        assunto,
        mensagem,
        anexos: prepararAnexosEnvio(novoEmail.anexos),
      })
      registrarLogEmail({
        acao: 'Novo e-mail enviado',
        detalhe: assunto,
        email: destinatarioEmail,
      })
      atualizarLogsRecentes()
      setNovoEmail(criarNovoEmailVazio())
      setStatus({ tipo: 'sucesso', mensagem: 'E-mail enviado pela conta IBC.' })
    } catch (erro) {
      setStatus({
        tipo: 'erro',
        mensagem: erro?.message || 'Nao foi possivel enviar o e-mail.',
      })
    } finally {
      setEnviando(false)
    }
  }

  async function handleMarcarResolvido() {
    if (!threadSelecionada) {
      return
    }

    const estadoAtualizado = await applyResolvedLabel(threadSelecionada.id)
    setEstadoEmails(estadoAtualizado)
    registrarLogEmail({
      acao: 'E-mail marcado como resolvido',
      detalhe: threadSelecionada.assunto,
      threadId: threadSelecionada.id,
      email: threadSelecionada.replyTo,
    })
    atualizarLogsRecentes()
    setStatus({ tipo: 'sucesso', mensagem: 'Conversa marcada como resolvida no sistema.' })
  }

  return (
    <>
      <BarraTopo
        titulo="E-mails"
        subtitulo="Caixa IBC simples para ler, responder e enviar documentos sem abrir o Gmail do navegador."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Caixa de E-mail IBC
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#1F1F1F]">
              Atendimento simples, sem Gmail aberto
            </h2>
            <p className="mt-2 max-w-3xl text-base font-medium leading-relaxed text-[#374151]">
              Use esta tela para abrir conversas, responder no mesmo assunto e anexar PDFs gerados
              no sistema.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={() => setNovoEmail((atual) => ({ ...atual, aberto: !atual.aberto }))}
              className={botaoPrimarioClass}
            >
              Novo e-mail
            </button>
            <button
              type="button"
              onClick={handleAtualizarLista}
              disabled={carregandoLista}
              className={botaoSecundarioClass}
            >
              {carregandoLista ? 'Atualizando...' : 'Atualizar lista'}
            </button>
          </div>
        </div>

        {status ? (
          <div
            className={`mt-5 rounded-lg border px-5 py-4 text-base font-bold ${
              statusClass[status.tipo] || statusClass.info
            }`}
          >
            {status.mensagem}
          </div>
        ) : null}
      </section>

      {novoEmail.aberto ? (
        <section className={`${cartaoPrincipalClass} mt-5`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#B40105]">
                Novo e-mail
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#1F1F1F]">Enviar mensagem simples</h2>
            </div>
            <button
              type="button"
              onClick={() => setNovoEmail(criarNovoEmailVazio())}
              className={botaoSecundarioClass}
            >
              Fechar
            </button>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={handleEnviarNovoEmail}>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#4B5563]">Para</span>
              <input
                type="email"
                value={novoEmail.destinatarioEmail}
                onChange={(event) =>
                  setNovoEmail((atual) => ({ ...atual, destinatarioEmail: event.target.value }))
                }
                className="min-h-[56px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-lg text-[#222222]"
                placeholder="nome@empresa.com.br"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#4B5563]">Assunto</span>
              <input
                value={novoEmail.assunto}
                onChange={(event) =>
                  setNovoEmail((atual) => ({ ...atual, assunto: event.target.value }))
                }
                className="min-h-[56px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-lg text-[#222222]"
                placeholder="Assunto do e-mail"
              />
            </label>

            <BotaoModelo onAplicar={handleAplicarModeloNovo} />

            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#4B5563]">Mensagem</span>
              <textarea
                rows={8}
                value={novoEmail.mensagem}
                onChange={(event) =>
                  setNovoEmail((atual) => ({ ...atual, mensagem: event.target.value }))
                }
                className="min-h-[220px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-lg leading-relaxed text-[#222222]"
                placeholder="Escreva a mensagem."
              />
            </label>

            <SeletorAnexos
              documentos={documentos}
              anexosSelecionados={novoEmail.anexos}
              onAdicionar={(documento) =>
                adicionarAnexo(
                  (callback) =>
                    setNovoEmail((atual) => ({
                      ...atual,
                      anexos: callback(atual.anexos),
                    })),
                  documento,
                )
              }
              onRemover={(id) =>
                setNovoEmail((atual) => ({
                  ...atual,
                  anexos: atual.anexos.filter((anexo) => anexo.id !== id),
                }))
              }
            />

            <button type="submit" disabled={enviando} className={`${botaoPrimarioClass} text-lg`}>
              {enviando ? 'Enviando...' : 'Enviar e-mail'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(560px,1.35fr)]">
        <div className={cartaoPrincipalClass}>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            {ABAS_EMAIL.map((aba) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={`min-h-[54px] rounded-lg px-4 py-3 text-base font-black transition-colors ${
                  abaAtiva === aba.id
                    ? 'bg-[#B40105] text-white'
                    : 'border border-[#CFCFCF] bg-white text-[#222222] hover:border-[#B40105]'
                }`}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            {carregandoLista ? (
              <div className={cartaoSecundarioClass}>
                <p className="text-lg font-bold text-[#374151]">Carregando e-mails...</p>
              </div>
            ) : null}

            {!carregandoLista && emailsFiltrados.length === 0 ? (
              <div className={cartaoSecundarioClass}>
                <p className="text-lg font-bold text-[#1F1F1F]">Nenhum e-mail nesta aba.</p>
                <p className="mt-2 text-base font-medium text-[#4B5563]">
                  Use Atualizar lista ou abra a aba Todos.
                </p>
              </div>
            ) : null}

            {emailsFiltrados.map((email) => (
              <article
                key={email.id}
                className={`rounded-lg border p-4 ${
                  emailSelecionado?.threadId === email.threadId
                    ? 'border-[#B40105] bg-[#FFF7F7]'
                    : 'border-[#CFCFCF] bg-white'
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {email.naoLido ? (
                        <span className="rounded-full bg-[#B40105] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
                          Novo
                        </span>
                      ) : null}
                      <span className="text-sm font-bold text-[#767676]">
                        {formatarDataEmail(email.data)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-xl font-black leading-tight text-[#1F1F1F]">
                      {email.assunto || 'Sem assunto'}
                    </h3>
                    <p className="mt-1 break-all text-base font-bold text-[#374151]">
                      {email.remetente || 'Remetente nao identificado'}
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-base font-medium leading-relaxed text-[#4B5563]">
                  {email.snippet || 'Sem trecho disponivel.'}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleAbrirEmail(email)}
                    className={botaoPrimarioClass}
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAbrirEmail(email)}
                    className={botaoSecundarioClass}
                  >
                    Responder
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={cartaoPrincipalClass}>
          {!threadSelecionada && !carregandoThread ? (
            <div className={cartaoSecundarioClass}>
              <h2 className="text-2xl font-black text-[#1F1F1F]">Abra um e-mail</h2>
              <p className="mt-2 text-lg font-medium leading-relaxed text-[#374151]">
                A conversa aparece aqui. Depois voce pode responder, anexar declaracao ou anexar
                prestacao.
              </p>
            </div>
          ) : null}

          {carregandoThread ? (
            <div className={cartaoSecundarioClass}>
              <p className="text-lg font-bold text-[#374151]">Abrindo conversa...</p>
            </div>
          ) : null}

          {threadSelecionada ? (
            <div className="grid gap-5">
              <div className="flex flex-col gap-4 rounded-lg border border-[#CFCFCF] bg-[#F6F6F6] p-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#B40105]">
                    Conversa aberta
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[#1F1F1F]">
                    {threadSelecionada.assunto || emailSelecionado?.assunto || 'Sem assunto'}
                  </h2>
                  <p className="mt-2 break-all text-base font-bold text-[#374151]">
                    Responder para: {threadSelecionada.replyTo || 'Nao identificado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleMarcarResolvido}
                  className={botaoSecundarioClass}
                >
                  Marcar como resolvido
                </button>
              </div>

              <div className="grid max-h-[560px] gap-4 overflow-auto pr-1">
                {threadSelecionada.mensagens.map((mensagem) => (
                  <article
                    key={mensagem.id}
                    className="rounded-lg border border-[#D9D9D9] bg-white p-4 shadow-sm"
                  >
                    <div className="grid gap-1 text-sm font-bold text-[#4B5563]">
                      <span>{formatarDataEmail(mensagem.data)}</span>
                      <span className="break-all">De: {mensagem.remetente}</span>
                      <span className="break-all">Para: {mensagem.destinatario}</span>
                    </div>
                    <div className="mt-4 whitespace-pre-wrap rounded-lg bg-[#F6F6F6] p-4 text-base font-medium leading-relaxed text-[#222222]">
                      {mensagem.corpo || mensagem.snippet || 'Mensagem sem texto visivel.'}
                    </div>
                    {mensagem.anexos?.length > 0 ? (
                      <div className="mt-3 rounded-lg border border-[#D9D9D9] bg-white p-3">
                        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#767676]">
                          Anexos recebidos
                        </p>
                        <div className="mt-2 grid gap-2">
                          {mensagem.anexos.map((anexo) => (
                            <span
                              key={`${mensagem.id}:${anexo.nomeArquivo}`}
                              className="rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm font-bold text-[#374151]"
                            >
                              {anexo.nomeArquivo}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              <form className="grid gap-4 rounded-lg border border-[#CFCFCF] bg-[#F6F6F6] p-4" onSubmit={handleEnviarResposta}>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#B40105]">
                    Responder
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#1F1F1F]">
                    Escrever resposta nesta conversa
                  </h3>
                </div>

                <BotaoModelo onAplicar={handleAplicarModeloResposta} />

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-[#4B5563]">Mensagem</span>
                  <textarea
                    rows={9}
                    value={respostaMensagem}
                    onChange={(event) => setRespostaMensagem(event.target.value)}
                    className="min-h-[240px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-lg leading-relaxed text-[#222222]"
                    placeholder="Digite a resposta para esta conversa."
                  />
                </label>

                <SeletorAnexos
                  documentos={documentos}
                  anexosSelecionados={respostaAnexos}
                  onAdicionar={(documento) => adicionarAnexo(setRespostaAnexos, documento)}
                  onRemover={(id) =>
                    setRespostaAnexos((atuais) => atuais.filter((anexo) => anexo.id !== id))
                  }
                />

                <button type="submit" disabled={enviando} className={`${botaoPrimarioClass} text-lg`}>
                  {enviando ? 'Enviando...' : 'Enviar resposta'}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      {logsRecentes.length > 0 ? (
        <section className={`${cartaoPrincipalClass} mt-5`}>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#767676]">
            Ultimas acoes registradas
          </p>
          <div className="mt-3 grid gap-2">
            {logsRecentes.map((log) => (
              <div key={log.id} className="rounded-lg bg-[#F6F6F6] px-4 py-3">
                <p className="text-base font-black text-[#1F1F1F]">{log.acao}</p>
                <p className="mt-1 text-sm font-semibold text-[#4B5563]">
                  {formatarDataEmail(log.criadoEm)} {log.email ? `| ${log.email}` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
