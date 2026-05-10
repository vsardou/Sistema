import { normalizarListaDatasContrato } from './contratoTreinamento'

export function migrarTreinamentoLegadoParaContratoV2(treinamento = {}) {
  if (!treinamento || typeof treinamento !== 'object') {
    return {}
  }

  if (Array.isArray(treinamento.diasTreinamento) || !Array.isArray(treinamento.dias)) {
    return treinamento
  }

  return {
    ...treinamento,
    diasTreinamento: normalizarListaDatasContrato(treinamento.dias),
  }
}
