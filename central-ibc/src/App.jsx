import { useEffect, useRef, useState } from 'react'
import { programacaoMensalInicial } from './data/mockData'
import {
  agruparProgramacoesPorGrupo,
  normalizarAgendaMensal,
  normalizarProgramacao,
  salvarProgramacaoAgrupada,
} from './features/programacao/utils/programacaoUtils'
import {
  carregarAgendaProgramacao,
  salvarAgendaProgramacao,
} from './features/programacao/utils/programacaoPersistencia'
import {
  criarAssinaturaAgendaProgramacao,
  enviarAvisoAlteracaoProgramacao,
} from './features/programacao/utils/programacaoEmailAvisos'
import TelaBusca from './pages/TelaBusca'
import TelaConfiguracoes from './pages/TelaConfiguracoes'
import TelaDeclaracoes from './pages/TelaDeclaracoes'
import TelaDocumentosConfiguracao from './pages/TelaDocumentosConfiguracao'
import TelaEmails from './pages/TelaEmails'
import TelaEnvioEmail from './pages/TelaEnvioEmail'
import TelaInicial from './pages/TelaInicial'
import TelaInstitucional from './pages/TelaInstitucional'
import TelaModelos from './pages/TelaModelos'
import TelaOperacao from './pages/TelaOperacao'
import TelaPrestacao from './pages/TelaPrestacao'
import TelaProgramacao from './pages/TelaProgramacao'
import TelaValores from './pages/TelaValores'

function criarContextoEmailInicial(origem = 'inicio') {
  return {
    origem,
    tipoDocumento: '',
    nomeDocumento: '',
    nomePessoa: '',
    destinatarioEmail: '',
    assuntoSugerido: '',
    mensagemSugerida: '',
    nomeArquivoPdf: '',
    anexoPrincipal: null,
    documentoEmitidoId: '',
  }
}

export default function App() {
  const [tela, setTela] = useState('inicio')
  const [agendaMensal, setAgendaMensal] = useState(() =>
    normalizarAgendaMensal(programacaoMensalInicial),
  )
  const [statusPersistenciaProgramacao, setStatusPersistenciaProgramacao] = useState({
    estado: 'carregando',
    mensagem: 'Carregando agenda salva...',
    atualizadoEm: '',
  })
  const carregamentoProgramacaoFinalizadoRef = useRef(false)
  const [programacaoContexto, setProgramacaoContexto] = useState({
    origem: 'inicio',
    grupoIdProgramacao: null,
    abrirEdicao: false,
    dataSelecionada: null,
  })
  const [prestacaoContexto, setPrestacaoContexto] = useState({
    grupoIdProgramacao: null,
    origem: 'inicio',
    programacaoResumo: null,
  })
  const [declaracaoContexto, setDeclaracaoContexto] = useState({
    grupoIdProgramacao: null,
    origem: 'inicio',
    programacaoResumo: null,
  })
  const [emailContexto, setEmailContexto] = useState(() => criarContextoEmailInicial())
  const agendaBaseAvisoProgramacaoRef = useRef(null)
  const agendaPendenteAvisoProgramacaoRef = useRef(null)
  const timeoutAvisoProgramacaoRef = useRef(null)

  useEffect(() => {
    let ativo = true

    async function carregarAgendaSalva() {
      try {
        const agendaSalva = await carregarAgendaProgramacao()

        if (!ativo) {
          return
        }

        if (agendaSalva?.agendaMensal) {
          agendaBaseAvisoProgramacaoRef.current = agendaSalva.agendaMensal
          setAgendaMensal(agendaSalva.agendaMensal)
          setStatusPersistenciaProgramacao({
            estado: 'salvo',
            mensagem: 'Agenda salva carregada.',
            atualizadoEm: agendaSalva.atualizadoEm,
          })
        } else {
          agendaBaseAvisoProgramacaoRef.current = normalizarAgendaMensal(programacaoMensalInicial)
          setStatusPersistenciaProgramacao({
            estado: 'salvo',
            mensagem: 'Agenda inicial carregada.',
            atualizadoEm: '',
          })
        }
      } catch {
        if (ativo) {
          setStatusPersistenciaProgramacao({
            estado: 'erro',
            mensagem: 'Não foi possível carregar a agenda salva.',
            atualizadoEm: '',
          })
        }
      } finally {
        if (ativo) {
          carregamentoProgramacaoFinalizadoRef.current = true
        }
      }
    }

    carregarAgendaSalva()

    return () => {
      ativo = false
    }
  }, [])

  useEffect(
    () => () => {
      if (timeoutAvisoProgramacaoRef.current) {
        window.clearTimeout(timeoutAvisoProgramacaoRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!carregamentoProgramacaoFinalizadoRef.current) {
      return undefined
    }

    let cancelado = false
    setStatusPersistenciaProgramacao((atual) => ({
      ...atual,
      estado: 'salvando',
      mensagem: 'Salvando agenda...',
    }))

    const timeoutId = window.setTimeout(async () => {
      try {
        const registro = await salvarAgendaProgramacao(agendaMensal)

        if (!cancelado) {
          setStatusPersistenciaProgramacao({
            estado: 'salvo',
            mensagem: 'Agenda salva automaticamente.',
            atualizadoEm: registro.atualizadoEm,
          })
          agendarAvisoAlteracaoProgramacao(agendaMensal)
        }
      } catch {
        if (!cancelado) {
          setStatusPersistenciaProgramacao({
            estado: 'erro',
            mensagem: 'Não foi possível salvar a agenda automaticamente.',
            atualizadoEm: '',
          })
        }
      }
    }, 700)

    return () => {
      cancelado = true
      window.clearTimeout(timeoutId)
    }
  }, [agendaMensal])

  function agendarAvisoAlteracaoProgramacao(agendaAtual) {
    const agendaBase = agendaBaseAvisoProgramacaoRef.current

    if (!agendaBase) {
      agendaBaseAvisoProgramacaoRef.current = agendaAtual
      return
    }

    if (
      criarAssinaturaAgendaProgramacao(agendaBase) ===
      criarAssinaturaAgendaProgramacao(agendaAtual)
    ) {
      return
    }

    agendaPendenteAvisoProgramacaoRef.current = agendaAtual

    if (timeoutAvisoProgramacaoRef.current) {
      window.clearTimeout(timeoutAvisoProgramacaoRef.current)
    }

    timeoutAvisoProgramacaoRef.current = window.setTimeout(async () => {
      const agendaAnterior = agendaBaseAvisoProgramacaoRef.current
      const agendaParaEnviar = agendaPendenteAvisoProgramacaoRef.current

      if (!agendaAnterior || !agendaParaEnviar) {
        return
      }

      try {
        const retorno = await enviarAvisoAlteracaoProgramacao({
          agendaAnterior,
          agendaAtual: agendaParaEnviar,
        })

        if (retorno.enviado) {
          setStatusPersistenciaProgramacao((atual) => ({
            ...atual,
            estado: 'salvo',
            mensagem: 'Agenda salva. Aviso por e-mail enviado.',
          }))
        }
      } catch (erro) {
        setStatusPersistenciaProgramacao((atual) => ({
          ...atual,
          estado: 'salvo',
          mensagem: `Agenda salva. Aviso por e-mail nao enviado: ${
            erro?.message || 'erro no envio'
          }`,
        }))
      } finally {
        agendaBaseAvisoProgramacaoRef.current = agendaParaEnviar
        agendaPendenteAvisoProgramacaoRef.current = null
        timeoutAvisoProgramacaoRef.current = null
      }
    }, 8000)
  }

  function handleAbrir(destino) {
    setTela(destino)

    if (destino === 'programacao') {
      setProgramacaoContexto({
        origem: 'inicio',
        grupoIdProgramacao: null,
        abrirEdicao: false,
        dataSelecionada: null,
      })
    }

    if (destino === 'prestacao') {
      setPrestacaoContexto({
        grupoIdProgramacao: null,
        origem: 'inicio',
        programacaoResumo: null,
      })
      return
    }

    if (destino === 'declaracoes') {
      setDeclaracaoContexto({
        grupoIdProgramacao: null,
        origem: 'inicio',
        programacaoResumo: null,
      })
      return
    }

    if (destino === 'email') {
      setEmailContexto(criarContextoEmailInicial('inicio'))
      return
    }

    if (destino === 'emails') {
      return
    }

    if (destino === 'valores') {
      return
    }

    setPrestacaoContexto({
      grupoIdProgramacao: null,
      origem: destino,
      programacaoResumo: null,
    })
  }

  function handleAbrirProgramacaoEdicao(
    grupoIdProgramacao = null,
    origem = 'inicio',
    dataSelecionada = null,
  ) {
    setProgramacaoContexto({
      origem,
      grupoIdProgramacao,
      abrirEdicao: Boolean(grupoIdProgramacao),
      dataSelecionada,
    })
    setTela('programacao')
  }

  function handleAbrirPrestacao(
    grupoIdProgramacao = null,
    origem = 'inicio',
    programacaoResumo = null,
  ) {
    setPrestacaoContexto({
      grupoIdProgramacao,
      origem,
      programacaoResumo,
    })
    setTela('prestacao')
  }

  function handleAbrirDeclaracoes(
    grupoIdProgramacao = null,
    origem = 'inicio',
    programacaoResumo = null,
  ) {
    setDeclaracaoContexto({
      grupoIdProgramacao,
      origem,
      programacaoResumo,
    })
    setTela('declaracoes')
  }

  function handleAbrirEmail(contextoDocumento = null, origem = 'inicio') {
    setEmailContexto({
      ...criarContextoEmailInicial(origem),
      ...(contextoDocumento ?? {}),
      origem,
    })
    setTela('email')
  }

  function handleAtualizarProgramacaoOrigem(grupoIdProgramacao, camposAtualizados = {}) {
    if (!grupoIdProgramacao) {
      return
    }

    setAgendaMensal((agendaAtual) => {
      const programacaoAtual = agruparProgramacoesPorGrupo(agendaAtual).find(
        (programacao) => programacao.grupoId === grupoIdProgramacao,
      )

      if (!programacaoAtual) {
        return agendaAtual
      }

      const programacaoAtualizada = normalizarProgramacao({
        ...programacaoAtual,
        ...camposAtualizados,
      })

      return salvarProgramacaoAgrupada(agendaAtual, programacaoAtualizada)
    })
  }

  function handleVoltarPrestacao() {
    setTela(prestacaoContexto.origem === 'programacao' ? 'programacao' : 'inicio')
  }

  function handleVoltarDeclaracoes() {
    setTela(declaracaoContexto.origem === 'programacao' ? 'programacao' : 'inicio')
  }

  function handleVoltarEmail() {
    if (emailContexto.origem === 'declaracoes') {
      setTela('declaracoes')
      return
    }

    if (emailContexto.origem === 'prestacao') {
      setTela('prestacao')
      return
    }

    if (emailContexto.origem === 'programacao') {
      setTela('programacao')
      return
    }

    if (emailContexto.origem === 'buscar') {
      setTela('buscar')
      return
    }

    if (emailContexto.origem === 'modelos') {
      setTela('modelos')
      return
    }

    setTela('inicio')
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] p-3 md:p-6 xl:p-8">
      <div className="mx-auto w-full">
        {tela === 'inicio' && <TelaInicial onAbrir={handleAbrir} />}
        {tela === 'modelos' && (
          <TelaModelos
            onVoltar={() => setTela('inicio')}
            onAbrirEnvioEmail={(contextoDocumento) =>
              handleAbrirEmail(contextoDocumento, 'modelos')
            }
          />
        )}
        {tela === 'programacao' && (
          <TelaProgramacao
            onVoltar={() =>
              setTela(
                programacaoContexto.origem === 'declaracoes'
                  ? 'declaracoes'
                  : programacaoContexto.origem === 'prestacao'
                    ? 'prestacao'
                    : 'inicio',
              )
            }
            agendaMensal={agendaMensal}
            setAgendaMensal={setAgendaMensal}
            statusPersistencia={statusPersistenciaProgramacao}
            grupoIdProgramacaoInicial={programacaoContexto.grupoIdProgramacao}
            abrirEdicaoInicial={programacaoContexto.abrirEdicao}
            dataSelecionadaInicial={programacaoContexto.dataSelecionada}
            onAbrirPrestacao={(grupoIdProgramacao, programacaoResumo) =>
              handleAbrirPrestacao(grupoIdProgramacao, 'programacao', programacaoResumo)
            }
            onAbrirDeclaracoes={(grupoIdProgramacao, programacaoResumo) =>
              handleAbrirDeclaracoes(grupoIdProgramacao, 'programacao', programacaoResumo)
            }
          />
        )}
        {tela === 'prestacao' && (
          <TelaPrestacao
            onVoltar={handleVoltarPrestacao}
            onVoltarProgramacao={() => setTela('programacao')}
            agendaMensal={agendaMensal}
            grupoIdProgramacaoInicial={prestacaoContexto.grupoIdProgramacao}
            programacaoInicialResumo={prestacaoContexto.programacaoResumo}
            onAtualizarProgramacaoOrigem={handleAtualizarProgramacaoOrigem}
            onAbrirProgramacaoEdicao={(grupoIdProgramacao, dataSelecionada) =>
              handleAbrirProgramacaoEdicao(grupoIdProgramacao, 'prestacao', dataSelecionada)
            }
            onAbrirEnvioEmail={(contextoDocumento) =>
              handleAbrirEmail(contextoDocumento, 'prestacao')
            }
          />
        )}
        {tela === 'declaracoes' && (
          <TelaDeclaracoes
            onVoltar={handleVoltarDeclaracoes}
            agendaMensal={agendaMensal}
            programacaoInicialResumo={declaracaoContexto.programacaoResumo}
            onAtualizarProgramacaoOrigem={handleAtualizarProgramacaoOrigem}
            onAbrirProgramacaoEdicao={(grupoIdProgramacao, dataSelecionada) =>
              handleAbrirProgramacaoEdicao(grupoIdProgramacao, 'declaracoes', dataSelecionada)
            }
            onAbrirEnvioEmail={(contextoDocumento) =>
              handleAbrirEmail(contextoDocumento, 'declaracoes')
            }
          />
        )}
        {tela === 'buscar' && (
          <TelaBusca
            onVoltar={() => setTela('inicio')}
            onAbrirEnvioEmail={(contextoDocumento) => handleAbrirEmail(contextoDocumento, 'buscar')}
          />
        )}
        {tela === 'configuracoes' && (
          <TelaConfiguracoes
            onVoltar={() => setTela('inicio')}
            onAbrirValores={() => setTela('valores')}
            onAbrirOperacao={() => setTela('operacao')}
            onAbrirInstitucional={() => setTela('institucional')}
            onAbrirDocumentos={() => setTela('documentos-configuracao')}
          />
        )}
        {tela === 'operacao' && <TelaOperacao onVoltar={() => setTela('configuracoes')} />}
        {tela === 'institucional' && (
          <TelaInstitucional onVoltar={() => setTela('configuracoes')} />
        )}
        {tela === 'documentos-configuracao' && (
          <TelaDocumentosConfiguracao onVoltar={() => setTela('configuracoes')} />
        )}
        {tela === 'valores' && <TelaValores onVoltar={() => setTela('configuracoes')} />}
        {tela === 'emails' && <TelaEmails onVoltar={() => setTela('inicio')} />}
        {tela === 'email' && (
          <TelaEnvioEmail
            key={`${emailContexto.origem}:${emailContexto.documentoEmitidoId}:${emailContexto.nomeDocumento}:${emailContexto.nomeArquivoPdf}`}
            onVoltar={handleVoltarEmail}
            contextoEmail={emailContexto}
          />
        )}
      </div>
    </div>
  )
}
