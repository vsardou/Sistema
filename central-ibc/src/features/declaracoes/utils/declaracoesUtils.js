import { formatarDataCurta, formatarDataExtensa, ordenarDatas } from '../../programacao/utils/dateUtils'
import { carregarConfiguracaoDocumentos } from '../../configuracoes/configuracaoDocumentos'
import { normalizarOrigemDeclaracao } from './declaracoesNormalization'
import {
  carregarCamposInstitucionaisDeclaracao,
  finalidadesTreinamentoDeclaracao,
  MODELO_DECLARACAO_ABENDI,
  MODELO_DECLARACAO_PERIODO,
  modelosDeclaracaoV1,
  rotulosModeloDeclaracao,
  subniveisDeclaracao,
} from '../constants'

const STORAGE_VERSAO_ATUAL = 2
const STORAGE_CHAVE = `ibc-declaracoes-v${STORAGE_VERSAO_ATUAL}`
const STORAGE_CHAVE_GRUPO_PREFIXO = `${STORAGE_CHAVE}:grupo:`
const STORAGE_CHAVES_LEGADAS = ['ibc-declaracoes-v1']
const MAPA_MODELOS_LEGADOS = {
  treinamento: MODELO_DECLARACAO_PERIODO,
  abendi: MODELO_DECLARACAO_ABENDI,
}
const PARTICULAS_NOME_MINUSCULAS = new Set([
  'da',
  'das',
  'de',
  'del',
  'della',
  'di',
  'do',
  'dos',
  'du',
  'e',
])

function criarChaveDataLocal(data = new Date()) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor : ''
}

function capitalizarTrechoNome(valor = '') {
  if (!valor) {
    return ''
  }

  return valor.charAt(0).toLocaleUpperCase('pt-BR') + valor.slice(1)
}

function formatarTokenNome(token = '', indice = 0) {
  if (!token) {
    return ''
  }

  return token
    .split('-')
    .map((parte) => {
      const parteNormalizada = parte.toLocaleLowerCase('pt-BR')

      if (indice > 0 && PARTICULAS_NOME_MINUSCULAS.has(parteNormalizada)) {
        return parteNormalizada
      }

      return capitalizarTrechoNome(parteNormalizada)
    })
    .join('-')
}

export function formatarNomeBrasileiro(valor) {
  const texto = normalizarTexto(valor).trim().replace(/\s+/g, ' ')

  if (!texto) {
    return ''
  }

  return texto
    .split(' ')
    .map((token, indice) => formatarTokenNome(token, indice))
    .join(' ')
}

function normalizarCpf(valor) {
  return normalizarTexto(valor).replace(/\D/g, '').slice(0, 11)
}

export function formatarCpfProgressivo(valor) {
  const digitos = normalizarCpf(valor)

  if (digitos.length <= 3) {
    return digitos
  }

  if (digitos.length <= 6) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3)}`
  }

  if (digitos.length <= 9) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
  }

  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

function normalizarData(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : ''
}

function normalizarListaDatas(datas) {
  if (!Array.isArray(datas)) {
    return []
  }

  const datasValidas = datas.map(normalizarData).filter(Boolean)
  return ordenarDatas([...new Set(datasValidas)])
}

function formatarDataIso(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function criarListaDatasIntervalo(dataInicial, dataFinal) {
  const inicio = normalizarData(dataInicial)
  const fim = normalizarData(dataFinal)

  if (!inicio || !fim) {
    return []
  }

  const dataInicio = new Date(`${inicio}T00:00:00`)
  const dataFim = new Date(`${fim}T00:00:00`)

  if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime()) || dataInicio > dataFim) {
    return []
  }

  const datas = []
  const cursor = new Date(dataInicio)

  while (cursor <= dataFim) {
    datas.push(formatarDataIso(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return datas
}

function getPeriodoPorDatasSelecionadas(datasSelecionadas = []) {
  if (datasSelecionadas.length === 0) {
    return {
      dataInicial: '',
      dataFinal: '',
    }
  }

  return {
    dataInicial: datasSelecionadas[0],
    dataFinal: datasSelecionadas.at(-1),
  }
}

function getCargaHorariaPorDiasSelecionados(datasSelecionadas = []) {
  if (datasSelecionadas.length === 0) {
    return ''
  }

  return String(datasSelecionadas.length * carregarConfiguracaoDocumentos().horasPorDiaDeclaracao)
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

function getDescricaoDatasTreinamento(formulario) {
  const diasSelecionados = normalizarListaDatas(formulario?.diasDeclaracaoSelecionados)

  if (diasSelecionados.length === 1) {
    return `no dia ${formatarDataCurta(diasSelecionados[0])}`
  }

  if (diasSelecionados.length > 1) {
    if (ehIntervaloContinuo(diasSelecionados)) {
      return `no período de ${formatarDataCurta(diasSelecionados[0])} a ${formatarDataCurta(diasSelecionados.at(-1))}`
    }

    return `nos dias ${formatarListaDatas(diasSelecionados)}`
  }

  const dataInicial = getDataDocumento(formulario?.dataInicial)
  const dataFinal = getDataDocumento(formulario?.dataFinal)
  return `no período de ${dataInicial} a ${dataFinal}`
}

function normalizarModeloDeclaracaoId(modeloId) {
  if (modelosDeclaracaoV1.some((modelo) => modelo.id === modeloId && modelo.disponivel)) {
    return modeloId
  }

  if (MAPA_MODELOS_LEGADOS[modeloId]) {
    return MAPA_MODELOS_LEGADOS[modeloId]
  }

  return MODELO_DECLARACAO_PERIODO
}

function clonarResumoOrigemProgramacao(origemProgramacao) {
  return origemProgramacao?.grupoId ? normalizarOrigemDeclaracao(origemProgramacao) : null
}

function getDataDocumento(data, placeholder = '__/__/____') {
  return data ? formatarDataCurta(data) : placeholder
}

function getValorDocumento(valor, placeholder = '________________') {
  const texto = normalizarTexto(valor).trim()
  return texto || placeholder
}

function getLocalDataEmissao(cidadeEmissao, dataEmissao) {
  const cidade = getValorDocumento(cidadeEmissao)
  const data = dataEmissao ? formatarDataExtensa(dataEmissao) : '___ de __________ de ______'
  return `${cidade}, ${data}.`
}

function getTituloTreinamentoPorFinalidade(finalidade) {
  return normalizarTexto(finalidade).toLowerCase().includes('retreinamento')
    ? 'DECLARAÇÃO DE RETREINAMENTO'
    : 'DECLARAÇÃO DE TREINAMENTO'
}

function getTrechoSnqcDocumento(snqc, prefixo = ' e registro SNQC número ') {
  const valor = normalizarTexto(snqc).trim()
  return valor ? `${prefixo}${valor}` : ''
}

function getTrechoCpfDocumento(cpf) {
  const valor = normalizarTexto(cpf).trim()
  return valor ? `, inscrito(a) no CPF sob o número ${valor}` : ''
}

function normalizarParagrafosTextoLivre(texto = '') {
  const textoNormalizado = normalizarTexto(texto).replace(/\r\n/g, '\n')

  if (!textoNormalizado.trim()) {
    return []
  }

  return textoNormalizado
    .split(/\n{2,}/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean)
}

function juntarParagrafosTextoLivre(paragrafos = []) {
  return paragrafos.join('\n\n')
}

function descreverPeriodoProgramacao(programacao) {
  if (!programacao?.dataInicial) {
    return ''
  }

  if (programacao.dataInicial === programacao.dataFinal) {
    return formatarDataCurta(programacao.dataInicial)
  }

  return `${formatarDataCurta(programacao.dataInicial)} a ${formatarDataCurta(programacao.dataFinal)}`
}

function lerStorageDeclaracoes(chave) {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(chave)
  } catch {
    return null
  }
}

function criarChaveRascunhoGrupoDeclaracao(grupoId) {
  const id = normalizarTexto(grupoId)

  if (!id) {
    return ''
  }

  return `${STORAGE_CHAVE_GRUPO_PREFIXO}${id}`
}

function getGrupoIdEstadoDeclaracoes(estado) {
  const modeloAtivo = normalizarModeloDeclaracaoId(estado?.modeloAtivo)
  const formularioAtivo = estado?.formularios?.[modeloAtivo]
  const grupoFormularioAtivo = normalizarTexto(formularioAtivo?.origemProgramacaoId)

  if (grupoFormularioAtivo) {
    return grupoFormularioAtivo
  }

  return normalizarTexto(
    estado?.formularios?.[MODELO_DECLARACAO_PERIODO]?.origemProgramacaoId ??
      estado?.formularios?.[MODELO_DECLARACAO_ABENDI]?.origemProgramacaoId,
  )
}

function criarDadosDocumentoDeclaracaoPeriodo(formulario) {
  const instituicao = carregarCamposInstitucionaisDeclaracao()

  return {
    modeloId: MODELO_DECLARACAO_PERIODO,
    titulo: getTituloTreinamentoPorFinalidade(formulario.finalidade),
    subtitulo: 'Modelo institucional por período',
    nomeAluno: getValorDocumento(formulario.nomeAluno),
    cpfAluno: normalizarTexto(formulario.cpfAluno).trim(),
    snqcAluno: normalizarTexto(formulario.snqcAluno).trim(),
    finalidade: getValorDocumento(formulario.finalidade),
    subnivel: getValorDocumento(formulario.subnivel),
    periodoTreinamentoDescricao: getDescricaoDatasTreinamento(formulario),
    dataInicial: getDataDocumento(formulario.dataInicial),
    dataFinal: getDataDocumento(formulario.dataFinal),
    cargaHoraria: getValorDocumento(formulario.cargaHoraria, '____'),
    temOrigemProgramacao: Boolean(formulario.origemProgramacaoResumo?.grupoId),
    aluguelAparelho: Boolean(formulario.origemProgramacaoResumo?.aluguelAparelho),
    cidadeEmissao: formulario.cidadeEmissao,
    dataEmissao: formulario.dataEmissao,
    empresa: instituicao.empresa,
    cnpj: instituicao.cnpj,
    supervisorNome: instituicao.supervisorNome,
    supervisorCpf: instituicao.supervisorCpf,
    supervisorSnqc: instituicao.supervisorSnqc,
    supervisorQualificacoes: instituicao.supervisorQualificacoes,
    blocoInstitucional: instituicao.blocoInstitucional,
    rodape: instituicao.rodape,
    rodapeLinhas: instituicao.rodapeLinhas,
    assinaturas: instituicao.assinaturas,
  }
}

function criarDadosDocumentoDeclaracaoAbendi(formulario) {
  const instituicao = carregarCamposInstitucionaisDeclaracao()

  return {
    modeloId: MODELO_DECLARACAO_ABENDI,
    titulo: 'DECLARAÇÃO DE COMPROVAÇÃO / ABENDI',
    subtitulo: 'Comprovação institucional de atuação e experiência profissional',
    nomeProfissional: getValorDocumento(formulario.nomeProfissional),
    cpf: normalizarTexto(formulario.cpf).trim(),
    snqc: normalizarTexto(formulario.snqc).trim(),
    entidadeDestino: getValorDocumento(formulario.entidadeDestino),
    descricaoAtuacao: getValorDocumento(formulario.descricaoAtuacao),
    metodo: getValorDocumento(formulario.metodo),
    subnivel: getValorDocumento(formulario.subnivel),
    periodoAtuacao: getValorDocumento(formulario.periodoAtuacao),
    empresaAtuacao: getValorDocumento(formulario.empresaAtuacao),
    numeroInscricao: normalizarTexto(formulario.numeroInscricao).trim(),
    temOrigemProgramacao: Boolean(formulario.origemProgramacaoResumo?.grupoId),
    aluguelAparelho: Boolean(formulario.origemProgramacaoResumo?.aluguelAparelho),
    cidadeEmissao: formulario.cidadeEmissao,
    dataEmissao: formulario.dataEmissao,
    blocoInstitucional: instituicao.blocoInstitucional,
    rodape: instituicao.rodape,
    rodapeLinhas: instituicao.rodapeLinhas,
    assinaturas: instituicao.assinaturas,
  }
}

function comporParagrafosDeclaracaoPeriodo(dadosDocumento) {
  return [
    `Declaramos, para os devidos fins, que ${dadosDocumento.nomeAluno}${getTrechoCpfDocumento(dadosDocumento.cpfAluno)}${getTrechoSnqcDocumento(dadosDocumento.snqcAluno)}, participou de ${dadosDocumento.finalidade}, para o subnível ${dadosDocumento.subnivel}, realizado ${dadosDocumento.periodoTreinamentoDescricao}, com carga horária total de ${dadosDocumento.cargaHoraria} horas.`,
    `O referido treinamento foi realizado sob a responsabilidade da ${dadosDocumento.empresa}, CNPJ ${dadosDocumento.cnpj}, com supervisão técnica de ${dadosDocumento.supervisorNome}, CPF ${dadosDocumento.supervisorCpf}, registro SNQC número ${dadosDocumento.supervisorSnqc}, ${dadosDocumento.supervisorQualificacoes}.`,
    'A presente declaração é emitida a pedido do interessado, para comprovação do treinamento realizado e para os fins que se fizerem necessários.',
  ]
}

function comporParagrafosDeclaracaoAbendi(dadosDocumento) {
  const complementoInscricao = dadosDocumento.numeroInscricao
    ? `, vinculada ao número de inscrição ${dadosDocumento.numeroInscricao}`
    : ''

  return [
    `Declaramos, para os devidos fins, em especial para apresentação junto a ${dadosDocumento.entidadeDestino}, que ${dadosDocumento.nomeProfissional}${getTrechoCpfDocumento(dadosDocumento.cpf)}${getTrechoSnqcDocumento(dadosDocumento.snqc)}, exerceu atividades no método ${dadosDocumento.metodo}, subnível ${dadosDocumento.subnivel}, no período ${dadosDocumento.periodoAtuacao}, vinculado(a) a ${dadosDocumento.empresaAtuacao}.`,
    `Durante o período acima informado, o profissional atuou nas seguintes atividades: ${dadosDocumento.descricaoAtuacao}.`,
    `A presente declaração é emitida para fins de comprovação de atuação e experiência profissional${complementoInscricao}, para os fins que se fizerem necessários.`,
  ]
}

export function gerarTextoModeloDeclaracao(modeloId, formulario) {
  if (modeloId === MODELO_DECLARACAO_ABENDI) {
    const dadosDocumento = criarDadosDocumentoDeclaracaoAbendi(formulario ?? {})
    return juntarParagrafosTextoLivre(comporParagrafosDeclaracaoAbendi(dadosDocumento))
  }

  const dadosDocumento = criarDadosDocumentoDeclaracaoPeriodo(formulario ?? {})
  return juntarParagrafosTextoLivre(comporParagrafosDeclaracaoPeriodo(dadosDocumento))
}

export function criarResumoProgramacaoDeclaracao(programacao) {
  return clonarResumoOrigemProgramacao(programacao)
}

export function criarFormularioTreinamentoInicial() {
  const formulario = {
    origemProgramacaoId: '',
    origemProgramacaoResumo: null,
    nomeAluno: '',
    cpfAluno: '',
    snqcAluno: '',
    finalidade: finalidadesTreinamentoDeclaracao[0],
    subnivel: subniveisDeclaracao[0],
    diasDeclaracaoSelecionados: [],
    dataInicial: '',
    dataFinal: '',
    cargaHoraria: '',
    cidadeEmissao: carregarCamposInstitucionaisDeclaracao().cidadePadraoTreinamento,
    dataEmissao: criarChaveDataLocal(),
  }

  return {
    ...formulario,
    textoLivre: gerarTextoModeloDeclaracao(MODELO_DECLARACAO_PERIODO, formulario),
    textoEditadoManualmente: false,
  }
}

export function criarFormularioComprovacaoInicial() {
  const formulario = {
    origemProgramacaoId: '',
    origemProgramacaoResumo: null,
    nomeProfissional: '',
    cpf: '',
    snqc: '',
    entidadeDestino: 'ABENDI',
    descricaoAtuacao: '',
    metodo: '',
    subnivel: subniveisDeclaracao[0],
    periodoAtuacao: '',
    empresaAtuacao: '',
    numeroInscricao: '',
    cidadeEmissao: carregarCamposInstitucionaisDeclaracao().cidadePadraoTreinamento,
    dataEmissao: criarChaveDataLocal(),
  }

  return {
    ...formulario,
    textoLivre: gerarTextoModeloDeclaracao(MODELO_DECLARACAO_ABENDI, formulario),
    textoEditadoManualmente: false,
  }
}

function normalizarFormularioTreinamento(formulario = {}) {
  const diasDeclaracaoSelecionados = normalizarListaDatas(formulario.diasDeclaracaoSelecionados)
  const diasPorIntervalo = criarListaDatasIntervalo(formulario.dataInicial, formulario.dataFinal)
  const diasNormalizados =
    diasDeclaracaoSelecionados.length > 0 ? diasDeclaracaoSelecionados : diasPorIntervalo
  const periodo = getPeriodoPorDatasSelecionadas(diasNormalizados)
  const cargaHoraria = getCargaHorariaPorDiasSelecionados(diasNormalizados)

  const formularioNormalizado = {
    origemProgramacaoId: normalizarTexto(formulario.origemProgramacaoId),
    origemProgramacaoResumo: clonarResumoOrigemProgramacao(formulario.origemProgramacaoResumo),
    nomeAluno: formatarNomeBrasileiro(formulario.nomeAluno),
    cpfAluno: formatarCpfProgressivo(formulario.cpfAluno),
    snqcAluno: normalizarTexto(formulario.snqcAluno),
    finalidade: finalidadesTreinamentoDeclaracao.includes(formulario.finalidade)
      ? formulario.finalidade
      : finalidadesTreinamentoDeclaracao[0],
    subnivel: subniveisDeclaracao.includes(formulario.subnivel)
      ? formulario.subnivel
      : subniveisDeclaracao[0],
    diasDeclaracaoSelecionados: diasNormalizados,
    dataInicial: periodo.dataInicial || normalizarData(formulario.dataInicial),
    dataFinal: periodo.dataFinal || normalizarData(formulario.dataFinal),
    cargaHoraria,
    cidadeEmissao:
      normalizarTexto(formulario.cidadeEmissao) ||
      carregarCamposInstitucionaisDeclaracao().cidadePadraoTreinamento,
    dataEmissao: normalizarData(formulario.dataEmissao) || criarChaveDataLocal(),
    textoEditadoManualmente: formulario.textoEditadoManualmente === true,
  }

  const textoLivre = normalizarTexto(formulario.textoLivre)

  return {
    ...formularioNormalizado,
    textoLivre:
      textoLivre || gerarTextoModeloDeclaracao(MODELO_DECLARACAO_PERIODO, formularioNormalizado),
  }
}

function normalizarFormularioComprovacao(formulario = {}) {
  const formularioNormalizado = {
    origemProgramacaoId: normalizarTexto(formulario.origemProgramacaoId),
    origemProgramacaoResumo: clonarResumoOrigemProgramacao(formulario.origemProgramacaoResumo),
    nomeProfissional: formatarNomeBrasileiro(formulario.nomeProfissional),
    cpf: formatarCpfProgressivo(formulario.cpf),
    snqc: normalizarTexto(formulario.snqc),
    entidadeDestino: normalizarTexto(formulario.entidadeDestino) || 'ABENDI',
    descricaoAtuacao: normalizarTexto(formulario.descricaoAtuacao),
    metodo: normalizarTexto(formulario.metodo),
    subnivel: subniveisDeclaracao.includes(formulario.subnivel)
      ? formulario.subnivel
      : subniveisDeclaracao[0],
    periodoAtuacao: normalizarTexto(formulario.periodoAtuacao),
    empresaAtuacao:
      normalizarTexto(formulario.empresaAtuacao) || normalizarTexto(formulario.empresa),
    numeroInscricao: normalizarTexto(formulario.numeroInscricao),
    cidadeEmissao:
      normalizarTexto(formulario.cidadeEmissao) ||
      carregarCamposInstitucionaisDeclaracao().cidadePadraoTreinamento,
    dataEmissao: normalizarData(formulario.dataEmissao) || criarChaveDataLocal(),
    textoEditadoManualmente: formulario.textoEditadoManualmente === true,
  }

  const textoLivre = normalizarTexto(formulario.textoLivre)

  return {
    ...formularioNormalizado,
    textoLivre:
      textoLivre || gerarTextoModeloDeclaracao(MODELO_DECLARACAO_ABENDI, formularioNormalizado),
  }
}

export function criarEstadoDeclaracoesInicial() {
  return {
    versaoSchema: STORAGE_VERSAO_ATUAL,
    modeloAtivo: MODELO_DECLARACAO_PERIODO,
    formularios: {
      [MODELO_DECLARACAO_PERIODO]: criarFormularioTreinamentoInicial(),
      [MODELO_DECLARACAO_ABENDI]: criarFormularioComprovacaoInicial(),
    },
    meta: {
      atualizadoEmPorModelo: {
        [MODELO_DECLARACAO_PERIODO]: '',
        [MODELO_DECLARACAO_ABENDI]: '',
      },
    },
  }
}

function normalizarEstadoDeclaracoes(estado = {}) {
  const estadoInicial = criarEstadoDeclaracoesInicial()
  const modeloAtivo = normalizarModeloDeclaracaoId(estado.modeloAtivo ?? estado.familiaAtiva)
  const atualizadoEmLegado = estado.meta?.atualizadoEmPorFamilia ?? {}
  const atualizadoEmAtual = estado.meta?.atualizadoEmPorModelo ?? {}

  return {
    versaoSchema: STORAGE_VERSAO_ATUAL,
    modeloAtivo,
    formularios: {
      [MODELO_DECLARACAO_PERIODO]: normalizarFormularioTreinamento(
        estado.formularios?.[MODELO_DECLARACAO_PERIODO] ?? estado.formularios?.treinamento,
      ),
      [MODELO_DECLARACAO_ABENDI]: normalizarFormularioComprovacao(
        estado.formularios?.[MODELO_DECLARACAO_ABENDI] ?? estado.formularios?.abendi,
      ),
    },
    meta: {
      atualizadoEmPorModelo: {
        [MODELO_DECLARACAO_PERIODO]:
          normalizarTexto(
            atualizadoEmAtual[MODELO_DECLARACAO_PERIODO] ?? atualizadoEmLegado.treinamento,
          ) || estadoInicial.meta.atualizadoEmPorModelo[MODELO_DECLARACAO_PERIODO],
        [MODELO_DECLARACAO_ABENDI]:
          normalizarTexto(
            atualizadoEmAtual[MODELO_DECLARACAO_ABENDI] ?? atualizadoEmLegado.abendi,
          ) || estadoInicial.meta.atualizadoEmPorModelo[MODELO_DECLARACAO_ABENDI],
      },
    },
  }
}

export function carregarRascunhoDeclaracoes() {
  if (typeof window === 'undefined') {
    return criarEstadoDeclaracoesInicial()
  }

  const chaves = [STORAGE_CHAVE, ...STORAGE_CHAVES_LEGADAS]

  for (const chave of chaves) {
    const conteudo = lerStorageDeclaracoes(chave)

    if (!conteudo) {
      continue
    }

    try {
      return normalizarEstadoDeclaracoes(JSON.parse(conteudo))
    } catch {
      continue
    }
  }

  return criarEstadoDeclaracoesInicial()
}

export function carregarRascunhoDeclaracoesPorGrupo(grupoId) {
  if (typeof window === 'undefined') {
    return null
  }

  const chave = criarChaveRascunhoGrupoDeclaracao(grupoId)

  if (!chave) {
    return null
  }

  const conteudo = lerStorageDeclaracoes(chave)

  if (!conteudo) {
    return null
  }

  try {
    return normalizarEstadoDeclaracoes(JSON.parse(conteudo))
  } catch {
    return null
  }
}

export function salvarRascunhoDeclaracoes(estado) {
  if (typeof window === 'undefined') {
    return null
  }

  const estadoNormalizado = normalizarEstadoDeclaracoes(estado)
  const atualizadoEm = new Date().toISOString()
  const payload = {
    ...estadoNormalizado,
    meta: {
      ...estadoNormalizado.meta,
      atualizadoEmPorModelo: {
        ...estadoNormalizado.meta.atualizadoEmPorModelo,
        [estadoNormalizado.modeloAtivo]: atualizadoEm,
      },
    },
  }

  try {
    window.localStorage.setItem(STORAGE_CHAVE, JSON.stringify(payload))

    const chaveGrupo = criarChaveRascunhoGrupoDeclaracao(getGrupoIdEstadoDeclaracoes(payload))

    if (chaveGrupo) {
      window.localStorage.setItem(chaveGrupo, JSON.stringify(payload))
    }

    return payload
  } catch {
    return null
  }
}

export function preencherFormularioTreinamentoComProgramacao(formularioAtual, programacao) {
  const diasDeclaracaoSelecionados = normalizarListaDatas(programacao?.diasTreinamento)
  const periodoPorDias = getPeriodoPorDatasSelecionadas(diasDeclaracaoSelecionados)
  const cargaHoraria = getCargaHorariaPorDiasSelecionados(diasDeclaracaoSelecionados)

  const formularioAtualizado = {
    ...formularioAtual,
    origemProgramacaoId: normalizarTexto(programacao?.grupoId),
    origemProgramacaoResumo: criarResumoProgramacaoDeclaracao(programacao),
    nomeAluno: formatarNomeBrasileiro(programacao?.aluno) || formularioAtual.nomeAluno,
    diasDeclaracaoSelecionados,
    dataInicial:
      periodoPorDias.dataInicial ||
      normalizarData(programacao?.dataInicial) ||
      formularioAtual.dataInicial,
    dataFinal:
      periodoPorDias.dataFinal ||
      normalizarData(programacao?.dataFinal) ||
      formularioAtual.dataFinal,
    cargaHoraria,
  }

  return {
    ...formularioAtualizado,
    textoLivre: gerarTextoModeloDeclaracao(MODELO_DECLARACAO_PERIODO, formularioAtualizado),
  }
}

export function preencherFormularioComprovacaoComProgramacao(formularioAtual, programacao) {
  const formularioAtualizado = {
    ...formularioAtual,
    origemProgramacaoId: normalizarTexto(programacao?.grupoId),
    origemProgramacaoResumo: criarResumoProgramacaoDeclaracao(programacao),
    nomeProfissional:
      formatarNomeBrasileiro(programacao?.aluno) || formularioAtual.nomeProfissional,
    periodoAtuacao:
      descreverPeriodoProgramacao(programacao) || normalizarTexto(formularioAtual.periodoAtuacao),
  }

  return {
    ...formularioAtualizado,
    textoLivre: gerarTextoModeloDeclaracao(MODELO_DECLARACAO_ABENDI, formularioAtualizado),
  }
}

function criarPreviewTreinamento(formulario) {
  const dadosDocumento = criarDadosDocumentoDeclaracaoPeriodo(formulario)
  const paragrafosTextoLivre = normalizarParagrafosTextoLivre(formulario?.textoLivre)
  const paragrafosPadrao = comporParagrafosDeclaracaoPeriodo(dadosDocumento)

  return {
    modeloId: dadosDocumento.modeloId,
    modeloLabel: rotulosModeloDeclaracao[dadosDocumento.modeloId],
    titulo: dadosDocumento.titulo,
    subtitulo: dadosDocumento.subtitulo,
    paragrafos: paragrafosTextoLivre.length > 0 ? paragrafosTextoLivre : paragrafosPadrao,
    localDataEmissao: getLocalDataEmissao(dadosDocumento.cidadeEmissao, dadosDocumento.dataEmissao),
    assinaturas: dadosDocumento.assinaturas,
    blocoInstitucional: dadosDocumento.blocoInstitucional,
    rodape: dadosDocumento.rodape,
    rodapeLinhas: dadosDocumento.rodapeLinhas,
    camposDocumento: dadosDocumento,
  }
}

function criarPreviewComprovacao(formulario) {
  const dadosDocumento = criarDadosDocumentoDeclaracaoAbendi(formulario)
  const paragrafosTextoLivre = normalizarParagrafosTextoLivre(formulario?.textoLivre)
  const paragrafosPadrao = comporParagrafosDeclaracaoAbendi(dadosDocumento)

  return {
    modeloId: dadosDocumento.modeloId,
    modeloLabel: rotulosModeloDeclaracao[dadosDocumento.modeloId],
    titulo: dadosDocumento.titulo,
    subtitulo: dadosDocumento.subtitulo,
    paragrafos: paragrafosTextoLivre.length > 0 ? paragrafosTextoLivre : paragrafosPadrao,
    localDataEmissao: getLocalDataEmissao(dadosDocumento.cidadeEmissao, dadosDocumento.dataEmissao),
    assinaturas: dadosDocumento.assinaturas,
    blocoInstitucional: dadosDocumento.blocoInstitucional,
    rodape: dadosDocumento.rodape,
    rodapeLinhas: dadosDocumento.rodapeLinhas,
    camposDocumento: dadosDocumento,
  }
}

export function criarPreviewDeclaracao(modeloId, formulario) {
  if (modeloId === MODELO_DECLARACAO_ABENDI) {
    return criarPreviewComprovacao(formulario)
  }

  return criarPreviewTreinamento(formulario)
}
