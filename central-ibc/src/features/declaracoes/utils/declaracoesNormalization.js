import { criarSnapshotTreinamentoCompartilhado } from '../../../domain/treinamento/contratoTreinamento'

export function normalizarOrigemDeclaracao(programacao) {
  return criarSnapshotTreinamentoCompartilhado(programacao)
}
