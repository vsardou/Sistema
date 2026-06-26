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
  formatarMesAno,
  getInfoMes,
  ordenarDatas,
} from '../features/programacao/utils/dateUtils'
import {
  agruparProgramacoesPorGrupo,
  getRotuloSelecaoProgramacao,
} from '../features/programacao/utils/programacaoUtils'
import {
  MODELO_DECLARACAO_ABENDI,
  MODELO_DECLARACAO_PERIODO,
  subniveisDeclaracao,
  finalidadesTreinamentoDeclaracao,
  modelosDeclaracaoV1,
  rotulosModeloDeclaracao,
} from '../features/declaracoes/constants'
import {
  carregarRascunhoDeclaracoes as carregarDeclaracoesSalvas,
  criarEstadoDeclaracoesInicial,
  criarFormularioComprovacaoInicial,
  criarFormularioTreinamentoInicial,
  criarPreviewDeclaracao,
  formatarCpfProgressivo,
  formatarNomeBrasileiro,
  gerarTextoModeloDeclaracao,
  preencherFormularioComprovacaoComProgramacao,
  preencherFormularioTreinamentoComProgramacao,
  salvarRascunhoDeclaracoes as salvarDeclaracoesAutomaticamente,
} from '../features/declaracoes/utils/declaracoesUtils'
import {
  criarAssuntoSugeridoEmail,
  criarMensagemSugeridaEmail,
  criarNomeArquivoPdf,
} from '../features/email/utils/emailComposer'
import { carregarConfiguracaoDocumentos } from '../features/configuracoes/configuracaoDocumentos'
import {
  criarCloneDocumentoExportacao,
  gerarAnexoPdfVisualBase64,
} from '../features/email/utils/pdfUtils'
import { registrarDocumentoEmitido } from '../features/documentos/utils/documentosEmitidos'
import {
  abrirCaminhoSistema,
  salvarPdfOficial,
} from '../features/documentos/utils/documentosOficiais'

const inputClass =
  'min-w-0 w-full rounded-[20px] border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]'
const textareaClass =
  'min-h-[120px] min-w-0 w-full rounded-[20px] border border-[#D9D9D9] bg-white px-4 py-4 text-base text-[#222222]'
const inputSomenteLeituraClass =
  'min-w-0 w-full rounded-[20px] border border-[#D9D9D9] bg-[#FAFAFA] px-4 py-4 text-base text-[#4B5563]'

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  helperText = '',
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-[#4B5563]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={readOnly ? inputSomenteLeituraClass : inputClass}
      />
      {helperText ? <span className="text-sm text-[#767676]">{helperText}</span> : null}
    </label>
  )
}

function CampoSelect({ label, value, onChange, options, helperText = '' }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-[#4B5563]">{label}</span>
      <select value={value} onChange={onChange} className={inputClass}>
        {options.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
      {helperText ? <span className="text-sm text-[#767676]">{helperText}</span> : null}
    </label>
  )
}

function CampoTextoArea({ label, value, onChange, placeholder, helperText = '', rows = 4 }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-[#4B5563]">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={textareaClass}
      />
      {helperText ? <span className="text-sm text-[#767676]">{helperText}</span> : null}
    </label>
  )
}

function TextoDocumentoEditavel({ value, onChange, ariaLabel, minHeight = 260 }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  function handleChange(event) {
    const textarea = event.target
    onChange(textarea.value)
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      style={{ minHeight }}
      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-justify font-serif text-[13px] leading-7 text-[#1F2937] outline-none focus:ring-0"
      aria-label={ariaLabel}
    />
  )
}

function PreviewDocumento({ preview, textoLivre, onChangeTextoLivre }) {
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
            {preview.blocoInstitucional.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <h4 className="mt-2 font-serif text-[21px] font-semibold uppercase tracking-[0.06em] text-[#1F2937] md:text-[23px]">
            {preview.titulo}
          </h4>
        </div>

        <div className="mt-7 font-serif text-[13px] leading-7 text-[#1F2937]">
          <TextoDocumentoEditavel
            value={textoLivre}
            onChange={onChangeTextoLivre}
            ariaLabel="Texto da declaração"
            minHeight={260}
          />
        </div>

        <div className="mt-8 text-right font-serif text-[13px] text-[#1F2937]">
          {preview.localDataEmissao}
        </div>

        <div className="ibc-print-evitar-quebra mt-10 grid gap-6 md:grid-cols-2">
          {preview.assinaturas.map((assinatura) => {
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
          {preview.rodapeLinhas?.length > 0
            ? preview.rodapeLinhas.map((linha) => <p key={linha}>{linha}</p>)
            : preview.rodape}
        </div>
      </div>
    </div>
  )
}

function getResumoOrigemAplicada(origemProgramacaoResumo) {
  if (!origemProgramacaoResumo?.grupoId) {
    return null
  }

  return `${origemProgramacaoResumo.aluno} | ${origemProgramacaoResumo.tipoTreinamento || 'Sem tipo'} | ${formatarDataCurta(origemProgramacaoResumo.dataInicial)} a ${formatarDataCurta(origemProgramacaoResumo.dataFinal)}`
}

function formatarAtualizacao(iso) {
  if (!iso) {
    return 'Documento em edição'
  }

  return `Atualizado em ${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))}`
}

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

function criarDiasCalendarioSelecao(ano, mes, diasSelecionados = [], diasOrigem = []) {
  const diasSelecionadosSet = new Set(diasSelecionados)
  const diasOrigemSet = new Set(diasOrigem)
  const { totalDias, deslocamentoInicial } = getInfoMes(ano, mes)
  const dias = []

  for (let indice = 0; indice < deslocamentoInicial; indice += 1) {
    dias.push({
      key: `vazio-inicio-${ano}-${mes}-${indice}`,
      vazio: true,
    })
  }

  for (let dia = 1; dia <= totalDias; dia += 1) {
    const data = criarChaveData(ano, mes, dia)

    dias.push({
      key: data,
      vazio: false,
      dia,
      data,
      selecionado: diasSelecionadosSet.has(data),
      origem: diasOrigemSet.has(data),
    })
  }

  const espacosFinais = (7 - (dias.length % 7)) % 7

  for (let indice = 0; indice < espacosFinais; indice += 1) {
    dias.push({
      key: `vazio-fim-${ano}-${mes}-${indice}`,
      vazio: true,
    })
  }

  return dias
}

function ehIntervaloContinuo(datas = []) {
  if (datas.length <= 1) {
    return true
  }

  for (let indice = 1; indice < datas.length; indice += 1) {
    const anterior = new Date(`${datas[indice - 1]}T00:00:00`)
    const atual = new Date(`${datas[indice]}T00:00:00`)
    const diferencaEmDias = (atual.getTime() - anterior.getTime()) / 86400000

    if (!Number.isFinite(diferencaEmDias) || diferencaEmDias !== 1) {
      return false
    }
  }

  return true
}

function formatarListaDatas(datas = []) {
  const datasFormatadas = datas.map((data) => formatarDataCurta(data))

  if (datasFormatadas.length === 0) {
    return ''
  }

  if (datasFormatadas.length === 1) {
    return datasFormatadas[0]
  }

  if (datasFormatadas.length === 2) {
    return `${datasFormatadas[0]} e ${datasFormatadas[1]}`
  }

  return `${datasFormatadas.slice(0, -1).join(', ')} e ${datasFormatadas.at(-1)}`
}

function getResumoPeriodoSelecionado(diasSelecionados = [], dataInicial = '', dataFinal = '') {
  if (diasSelecionados.length === 0) {
    return dataInicial && dataFinal
      ? `${formatarDataCurta(dataInicial)} a ${formatarDataCurta(dataFinal)}`
      : 'Nenhum dia selecionado'
  }

  if (diasSelecionados.length === 1) {
    return formatarDataCurta(diasSelecionados[0])
  }

  if (ehIntervaloContinuo(diasSelecionados)) {
    return `${formatarDataCurta(diasSelecionados[0])} a ${formatarDataCurta(diasSelecionados.at(-1))}`
  }

  return formatarListaDatas(diasSelecionados)
}

function getCargaHorariaPorDiasSelecionados(diasSelecionados = []) {
  if (diasSelecionados.length === 0) {
    return ''
  }

  return String(diasSelecionados.length * carregarConfiguracaoDocumentos().horasPorDiaDeclaracao)
}

export default function TelaDeclaracoes({
  onVoltar,
  agendaMensal = [],
  programacaoInicialResumo = null,
  onAtualizarProgramacaoOrigem = null,
  onAbrirEnvioEmail = null,
}) {
  const [declaracoes, setDeclaracoes] = useState(() => {
    const declaracoesSalvas = carregarDeclaracoesSalvas() ?? criarEstadoDeclaracoesInicial()
    const formulariosIniciais = programacaoInicialResumo?.grupoId
      ? {
          ...declaracoesSalvas.formularios,
          ...criarFormulariosComOrigemProgramacao(programacaoInicialResumo),
        }
      : {
          ...declaracoesSalvas.formularios,
          [MODELO_DECLARACAO_PERIODO]: {
            ...declaracoesSalvas.formularios[MODELO_DECLARACAO_PERIODO],
            origemProgramacaoId: '',
            origemProgramacaoResumo: null,
          },
          [MODELO_DECLARACAO_ABENDI]: {
            ...declaracoesSalvas.formularios[MODELO_DECLARACAO_ABENDI],
            origemProgramacaoId: '',
            origemProgramacaoResumo: null,
          },
        }

    return {
      ...declaracoesSalvas,
      modeloAtivo: MODELO_DECLARACAO_PERIODO,
      formularios: formulariosIniciais,
    }
  })
  const [mensagem, setMensagem] = useState('')
  const [impressaoAtiva, setImpressaoAtiva] = useState(false)
  const primeiroSalvamentoAutomaticoRef = useRef(true)
  const [salvamentoAutomaticoEmPorModelo, setSalvamentoAutomaticoEmPorModelo] = useState({})
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

  const modeloAtivo = declaracoes.modeloAtivo
  const formularioTreinamento = declaracoes.formularios[MODELO_DECLARACAO_PERIODO]
  const formularioComprovacao = declaracoes.formularios[MODELO_DECLARACAO_ABENDI]
  const formularioAtivo =
    modeloAtivo === MODELO_DECLARACAO_ABENDI ? formularioComprovacao : formularioTreinamento
  const preview = useMemo(
    () => criarPreviewDeclaracao(modeloAtivo, formularioAtivo),
    [modeloAtivo, formularioAtivo],
  )
  const resumoOrigemAplicada = getResumoOrigemAplicada(formularioAtivo.origemProgramacaoResumo)
  const textoDoPreviewTravado = formularioAtivo.textoEditadoManualmente === true
  const atualizadoEm =
    salvamentoAutomaticoEmPorModelo[modeloAtivo] ??
    declaracoes.meta.atualizadoEmPorModelo[modeloAtivo]
  const diasReaisOrigem = useMemo(
    () => ordenarDatas(formularioTreinamento.origemProgramacaoResumo?.diasTreinamento ?? []),
    [formularioTreinamento.origemProgramacaoResumo],
  )
  const diasDeclaracaoSelecionados = useMemo(
    () => ordenarDatas(formularioTreinamento.diasDeclaracaoSelecionados ?? []),
    [formularioTreinamento.diasDeclaracaoSelecionados],
  )
  const dataBaseMesSelecao =
    diasDeclaracaoSelecionados[0] ??
    formularioTreinamento.dataInicial ??
    formularioTreinamento.origemProgramacaoResumo?.dataInicial ??
    ''
  const mesAnoBaseSelecao = getMesAnoDaData(dataBaseMesSelecao)
  const hoje = new Date()
  const [anoSelecaoDatas, setAnoSelecaoDatas] = useState(
    mesAnoBaseSelecao?.ano ?? hoje.getFullYear(),
  )
  const [mesSelecaoDatas, setMesSelecaoDatas] = useState(
    mesAnoBaseSelecao?.mes ?? hoje.getMonth() + 1,
  )
  const diasCalendarioDeclaracao = useMemo(
    () =>
      criarDiasCalendarioSelecao(
        anoSelecaoDatas,
        mesSelecaoDatas,
        diasDeclaracaoSelecionados,
        diasReaisOrigem,
      ),
    [anoSelecaoDatas, mesSelecaoDatas, diasDeclaracaoSelecionados, diasReaisOrigem],
  )
  const resumoPeriodoSelecionado = useMemo(
    () =>
      getResumoPeriodoSelecionado(
        diasDeclaracaoSelecionados,
        formularioTreinamento.dataInicial,
        formularioTreinamento.dataFinal,
      ),
    [diasDeclaracaoSelecionados, formularioTreinamento.dataInicial, formularioTreinamento.dataFinal],
  )

  function criarFormulariosComOrigemProgramacao(programacaoResumo) {
    return {
      [MODELO_DECLARACAO_PERIODO]: preencherFormularioTreinamentoComProgramacao(
        criarFormularioTreinamentoInicial(),
        programacaoResumo,
      ),
      [MODELO_DECLARACAO_ABENDI]: preencherFormularioComprovacaoComProgramacao(
        criarFormularioComprovacaoInicial(),
        programacaoResumo,
      ),
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    if (primeiroSalvamentoAutomaticoRef.current) {
      primeiroSalvamentoAutomaticoRef.current = false
      return undefined
    }

    const timeoutSalvamento = window.setTimeout(() => {
      const salvo = salvarDeclaracoesAutomaticamente(declaracoes)

      if (salvo?.meta?.atualizadoEmPorModelo) {
        setSalvamentoAutomaticoEmPorModelo((atual) => ({
          ...atual,
          [salvo.modeloAtivo]: salvo.meta.atualizadoEmPorModelo[salvo.modeloAtivo],
        }))
      }
    }, 450)

    return () => window.clearTimeout(timeoutSalvamento)
  }, [declaracoes])

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

  function atualizarFormularioDoModelo(modeloId, transformacao) {
    setDeclaracoes((atual) => ({
      ...atual,
      formularios: {
        ...atual.formularios,
        [modeloId]: transformacao(atual.formularios[modeloId]),
      },
    }))
  }

  function handleSelecionarModelo(modeloId) {
    const modelo = modelosDeclaracaoV1.find((item) => item.id === modeloId)

    if (!modelo?.disponivel) {
      return
    }

    setMensagem('')
    setDeclaracoes((atual) => ({
      ...atual,
      modeloAtivo: modeloId,
    }))
  }

  function sincronizarCampoOrigemNosFormularios(
    grupoId,
    camposOrigem = {},
    camposDocumento = {},
  ) {
    if (
      !grupoId ||
      (Object.keys(camposOrigem).length === 0 && Object.keys(camposDocumento).length === 0)
    ) {
      return
    }

    setDeclaracoes((atual) => {
      const formularios = { ...atual.formularios }

      Object.entries(formularios).forEach(([modeloId, formulario]) => {
        if (formulario.origemProgramacaoId !== grupoId) {
          return
        }

        const camposFormulario = {}

        if (typeof camposDocumento.aluno === 'string') {
          camposFormulario[
            modeloId === MODELO_DECLARACAO_ABENDI ? 'nomeProfissional' : 'nomeAluno'
          ] = camposDocumento.aluno
        }

        if (typeof camposDocumento.cpf === 'string') {
          camposFormulario[modeloId === MODELO_DECLARACAO_ABENDI ? 'cpf' : 'cpfAluno'] =
            camposDocumento.cpf
        }

        if (typeof camposDocumento.snqc === 'string') {
          camposFormulario[modeloId === MODELO_DECLARACAO_ABENDI ? 'snqc' : 'snqcAluno'] =
            camposDocumento.snqc
        }

        if (typeof camposDocumento.subnivel === 'string') {
          camposFormulario.subnivel = camposDocumento.subnivel
        }

        const formularioAtualizado = {
          ...formulario,
          ...camposFormulario,
          origemProgramacaoResumo: formulario.origemProgramacaoResumo
            ? {
                ...formulario.origemProgramacaoResumo,
                ...camposOrigem,
              }
            : formulario.origemProgramacaoResumo,
        }

        formularios[modeloId] = formulario.textoEditadoManualmente
          ? formularioAtualizado
          : {
              ...formularioAtualizado,
              textoLivre: gerarTextoModeloDeclaracao(modeloId, formularioAtualizado),
            }
      })

      return {
        ...atual,
        formularios,
      }
    })
  }

  function handleAtualizarFormularioAtivo(campo, valor) {
    setMensagem('')
    const valorNormalizadoParaAgenda =
      campo === 'nomeAluno' || campo === 'nomeProfissional'
        ? formatarNomeBrasileiro(valor)
        : campo === 'cpfAluno' || campo === 'cpf'
          ? formatarCpfProgressivo(valor)
          : valor
    const campoAgenda =
      campo === 'nomeAluno' || campo === 'nomeProfissional' ? 'aluno' : ''
    const camposDocumentoSincronizados = {}

    if (campo === 'nomeAluno' || campo === 'nomeProfissional') {
      camposDocumentoSincronizados.aluno = valorNormalizadoParaAgenda
    }

    if (campo === 'cpfAluno' || campo === 'cpf') {
      camposDocumentoSincronizados.cpf = valorNormalizadoParaAgenda
    }

    if (campo === 'snqcAluno' || campo === 'snqc') {
      camposDocumentoSincronizados.snqc = valorNormalizadoParaAgenda
    }

    if (campo === 'subnivel') {
      camposDocumentoSincronizados.subnivel = valorNormalizadoParaAgenda
    }

    if (formularioAtivo.origemProgramacaoId && Object.keys(camposDocumentoSincronizados).length) {
      const camposOrigem = { [campoAgenda]: valorNormalizadoParaAgenda }

      if (campoAgenda) {
        onAtualizarProgramacaoOrigem?.(formularioAtivo.origemProgramacaoId, camposOrigem)
      }

      sincronizarCampoOrigemNosFormularios(
        formularioAtivo.origemProgramacaoId,
        campoAgenda ? camposOrigem : {},
        camposDocumentoSincronizados,
      )
    }

    atualizarFormularioDoModelo(modeloAtivo, (formulario) => {
      const valorNormalizado =
        campo === 'nomeAluno' || campo === 'nomeProfissional'
          ? formatarNomeBrasileiro(valor)
          : campo === 'cpfAluno' || campo === 'cpf'
            ? formatarCpfProgressivo(valor)
            : valor
      const formularioAtualizado = {
        ...formulario,
        [campo]: valorNormalizado,
        origemProgramacaoResumo:
          campoAgenda && formulario.origemProgramacaoResumo
            ? {
                ...formulario.origemProgramacaoResumo,
                [campoAgenda]: valorNormalizado,
              }
            : formulario.origemProgramacaoResumo,
      }

      if (campo === 'textoLivre') {
        return {
          ...formularioAtualizado,
          textoEditadoManualmente: true,
        }
      }

      if (formulario.textoEditadoManualmente) {
        return formularioAtualizado
      }

      return {
        ...formularioAtualizado,
        textoLivre: gerarTextoModeloDeclaracao(modeloAtivo, formularioAtualizado),
      }
    })
  }

  function handleAtualizarTextoModeloAtivo() {
    setMensagem('')
    atualizarFormularioDoModelo(modeloAtivo, (formulario) => {
      const formularioAtualizado = {
        ...formulario,
        textoEditadoManualmente: false,
      }

      return {
        ...formularioAtualizado,
        textoLivre: gerarTextoModeloDeclaracao(modeloAtivo, formularioAtualizado),
      }
    })
    setMensagem('Texto atualizado com os dados atuais.')
  }

  function handleSelecionarOrigemProgramacao(grupoId) {
    setMensagem('')
    if (!grupoId) {
      atualizarFormularioDoModelo(modeloAtivo, (formulario) => ({
        ...formulario,
        origemProgramacaoId: '',
        origemProgramacaoResumo: null,
      }))
      return
    }

    const programacaoSelecionada = programacoesPorGrupo.get(grupoId)

    if (!programacaoSelecionada) {
      setMensagem('Selecione uma programação válida para carregar os dados.')
      return
    }

    setDeclaracoes((atual) => ({
      ...atual,
      modeloAtivo: atual.modeloAtivo,
      formularios: {
        ...atual.formularios,
        ...criarFormulariosComOrigemProgramacao(programacaoSelecionada),
      },
    }))
    const mesAno = getMesAnoDaData(programacaoSelecionada.dataInicial)

    if (mesAno) {
      setAnoSelecaoDatas(mesAno.ano)
      setMesSelecaoDatas(mesAno.mes)
    }

    setMensagem(`Dados da programação carregados em ${rotulosModeloDeclaracao[modeloAtivo]}.`)
  }

  function handleLimparModeloAtivo() {
    const confirmou = window.confirm(
      `Limpar os campos atuais de ${rotulosModeloDeclaracao[modeloAtivo]}?`,
    )

    if (!confirmou) {
      return
    }

    setMensagem('')
    atualizarFormularioDoModelo(modeloAtivo, () =>
      modeloAtivo === MODELO_DECLARACAO_ABENDI
        ? criarFormularioComprovacaoInicial()
        : criarFormularioTreinamentoInicial(),
    )

    setMensagem(`Campos de ${rotulosModeloDeclaracao[modeloAtivo]} reiniciados.`)
  }

  async function gerarDocumentoDeclaracaoOficial(acaoGeradora) {
    const tipoDocumento = rotulosModeloDeclaracao[modeloAtivo] || 'Declaração'
    const nomePessoa =
      modeloAtivo === MODELO_DECLARACAO_ABENDI
        ? normalizarTexto(formularioComprovacao.nomeProfissional)
        : normalizarTexto(formularioTreinamento.nomeAluno)
    const subnivel =
      modeloAtivo === MODELO_DECLARACAO_ABENDI
        ? normalizarTexto(formularioComprovacao.subnivel)
        : normalizarTexto(formularioTreinamento.subnivel)
    const nomeArquivoPdf = criarNomeArquivoPdf({ tipoDocumento, nomePessoa, subnivel })
    const anexoPrincipal = await gerarAnexoPdfVisualBase64({ nomeArquivo: nomeArquivoPdf })

    if (!anexoPrincipal?.base64) {
      throw new Error('Não foi possível renderizar o PDF visual da declaração.')
    }
    const arquivoSalvo = await salvarPdfOficial({
      nomeArquivo: nomeArquivoPdf,
      base64: anexoPrincipal?.base64,
      categoria: 'declaracoes',
    })
    const documentoEmitido = await registrarDocumentoEmitido({
      tipo: tipoDocumento,
      aluno: nomePessoa,
      nomeDocumento: preview.titulo || tipoDocumento,
      nomeArquivoPdf: arquivoSalvo.nomeArquivo,
      caminhoPdf: arquivoSalvo.caminhoArquivo,
      anexoPrincipal,
      origem: 'declaracoes',
      acaoGeradora,
      statusDocumento: 'salvo',
    })

    return {
      documentoEmitido,
      tipoDocumento,
      nomePessoa,
      nomeDocumento: preview.titulo || tipoDocumento,
      nomeArquivoPdf: arquivoSalvo.nomeArquivo,
      caminhoPdf: arquivoSalvo.caminhoArquivo,
      usandoPastaTemporaria: arquivoSalvo.usandoPastaTemporaria,
      anexoPrincipal: {
        ...anexoPrincipal,
        nomeArquivo: arquivoSalvo.nomeArquivo,
      },
    }
  }

  async function handleSalvarPdfDeclaracao() {
    setMensagem('Salvando PDF oficial da declaração...')

    try {
      const { nomeArquivoPdf, caminhoPdf, usandoPastaTemporaria } =
        await gerarDocumentoDeclaracaoOficial('salvar')
      await abrirCaminhoSistema(caminhoPdf)
      setMensagem(
        usandoPastaTemporaria
          ? `PDF salvo e aberto a partir da pasta temporária: ${caminhoPdf}.`
          : `PDF salvo e aberto: ${caminhoPdf}`,
      )
      return { nomeArquivoPdf, caminhoPdf }
    } catch (erro) {
      setMensagem(erro?.message || 'Não foi possível salvar o PDF da declaração.')
      return null
    }
  }

  async function handleImprimirDeclaracao() {
    setMensagem('Salvando PDF oficial da declaração antes de imprimir...')

    try {
      const { caminhoPdf, usandoPastaTemporaria } = await gerarDocumentoDeclaracaoOficial('imprimir')
      setMensagem(
        usandoPastaTemporaria
          ? `PDF salvo em pasta temporária: ${caminhoPdf}. Abrindo impressão...`
          : `PDF salvo com sucesso em ${caminhoPdf}. Abrindo impressão...`,
      )
      setImpressaoAtiva(true)
    } catch (erro) {
      setMensagem(erro?.message || 'Não foi possível salvar o PDF da declaração para impressão.')
    }
  }

  async function handleAbrirEnvioEmailDeclaracao() {
    if (!onAbrirEnvioEmail) {
      return
    }

    setMensagem('Salvando PDF oficial da declaração para anexar ao e-mail...')

    try {
      const {
        documentoEmitido,
        tipoDocumento,
        nomePessoa,
        nomeDocumento,
        nomeArquivoPdf,
        caminhoPdf,
        usandoPastaTemporaria,
        anexoPrincipal,
      } = await gerarDocumentoDeclaracaoOficial('enviar_email')

      onAbrirEnvioEmail({
        documentoEmitidoId: documentoEmitido.id,
        tipoDocumento,
        nomeDocumento,
        nomePessoa,
        destinatarioEmail: normalizarTexto(formularioAtivo?.origemProgramacaoResumo?.email),
        assuntoSugerido: criarAssuntoSugeridoEmail({ tipoDocumento, nomePessoa }),
        mensagemSugerida: criarMensagemSugeridaEmail({ tipoDocumento, nomePessoa }),
        nomeArquivoPdf,
        anexoPrincipal,
      })

      setMensagem(
        usandoPastaTemporaria
          ? `PDF salvo em pasta temporária: ${caminhoPdf}.`
          : `PDF salvo com sucesso em ${caminhoPdf}.`,
      )
    } catch (erro) {
      setMensagem(erro?.message || 'Não foi possível preparar o PDF da declaração para e-mail.')
    }
  }

  function handleTrocarMesSelecaoDatas(direcao) {
    aplicarTrocaMes(
      anoSelecaoDatas,
      mesSelecaoDatas,
      direcao,
      setAnoSelecaoDatas,
      setMesSelecaoDatas,
    )
  }

  function handleAlternarDiaDeclaracao(data) {
    setMensagem('')
    atualizarFormularioDoModelo(MODELO_DECLARACAO_PERIODO, (formulario) => {
      const diasAtuais = ordenarDatas(formulario.diasDeclaracaoSelecionados ?? [])
      const existe = diasAtuais.includes(data)
      const diasAtualizados = existe
        ? diasAtuais.filter((item) => item !== data)
        : ordenarDatas([...diasAtuais, data])
      const formularioAtualizado = {
        ...formulario,
        diasDeclaracaoSelecionados: diasAtualizados,
        dataInicial: diasAtualizados[0] ?? '',
        dataFinal: diasAtualizados.at(-1) ?? '',
        cargaHoraria: getCargaHorariaPorDiasSelecionados(diasAtualizados),
      }

      if (formulario.textoEditadoManualmente) {
        return formularioAtualizado
      }

      return {
        ...formularioAtualizado,
        textoLivre: gerarTextoModeloDeclaracao(MODELO_DECLARACAO_PERIODO, formularioAtualizado),
      }
    })
  }

  function handleLimparDiasDeclaracao() {
    setMensagem('')
    atualizarFormularioDoModelo(MODELO_DECLARACAO_PERIODO, (formulario) => ({
      ...(function construirFormularioLimpo() {
        const formularioAtualizado = {
          ...formulario,
          diasDeclaracaoSelecionados: [],
          dataInicial: '',
          dataFinal: '',
          cargaHoraria: '',
        }

        if (formulario.textoEditadoManualmente) {
          return formularioAtualizado
        }

        return {
          ...formularioAtualizado,
          textoLivre: gerarTextoModeloDeclaracao(MODELO_DECLARACAO_PERIODO, formularioAtualizado),
        }
      })(),
    }))
  }

  const opcoesSubnivel = subniveisDeclaracao.map((subnivel) => ({
    value: subnivel,
    label: subnivel,
  }))

  const opcoesFinalidade = finalidadesTreinamentoDeclaracao.map((finalidade) => ({
    value: finalidade,
    label: finalidade,
  }))

  return (
    <>
      <BarraTopo
        titulo="Declarações"
        subtitulo="Módulo declaratório com dois modelos institucionais, preview fixo e campos editáveis."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
              Modelos de documento
            </p>
            <h3 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
              Declarações operacionais
            </h3>
            <p className="mt-3 max-w-3xl text-base text-[#4B5563]">
              A V1 trabalha com dois modelos estáveis: declaração de treinamento por período e
              declaração de comprovação / ABENDI.
            </p>
          </div>

          <div className="rounded-[22px] border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm text-[#4B5563]">
            {formatarAtualizacao(atualizadoEm)}
          </div>
        </div>

        {mensagem ? (
          <div className="mt-6 rounded-[20px] border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm font-semibold text-[#334155]">
            {mensagem}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {modelosDeclaracaoV1.map((modelo) => {
            const ativo = modeloAtivo === modelo.id

            return (
              <button
                key={modelo.id}
                type="button"
                onClick={() => handleSelecionarModelo(modelo.id)}
                disabled={!modelo.disponivel}
                className={[
                  'rounded-[24px] border p-5 text-left transition-colors',
                  ativo
                    ? 'border-[#B40105] bg-[#FFF5F5]'
                    : 'border-[#D9D9D9] bg-white',
                  !modelo.disponivel ? 'cursor-not-allowed bg-[#FAFAFA] text-[#9CA3AF]' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B40105]">
                      {modelo.disponivel ? 'Ativo' : 'Em breve'}
                    </p>
                    <h4 className="mt-3 text-xl font-bold text-[#222222]">{modelo.label}</h4>
                  </div>
                  {ativo ? (
                    <span className="rounded-full bg-[#B40105] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                      Selecionado
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#4B5563]">{modelo.descricao}</p>
              </button>
            )
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[500px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(820px,1fr)]">
        <section className={`${cartaoPrincipalClass} flex min-w-0 flex-col`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
                Campos editáveis
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                {rotulosModeloDeclaracao[modeloAtivo]}
              </h3>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={handleLimparModeloAtivo}
                className={botaoSecundarioClass}
              >
                Limpar este documento
              </button>
            </div>
          </div>

          <div className={`order-1 mt-6 ${cartaoSecundarioClass}`}>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
                  Programação
                </p>
              </div>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-semibold text-[#4B5563]">Buscar programação</span>
                <input
                  value={filtroProgramacao}
                  onChange={(e) => setFiltroProgramacao(e.target.value)}
                  className={inputClass}
                  placeholder="Aluno, curso, subnível ou data"
                />
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-semibold text-[#4B5563]">
                  Escolher programação
                </span>
                <select
                  value={formularioAtivo.origemProgramacaoId}
                  onChange={(e) => handleSelecionarOrigemProgramacao(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Preenchimento manual</option>
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

              {resumoOrigemAplicada ? (
                <div className="rounded-[20px] border border-[#D9D9D9] bg-white px-4 py-4 text-sm font-semibold text-[#4B5563]">
                  {resumoOrigemAplicada}
                </div>
              ) : null}
            </div>
          </div>

          {modeloAtivo === MODELO_DECLARACAO_PERIODO ? (
            <>
              <div className="order-2 mt-6 grid gap-4 rounded-[26px] border border-[#D9D9D9] bg-[#F6F6F6] p-4 md:grid-cols-2 md:p-5 xl:grid-cols-1 2xl:grid-cols-2">
                <CampoTexto
                  label="Nome do aluno"
                  value={formularioTreinamento.nomeAluno}
                  onChange={(e) => handleAtualizarFormularioAtivo('nomeAluno', e.target.value)}
                  placeholder="Ex.: Pablo Almeida"
                  helperText="O nome é formatado automaticamente no padrão brasileiro."
                />
                <CampoTexto
                  label="CPF do aluno"
                  value={formularioTreinamento.cpfAluno}
                  onChange={(e) => handleAtualizarFormularioAtivo('cpfAluno', e.target.value)}
                  placeholder="000.000.000-00"
                  helperText="Digite só os números ou com pontuação; a máscara é aplicada automaticamente."
                />
                <CampoTexto
                  label="Registro SNQC (opcional)"
                  value={formularioTreinamento.snqcAluno}
                  onChange={(e) => handleAtualizarFormularioAtivo('snqcAluno', e.target.value)}
                  placeholder="Ex.: SNQC-0000"
                  helperText="Se ficar vazio, esse dado não aparece no documento."
                />
                <CampoSelect
                  label="Subnível"
                  value={formularioTreinamento.subnivel}
                  onChange={(e) => handleAtualizarFormularioAtivo('subnivel', e.target.value)}
                  options={opcoesSubnivel}
                />
                <CampoTexto
                  label="Cidade de emissão"
                  value={formularioTreinamento.cidadeEmissao}
                  onChange={(e) => handleAtualizarFormularioAtivo('cidadeEmissao', e.target.value)}
                  placeholder="Ex.: Rio de Janeiro"
                />
                <CampoTexto
                  label="Data de emissão"
                  type="date"
                  value={formularioTreinamento.dataEmissao}
                  onChange={(e) => handleAtualizarFormularioAtivo('dataEmissao', e.target.value)}
                />
                <div className="md:col-span-2 xl:col-span-1 2xl:col-span-2">
                  <CampoSelect
                    label="Finalidade"
                    value={formularioTreinamento.finalidade}
                    onChange={(e) => handleAtualizarFormularioAtivo('finalidade', e.target.value)}
                    options={opcoesFinalidade}
                    helperText="O template institucional permanece fixo; a finalidade altera o corpo principal do documento."
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="order-2 mt-6 grid gap-4 rounded-[26px] border border-[#D9D9D9] bg-[#F6F6F6] p-4 md:grid-cols-2 md:p-5 xl:grid-cols-1 2xl:grid-cols-2">
                <CampoTexto
                  label="Nome do profissional"
                  value={formularioComprovacao.nomeProfissional}
                  onChange={(e) =>
                    handleAtualizarFormularioAtivo('nomeProfissional', e.target.value)
                  }
                  placeholder="Ex.: Pablo Almeida"
                  helperText="O nome é formatado automaticamente no padrão brasileiro."
                />
                <CampoTexto
                  label="CPF"
                  value={formularioComprovacao.cpf}
                  onChange={(e) => handleAtualizarFormularioAtivo('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  helperText="Digite só os números ou com pontuação; a máscara é aplicada automaticamente."
                />
                <CampoTexto
                  label="Registro SNQC (opcional)"
                  value={formularioComprovacao.snqc}
                  onChange={(e) => handleAtualizarFormularioAtivo('snqc', e.target.value)}
                  placeholder="Ex.: SNQC-0000"
                  helperText="Se ficar vazio, esse dado não aparece no documento."
                />
                <CampoSelect
                  label="Subnível"
                  value={formularioComprovacao.subnivel}
                  onChange={(e) => handleAtualizarFormularioAtivo('subnivel', e.target.value)}
                  options={opcoesSubnivel}
                />
                <CampoTexto
                  label="Cidade de emissão"
                  value={formularioComprovacao.cidadeEmissao}
                  onChange={(e) =>
                    handleAtualizarFormularioAtivo('cidadeEmissao', e.target.value)
                  }
                  placeholder="Ex.: Rio de Janeiro"
                />
                <CampoTexto
                  label="Data de emissão"
                  type="date"
                  value={formularioComprovacao.dataEmissao}
                  onChange={(e) =>
                    handleAtualizarFormularioAtivo('dataEmissao', e.target.value)
                  }
                />
                <CampoTexto
                  label="Entidade de destino"
                  value={formularioComprovacao.entidadeDestino}
                  onChange={(e) =>
                    handleAtualizarFormularioAtivo('entidadeDestino', e.target.value)
                  }
                  placeholder="Ex.: ABENDI"
                />
                <CampoTexto
                  label="Método"
                  value={formularioComprovacao.metodo}
                  onChange={(e) => handleAtualizarFormularioAtivo('metodo', e.target.value)}
                  placeholder="Ex.: Ultrassom"
                />
                <CampoTexto
                  label="Número de inscrição"
                  value={formularioComprovacao.numeroInscricao}
                  onChange={(e) =>
                    handleAtualizarFormularioAtivo('numeroInscricao', e.target.value)
                  }
                  placeholder="Ex.: 12345"
                />
                <div className="md:col-span-2 xl:col-span-1 2xl:col-span-2">
                  <CampoTexto
                    label="Período de atuação"
                    value={formularioComprovacao.periodoAtuacao}
                    onChange={(e) =>
                      handleAtualizarFormularioAtivo('periodoAtuacao', e.target.value)
                    }
                    placeholder="Ex.: 13/04/2026 a 18/04/2026"
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-1 2xl:col-span-2">
                  <CampoTextoArea
                    label="Descrição da atuação"
                    value={formularioComprovacao.descricaoAtuacao}
                    onChange={(e) =>
                      handleAtualizarFormularioAtivo('descricaoAtuacao', e.target.value)
                    }
                    placeholder="Descreva a atuação, experiência e atividades comprovadas."
                  />
                </div>
              </div>

              <div className={`order-3 mt-6 ${cartaoSecundarioClass}`}>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
                  Referência institucional
                </p>

                <div className="mt-4 grid gap-4">
                  <CampoTexto
                    label="Empresa de atuação"
                    value={formularioComprovacao.empresaAtuacao}
                    onChange={(e) =>
                      handleAtualizarFormularioAtivo('empresaAtuacao', e.target.value)
                    }
                    placeholder="Ex.: Empresa contratante ou executora"
                    helperText="No modelo ABENDI, a empresa vinculada à atuação continua editável."
                  />
                </div>
              </div>
            </>
          )}

        </section>

        <section className={`${cartaoPrincipalClass} min-w-0`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
                Preview do documento
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Documento</h3>
            </div>

            <div className="flex flex-col gap-3">
              {textoDoPreviewTravado ? (
                <button
                  type="button"
                  onClick={handleAtualizarTextoModeloAtivo}
                  className={botaoSecundarioClass}
                >
                  Atualizar texto com dados atuais
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSalvarPdfDeclaracao}
                className={botaoSecundarioClass}
              >
                Salvar PDF
              </button>
              <button type="button" onClick={handleImprimirDeclaracao} className={botaoPrimarioClass}>
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleAbrirEnvioEmailDeclaracao}
                className={botaoSecundarioClass}
              >
                Enviar por e-mail
              </button>
            </div>
          </div>

          {textoDoPreviewTravado ? (
            <div className="mt-5 rounded-[20px] border border-[#F1C96B] bg-[#FFFBEB] px-4 py-4 text-sm font-semibold text-[#7C2D12]">
              O texto do documento foi editado manualmente. Alterações em CPF, datas, SNQC,
              aluguel ou outros campos não entram no texto até você clicar em “Atualizar texto com
              dados atuais”.
            </div>
          ) : null}

          <div className="mt-6">
            <PreviewDocumento
              preview={preview}
              textoLivre={formularioAtivo.textoLivre || ''}
              onChangeTextoLivre={(valor) => handleAtualizarFormularioAtivo('textoLivre', valor)}
            />
          </div>
        </section>
      </div>

      {modeloAtivo === MODELO_DECLARACAO_PERIODO ? (
        <section className={`mt-6 ${cartaoPrincipalClass}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
                Datas da declaração
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                {formatarMesAno(mesSelecaoDatas, anoSelecaoDatas)}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleTrocarMesSelecaoDatas(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D9D9] bg-white text-xl font-bold text-[#222222] transition-colors hover:bg-[#FCFCFC]"
                aria-label="Mês anterior"
              >
                {'<'}
              </button>
              <button
                type="button"
                onClick={() => handleTrocarMesSelecaoDatas(1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D9D9] bg-white text-xl font-bold text-[#222222] transition-colors hover:bg-[#FCFCFC]"
                aria-label="Próximo mês"
              >
                {'>'}
              </button>
              <button
                type="button"
                onClick={handleLimparDiasDeclaracao}
                className={botaoSecundarioCompactoClass}
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#222222] ring-1 ring-[#D9D9D9]">
              {diasDeclaracaoSelecionados.length} dia(s)
            </span>
            <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#4B5563] ring-1 ring-[#D9D9D9]">
              {resumoPeriodoSelecionado}
            </span>
            <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#4B5563] ring-1 ring-[#D9D9D9]">
              {formularioTreinamento.cargaHoraria
                ? `${formularioTreinamento.cargaHoraria} horas`
                : 'Carga horária não definida'}
            </span>
            {diasReaisOrigem.length > 0 ? (
              <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#4B5563] ring-1 ring-[#D9D9D9]">
                {diasReaisOrigem.length} da origem
              </span>
            ) : null}
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

            {diasCalendarioDeclaracao.map((item) => {
              if (item.vazio) {
                return (
                  <div
                    key={item.key}
                    className="min-h-[58px] rounded-2xl border border-dashed border-slate-200 bg-white/60"
                  />
                )
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleAlternarDiaDeclaracao(item.data)}
                  className={[
                    'min-h-[82px] rounded-[18px] border px-2 py-3 text-center text-sm font-semibold transition-colors md:text-base',
                    item.selecionado
                      ? 'border-[#B40105] bg-[#B40105] text-white'
                      : item.origem
                        ? 'border-[#D9D9D9] bg-[#F6F6F6] text-[#334155] hover:bg-[#EEEEEE]'
                        : 'border-[#D9D9D9] bg-white text-[#222222] hover:bg-[#FCFCFC]',
                  ].join(' ')}
                >
                  <span className="block">{item.dia}</span>
                  {item.origem ? (
                    <span
                      className={[
                        'mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                        item.selecionado
                          ? 'bg-white/15 text-white'
                          : 'bg-[#E5E7EB] text-[#4B5563]',
                      ].join(' ')}
                    >
                      Origem
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}
    </>
  )
}


