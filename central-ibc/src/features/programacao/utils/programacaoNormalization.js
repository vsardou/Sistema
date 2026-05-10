import {
  criarSnapshotTreinamentoCompartilhado,
  normalizarTreinamentoCompartilhado,
} from '../../../domain/treinamento/contratoTreinamento'
import { migrarTreinamentoLegadoParaContratoV2 } from '../../../domain/treinamento/migracoesTreinamento'

export function normalizarTreinamentoProgramacao(programacao) {
  return normalizarTreinamentoCompartilhado(
    migrarTreinamentoLegadoParaContratoV2(programacao),
    { manterExtras: true },
  )
}

export function criarResumoTreinamentoProgramacao(programacao) {
  return criarSnapshotTreinamentoCompartilhado(
    migrarTreinamentoLegadoParaContratoV2(programacao),
  )
}
