import {
  criarSnapshotTreinamentoCompartilhado,
  listarDivergenciasTreinamentoCompartilhado,
} from '../../../domain/treinamento/contratoTreinamento'

export function normalizarOrigemPrestacao(programacao) {
  return criarSnapshotTreinamentoCompartilhado(programacao)
}

export function listarDivergenciasOrigemPrestacao(origemSnapshot, origemAtual) {
  return listarDivergenciasTreinamentoCompartilhado(origemSnapshot, origemAtual)
}
