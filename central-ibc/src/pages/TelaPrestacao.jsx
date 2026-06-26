import { useEffect, useMemo, useRef, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  botaoSecundarioCompactoClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
  diasSemana,
} from '../features/programacao/constants'
import {
  criarChaveData,
  formatarDataCurta,
  formatarDataExtensa,
  formatarMesAno,
  formatarQuantidadeDatas,
  getInfoMes,
  ordenarDatas,
} from '../features/programacao/utils/dateUtils'
import {
  agruparProgramacoesPorGrupo,
  getRotuloSelecaoProgramacao,
} from '../features/programacao/utils/programacaoUtils'
import {
  atualizarTotaisDasLinhas,
  calcularResumoFinanceiro as calcularResumoFinanceiroPrestacao,
  carregarRascunhoPrestacao as carregarPrestacaoSalva,
  criarPrestacaoInicial,
  getDatasBasePeriodoPrestacao,
  getDatasCandidatasPrestacao,
  listarDatasEntre,
  salvarRascunhoPrestacao as salvarPrestacaoSalva,
  sincronizarLinhasComFechamento,
} from '../features/prestacao/utils/prestacaoUtils'
import { carregarCamposInstitucionaisDeclaracao } from '../features/declaracoes/constants'
import {
  criarAssuntoSugeridoEmail,
  criarMensagemSugeridaEmail,
  criarNomeArquivoPdf,
} from '../features/email/utils/emailComposer'
import {
  criarCloneDocumentoExportacao,
  gerarAnexoPdfVisualBase64,
} from '../features/email/utils/pdfUtils'
import { registrarDocumentoEmitido } from '../features/documentos/utils/documentosEmitidos'
import {
  abrirUltimoPdfOficial,
  abrirCaminhoSistema,
  salvarPdfOficial,
} from '../features/documentos/utils/documentosOficiais'

const resumoFinanceiroInicial = {
  subtotalDiarias: 0,
  subtotalHospedagem: 0,
  subtotalAluguelAparelho: 0,
  totalGeral: 0,
}

const modosCalendarioSimplificado = [
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'prova', label: 'Aluguel de aparelho' },
  { value: 'hospedagem', label: 'Hospedagem' },
]
const OPCAO_PRESTACAO_MANUAL = '__prestacao_manual__'

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor) || 0)
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor : ''
}

function extrairParagrafosTexto(texto) {
  const textoNormalizado = normalizarTexto(texto).replace(/\r\n/g, '\n').trim()

  if (!textoNormalizado) {
    return []
  }

  return textoNormalizado
    .split(/\n{2,}/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean)
}

function getTituloPrestacaoDocumento(origemProgramacao) {
  const aluno = (origemProgramacao?.aluno ?? '').trim().toUpperCase()
  return aluno ? `PRESTAÇÃO DE CONTAS ${aluno}` : 'PRESTAÇÃO DE CONTAS'
}

function getDateObjectLocal(data) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function getDiaTexto(data) {
  return data.split('-')[2]
}

function datasEstaoNoMesmoMes(datas = []) {
  if (datas.length === 0) {
    return false
  }

  const [anoBase, mesBase] = datas[0].split('-')
  return datas.every((data) => {
    const [ano, mes] = data.split('-')
    return ano === anoBase && mes === mesBase
  })
}

function formatarMesAnoDasDatas(datas = []) {
  if (datas.length === 0) {
    return ''
  }

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(getDateObjectLocal(datas[0]))
}

function agruparDatasConsecutivas(datas = []) {
  const datasOrdenadas = ordenarDatas(datas)
  const grupos = []

  datasOrdenadas.forEach((data) => {
    const ultimoGrupo = grupos.at(-1)

    if (!ultimoGrupo) {
      grupos.push([data])
      return
    }

    const dataAnterior = getDateObjectLocal(ultimoGrupo.at(-1))
    const dataAtual = getDateObjectLocal(data)
    const diferencaDias = (dataAtual.getTime() - dataAnterior.getTime()) / 86400000

    if (diferencaDias === 1) {
      ultimoGrupo.push(data)
      return
    }

    grupos.push([data])
  })

  return grupos
}

function formatarListaComVirgulaE(lista = []) {
  if (lista.length === 0) {
    return ''
  }

  if (lista.length === 1) {
    return lista[0]
  }

  if (lista.length === 2) {
    return `${lista[0]}, e ${lista[1]}`
  }

  return `${lista.slice(0, -1).join(', ')}, e ${lista.at(-1)}`
}

function formatarGrupoDatas(grupo, usarDataCompleta) {
  if (grupo.length === 1) {
    return usarDataCompleta ? formatarDataCurta(grupo[0]) : getDiaTexto(grupo[0])
  }

  if (grupo.length === 2) {
    const primeiro = usarDataCompleta ? formatarDataCurta(grupo[0]) : getDiaTexto(grupo[0])
    const ultimo = usarDataCompleta ? formatarDataCurta(grupo[1]) : getDiaTexto(grupo[1])
    return `${primeiro} e ${ultimo}`
  }

  const primeiro = usarDataCompleta ? formatarDataCurta(grupo[0]) : getDiaTexto(grupo[0])
  const ultimo = usarDataCompleta ? formatarDataCurta(grupo.at(-1)) : getDiaTexto(grupo.at(-1))
  return `${primeiro} a ${ultimo}`
}

function formatarDiasPrestacaoDocumento(datas = []) {
  const datasOrdenadas = ordenarDatas(datas)

  if (datasOrdenadas.length === 0) {
    return 'dias não definidos'
  }

  const mesmoMes = datasEstaoNoMesmoMes(datasOrdenadas)
  const grupos = agruparDatasConsecutivas(datasOrdenadas)
  const blocos = grupos.map((grupo) => formatarGrupoDatas(grupo, !mesmoMes))
  const prefixo = datasOrdenadas.length === 1 ? 'dia' : 'dias'
  const sufixoMes = mesmoMes ? ` de ${formatarMesAnoDasDatas(datasOrdenadas)}` : ''

  return `${prefixo} ${formatarListaComVirgulaE(blocos)}${sufixoMes}`
}

function getResumoOrigemSolicitada(programacao) {
  if (!programacao) {
    return ''
  }

  return `${programacao.aluno} | ${programacao.tipoTreinamento || 'Sem tipo'} | ${formatarDataCurta(programacao.dataInicial)} a ${formatarDataCurta(programacao.dataFinal)}`
}

function criarProgramacaoManualPrestacao(grupoId = 'prestacao-manual') {
  return {
    grupoId,
    aluno: 'Prestação manual',
    email: '',
    tipoTreinamento: 'Prestação manual',
    status: 'planejado',
    dataInicial: '',
    dataFinal: '',
    diasTreinamento: [],
    diasEmProva: [],
    diasHospedagem: [],
    dias: [],
    aluguelAparelho: false,
  }
}

function criarTextoModeloPrestacao(origemProgramacao, resumoFinanceiro, linhasPrestacao) {
  const nomeAlunoDocumento = origemProgramacao?.aluno || 'NOME DO ALUNO'
  const linhasVisiveis = linhasPrestacao.filter((linha) => linha.visivel)
  const diasDocumento = formatarDiasPrestacaoDocumento(linhasVisiveis.map((linha) => linha.data))

  return [
    `Prestação de contas referente ao treinamento de ${nomeAlunoDocumento}, considerando os ${diasDocumento}.`,
    `Resumo financeiro: diárias ${formatarMoeda(resumoFinanceiro.subtotalDiarias)}, hospedagem ${formatarMoeda(resumoFinanceiro.subtotalHospedagem)}, aluguel de aparelho ${formatarMoeda(resumoFinanceiro.subtotalAluguelAparelho)} e total geral de ${formatarMoeda(resumoFinanceiro.totalGeral)} em ${formatarQuantidadeDatas(linhasVisiveis.length)}.`,
  ].join('\n\n')
}

function getMesAnoInicialPrestacao(prestacao) {
  const datas =
    prestacao?.origemProgramacao && prestacao?.fechamento
      ? getDatasCandidatasPrestacao(prestacao.origemProgramacao, prestacao.fechamento)
      : []
  const dataBase = datas[0] ?? prestacao?.origemProgramacao?.dataInicial ?? null

  if (dataBase) {
    const [ano, mes] = dataBase.split('-').map(Number)
    return { ano, mes }
  }

  const hoje = new Date()
  return {
    ano: hoje.getFullYear(),
    mes: hoje.getMonth() + 1,
  }
}

function criarListaAtualizada(datas, data, deveExistir) {
  const lista = new Set(datas)

  if (deveExistir) {
    lista.add(data)
  } else {
    lista.delete(data)
  }

  return ordenarDatas([...lista])
}

function carregarPrestacaoDaProgramacao(programacao) {
  if (!programacao) {
    return {
      prestacao: null,
      mensagem: '',
    }
  }

  const prestacaoSalva = carregarPrestacaoSalva(programacao.grupoId)
  const prestacaoBase = criarPrestacaoInicial(programacao, prestacaoSalva)
  const fechamento = {
    ...prestacaoBase.fechamento,
    diasOcultos: [],
  }
  const parametros = {
    ...prestacaoBase.parametros,
    desconto: 0,
    acrescimo: 0,
    ajusteManual: 0,
    pagamentoEmpresa: 0,
    pagamentoAluno: 0,
    observacaoFinanceira: '',
  }
  const prestacao = {
    ...prestacaoBase,
    fechamento,
    parametros,
    linhas: sincronizarLinhasComFechamento(
      prestacaoBase.origemProgramacao,
      fechamento,
      [],
      parametros,
    ),
  }
  const linhasComTotais = atualizarTotaisDasLinhas(prestacao.linhas)
  const resumoBase = calcularResumoFinanceiroPrestacao(linhasComTotais, prestacao.parametros)
  const textoAtual = normalizarTexto(prestacao.parametros?.observacoes).trim()

  if (!textoAtual && !prestacaoSalva) {
    prestacao.parametros = {
      ...prestacao.parametros,
      observacoes: criarTextoModeloPrestacao(
        programacao,
        resumoBase,
        linhasComTotais,
      ),
    }
  }

  return {
    prestacao,
    mensagem: prestacaoSalva ? 'Prestação existente carregada.' : '',
  }
}

function PreviewPrestacaoDocumento({
  origemProgramacao,
  linhasPrestacao,
  resumoFinanceiro,
  textoLivre,
  cidadeEmissao,
  dataEmissao,
  onChangeTextoLivre,
}) {
  const linhasVisiveis = linhasPrestacao.filter((linha) => linha.visivel)
  const instituicao = carregarCamposInstitucionaisDeclaracao()
  const dataEmissaoDocumento = dataEmissao || new Date().toISOString().slice(0, 10)
  const cidadeEmissaoDocumento = cidadeEmissao || instituicao.cidadePadraoTreinamento
  const localData = `${cidadeEmissaoDocumento}, ${formatarDataExtensa(dataEmissaoDocumento)}`
  const nomeAlunoDocumento = origemProgramacao?.aluno || 'NOME DO ALUNO'
  const diasDocumento = formatarDiasPrestacaoDocumento(linhasVisiveis.map((linha) => linha.data))
  const paragrafos = extrairParagrafosTexto(textoLivre)
  const paragrafosRenderizados =
    paragrafos.length > 0
      ? paragrafos
      : [
          `Prestação de contas referente ao treinamento de ${nomeAlunoDocumento}, considerando os ${diasDocumento}.`,
        ]

  return (
    <div className="ibc-declaracao-documento-print rounded-[28px] border border-[#D9D9D9] bg-[#EEE7DA] p-3 md:p-5">
      <div className="ibc-declaracao-documento-surface mx-auto max-w-[820px] rounded-[10px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-8">
        <div className="ibc-print-evitar-quebra flex flex-col gap-5 border-b border-[#E5E7EB] pb-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo-sem-fundo.png"
              alt="IBC"
              className="h-12 w-auto object-contain md:h-14"
            />
          </div>

          <div className="text-[13px] leading-6 text-[#4B5563] md:text-right">
            {instituicao.blocoInstitucional.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <h4 className="mt-2 font-serif text-[21px] font-semibold uppercase tracking-[0.06em] text-[#1F2937] md:text-[23px]">
            {getTituloPrestacaoDocumento(origemProgramacao)}
          </h4>
        </div>

        <div className="mt-7 font-serif text-[13px] leading-7 text-[#1F2937]">
          <textarea
            value={textoLivre || paragrafosRenderizados.join('\n\n')}
            onChange={(e) => onChangeTextoLivre(e.target.value)}
            className="min-h-[180px] w-full resize-y border-0 bg-transparent p-0 text-justify font-serif text-[13px] leading-7 text-[#1F2937] outline-none focus:ring-0 print:resize-none"
            aria-label="Texto da prestação"
          />
        </div>

        <div className="ibc-print-evitar-quebra mt-7 grid gap-3 border border-[#E5E7EB] bg-[#F8FAFC] p-4 font-serif text-[13px] text-[#1F2937] md:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#64748B]">Dias</p>
            <p className="mt-1 font-semibold">{diasDocumento}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#64748B]">Diárias</p>
            <p className="mt-1 font-semibold">
              {formatarMoeda(resumoFinanceiro.subtotalDiarias)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#64748B]">Hospedagem / aparelho</p>
            <p className="mt-1 font-semibold">
              {formatarMoeda(
                resumoFinanceiro.subtotalHospedagem + resumoFinanceiro.subtotalAluguelAparelho,
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#64748B]">
              Total / {formatarQuantidadeDatas(linhasVisiveis.length)}
            </p>
            <p className="mt-1 font-bold text-[#B40105]">
              {formatarMoeda(resumoFinanceiro.totalGeral)}
            </p>
          </div>
        </div>

        <div className="mt-8 text-right font-serif text-[13px] text-[#1F2937]">{localData}.</div>

        <div className="ibc-print-evitar-quebra mt-10 grid gap-6 md:grid-cols-2">
          {instituicao.assinaturas.map((assinatura) => {
            const imagemAssinatura =
              typeof assinatura.imagem === 'string' ? assinatura.imagem.trim() : ''
            const ajusteVerticalAssinatura =
              assinatura.id === 'assinatura-diretora'
                ? 'translate-y-1'
                : assinatura.id === 'assinatura-diretor-tecnico'
                  ? 'translate-y-2.5'
                  : ''

            return (
              <div key={assinatura.id} className="pt-4 text-center">
                <div className="mx-auto -mb-2 flex h-[50px] w-full max-w-[220px] items-end justify-center overflow-visible">
                  {imagemAssinatura ? (
                    <img
                      src={imagemAssinatura}
                      alt={`Assinatura de ${assinatura.nome}`}
                      className={`max-h-[54px] w-auto object-contain ${ajusteVerticalAssinatura}`}
                    />
                  ) : null}
                </div>
                <div className="mx-auto h-px w-full max-w-[220px] bg-[#9CA3AF]" />
                <p className="mt-3 font-serif text-sm font-semibold text-[#1F2937]">
                  {assinatura.nome}
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">{assinatura.cargo}</p>
              </div>
            )
          })}
        </div>

        <div className="ibc-print-evitar-quebra mt-7 border-t border-[#E5E7EB] pt-3 text-center text-[10px] leading-5 text-[#6B7280]">
          {instituicao.rodapeLinhas?.length > 0
            ? instituicao.rodapeLinhas.map((linha) => <p key={linha}>{linha}</p>)
            : null}
        </div>
      </div>
    </div>
  )
}

export default function TelaPrestacao({
  onVoltar,
  onVoltarProgramacao,
  agendaMensal,
  grupoIdProgramacaoInicial = null,
  programacaoInicialResumo = null,
  onAtualizarProgramacaoOrigem = null,
  onAbrirEnvioEmail = null,
}) {
  const [filtroProgramacao, setFiltroProgramacao] = useState('')
  const programacoesDisponiveis = useMemo(
    () =>
      agruparProgramacoesPorGrupo(agendaMensal).sort(
        (a, b) =>
          b.dataFinal.localeCompare(a.dataFinal) ||
          b.dataInicial.localeCompare(a.dataInicial) ||
          a.aluno.localeCompare(b.aluno),
      ),
    [agendaMensal],
  )

  const programacoesFiltradas = useMemo(() => {
    const filtro = filtroProgramacao.toLowerCase().trim()
    const lista = !filtro
      ? programacoesDisponiveis
      : programacoesDisponiveis.filter((programacao) =>
          [
            programacao.aluno,
            programacao.tipoTreinamento,
            programacao.subnivel,
            programacao.dataInicial,
            programacao.dataFinal,
          ]
            .join(' ')
            .toLowerCase()
            .includes(filtro),
        )

    return filtro ? lista : lista.slice(0, 30)
  }, [filtroProgramacao, programacoesDisponiveis])

  const programacoesPorGrupo = useMemo(
    () => new Map(programacoesDisponiveis.map((programacao) => [programacao.grupoId, programacao])),
    [programacoesDisponiveis],
  )

  const grupoIdInicial = grupoIdProgramacaoInicial ?? OPCAO_PRESTACAO_MANUAL
  const prestacaoInicial = useMemo(() => {
    if (grupoIdInicial === OPCAO_PRESTACAO_MANUAL) {
      return carregarPrestacaoDaProgramacao(criarProgramacaoManualPrestacao())
    }

    return carregarPrestacaoDaProgramacao(programacoesPorGrupo.get(grupoIdInicial) ?? null)
  }, [grupoIdInicial, programacoesPorGrupo])
  const mesAnoInicial = getMesAnoInicialPrestacao(prestacaoInicial.prestacao)
  const [grupoIdSelecionado, setGrupoIdSelecionado] = useState(grupoIdInicial)
  const [prestacao, setPrestacao] = useState(prestacaoInicial.prestacao)
  const [mensagem, setMensagem] = useState(prestacaoInicial.mensagem)
  const [impressaoAtiva, setImpressaoAtiva] = useState(false)
  const [modoCalendario, setModoCalendario] = useState('treinamento')
  const [mesSelecao, setMesSelecao] = useState(mesAnoInicial.mes)
  const [anoSelecao, setAnoSelecao] = useState(mesAnoInicial.ano)
  const textoModeloPrestacaoAnteriorRef = useRef('')

  const origemInicialNaoEncontrada = false

  const origemProgramacao = prestacao?.origemProgramacao ?? null
  const fechamento = prestacao?.fechamento ?? null
  const camposInstitucionaisPrestacao = useMemo(
    () => carregarCamposInstitucionaisDeclaracao(),
    [],
  )

  useEffect(() => {
    if (!impressaoAtiva || typeof window === 'undefined') {
      return undefined
    }

    const classeImpressao = 'ibc-print-declaracao'
    const body = document.body
    const previewOriginal = document.querySelector('.ibc-declaracao-documento-print')

    if (!previewOriginal) {
      const timeoutSemPreview = window.setTimeout(() => setImpressaoAtiva(false), 0)
      return () => window.clearTimeout(timeoutSemPreview)
    }

    const cloneExportacao = criarCloneDocumentoExportacao()
    const previewClone = cloneExportacao?.clone ?? previewOriginal.cloneNode(true)

    if (!cloneExportacao) {
      previewClone.classList.add('ibc-declaracao-documento-print-portal')
      previewClone.setAttribute('aria-hidden', 'true')
      body.appendChild(previewClone)
    } else {
      cloneExportacao.portal.style.left = '0'
      cloneExportacao.portal.style.top = '0'
      cloneExportacao.portal.style.zIndex = '99999'
      cloneExportacao.portal.style.width = '100vw'
      cloneExportacao.portal.style.height = '100vh'
      cloneExportacao.portal.style.display = 'flex'
      cloneExportacao.portal.style.alignItems = 'flex-start'
      cloneExportacao.portal.style.justifyContent = 'center'
      cloneExportacao.portal.style.overflow = 'hidden'
      cloneExportacao.portal.style.background = '#ffffff'
    }

    function ajustarEscalaA4() {
      const superficie = previewClone.querySelector('.ibc-declaracao-documento-surface')

      if (!superficie) {
        body.style.setProperty('--ibc-print-scale', '1')
        return
      }

      const pxPorMm = 96 / 25.4
      const larguraUtilA4Px = (210 - 24) * pxPorMm
      const alturaUtilA4Px = (297 - 24) * pxPorMm
      const rect = superficie.getBoundingClientRect()
      const larguraAtual = rect.width || superficie.scrollWidth || 1
      const alturaAtual = rect.height || superficie.scrollHeight || 1
      const escalaLimite = Math.min(larguraUtilA4Px / larguraAtual, alturaUtilA4Px / alturaAtual)
      const escalaCalculada = Math.min(1.15, escalaLimite)
      const escala = Number.isFinite(escalaCalculada) ? Math.max(0.1, escalaCalculada) : 1

      body.style.setProperty('--ibc-print-scale', escala.toFixed(4))
    }

    body.classList.add(classeImpressao)
    ajustarEscalaA4()

    const handleAfterPrint = () => {
      body.classList.remove(classeImpressao)
      body.style.removeProperty('--ibc-print-scale')
      if (cloneExportacao) {
        cloneExportacao.limpar()
      } else {
        previewClone.remove()
      }
      setImpressaoAtiva(false)
    }

    const timeoutId = window.setTimeout(() => {
      ajustarEscalaA4()
      window.print()
    }, 120)

    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('afterprint', handleAfterPrint)
      body.classList.remove(classeImpressao)
      body.style.removeProperty('--ibc-print-scale')
      if (cloneExportacao) {
        cloneExportacao.limpar()
      } else {
        previewClone.remove()
      }
    }
  }, [impressaoAtiva])

  useEffect(() => {
    if (!prestacao?.grupoIdProgramacao || !origemProgramacao) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      salvarPrestacaoSalva(prestacao.grupoIdProgramacao, {
        ...prestacao,
        linhas: atualizarTotaisDasLinhas(prestacao.linhas),
      })
    }, 600)

    return () => window.clearTimeout(timeoutId)
  }, [origemProgramacao, prestacao])

  const linhasPrestacao = useMemo(
    () => (prestacao ? atualizarTotaisDasLinhas(prestacao.linhas) : []),
    [prestacao],
  )
  const datasBasePeriodo = useMemo(
    () => (origemProgramacao ? getDatasBasePeriodoPrestacao(origemProgramacao) : []),
    [origemProgramacao],
  )
  const datasBasePeriodoSet = useMemo(() => new Set(datasBasePeriodo), [datasBasePeriodo])

  const resumoFinanceiro = useMemo(
    () =>
      prestacao
        ? calcularResumoFinanceiroPrestacao(linhasPrestacao, prestacao.parametros)
        : resumoFinanceiroInicial,
    [linhasPrestacao, prestacao],
  )
  const textoModeloPrestacao = useMemo(() => {
    if (!prestacao || !origemProgramacao) {
      return ''
    }

    return criarTextoModeloPrestacao(origemProgramacao, resumoFinanceiro, linhasPrestacao)
  }, [linhasPrestacao, origemProgramacao, prestacao, resumoFinanceiro])

  useEffect(() => {
    if (!textoModeloPrestacao) {
      return
    }

    const textoModeloAnterior = textoModeloPrestacaoAnteriorRef.current
    textoModeloPrestacaoAnteriorRef.current = textoModeloPrestacao

    setPrestacao((atual) => {
      if (!atual) {
        return atual
      }

      const textoAtual = normalizarTexto(atual.parametros?.observacoes)

      if (textoAtual === textoModeloPrestacao) {
        return atual
      }

      if (textoAtual && textoAtual !== textoModeloAnterior) {
        return atual
      }

      return {
        ...atual,
        parametros: {
          ...atual.parametros,
          observacoes: textoModeloPrestacao,
        },
      }
    })
  }, [textoModeloPrestacao])

  const diasDoCalendario = useMemo(() => {
    if (!prestacao || !origemProgramacao || !fechamento) {
      return []
    }

    const { totalDias, deslocamentoInicial } = getInfoMes(anoSelecao, mesSelecao)
    const dias = []
    const datasCandidatasSet = new Set(getDatasCandidatasPrestacao(origemProgramacao, fechamento))

    for (let indice = 0; indice < deslocamentoInicial; indice += 1) {
      dias.push({
        key: `prestacao-vazio-inicio-${indice}`,
        vazio: true,
      })
    }

    for (let dia = 1; dia <= totalDias; dia += 1) {
      const data = criarChaveData(anoSelecao, mesSelecao, dia)
      const treinamentoSelecionado = fechamento.diasTreinamento.includes(data)
      const provaSelecionada = fechamento.diasEmProva.includes(data)
      const hospedagemSelecionada = fechamento.diasHospedagem.includes(data)
      const ocultoSelecionado = fechamento.diasOcultos.includes(data)
      const existeNoFechamento = datasCandidatasSet.has(data)
      const ehBasePeriodo = datasBasePeriodoSet.has(data)
      const extraSelecionado = !ehBasePeriodo && existeNoFechamento
      const selecionado =
        modoCalendario === 'prova'
          ? provaSelecionada
          : modoCalendario === 'hospedagem'
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
        ocultoSelecionado,
        extraSelecionado,
        existeNoFechamento,
        ehBasePeriodo,
      })
    }

    const espacosFinais = (7 - (dias.length % 7)) % 7

    for (let indice = 0; indice < espacosFinais; indice += 1) {
      dias.push({
        key: `prestacao-vazio-fim-${indice}`,
        vazio: true,
      })
    }

    return dias
  }, [
    anoSelecao,
    datasBasePeriodoSet,
    fechamento,
    mesSelecao,
    modoCalendario,
    origemProgramacao,
    prestacao,
  ])

  function handleSelecionarProgramacao(event) {
    const grupoId = event.target.value
    const origemSelecionada =
      grupoId === OPCAO_PRESTACAO_MANUAL
        ? criarProgramacaoManualPrestacao()
        : (programacoesPorGrupo.get(grupoId) ?? null)
    const { prestacao: novaPrestacao, mensagem: novaMensagem } =
      carregarPrestacaoDaProgramacao(origemSelecionada)
    const mesAno = getMesAnoInicialPrestacao(novaPrestacao)

    setGrupoIdSelecionado(grupoId)
    setPrestacao(novaPrestacao)
    setMensagem(novaMensagem)
    setModoCalendario('treinamento')
    setMesSelecao(mesAno.mes)
    setAnoSelecao(mesAno.ano)
  }

  function handleAbrirProgramacaoOrigem() {
    setMensagem('Abrindo a última programação mensal salva...')

    abrirUltimoPdfOficial('programacoes')
      .then((caminho) => {
        setMensagem(`Última programação mensal aberta: ${caminho}`)
      })
      .catch((erro) => {
        setMensagem(
          erro?.message || 'Não foi possível abrir a última programação mensal salva.',
        )
      })
  }

  function handleAtualizarParametroPrestacao(campo, valor) {
    setMensagem('')

    setPrestacao((atual) => {
      if (!atual) {
        return atual
      }

      return {
        ...atual,
        parametros: {
          ...atual.parametros,
          [campo]: valor,
        },
      }
    })
  }

  function handleAtualizarValorPrestacao(campo, valor) {
    setMensagem('')
    const valorNumerico = Number(valor) || 0

    setPrestacao((atual) => {
      if (!atual) {
        return atual
      }

      const parametros = {
        ...atual.parametros,
        [campo]: valorNumerico,
        desconto: 0,
        acrescimo: 0,
        ajusteManual: 0,
        pagamentoEmpresa: 0,
        pagamentoAluno: 0,
        observacaoFinanceira: '',
      }

      return {
        ...atual,
        parametros,
        linhas: sincronizarLinhasComFechamento(
          atual.origemProgramacao,
          atual.fechamento,
          [],
          parametros,
        ),
      }
    })
  }

  function handleAtualizarOrigemPrestacao(campo, valor) {
    setMensagem('')
    const valorNormalizadoParaAgenda = campo === 'aluguelAparelho' ? valor === 'sim' : valor

    if (
      onAtualizarProgramacaoOrigem &&
      prestacao?.grupoIdProgramacao &&
      prestacao.grupoIdProgramacao !== 'prestacao-manual'
    ) {
      onAtualizarProgramacaoOrigem(prestacao.grupoIdProgramacao, {
        [campo]: valorNormalizadoParaAgenda,
      })
    }

    setPrestacao((atual) => {
      if (!atual) {
        return atual
      }

      const origemProgramacaoAtualizada = {
        ...atual.origemProgramacao,
        [campo]: valorNormalizadoParaAgenda,
      }
      const fechamentoAtualizado = {
        ...atual.fechamento,
        diasTreinamento: [...(atual.fechamento?.diasTreinamento ?? [])],
        diasEmProva: [...(atual.fechamento?.diasEmProva ?? [])],
        diasHospedagem: [...(atual.fechamento?.diasHospedagem ?? [])],
        diasOcultos: [...(atual.fechamento?.diasOcultos ?? [])],
        diasAdicionados: [...(atual.fechamento?.diasAdicionados ?? [])],
      }

      if (campo === 'dataInicial' || campo === 'dataFinal') {
        const datasPeriodo = listarDatasEntre(
          origemProgramacaoAtualizada.dataInicial,
          origemProgramacaoAtualizada.dataFinal,
        )
        const ehPrestacaoManual =
          origemProgramacaoAtualizada.grupoId === 'prestacao-manual' ||
          origemProgramacaoAtualizada.tipoTreinamento === 'Prestação manual'

        if (ehPrestacaoManual && datasPeriodo.length > 0) {
          origemProgramacaoAtualizada.diasTreinamento = datasPeriodo
          origemProgramacaoAtualizada.dias = datasPeriodo
          fechamentoAtualizado.diasTreinamento = datasPeriodo
          fechamentoAtualizado.diasOcultos = fechamentoAtualizado.diasOcultos.filter((data) =>
            datasPeriodo.includes(data),
          )
        }
      }

      return {
        ...atual,
        origemProgramacao: origemProgramacaoAtualizada,
        fechamento: fechamentoAtualizado,
        linhas: sincronizarLinhasComFechamento(
          origemProgramacaoAtualizada,
          fechamentoAtualizado,
          [],
          atual.parametros,
        ),
      }
    })
  }

  function handleTrocarMesSelecao(direcao) {
    const proximaData = new Date(anoSelecao, mesSelecao - 1 + direcao, 1)
    setMesSelecao(proximaData.getMonth() + 1)
    setAnoSelecao(proximaData.getFullYear())
  }

  function handleAlternarDiaCalendario(data) {
    setMensagem('')
    setPrestacao((atual) => {
      if (!atual) {
        return atual
      }

      const origem = atual.origemProgramacao
      const fechamentoAtual = atual.fechamento
      let fechamentoNovo = {
        ...fechamentoAtual,
        diasTreinamento: [...fechamentoAtual.diasTreinamento],
        diasEmProva: [...fechamentoAtual.diasEmProva],
        diasHospedagem: [...fechamentoAtual.diasHospedagem],
        diasOcultos: [...fechamentoAtual.diasOcultos],
        diasAdicionados: [...fechamentoAtual.diasAdicionados],
      }

      if (modoCalendario === 'treinamento') {
        const ativo = !fechamentoNovo.diasTreinamento.includes(data)
        fechamentoNovo.diasTreinamento = criarListaAtualizada(
          fechamentoNovo.diasTreinamento,
          data,
          ativo,
        )
        if (ativo) {
          fechamentoNovo.diasOcultos = criarListaAtualizada(fechamentoNovo.diasOcultos, data, false)
        }
      } else if (modoCalendario === 'prova') {
        const ativo = !fechamentoNovo.diasEmProva.includes(data)
        fechamentoNovo.diasEmProva = criarListaAtualizada(fechamentoNovo.diasEmProva, data, ativo)
        if (ativo) {
          fechamentoNovo.diasOcultos = criarListaAtualizada(fechamentoNovo.diasOcultos, data, false)
        }
      } else if (modoCalendario === 'hospedagem') {
        const ativo = !fechamentoNovo.diasHospedagem.includes(data)
        fechamentoNovo.diasHospedagem = criarListaAtualizada(
          fechamentoNovo.diasHospedagem,
          data,
          ativo,
        )
        if (ativo) {
          fechamentoNovo.diasOcultos = criarListaAtualizada(fechamentoNovo.diasOcultos, data, false)
        }
      }

      const fechamento = {
        ...fechamentoNovo,
        diasTreinamento: ordenarDatas(fechamentoNovo.diasTreinamento),
        diasEmProva: ordenarDatas(fechamentoNovo.diasEmProva),
        diasHospedagem: ordenarDatas(fechamentoNovo.diasHospedagem),
        diasOcultos: ordenarDatas(fechamentoNovo.diasOcultos),
        diasAdicionados: ordenarDatas(fechamentoNovo.diasAdicionados),
      }

      return {
        ...atual,
        fechamento,
        linhas: sincronizarLinhasComFechamento(origem, fechamento, [], atual.parametros),
      }
    })
  }

  function handleAtualizarTextoPrestacao(valor) {
    setMensagem('')
    setPrestacao((atual) => {
      if (!atual) {
        return atual
      }

      return {
        ...atual,
        parametros: {
          ...atual.parametros,
          observacoes: valor,
        },
      }
    })
  }

  function handleGerarPrestacao() {
    if (!prestacao || !origemProgramacao) {
      return
    }

    const linhas = atualizarTotaisDasLinhas(prestacao.linhas)
    const geradaEm = new Date().toISOString()
    const salvo = salvarPrestacaoSalva(prestacao.grupoIdProgramacao, {
      ...prestacao,
      linhas,
      geradaEm,
    })

    if (!salvo) {
      setMensagem('Não foi possível salvar.')
      return
    }

    setPrestacao((atual) => ({
      ...atual,
      linhas,
      geradaEm,
      atualizadoEm: salvo.atualizadoEm,
    }))
    setMensagem('Prestação salva.')
  }

  async function gerarDocumentoEmitidoPrestacao(acaoGeradora) {
    const tipoDocumento = 'Prestação de contas'
    const nomePessoa = normalizarTexto(origemProgramacao.aluno)
    const nomeDocumento = getTituloPrestacaoDocumento(origemProgramacao)
    const nomeArquivoPdf = criarNomeArquivoPdf({ tipoDocumento, nomePessoa })
    const dataEmissao =
      prestacao.parametros?.dataEmissao || new Date().toISOString().slice(0, 10)
    const instituicao = carregarCamposInstitucionaisDeclaracao()
    const cidadeEmissao =
      prestacao.parametros?.cidadeEmissao || instituicao.cidadePadraoTreinamento
    const localData = `${cidadeEmissao}, ${formatarDataExtensa(dataEmissao)}.`
    void localData
    const anexoPrincipal = await gerarAnexoPdfVisualBase64({ nomeArquivo: nomeArquivoPdf })

    if (!anexoPrincipal?.base64) {
      throw new Error('Não foi possível renderizar o PDF visual da prestação.')
    }
    const arquivoSalvo = await salvarPdfOficial({
      nomeArquivo: nomeArquivoPdf,
      base64: anexoPrincipal?.base64,
      categoria: 'prestacoes',
    })
    const documentoEmitido = await registrarDocumentoEmitido({
      tipo: tipoDocumento,
      aluno: nomePessoa,
      nomeDocumento,
      nomeArquivoPdf: arquivoSalvo.nomeArquivo,
      caminhoPdf: arquivoSalvo.caminhoArquivo,
      anexoPrincipal,
      origem: 'prestacao',
      acaoGeradora,
      statusDocumento: 'salvo',
    })

    return {
      documentoEmitido,
      tipoDocumento,
      nomeDocumento,
      nomePessoa,
      nomeArquivoPdf: arquivoSalvo.nomeArquivo,
      caminhoPdf: arquivoSalvo.caminhoArquivo,
      usandoPastaTemporaria: arquivoSalvo.usandoPastaTemporaria,
      anexoPrincipal: {
        ...anexoPrincipal,
        nomeArquivo: arquivoSalvo.nomeArquivo,
      },
    }
  }

  async function handleSalvarPdfHistorico() {
    if (!prestacao || !origemProgramacao) {
      return
    }

    setMensagem('Gerando PDF e salvando no histórico...')

    try {
      const { caminhoPdf, usandoPastaTemporaria } = await gerarDocumentoEmitidoPrestacao('salvar')
      await abrirCaminhoSistema(caminhoPdf)
      setMensagem(
        usandoPastaTemporaria
          ? `PDF salvo e aberto a partir da pasta temporária: ${caminhoPdf}.`
          : `PDF salvo e aberto: ${caminhoPdf}`,
      )
    } catch (erro) {
      setMensagem(erro?.message || 'Não foi possível salvar o PDF da prestação.')
    }
  }

  async function handleEmitirPdf() {
    if (typeof window === 'undefined' || !prestacao || !origemProgramacao) {
      return
    }

    setMensagem('Salvando PDF oficial da prestação antes de imprimir...')

    try {
      const { caminhoPdf } = await gerarDocumentoEmitidoPrestacao('imprimir')
      setMensagem(`PDF salvo com sucesso em ${caminhoPdf}. Abrindo impressão...`)
      setImpressaoAtiva(true)
    } catch (erro) {
      setMensagem(erro?.message || 'Não foi possível salvar o PDF da prestação para impressão.')
    }
  }

  async function handleAbrirEnvioEmailPrestacao() {
    if (!onAbrirEnvioEmail || !prestacao || !origemProgramacao) {
      return
    }

    setMensagem('Salvando PDF oficial da prestação para anexar ao e-mail...')

    try {
      const {
        documentoEmitido,
        tipoDocumento,
        nomeDocumento,
        nomePessoa,
        nomeArquivoPdf,
        anexoPrincipal,
        caminhoPdf,
      } = await gerarDocumentoEmitidoPrestacao('enviar_email')

      onAbrirEnvioEmail({
        documentoEmitidoId: documentoEmitido.id,
        tipoDocumento,
        nomeDocumento,
        nomePessoa,
        destinatarioEmail: normalizarTexto(origemProgramacao.email),
        assuntoSugerido: criarAssuntoSugeridoEmail({ tipoDocumento, nomePessoa }),
        mensagemSugerida: criarMensagemSugeridaEmail({ tipoDocumento, nomePessoa }),
        nomeArquivoPdf,
        anexoPrincipal,
      })
      setMensagem(`PDF salvo com sucesso em ${caminhoPdf}.`)
    } catch (erro) {
      setMensagem(erro?.message || 'Não foi possível preparar o PDF da prestação para e-mail.')
    }
  }

  return (
    <>
      <BarraTopo
        titulo="Prestação de contas"
        subtitulo="Edite o texto, ajuste os valores e gere o PDF direto no sistema."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
              Dados
            </p>
            <h3 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
              Prestação editável
            </h3>
          </div>

          <div className="rounded-[22px] border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm text-[#4B5563]">
            {prestacao?.atualizadoEm
              ? `Prestação atualizada em ${formatarDataCurta(prestacao.atualizadoEm.slice(0, 10))}`
              : 'Prestação em edição'}
          </div>
        </div>

        {mensagem ? (
          <div className="mt-6 rounded-[20px] border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm font-semibold text-[#334155]">
            {mensagem}
          </div>
        ) : null}

        <label className="mt-6 grid min-w-0 gap-2">
          <span className="text-sm font-semibold text-[#4B5563]">Buscar programação</span>
          <input
            value={filtroProgramacao}
            onChange={(e) => setFiltroProgramacao(e.target.value)}
            className="min-w-0 w-full rounded-[20px] border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
            placeholder="Aluno, curso, subnível ou data"
          />
        </label>

        <label className="mt-6 grid min-w-0 gap-2">
          <span className="text-sm font-semibold text-[#4B5563]">
            Programação
          </span>
          <select
            value={grupoIdSelecionado}
            onChange={handleSelecionarProgramacao}
            className="min-w-0 w-full rounded-[20px] border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
          >
            <option value={OPCAO_PRESTACAO_MANUAL}>Prestação manual (do zero)</option>
            <option value="">Selecione uma programação</option>
            {programacoesFiltradas.map((programacao) => (
              <option key={programacao.grupoId} value={programacao.grupoId}>
                {getRotuloSelecaoProgramacao(programacao)}
              </option>
            ))}
          </select>
          <span className="text-sm text-[#767676]">
            {filtroProgramacao
              ? `${programacoesFiltradas.length} programação(ões) encontrada(s).`
              : `Mostrando as 30 programações mais recentes de ${programacoesDisponiveis.length} no total.`}
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleAbrirProgramacaoOrigem}
            className="rounded-[18px] border border-[#D9D9D9] bg-white px-4 py-3 font-semibold text-[#222222] transition-colors hover:bg-[#FCFCFC]"
          >
            Abrir programação mensal
          </button>
        </div>

        {!prestacao || !origemProgramacao ? (
          <div className="mt-6 rounded-[20px] border border-dashed border-[#D9D9D9] bg-[#FAFAFA] px-4 py-5 text-sm text-[#767676]">
            {origemInicialNaoEncontrada ? (
              <>
                <p className="font-semibold text-[#334155]">
                  A programação de origem não foi encontrada na agenda atual.
                </p>
                {programacaoInicialResumo ? (
                  <p className="mt-2">
                    Origem solicitada: {getResumoOrigemSolicitada(programacaoInicialResumo)}.
                  </p>
                ) : null}
                <p className="mt-2">
                  Selecione outra programação para iniciar o fechamento ou volte para revisar a
                  programação.
                </p>
              </>
            ) : (
              <>
                Preenchimento manual ativo. A prestação abre sem carregar automaticamente a última
                programação. Selecione uma origem apenas quando quiser puxar os dados.
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-6 xl:grid-cols-[500px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(820px,1fr)]">
              <div className="grid min-w-0 content-start gap-4">
                <div className={cartaoSecundarioClass}>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
                    Dados da prestação
                  </p>
                  <div className="mt-4 grid gap-4">
                    <label className="grid min-w-0 gap-2">
                      <span className="text-sm font-semibold text-[#4B5563]">Aluno</span>
                      <input
                        value={origemProgramacao.aluno}
                        onChange={(e) => handleAtualizarOrigemPrestacao('aluno', e.target.value)}
                        className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-lg font-semibold text-slate-900"
                        placeholder="Nome do aluno"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2">
                      <span className="text-sm font-semibold text-[#4B5563]">E-mail</span>
                      <input
                        type="email"
                        value={origemProgramacao.email}
                        onChange={(e) => handleAtualizarOrigemPrestacao('email', e.target.value)}
                        className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base font-semibold text-slate-900"
                        placeholder="email@exemplo.com"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid min-w-0 gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#767676]">
                          Início
                        </span>
                        <input
                          type="date"
                          value={origemProgramacao.dataInicial}
                          onChange={(e) =>
                            handleAtualizarOrigemPrestacao('dataInicial', e.target.value)
                          }
                          className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base font-semibold text-slate-900"
                        />
                      </label>
                      <label className="grid min-w-0 gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#767676]">
                          Fim
                        </span>
                        <input
                          type="date"
                          value={origemProgramacao.dataFinal}
                          onChange={(e) =>
                            handleAtualizarOrigemPrestacao('dataFinal', e.target.value)
                          }
                          className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base font-semibold text-slate-900"
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid min-w-0 gap-2">
                        <span className="text-sm font-semibold text-[#4B5563]">
                          Cidade de emissão
                        </span>
                        <input
                          value={
                            prestacao.parametros?.cidadeEmissao ||
                            camposInstitucionaisPrestacao.cidadePadraoTreinamento
                          }
                          onChange={(e) =>
                            handleAtualizarParametroPrestacao('cidadeEmissao', e.target.value)
                          }
                          className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
                          placeholder="Ex.: Rio de Janeiro"
                        />
                      </label>
                      <label className="grid min-w-0 gap-2">
                        <span className="text-sm font-semibold text-[#4B5563]">
                          Data de emissão
                        </span>
                        <input
                          type="date"
                          value={
                            prestacao.parametros?.dataEmissao ||
                            new Date().toISOString().slice(0, 10)
                          }
                          onChange={(e) =>
                            handleAtualizarParametroPrestacao('dataEmissao', e.target.value)
                          }
                          className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className={cartaoSecundarioClass}>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
                    Valores editáveis
                  </p>
                  <p className="mt-2 text-sm text-[#4B5563]">
                    Alterou o valor, o resumo e o texto do documento atualizam direto.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid min-w-0 gap-2">
                      <span className="text-sm font-semibold text-[#4B5563]">Diária útil</span>
                      <input
                        type="number"
                        value={prestacao.parametros?.valorDiariaUtil ?? 0}
                        onChange={(e) =>
                          handleAtualizarValorPrestacao('valorDiariaUtil', e.target.value)
                        }
                        className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2">
                      <span className="text-sm font-semibold text-[#4B5563]">
                        Diária fim de semana
                      </span>
                      <input
                        type="number"
                        value={prestacao.parametros?.valorDiariaFimDeSemana ?? 0}
                        onChange={(e) =>
                          handleAtualizarValorPrestacao('valorDiariaFimDeSemana', e.target.value)
                        }
                        className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2">
                      <span className="text-sm font-semibold text-[#4B5563]">Hospedagem</span>
                      <input
                        type="number"
                        value={prestacao.parametros?.valorHospedagemDia ?? 0}
                        onChange={(e) =>
                          handleAtualizarValorPrestacao('valorHospedagemDia', e.target.value)
                        }
                        className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2">
                      <span className="text-sm font-semibold text-[#4B5563]">
                        Aluguel de aparelho
                      </span>
                      <input
                        type="number"
                        value={prestacao.parametros?.valorAluguelAparelho ?? 0}
                        onChange={(e) =>
                          handleAtualizarValorPrestacao('valorAluguelAparelho', e.target.value)
                        }
                        className="min-w-0 rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <section className={`${cartaoPrincipalClass} min-w-0`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
                      Preview editável
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                      Prestação pronta para conferência
                    </h3>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row">
                    <button
                      type="button"
                      onClick={handleSalvarPdfHistorico}
                      className={botaoSecundarioClass}
                    >
                      Salvar PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleAbrirEnvioEmailPrestacao}
                      className={botaoSecundarioClass}
                    >
                      Enviar por e-mail
                    </button>
                    <button type="button" onClick={handleEmitirPdf} className={botaoPrimarioClass}>
                      Imprimir
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <PreviewPrestacaoDocumento
                    origemProgramacao={origemProgramacao}
                    linhasPrestacao={linhasPrestacao}
                    resumoFinanceiro={resumoFinanceiro}
                    textoLivre={prestacao.parametros?.observacoes}
                    cidadeEmissao={prestacao.parametros?.cidadeEmissao}
                    dataEmissao={prestacao.parametros?.dataEmissao}
                    onChangeTextoLivre={handleAtualizarTextoPrestacao}
                  />
                </div>
              </section>
            </div>

            <div className={`mt-6 ${cartaoSecundarioClass}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
                    Calendário
                  </p>
                  <h4 className="mt-2 text-2xl font-bold text-slate-900">
                    {formatarMesAno(mesSelecao, anoSelecao)}
                  </h4>
                  <p className="mt-2 text-sm text-[#4B5563]">
                    {modoCalendario === 'prova'
                      ? 'Modo atual: Aluguel de aparelho'
                      : modoCalendario === 'hospedagem'
                        ? 'Modo atual: Hospedagem'
                        : 'Modo atual: Treinamento'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleTrocarMesSelecao(-1)}
                    className={botaoSecundarioCompactoClass}
                  >
                    Mês anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrocarMesSelecao(1)}
                    className={botaoSecundarioCompactoClass}
                  >
                    Próximo mês
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {modosCalendarioSimplificado.map((modo) => (
                  <button
                    key={modo.value}
                    type="button"
                    onClick={() => setModoCalendario(modo.value)}
                    className={[
                      'rounded-[18px] px-4 py-3 text-sm font-semibold transition-colors',
                      modoCalendario === modo.value
                        ? modo.value === 'prova'
                          ? 'bg-[#9A3412] text-white'
                          : modo.value === 'hospedagem'
                            ? 'bg-[#166534] text-white'
                            : 'bg-[#B40105] text-white'
                        : 'border border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                    ].join(' ')}
                  >
                    {modo.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-semibold text-[#767676]">Treinamento</span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {prestacao.fechamento.diasTreinamento.length}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-semibold text-[#767676]">
                    Aluguel de aparelho
                  </span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {prestacao.fechamento.diasEmProva.length}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-semibold text-[#767676]">Hospedagem</span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {prestacao.fechamento.diasHospedagem.length}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-semibold text-[#767676]">Dias no documento</span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {linhasPrestacao.filter((linha) => linha.visivel).length}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-dashed border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#767676]">
                Clique nos dias para marcar treinamento, aluguel de aparelho e hospedagem.
              </div>

              <div className="mt-6 grid grid-cols-7 gap-2 md:gap-3">
                {diasSemana.map((diaSemana) => (
                  <div
                    key={diaSemana}
                    className="rounded-[18px] bg-[#222222] px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 md:text-sm"
                  >
                    {diaSemana}
                  </div>
                ))}

                {diasDoCalendario.map((item) => {
                  if (item.vazio) {
                    return (
                      <div
                        key={item.key}
                        className="min-h-[84px] rounded-2xl border border-dashed border-slate-200 bg-white/60"
                      />
                    )
                  }

                  const possuiMarcacao =
                    item.treinamentoSelecionado ||
                    item.provaSelecionada ||
                    item.hospedagemSelecionada ||
                    item.ocultoSelecionado ||
                    item.extraSelecionado ||
                    item.ehBasePeriodo

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleAlternarDiaCalendario(item.data)}
                      className={[
                        'min-h-[108px] rounded-[18px] border px-2 py-3 text-center text-sm font-semibold transition-colors md:text-base',
                        item.selecionado
                          ? modoCalendario === 'prova'
                            ? 'border-[#9A3412] bg-[#9A3412] text-white'
                            : modoCalendario === 'hospedagem'
                              ? 'border-[#166534] bg-[#166534] text-white'
                              : 'border-[#B40105] bg-[#B40105] text-white'
                          : item.ocultoSelecionado
                            ? 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                            : possuiMarcacao
                              ? 'border-[#E5D1D3] bg-[#FFF8F8] text-[#222222] hover:bg-[#FFF1F1]'
                              : 'border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                      ].join(' ')}
                    >
                      <span className="block">{item.dia}</span>
                      {(item.treinamentoSelecionado ||
                        item.provaSelecionada ||
                        item.hospedagemSelecionada) && (
                        <div className="mt-2 flex flex-wrap justify-center gap-1">
                          {item.treinamentoSelecionado ? (
                            <span
                              className={[
                                'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                item.selecionado && modoCalendario === 'treinamento'
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
                                item.selecionado && modoCalendario === 'prova'
                                  ? 'bg-white/15 text-white'
                                  : 'bg-[#FFF5E8] text-[#9A3412]',
                              ].join(' ')}
                            >
                              Aparelho
                            </span>
                          ) : null}
                          {item.hospedagemSelecionada ? (
                            <span
                              className={[
                                'rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                item.selecionado && modoCalendario === 'hospedagem'
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

            <div className={`mt-6 ${cartaoSecundarioClass}`}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
                Resumo
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-medium text-[#4B5563]">Diárias</span>
                  <p className="mt-2 text-xl font-bold text-[#222222]">
                    {formatarMoeda(resumoFinanceiro.subtotalDiarias)}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-medium text-[#4B5563]">Hospedagem</span>
                  <p className="mt-2 text-xl font-bold text-[#222222]">
                    {formatarMoeda(resumoFinanceiro.subtotalHospedagem)}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-medium text-[#4B5563]">Aparelho</span>
                  <p className="mt-2 text-xl font-bold text-[#222222]">
                    {formatarMoeda(resumoFinanceiro.subtotalAluguelAparelho)}
                  </p>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#D9D9D9]">
                  <span className="text-sm font-medium text-[#4B5563]">Dias</span>
                  <p className="mt-2 text-xl font-bold text-[#222222]">
                    {formatarQuantidadeDatas(linhasPrestacao.filter((linha) => linha.visivel).length)}
                  </p>
                </div>
                <div className="rounded-[18px] bg-[#FFF5F5] px-4 py-4 ring-1 ring-[#E5B5B8]">
                  <span className="text-sm font-semibold text-[#B40105]">Total</span>
                  <p className="mt-2 text-2xl font-bold text-[#B40105]">
                    {formatarMoeda(resumoFinanceiro.totalGeral)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button type="button" onClick={handleGerarPrestacao} className={botaoPrimarioClass}>
                Salvar prestação
              </button>
              {onVoltarProgramacao ? (
                <button
                  type="button"
                  onClick={onVoltarProgramacao}
                  className={botaoSecundarioClass}
                >
                  Voltar para programação
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>
    </>
  )
}



