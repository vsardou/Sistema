import { useMemo, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import { programacaoMensalInicial } from '../data/mockData'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  botaoSecundarioCompactoClass,
  cartaoSecundarioClass,
  coresPorValor,
  diasSemana,
  estiloCancelado,
  estilosStatus,
} from '../features/programacao/constants'
import {
  criarChaveData,
  formatarDataCurta,
  formatarDataExtensa,
  formatarMesAno,
  formatarQuantidadeAparelhos,
  formatarQuantidadeAlunos,
  formatarQuantidadeDatas,
  getInfoMes,
  ordenarDatas,
} from '../features/programacao/utils/dateUtils'
import {
  agruparProgramacoesPorGrupo,
  atualizarStatusGrupo,
  calcularResumoAparelhosDoMes,
  calcularResumoHospedagemDoMes,
  criarFormularioEdicao,
  criarFormularioInicial,
  getContagemPrincipal,
  getCorAutomatica,
  getMesInicial,
  getProgramacoesDoDia,
  normalizarAgendaMensal,
  normalizarProgramacao,
  removerProgramacaoGrupo,
  salvarProgramacaoAgrupada,
} from '../features/programacao/utils/programacaoUtils'
import { criarResumoTreinamentoProgramacao } from '../features/programacao/utils/programacaoNormalization'
import { gerarBase64PdfAgendaMensal } from '../features/programacao/utils/programacaoPdf'
import { validarFormularioProgramacao } from '../features/programacao/utils/validation'
import { carregarConfiguracaoOperacional } from '../features/configuracoes/configuracaoOperacional'
import {
  abrirCaminhoSistema,
  salvarPdfOficial,
} from '../features/documentos/utils/documentosOficiais'

function criarGrupoIdProgramacao() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `grupo-${crypto.randomUUID()}`
  }

  return `grupo-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getPrimeiroNome(nome) {
  return (nome || 'Aluno').trim().split(/\s+/)[0] || 'Aluno'
}

function formatarStatusProgramacao(status) {
  const rotulos = {
    concluido: 'concluído',
  }

  return rotulos[status] ?? status
}

export default function TelaProgramacao({
  onVoltar,
  agendaMensal: agendaMensalProp,
  setAgendaMensal: setAgendaMensalProp,
  statusPersistencia = null,
  onAbrirPrestacao,
  onAbrirDeclaracoes,
  grupoIdProgramacaoInicial = null,
  abrirEdicaoInicial = false,
  dataSelecionadaInicial = null,
}) {
  const agendaMensalInicial = agendaMensalProp ?? normalizarAgendaMensal(programacaoMensalInicial)
  const mesInicial = getMesInicial(agendaMensalInicial)
  const programacaoInicialSelecionada = grupoIdProgramacaoInicial
    ? agruparProgramacoesPorGrupo(agendaMensalInicial).find(
        (programacao) => programacao.grupoId === grupoIdProgramacaoInicial,
      ) ?? null
    : null
  const dataInicialSelecionada =
    dataSelecionadaInicial && programacaoInicialSelecionada?.dias.includes(dataSelecionadaInicial)
      ? dataSelecionadaInicial
      : programacaoInicialSelecionada?.dataInicial ?? null
  const [anoInicialComContexto, mesInicialComContexto] = dataInicialSelecionada
    ? (() => {
        const [ano, mes] = dataInicialSelecionada.split('-').map(Number)
        return [ano, mes]
      })()
    : [mesInicial.ano, mesInicial.mes]
  const [agendaMensalLocal, setAgendaMensalLocal] = useState(() =>
    normalizarAgendaMensal(programacaoMensalInicial),
  )
  const agendaMensal = agendaMensalProp ?? agendaMensalLocal
  const setAgendaMensal = setAgendaMensalProp ?? setAgendaMensalLocal
  const [mesAtual, setMesAtual] = useState(mesInicialComContexto)
  const [anoAtual, setAnoAtual] = useState(anoInicialComContexto)
  const [dataSelecionada, setDataSelecionada] = useState(dataInicialSelecionada)
  const deveAbrirEdicaoInicial = Boolean(abrirEdicaoInicial && programacaoInicialSelecionada)
  const [programacaoSelecionadaId, setProgramacaoSelecionadaId] = useState(
    programacaoInicialSelecionada?.grupoId ?? null,
  )
  const [painelAtivo, setPainelAtivo] = useState(programacaoInicialSelecionada ? 'treinamento' : 'dia')
  const [modalAberto, setModalAberto] = useState(deveAbrirEdicaoInicial)
  const [modoModal, setModoModal] = useState(deveAbrirEdicaoInicial ? 'editar' : 'adicionar')
  const [grupoEmEdicao, setGrupoEmEdicao] = useState(
    deveAbrirEdicaoInicial ? programacaoInicialSelecionada.grupoId : null,
  )
  const [mesSelecao, setMesSelecao] = useState(mesInicialComContexto)
  const [anoSelecao, setAnoSelecao] = useState(anoInicialComContexto)
  const [formulario, setFormulario] = useState(() =>
    deveAbrirEdicaoInicial
      ? criarFormularioEdicao(programacaoInicialSelecionada)
      : criarFormularioInicial(),
  )
  const [configuracaoOperacional] = useState(() => carregarConfiguracaoOperacional())
  const [mensagemFormulario, setMensagemFormulario] = useState('')
  const [mensagemPdf, setMensagemPdf] = useState('')
  const totalAparelhosDisponiveis = configuracaoOperacional.totalAparelhosDisponiveis
  const totalVagasHospedagem = configuracaoOperacional.totalVagasHospedagem

  const agendaDoMes = useMemo(
    () =>
      agendaMensal.find((item) => item.mes === mesAtual && item.ano === anoAtual) ?? {
        mes: mesAtual,
        ano: anoAtual,
        programacoes: [],
      },
    [agendaMensal, anoAtual, mesAtual],
  )

  const programacoesAgrupadas = useMemo(
    () => agruparProgramacoesPorGrupo(agendaMensal),
    [agendaMensal],
  )

  const programacoesPorGrupo = useMemo(
    () => new Map(programacoesAgrupadas.map((programacao) => [programacao.grupoId, programacao])),
    [programacoesAgrupadas],
  )

  const programacaoSelecionada = programacoesPorGrupo.get(programacaoSelecionadaId) ?? null

  const diasDoCalendario = useMemo(() => {
    const { totalDias, deslocamentoInicial } = getInfoMes(anoAtual, mesAtual)
    const dias = []

    for (let indice = 0; indice < deslocamentoInicial; indice += 1) {
      dias.push({
        key: `vazio-inicio-${indice}`,
        vazio: true,
      })
    }

    for (let dia = 1; dia <= totalDias; dia += 1) {
      const data = criarChaveData(anoAtual, mesAtual, dia)
      const programacoes = getProgramacoesDoDia(agendaDoMes.programacoes, data)

      dias.push({
        key: data,
        vazio: false,
        data,
        dia,
        programacoes,
        contagemPrincipal: getContagemPrincipal(programacoes),
        contagemCancelados: programacoes.filter((item) => item.status === 'cancelado').length,
      })
    }

    const espacosFinais = (7 - (dias.length % 7)) % 7

    for (let indice = 0; indice < espacosFinais; indice += 1) {
      dias.push({
        key: `vazio-fim-${indice}`,
        vazio: true,
      })
    }

    return dias
  }, [agendaDoMes.programacoes, anoAtual, mesAtual])

  const diasDoCalendarioSelecao = useMemo(() => {
    const { totalDias, deslocamentoInicial } = getInfoMes(anoSelecao, mesSelecao)
    const dias = []

    for (let indice = 0; indice < deslocamentoInicial; indice += 1) {
      dias.push({
        key: `modal-vazio-inicio-${indice}`,
        vazio: true,
      })
    }

    for (let dia = 1; dia <= totalDias; dia += 1) {
      const data = criarChaveData(anoSelecao, mesSelecao, dia)
      const programacoesExistentes = getProgramacoesDoDia(programacoesAgrupadas, data).filter(
        (programacao) =>
          programacao.status !== 'cancelado' && programacao.grupoId !== grupoEmEdicao,
      )
      const treinamentoExistente = programacoesExistentes.filter((programacao) =>
        programacao.diasTreinamento.includes(data),
      )
      const provaExistente = programacoesExistentes.filter((programacao) =>
        programacao.diasEmProva.includes(data),
      )
      const hospedagemExistente = programacoesExistentes.filter((programacao) =>
        programacao.diasHospedagem.includes(data),
      )
      const treinamentoSelecionado = formulario.diasSelecionados.includes(data)
      const provaSelecionada = formulario.diasEmProvaSelecionados.includes(data)
      const hospedagemSelecionada = formulario.diasHospedagemSelecionados.includes(data)
      const selecionado =
        formulario.modoSelecaoCalendario === 'prova'
          ? provaSelecionada
          : formulario.modoSelecaoCalendario === 'hospedagem'
            ? hospedagemSelecionada
            : treinamentoSelecionado

      dias.push({
        key: data,
        vazio: false,
        data,
        dia,
        selecionado,
        treinamentoSelecionado,
        provaSelecionada,
        hospedagemSelecionada,
        programacoesExistentes,
        treinamentoExistente,
        provaExistente,
        hospedagemExistente,
      })
    }

    const espacosFinais = (7 - (dias.length % 7)) % 7

    for (let indice = 0; indice < espacosFinais; indice += 1) {
      dias.push({
        key: `modal-vazio-fim-${indice}`,
        vazio: true,
      })
    }

    return dias
  }, [
    anoSelecao,
    formulario.diasEmProvaSelecionados,
    formulario.diasHospedagemSelecionados,
    formulario.diasSelecionados,
    formulario.modoSelecaoCalendario,
    grupoEmEdicao,
    mesSelecao,
    programacoesAgrupadas,
  ])

  const resumoOcupacaoSelecao = useMemo(() => {
    const diasComOcupacao = diasDoCalendarioSelecao.filter(
      (item) => !item.vazio && item.programacoesExistentes.length > 0,
    )
    const totalProgramacoes = diasComOcupacao.reduce(
      (total, item) => total + item.programacoesExistentes.length,
      0,
    )

    return {
      diasComOcupacao: diasComOcupacao.length,
      totalProgramacoes,
    }
  }, [diasDoCalendarioSelecao])

  const resumoDoMes = useMemo(() => {
    const programacoesAtivas = agendaDoMes.programacoes.filter((item) => item.status !== 'cancelado')
    const programacoesCanceladas = agendaDoMes.programacoes.filter(
      (item) => item.status === 'cancelado',
    )
    const diasOcupados = diasDoCalendario.filter(
      (item) => !item.vazio && item.contagemPrincipal > 0,
    ).length

    return {
      diasOcupados,
      totalAtivos: programacoesAtivas.length,
      totalCancelados: programacoesCanceladas.length,
    }
  }, [agendaDoMes.programacoes, diasDoCalendario])

  const resumoAparelhos = useMemo(
    () =>
      calcularResumoAparelhosDoMes(agendaDoMes.programacoes, totalAparelhosDisponiveis),
    [agendaDoMes.programacoes, totalAparelhosDisponiveis],
  )

  const resumoHospedagem = useMemo(
    () => calcularResumoHospedagemDoMes(agendaDoMes.programacoes, totalVagasHospedagem),
    [agendaDoMes.programacoes, totalVagasHospedagem],
  )

  const programacoesDaDataSelecionada = useMemo(() => {
    if (!dataSelecionada) return []
    return getProgramacoesDoDia(agendaDoMes.programacoes, dataSelecionada)
  }, [agendaDoMes.programacoes, dataSelecionada])

  const aparelhosReservadosNaDataSelecionada = useMemo(() => {
    if (!dataSelecionada) return 0

    return programacoesDaDataSelecionada.filter(
      (programacao) =>
        programacao.status !== 'cancelado' &&
        programacao.aluguelAparelho &&
        programacao.diasEmProva.includes(dataSelecionada),
    ).length
  }, [dataSelecionada, programacoesDaDataSelecionada])

  const hospedagensNaDataSelecionada = useMemo(() => {
    if (!dataSelecionada) return 0

    return programacoesDaDataSelecionada.filter(
      (programacao) =>
        programacao.status !== 'cancelado' &&
        programacao.diasHospedagem.includes(dataSelecionada),
    ).length
  }, [dataSelecionada, programacoesDaDataSelecionada])

  const diasSelecionadosOrdenados = useMemo(
    () => ordenarDatas(formulario.diasSelecionados),
    [formulario.diasSelecionados],
  )

  const diasEmProvaSelecionadosOrdenados = useMemo(
    () => ordenarDatas(formulario.diasEmProvaSelecionados),
    [formulario.diasEmProvaSelecionados],
  )

  const diasHospedagemSelecionadosOrdenados = useMemo(
    () => ordenarDatas(formulario.diasHospedagemSelecionados),
    [formulario.diasHospedagemSelecionados],
  )

  const statusAgenda = useMemo(() => {
    if (!statusPersistencia) {
      return null
    }

    const classesPorEstado = {
      carregando: 'border-[#D9D9D9] bg-[#F6F6F6] text-[#4B5563]',
      salvando: 'border-[#F3D9A2] bg-[#FFF7E4] text-[#8C5A00]',
      salvo: 'border-[#CDE6D5] bg-[#EEF7F2] text-[#166534]',
      erro: 'border-[#E5B5B8] bg-[#FFF5F5] text-[#991B1B]',
    }
    const dataSalvamento = statusPersistencia.atualizadoEm
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(statusPersistencia.atualizadoEm))
      : ''

    return {
      texto: dataSalvamento
        ? `${statusPersistencia.mensagem} ${dataSalvamento}`
        : statusPersistencia.mensagem,
      classe:
        classesPorEstado[statusPersistencia.estado] ??
        'border-[#D9D9D9] bg-[#F6F6F6] text-[#4B5563]',
    }
  }, [statusPersistencia])

  function getMesAnoDaData(data) {
    if (!data) {
      return null
    }

    const [ano, mes] = data.split('-').map(Number)

    if (!Number.isFinite(ano) || !Number.isFinite(mes)) {
      return null
    }

    return { ano, mes }
  }

  function aplicarTrocaMes(anoBase, mesBase, direcao, setAno, setMes) {
    const proximaData = new Date(anoBase, mesBase - 1 + direcao, 1)
    setMes(proximaData.getMonth() + 1)
    setAno(proximaData.getFullYear())
  }

  function atualizarMesAnoSelecaoPorData(data, anoFallback, mesFallback) {
    const mesAno = getMesAnoDaData(data)

    if (mesAno) {
      setAnoSelecao(mesAno.ano)
      setMesSelecao(mesAno.mes)
      return
    }

    setAnoSelecao(anoFallback)
    setMesSelecao(mesFallback)
  }

  function atualizarFormularioComMensagemLimpa(transformacao) {
    setMensagemFormulario('')
    setFormulario((atual) => transformacao(atual))
  }

  function limparCampoDias(campo) {
    const total = formulario[campo]?.length ?? 0

    if (total > 0 && typeof window !== 'undefined') {
      const rotulos = {
        diasSelecionados: 'dias de treinamento',
        diasEmProvaSelecionados: 'dias em prova',
        diasHospedagemSelecionados: 'dias de hospedagem',
      }
      const confirmou = window.confirm(`Limpar ${rotulos[campo] ?? 'datas selecionadas'}?`)

      if (!confirmou) {
        return
      }
    }

    atualizarFormularioComMensagemLimpa((atual) => ({
      ...atual,
      [campo]: [],
    }))
  }

  function handleTrocarMes(direcao) {
    aplicarTrocaMes(anoAtual, mesAtual, direcao, setAnoAtual, setMesAtual)
    setDataSelecionada(null)
    setProgramacaoSelecionadaId(null)
    setPainelAtivo('dia')
  }

  function handleTrocarMesSelecao(direcao) {
    aplicarTrocaMes(anoSelecao, mesSelecao, direcao, setAnoSelecao, setMesSelecao)
  }

  function handleSelecionarDia(data) {
    setDataSelecionada(data)
    setProgramacaoSelecionadaId(null)
    setPainelAtivo('dia')
  }

  function handleAbrirProgramacao(programacao, data) {
    setDataSelecionada(data)
    setProgramacaoSelecionadaId(programacao.grupoId)
    setPainelAtivo('treinamento')
  }

  function handleAbrirAdicionarTreinamento() {
    const dataBase = dataSelecionada ?? ''

    setModoModal('adicionar')
    setGrupoEmEdicao(null)
    setMensagemFormulario('')
    setFormulario(criarFormularioInicial(dataBase))

    atualizarMesAnoSelecaoPorData(dataBase, anoAtual, mesAtual)

    setModalAberto(true)
  }

  function handleAbrirAdicionarTreinamentoNaData(data) {
    setDataSelecionada(data)
    setProgramacaoSelecionadaId(null)
    setPainelAtivo('dia')
    setModoModal('adicionar')
    setGrupoEmEdicao(null)
    setMensagemFormulario('')
    setFormulario(criarFormularioInicial(data))

    atualizarMesAnoSelecaoPorData(data, anoAtual, mesAtual)

    setModalAberto(true)
  }

  function handleAbrirEdicao() {
    if (!programacaoSelecionada) {
      return
    }

    setModoModal('editar')
    setGrupoEmEdicao(programacaoSelecionada.grupoId)
    setMensagemFormulario('')
    setFormulario(criarFormularioEdicao(programacaoSelecionada))

    atualizarMesAnoSelecaoPorData(programacaoSelecionada.dataInicial, anoAtual, mesAtual)
    setModalAberto(true)
  }

  function handleFecharModal() {
    setModalAberto(false)
    setGrupoEmEdicao(null)
    setMensagemFormulario('')
  }

  function handleAtualizarFormulario(campo, valor) {
    atualizarFormularioComMensagemLimpa((atual) => ({
      ...atual,
      [campo]: valor,
    }))
  }

  function handleAlternarAluguelAparelho() {
    atualizarFormularioComMensagemLimpa((atual) => {
      const aluguelAparelho = !atual.aluguelAparelho

      return {
        ...atual,
        aluguelAparelho,
        diasEmProvaSelecionados: aluguelAparelho ? atual.diasEmProvaSelecionados : [],
        modoSelecaoCalendario: aluguelAparelho ? atual.modoSelecaoCalendario : 'treinamento',
      }
    })
  }

  function handleMudarModoSelecaoCalendario(modo) {
    if (modo === 'prova' && !formulario.aluguelAparelho) {
      return
    }

    atualizarFormularioComMensagemLimpa((atual) => ({
      ...atual,
      modoSelecaoCalendario: modo,
    }))
  }

  function handleAlternarDiaSelecao(data) {
    atualizarFormularioComMensagemLimpa((atual) => {
      if (atual.modoSelecaoCalendario === 'prova' && !atual.aluguelAparelho) {
        return atual
      }

      const campo =
        atual.modoSelecaoCalendario === 'prova'
          ? 'diasEmProvaSelecionados'
          : atual.modoSelecaoCalendario === 'hospedagem'
            ? 'diasHospedagemSelecionados'
            : 'diasSelecionados'
      const diasAtuais = atual[campo]
      const existe = diasAtuais.includes(data)
      const diasAtualizados = existe
        ? diasAtuais.filter((item) => item !== data)
        : ordenarDatas([...diasAtuais, data])

      return {
        ...atual,
        [campo]: diasAtualizados,
      }
    })
  }

  function handleLimparDiasTreinamento() {
    limparCampoDias('diasSelecionados')
  }

  function handleLimparDiasEmProva() {
    limparCampoDias('diasEmProvaSelecionados')
  }

  function handleLimparDiasHospedagem() {
    limparCampoDias('diasHospedagemSelecionados')
  }

  function handleSalvarProgramacao(event) {
    event.preventDefault()

    const validacao = validarFormularioProgramacao(formulario)

    if (!validacao.ok) {
      setMensagemFormulario(validacao.mensagem)
      return
    }

    const { nomeAluno, emailAluno, diasTreinamento, diasEmProva, diasHospedagem, dias } =
      validacao.dados
    const grupoId = grupoEmEdicao ?? criarGrupoIdProgramacao()
    const cor =
      modoModal === 'editar' && programacaoSelecionada?.cor
        ? programacaoSelecionada.cor
        : getCorAutomatica(nomeAluno)
    const tipoTreinamento = formulario.tipoTreinamento.trim() || 'Treinamento mensal'
    const observacoes =
      formulario.observacoes.trim() || 'Criado na programação mensal.'

    const novaProgramacao = normalizarProgramacao({
      id: grupoId,
      grupoId,
      aluno: nomeAluno,
      email: emailAluno,
      cor,
      tipoTreinamento,
      observacoes,
      dataInicial: diasTreinamento[0],
      dataFinal: diasTreinamento.at(-1),
      diasTreinamento,
      diasEmProva,
      diasHospedagem,
      dias,
      aluguelAparelho: formulario.aluguelAparelho,
      status: programacaoSelecionada?.status ?? 'planejado',
    })

    const agendaAtualizada = salvarProgramacaoAgrupada(agendaMensal, novaProgramacao)
    const primeiraData = diasTreinamento[0] ?? dias[0]
    const [ano, mes] = primeiraData.split('-').map(Number)

    setAgendaMensal(agendaAtualizada)
    setAnoAtual(ano)
    setMesAtual(mes)
    setDataSelecionada(primeiraData)
    setProgramacaoSelecionadaId(grupoId)
    setPainelAtivo('treinamento')
    setModalAberto(false)
    setGrupoEmEdicao(null)
    setMensagemFormulario('')
    setFormulario(criarFormularioInicial())
  }

  function handleRemoverProgramacao() {
    if (!programacaoSelecionada) {
      return
    }

    const confirmou = window.confirm(
      `Remover o treinamento de ${programacaoSelecionada.aluno} do calendário?`,
    )

    if (!confirmou) {
      return
    }

    setAgendaMensal((atual) => removerProgramacaoGrupo(atual, programacaoSelecionada.grupoId))
    setProgramacaoSelecionadaId(null)
  }

  function handleCancelarProgramacao() {
    if (!programacaoSelecionada) {
      return
    }

    const estaCancelado = programacaoSelecionada.status === 'cancelado'
    const confirmou = window.confirm(
      estaCancelado
        ? `Reativar o treinamento de ${programacaoSelecionada.aluno}?`
        : `Cancelar o treinamento de ${programacaoSelecionada.aluno} e manter visível em cinza?`,
    )

    if (!confirmou) {
      return
    }

    setAgendaMensal((atual) =>
      atualizarStatusGrupo(
        atual,
        programacaoSelecionada.grupoId,
        estaCancelado ? 'planejado' : 'cancelado',
      ),
    )
  }

  async function handleAbrirPdfAgenda() {
    setMensagemPdf('')

    try {
      const pdfAgenda = gerarBase64PdfAgendaMensal({
        agendaMensal,
        agendaDoMes,
        mes: mesAtual,
        ano: anoAtual,
      })
      const arquivoSalvo = await salvarPdfOficial({
        nomeArquivo: pdfAgenda.nomeArquivo,
        base64: pdfAgenda.base64,
        categoria: 'programacoes',
      })

      await abrirCaminhoSistema(arquivoSalvo.caminhoArquivo)
      setMensagemPdf(`Programação atualizada aberta: ${arquivoSalvo.caminhoArquivo}`)
    } catch (erro) {
      setMensagemPdf(
        erro?.message ||
          'Não foi possível gerar e abrir a programação atualizada.',
      )
    }
  }

  return (
    <>
      <div className="relative left-1/2 w-[calc(100vw-1.5rem)] -translate-x-1/2 md:w-[calc(100vw-3rem)] xl:w-[calc(100vw-4rem)]">
        <BarraTopo
          titulo="Programação mensal"
          subtitulo="Agenda mensal de treinamentos, provas e hospedagens."
          voltar
          onVoltar={onVoltar}
        />
      </div>

      <section className="relative left-1/2 w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-[24px] border border-[#D9D9D9] bg-white p-3 md:w-[calc(100vw-3rem)] md:p-4 xl:w-[calc(100vw-4rem)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleTrocarMes(-1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D9D9D9] bg-white text-2xl font-bold text-[#222222] transition-colors hover:bg-[#FCFCFC]"
              aria-label="Mês anterior"
            >
              {'<'}
            </button>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
              Agenda
            </p>
            <h3 className="text-3xl font-bold text-slate-900 md:text-4xl">
              {formatarMesAno(mesAtual, anoAtual)}
            </h3>
            <button
              type="button"
              onClick={() => handleTrocarMes(1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D9D9D9] bg-white text-2xl font-bold text-[#222222] transition-colors hover:bg-[#FCFCFC]"
              aria-label="Próximo mês"
            >
              {'>'}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAbrirPdfAgenda}
              className={botaoSecundarioClass}
            >
              Abrir última programação
            </button>
            <button
              type="button"
              onClick={handleAbrirAdicionarTreinamento}
              className={botaoPrimarioClass}
              >
              Adicionar treinamento
            </button>
          </div>
        </div>

        {statusAgenda ? (
          <div
            className={`mt-4 rounded-[18px] border px-4 py-3 text-sm font-semibold ${statusAgenda.classe}`}
              >
            {statusAgenda.texto}
          </div>
        ) : null}

        {mensagemPdf ? (
          <div className="mt-4 rounded-[18px] border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-3 text-sm font-semibold text-[#4B5563]">
            {mensagemPdf}
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 md:grid-cols-3">
          <div className="rounded-[18px] border border-[#D9D9D9] bg-[#F6F6F6] px-3 py-3">
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#767676]">Dias ocupados</span>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resumoDoMes.diasOcupados}</p>
          </div>
          <div className="rounded-[18px] border border-[#D9D9D9] bg-[#F6F6F6] px-3 py-3">
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#767676]">Ativos</span>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resumoDoMes.totalAtivos}</p>
          </div>
          <div className="rounded-[18px] border border-[#D9D9D9] bg-[#F6F6F6] px-3 py-3">
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#767676]">Cancelados</span>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {resumoDoMes.totalCancelados}
            </p>
          </div>
        </div>

        {resumoAparelhos.diasInsuficientes.length > 0 ? (
          <div className="mt-4 rounded-[22px] border border-[#E5B5B8] bg-[#FFF5F5] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#B40105]">
              ALERTA DE APARELHOS
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#7F1D1D]">
              Há mais aparelhos reservados do que o estoque disponível de{' '}
              {totalAparelhosDisponiveis} em{' '}
              {formatarQuantidadeDatas(resumoAparelhos.diasInsuficientes.length)}. Revise os dias abaixo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {resumoAparelhos.diasInsuficientes.map((item) => (
                <span
                  key={item.data}
                  className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#991B1B] ring-1 ring-[#E5B5B8]"
              >
                  {formatarDataCurta(item.data)} - {formatarQuantidadeAparelhos(item.quantidade)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {resumoHospedagem.diasInsuficientes.length > 0 ? (
          <div className="mt-4 rounded-[22px] border border-[#E5B5B8] bg-[#FFF5F5] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#B40105]">
              ALERTA DE HOSPEDAGEM
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#7F1D1D]">
              Há mais hospedagens do que as {totalVagasHospedagem} vagas disponíveis em{' '}
              {formatarQuantidadeDatas(resumoHospedagem.diasInsuficientes.length)}. Revise os dias abaixo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {resumoHospedagem.diasInsuficientes.map((item) => (
                <span
                  key={item.data}
                  className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#991B1B] ring-1 ring-[#E5B5B8]"
              >
                  {formatarDataCurta(item.data)} - {formatarQuantidadeDatas(item.quantidade)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-cols-7 gap-2 xl:min-w-0 xl:gap-3">
            {diasSemana.map((diaSemana) => (
              <div
                key={diaSemana}
                className="rounded-[18px] bg-[#222222] px-3 py-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-slate-100"
              >
                {diaSemana}
              </div>
            ))}

            {diasDoCalendario.map((item) => {
              if (item.vazio) {
                return (
                  <div
                    key={item.key}
                    className="min-h-[126px] rounded-[20px] border border-dashed border-[#D9D9D9] bg-[#FAFAFA] xl:min-h-[148px]"
                  />
                )
              }

              const estaSelecionado = dataSelecionada === item.data

              if (item.programacoes.length === 0) {
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleAbrirAdicionarTreinamentoNaData(item.data)}
                    className={[
                      'min-h-[126px] rounded-[20px] border border-dashed border-[#D9D9D9] bg-[#FAFAFA] p-2.5 text-left transition-colors hover:border-[#B40105] hover:bg-white xl:min-h-[148px] xl:p-3',
                      estaSelecionado ? 'border-[#B40105] ring-2 ring-[#B40105]/10' : '',
                    ].join(' ')}
              >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xl font-bold text-slate-900 xl:text-2xl">{item.dia}</span>
                      <span className="block rounded-full bg-[#F1F1F1] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#222222] xl:px-3 xl:text-xs xl:tracking-[0.16em]">
                        LIVRE
                      </span>
                    </div>

                    <div className="mt-4 rounded-[16px] border border-dashed border-[#D9D9D9] bg-white px-3 py-4 text-sm font-medium text-[#8F8F8F]">
                      Adicionar neste dia
                    </div>
                  </button>
                )
              }

              return (
                <div
                  key={item.key}
                  className={[
                    'min-h-[126px] rounded-[20px] border p-2.5 transition-colors xl:min-h-[148px] xl:p-3',
                    'border-[#D9D9D9] bg-white',
                    estaSelecionado ? 'border-[#B40105] ring-2 ring-[#B40105]/10' : '',
                  ].join(' ')}
              >
                  <button
                    type="button"
                    onClick={() => handleSelecionarDia(item.data)}
                    className="w-full text-left"
              >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xl font-bold text-slate-900 xl:text-2xl">{item.dia}</span>
                      <div className="text-right">
                        <span className="block rounded-full bg-[#F1F1F1] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#222222] xl:px-3 xl:text-xs xl:tracking-[0.16em]">
                          {formatarQuantidadeAlunos(item.contagemPrincipal)}
                        </span>
                        {item.contagemCancelados > 0 ? (
                          <span className="mt-2 block text-xs font-semibold text-slate-400">
                            {item.contagemCancelados} cancelado(s)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="mt-3 space-y-1.5">
                    {item.programacoes.map((programacao) => {
                        const corAtual =
                          programacao.status === 'cancelado'
                            ? estiloCancelado
                            : (coresPorValor[programacao.cor] ?? coresPorValor.emerald)
                        const estaAtiva = programacaoSelecionadaId === programacao.grupoId
                        const emProvaNoDia = programacao.diasEmProva.includes(item.data)
                        const hospedagemNoDia = programacao.diasHospedagem.includes(item.data)
                        const primeiroNome = getPrimeiroNome(programacao.aluno)

                        return (
                          <button
                            key={programacao.id}
                            type="button"
                            onClick={() => handleAbrirProgramacao(programacao, item.data)}
                            className={`w-full rounded-[14px] px-2 py-1.5 text-left text-xs font-semibold ring-1 transition-colors ${corAtual.chipClass} ${estaAtiva ? 'ring-2 ring-[#B40105]/20' : ''}`}
              >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 shrink-0 rounded-full ${corAtual.dotClass}`}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 whitespace-normal break-words leading-snug">
                                {primeiroNome}
                              </span>
                            </span>
                            {emProvaNoDia || hospedagemNoDia ? (
                              <span className="mt-1 flex flex-wrap gap-1 pl-4">
                                {emProvaNoDia ? (
                                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#9A3412]">
                                    Prova
                                  </span>
                                ) : null}
                                {hospedagemNoDia ? (
                                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#166534]">
                                    Hosp.
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                          </button>
                        )
                      })}

                  </div>
                </div>
              )
            })}
            </div>
          </div>

          <aside className="rounded-[22px] border border-[#D9D9D9] bg-white p-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto 2xl:p-4">
            <div className="grid grid-cols-2 gap-2 rounded-[18px] bg-[#F6F6F6] p-1">
              <button
                type="button"
                onClick={() => setPainelAtivo('dia')}
                className={[
                  'rounded-[14px] px-3 py-2 text-sm font-semibold transition-colors',
                  painelAtivo === 'dia'
                    ? 'bg-white text-[#B40105] shadow-sm'
                    : 'text-[#4B5563] hover:bg-white/70',
                ].join(' ')}
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setPainelAtivo('treinamento')}
                className={[
                  'rounded-[14px] px-3 py-2 text-sm font-semibold transition-colors',
                  painelAtivo === 'treinamento'
                    ? 'bg-white text-[#B40105] shadow-sm'
                    : 'text-[#4B5563] hover:bg-white/70',
                ].join(' ')}
              >
                Treinamento
              </button>
            </div>

            {painelAtivo === 'dia' ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B40105]">
                      Detalhe do dia
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {dataSelecionada ? formatarDataExtensa(dataSelecionada) : 'Selecione um dia'}
                    </h3>
                  </div>
                  {dataSelecionada ? (
                    <button
                      type="button"
                      onClick={() => handleAbrirAdicionarTreinamentoNaData(dataSelecionada)}
                      className={botaoSecundarioCompactoClass}
              >
                      Adicionar
                    </button>
                  ) : null}
                </div>

                {dataSelecionada ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#F1F1F1] px-3 py-2 text-xs font-semibold text-[#222222]">
                      {formatarQuantidadeAlunos(getContagemPrincipal(programacoesDaDataSelecionada))}
                    </span>
                    {aparelhosReservadosNaDataSelecionada > 0 ? (
                      <span className="rounded-full border border-[#D9D9D9] bg-white px-3 py-2 text-xs font-semibold text-[#222222]">
                        {formatarQuantidadeAparelhos(aparelhosReservadosNaDataSelecionada)}
                      </span>
                    ) : null}
                    {hospedagensNaDataSelecionada > 0 ? (
                      <span className="rounded-full border border-[#D9D9D9] bg-white px-3 py-2 text-xs font-semibold text-[#166534]">
                        {formatarQuantidadeDatas(hospedagensNaDataSelecionada)} em hospedagem
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  {dataSelecionada && programacoesDaDataSelecionada.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-4 py-5 text-sm text-[#767676]">
                      Sem treinamentos neste dia.
                    </div>
                  ) : null}

                  {programacoesDaDataSelecionada.map((programacao) => {
                    const corAtual =
                      programacao.status === 'cancelado'
                        ? estiloCancelado
                        : (coresPorValor[programacao.cor] ?? coresPorValor.emerald)
                    const emProvaNoDia = dataSelecionada
                      ? programacao.diasEmProva.includes(dataSelecionada)
                      : false
                    const hospedagemNoDia = dataSelecionada
                      ? programacao.diasHospedagem.includes(dataSelecionada)
                      : false

                    return (
                      <button
                        key={programacao.id}
                        type="button"
                        onClick={() => handleAbrirProgramacao(programacao, dataSelecionada)}
                        className={`w-full rounded-[18px] px-3 py-3 text-left ring-1 transition-colors ${corAtual.chipClass}`}
              >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{programacao.aluno}</p>
                            <p className="mt-1 truncate text-xs opacity-80">
                              {programacao.tipoTreinamento || 'Sem tipo informado'}
                            </p>
                          </div>
                          <span className={`h-3 w-3 shrink-0 rounded-full ${corAtual.dotClass}`} />
                        </div>
                        {emProvaNoDia || hospedagemNoDia ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {emProvaNoDia ? (
                              <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase text-[#9A3412]">
                                Prova
                              </span>
                            ) : null}
                            {hospedagemNoDia ? (
                              <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase text-[#166534]">
                                Hosp.
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B40105]">
                      Treinamento
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {programacaoSelecionada
                        ? programacaoSelecionada.aluno
                        : 'Nenhum treinamento aberto'}
                    </h3>
                  </div>
                  {programacaoSelecionada ? (
                    <span
                      className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${estilosStatus[programacaoSelecionada.status] ?? 'bg-[#EEF2F7] text-[#334155] ring-1 ring-[#D9D9D9]'}`}
              >
                      {formatarStatusProgramacao(programacaoSelecionada.status)}
                    </span>
                  ) : null}
                </div>

                {programacaoSelecionada ? (
                  <>
                    <div className="mt-4 grid gap-2">
                      <div className="rounded-[16px] bg-[#F6F6F6] px-3 py-3 ring-1 ring-[#D9D9D9]">
                        <span className="block text-xs font-semibold text-[#767676]">Tipo</span>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {programacaoSelecionada.tipoTreinamento || 'Sem tipo informado'}
                        </p>
                      </div>
                      <div className="rounded-[16px] bg-[#F6F6F6] px-3 py-3 ring-1 ring-[#D9D9D9]">
                        <span className="block text-xs font-semibold text-[#767676]">Período</span>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatarDataCurta(programacaoSelecionada.dataInicial)} a{' '}
                          {formatarDataCurta(programacaoSelecionada.dataFinal)}
                        </p>
                      </div>
                      <div className="rounded-[16px] bg-[#F6F6F6] px-3 py-3 ring-1 ring-[#D9D9D9]">
                        <span className="block text-xs font-semibold text-[#767676]">E-mail</span>
                        <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                          {programacaoSelecionada.email || 'Sem e-mail cadastrado'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-[16px] bg-[#F6F6F6] px-3 py-3 ring-1 ring-[#D9D9D9]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#767676]">
                            Treinamento
                          </span>
                          <span className="text-xs font-semibold text-[#4B5563]">
                            {programacaoSelecionada.diasTreinamento.length}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {programacaoSelecionada.diasTreinamento.slice(0, 12).map((dia) => (
                            <span
                              key={dia}
                              className="rounded-full bg-white px-2 py-1 text-xs font-medium text-[#222222] ring-1 ring-[#D9D9D9]"
              >
                              {formatarDataCurta(dia)}
                            </span>
                          ))}
                          {programacaoSelecionada.diasTreinamento.length > 12 ? (
                            <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-[#767676] ring-1 ring-[#D9D9D9]">
                              +{programacaoSelecionada.diasTreinamento.length - 12}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[16px] bg-[#F6F6F6] px-3 py-3 ring-1 ring-[#D9D9D9]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#767676]">Provas</span>
                          <span className="text-xs font-semibold text-[#4B5563]">
                            {programacaoSelecionada.diasEmProva.length}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {programacaoSelecionada.diasEmProva.length > 0 ? (
                            programacaoSelecionada.diasEmProva.map((dia) => (
                              <span
                                key={dia}
                                className="rounded-full bg-white px-2 py-1 text-xs font-medium text-[#9A3412] ring-1 ring-[#F0D5B1]"
              >
                                {formatarDataCurta(dia)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-medium text-[#767676]">Sem provas</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[16px] bg-[#F6F6F6] px-3 py-3 ring-1 ring-[#D9D9D9]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#767676]">Hospedagem</span>
                          <span className="text-xs font-semibold text-[#4B5563]">
                            {programacaoSelecionada.diasHospedagem.length}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {programacaoSelecionada.diasHospedagem.length > 0 ? (
                            programacaoSelecionada.diasHospedagem.map((dia) => (
                              <span
                                key={dia}
                                className="rounded-full bg-white px-2 py-1 text-xs font-medium text-[#166534] ring-1 ring-[#CDE6D5]"
              >
                                {formatarDataCurta(dia)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-medium text-[#767676]">
                              Sem hospedagem
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onAbrirDeclaracoes?.(
                            programacaoSelecionada.grupoId,
                            criarResumoTreinamentoProgramacao(programacaoSelecionada),
                          )
                        }
                        className={botaoSecundarioCompactoClass}
              >
                        Emitir declaração
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAbrirPrestacao?.(
                            programacaoSelecionada.grupoId,
                            criarResumoTreinamentoProgramacao(programacaoSelecionada),
                          )
                        }
                        className={botaoSecundarioCompactoClass}
              >
                        Fechar prestação
                      </button>
                      <button type="button" onClick={handleAbrirEdicao} className={botaoPrimarioClass}>
                        Editar
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCancelarProgramacao}
                          className={[
                            'rounded-[18px] border px-4 py-3 text-sm font-semibold transition-colors',
                            programacaoSelecionada.status === 'cancelado'
                              ? 'border-[#CDE6D5] bg-white text-[#166534] hover:bg-[#EEF7F2]'
                              : 'border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                          ].join(' ')}
              >
                          {programacaoSelecionada.status === 'cancelado'
                            ? 'Reativar'
                            : 'Cancelar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoverProgramacao}
                          className="rounded-[18px] border border-[#E5B5B8] bg-white px-4 py-3 text-sm font-semibold text-[#B40105] transition-colors hover:bg-[#FFF5F5]"
              >
                          Remover
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-[18px] border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-4 py-5 text-sm text-[#767676]">
                    Selecione um treinamento.
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>

      {modalAberto ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 p-4 md:p-8">
          <div className="mx-auto max-h-full max-w-[1500px] overflow-y-auto rounded-[22px] border border-[#D9D9D9] bg-white p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
                  {modoModal === 'editar' ? 'Editar treinamento' : 'Adicionar treinamento'}
                </p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {modoModal === 'editar' ? 'Ajustar treinamento' : 'Novo treinamento'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleFecharModal}
                className={botaoSecundarioCompactoClass}
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
              <form className="grid content-start gap-4 xl:sticky xl:top-0" onSubmit={handleSalvarProgramacao}>
                {mensagemFormulario ? (
                  <div className="rounded-[20px] border border-[#E5B5B8] bg-[#FFF5F5] px-4 py-4 text-sm font-semibold text-[#991B1B]">
                    {mensagemFormulario}
                  </div>
                ) : null}

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#4B5563]">Nome do aluno</span>
                  <input
                    value={formulario.nomeAluno}
                    onChange={(e) => handleAtualizarFormulario('nomeAluno', e.target.value)}
                    className="rounded-[20px] border border-[#D9D9D9] px-4 py-4 text-base text-[#222222]"
                    placeholder="Ex.: Pablo Almeida"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#4B5563]">E-mail</span>
                  <input
                    type="email"
                    value={formulario.emailAluno}
                    onChange={(e) => handleAtualizarFormulario('emailAluno', e.target.value)}
                    className="rounded-[20px] border border-[#D9D9D9] px-4 py-4 text-base text-[#222222]"
                    placeholder="nome@empresa.com.br"
                    autoComplete="email"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#4B5563]">Tipo de treinamento</span>
                  <input
                    value={formulario.tipoTreinamento}
                    onChange={(e) => handleAtualizarFormulario('tipoTreinamento', e.target.value)}
                    className="rounded-[20px] border border-[#D9D9D9] px-4 py-4 text-base text-[#222222]"
                    placeholder="Treinamento inicial, reciclagem, pratica supervisionada..."
                  />
                </label>

                <div className={cartaoSecundarioClass}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[#767676]">
                        Aluguel de aparelho
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAlternarAluguelAparelho}
                      className={[
                        'rounded-[18px] px-4 py-3 text-sm font-semibold transition-colors',
                        formulario.aluguelAparelho
                          ? 'bg-[#B40105] text-white'
                          : 'border border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                      ].join(' ')}
              >
                      {formulario.aluguelAparelho ? 'Ativo' : 'Ativar aluguel'}
                    </button>
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[#4B5563]">Observações</span>
                  <textarea
                    value={formulario.observacoes}
                    onChange={(e) => handleAtualizarFormulario('observacoes', e.target.value)}
                    className="min-h-[120px] rounded-[20px] border border-[#D9D9D9] px-4 py-4 text-base text-[#222222]"
                    placeholder="Detalhes importantes deste treinamento."
                  />
                </label>

                <div className={cartaoSecundarioClass}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-semibold text-[#767676]">
                        Dias de treinamento
                      </span>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {diasSelecionadosOrdenados.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLimparDiasTreinamento}
                      className={botaoSecundarioCompactoClass}
              >
                      Limpar dias de treinamento
                    </button>
                  </div>

                  <div className="mt-4 text-sm text-[#4B5563]">
                    {diasSelecionadosOrdenados.length > 0 ? (
                      <p>
                        {formatarDataCurta(diasSelecionadosOrdenados[0])} a{' '}
                        {formatarDataCurta(diasSelecionadosOrdenados.at(-1))}
                      </p>
                    ) : (
                      <p>Nenhum dia selecionado.</p>
                    )}
                  </div>
                </div>

                {formulario.aluguelAparelho ? (
                  <div className={cartaoSecundarioClass}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-semibold text-[#767676]">Datas em prova</span>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {diasEmProvaSelecionadosOrdenados.length}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLimparDiasEmProva}
                        className={botaoSecundarioCompactoClass}
              >
                        Limpar dias em prova
                      </button>
                    </div>

                  <div className="mt-4 text-sm text-[#4B5563]">
                      {diasEmProvaSelecionadosOrdenados.length > 0 ? (
                        <p>
                          {formatarQuantidadeDatas(diasEmProvaSelecionadosOrdenados.length)}
                        </p>
                      ) : (
                        <p>Nenhuma prova marcada.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className={cartaoSecundarioClass}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-semibold text-[#767676]">
                        Datas de hospedagem
                      </span>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {diasHospedagemSelecionadosOrdenados.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLimparDiasHospedagem}
                      className={botaoSecundarioCompactoClass}
              >
                      Limpar dias de hospedagem
                    </button>
                  </div>

                  <div className="mt-4 text-sm text-[#4B5563]">
                    {diasHospedagemSelecionadosOrdenados.length > 0 ? (
                      <p>
                        {formatarQuantidadeDatas(diasHospedagemSelecionadosOrdenados.length)}
                      </p>
                    ) : (
                      <p>Nenhuma hospedagem marcada.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    type="button"
                    onClick={handleFecharModal}
                    className={botaoSecundarioClass}
              >
                    Fechar
                  </button>
                  <button type="submit" className={botaoPrimarioClass}>
                    {modoModal === 'editar' ? 'Salvar alterações' : 'Salvar treinamento'}
                  </button>
                </div>
              </form>

              <div className="rounded-[22px] border border-[#D9D9D9] bg-[#F6F6F6] p-3 md:p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTrocarMesSelecao(-1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D9D9] bg-white text-xl font-bold text-[#222222] transition-colors hover:bg-[#FCFCFC]"
                      aria-label="Mês anterior"
                    >
                      {'<'}
                    </button>
                    <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
                      Seleção de datas
                    </p>
                    <h4 className="mt-2 text-2xl font-bold text-slate-900">
                      {formatarMesAno(mesSelecao, anoSelecao)}
                    </h4>
                    <p className="mt-2 text-sm text-[#4B5563]">
                      {formulario.modoSelecaoCalendario === 'prova'
                        ? 'Em prova'
                        : formulario.modoSelecaoCalendario === 'hospedagem'
                          ? 'Hospedagem'
                        : 'Treinamento'}
                    </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTrocarMesSelecao(1)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D9D9] bg-white text-xl font-bold text-[#222222] transition-colors hover:bg-[#FCFCFC]"
                      aria-label="Próximo mês"
                    >
                      {'>'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleMudarModoSelecaoCalendario('treinamento')}
                    className={[
                      'rounded-[18px] px-4 py-3 text-sm font-semibold transition-colors',
                      formulario.modoSelecaoCalendario === 'treinamento'
                        ? 'bg-[#B40105] text-white'
                        : 'border border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                    ].join(' ')}
              >
                    Treinamento
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMudarModoSelecaoCalendario('prova')}
                    disabled={!formulario.aluguelAparelho}
                    className={[
                      'rounded-[18px] px-4 py-3 text-sm font-semibold transition-colors',
                      formulario.modoSelecaoCalendario === 'prova'
                        ? 'bg-[#9A3412] text-white'
                        : 'border border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                      !formulario.aluguelAparelho ? 'cursor-not-allowed text-[#A3A3A3]' : '',
                    ].join(' ')}
              >
                    Em prova
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMudarModoSelecaoCalendario('hospedagem')}
                    className={[
                      'rounded-[18px] px-4 py-3 text-sm font-semibold transition-colors',
                      formulario.modoSelecaoCalendario === 'hospedagem'
                        ? 'bg-[#166534] text-white'
                        : 'border border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                    ].join(' ')}
              >
                    Hospedagem
                  </button>
                </div>

                {!formulario.aluguelAparelho ? (
                  <div className="mt-3 rounded-[18px] border border-dashed border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#767676]">
                    Em prova exige aluguel de aparelho.
                  </div>
                ) : null}

                <div
                  className={[
                    'mt-4 rounded-lg border px-4 py-3 text-sm font-semibold',
                    resumoOcupacaoSelecao.diasComOcupacao > 0
                      ? 'border-[#F3D9A2] bg-[#FFF7E4] text-[#8C5A00]'
                      : 'border-[#D9D9D9] bg-white text-[#767676]',
                  ].join(' ')}
                >
                  {resumoOcupacaoSelecao.diasComOcupacao > 0
                    ? `${resumoOcupacaoSelecao.diasComOcupacao} dias deste mês já têm treinamento na agenda.`
                    : 'Nenhum treinamento agendado neste mês.'}
                </div>

                <div className="mt-5 grid grid-cols-7 gap-1.5 md:gap-2">
                  {diasSemana.map((diaSemana) => (
                    <div
                      key={diaSemana}
                      className="rounded-[18px] bg-[#222222] px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 md:text-sm"
              >
                      {diaSemana}
                    </div>
                  ))}

                  {diasDoCalendarioSelecao.map((item) => {
                    if (item.vazio) {
                      return (
                        <div
                          key={item.key}
                          className="min-h-[56px] rounded-xl border border-dashed border-slate-200 bg-white/60"
                        />
                      )
                    }

                    const possuiMarcacao =
                      item.treinamentoSelecionado ||
                      item.provaSelecionada ||
                      item.hospedagemSelecionada
                    const possuiOcupacaoExistente = item.programacoesExistentes.length > 0
                    const nomesOcupacao = item.programacoesExistentes
                      .slice(0, 2)
                      .map((programacao) => getPrimeiroNome(programacao.aluno))
                    const resumoOcupacao =
                      nomesOcupacao.length > 0
                        ? nomesOcupacao.join(', ') +
                          (item.programacoesExistentes.length > nomesOcupacao.length
                            ? ` +${item.programacoesExistentes.length - nomesOcupacao.length}`
                            : '')
                        : ''

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleAlternarDiaSelecao(item.data)}
                        className={[
                          'min-h-[88px] rounded-[14px] border px-1.5 py-2 text-center text-sm font-semibold transition-colors md:min-h-[100px] md:px-2 md:py-3 md:text-base',
                          item.selecionado
                            ? formulario.modoSelecaoCalendario === 'prova'
                              ? 'border-[#9A3412] bg-[#9A3412] text-white'
                              : formulario.modoSelecaoCalendario === 'hospedagem'
                                ? 'border-[#166534] bg-[#166534] text-white'
                              : 'border-[#B40105] bg-[#B40105] text-white'
                            : possuiOcupacaoExistente
                              ? 'border-[#D97706] bg-[#FFF7E4] text-[#222222] ring-2 ring-[#F3D9A2] hover:bg-[#FFEFCB]'
                            : possuiMarcacao
                              ? 'border-[#E5D1D3] bg-[#FFF8F8] text-[#222222] hover:bg-[#FFF1F1]'
                              : 'border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                        ].join(' ')}
              >
                        <span className="block">{item.dia}</span>
                        {possuiOcupacaoExistente ? (
                          <div
                            className={[
                              'mt-2 grid gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold leading-tight',
                              item.selecionado
                                ? 'bg-white/15 text-white'
                                : 'bg-white text-[#8C5A00] ring-1 ring-[#F3D9A2]',
                            ].join(' ')}
                            title={item.programacoesExistentes
                              .map(
                                (programacao) =>
                                  `${programacao.aluno} - ${programacao.tipoTreinamento || 'Sem tipo'}`,
                              )
                              .join('\n')}
                          >
                            <span>Já tem {item.programacoesExistentes.length}</span>
                            {resumoOcupacao ? (
                              <span className="truncate text-[10px] font-semibold">
                                {resumoOcupacao}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {possuiOcupacaoExistente ? (
                          <div className="mt-1 flex flex-wrap justify-center gap-1">
                            {item.treinamentoExistente.length > 0 ? (
                              <span
                                className={[
                                  'rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]',
                                  item.selecionado
                                    ? 'bg-white/15 text-white'
                                    : 'bg-[#F1F1F1] text-[#4B5563]',
                                ].join(' ')}
                              >
                                T{item.treinamentoExistente.length}
                              </span>
                            ) : null}
                            {item.provaExistente.length > 0 ? (
                              <span
                                className={[
                                  'rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]',
                                  item.selecionado
                                    ? 'bg-white/15 text-white'
                                    : 'bg-[#FFF5E8] text-[#9A3412]',
                                ].join(' ')}
                              >
                                P{item.provaExistente.length}
                              </span>
                            ) : null}
                            {item.hospedagemExistente.length > 0 ? (
                              <span
                                className={[
                                  'rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]',
                                  item.selecionado
                                    ? 'bg-white/15 text-white'
                                    : 'bg-[#EEF7F2] text-[#166534]',
                                ].join(' ')}
                              >
                                H{item.hospedagemExistente.length}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {(item.treinamentoSelecionado ||
                          item.provaSelecionada ||
                          item.hospedagemSelecionada) && (
                          <div className="mt-2 flex flex-wrap justify-center gap-1">
                            {item.treinamentoSelecionado ? (
                              <span
                                className={[
                                  'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                  item.selecionado && formulario.modoSelecaoCalendario === 'treinamento'
                                    ? 'bg-white/15 text-white'
                                    : 'bg-[#F1F1F1] text-[#4B5563]',
                                ].join(' ')}
              >
                                Treino
                              </span>
                            ) : null}
                            {item.provaSelecionada ? (
                              <span
                                className={[
                                  'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                  item.selecionado && formulario.modoSelecaoCalendario === 'prova'
                                    ? 'bg-white/15 text-white'
                                    : 'bg-[#FFF5E8] text-[#9A3412]',
                                ].join(' ')}
              >
                                Em prova
                              </span>
                            ) : null}
                            {item.hospedagemSelecionada ? (
                              <span
                                className={[
                                  'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                  item.selecionado &&
                                  formulario.modoSelecaoCalendario === 'hospedagem'
                                    ? 'bg-white/15 text-white'
                                    : 'bg-[#EEF7F2] text-[#166534]',
                                ].join(' ')}
              >
                                Hospedagem
                              </span>
                            ) : null}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
