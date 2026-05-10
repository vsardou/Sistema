import { criarDiasDerivadosTreinamento } from '../../../domain/treinamento/contratoTreinamento'
import { ordenarDatas } from './dateUtils'

export function validarFormularioProgramacao(formulario) {
  const nomeAluno = formulario.nomeAluno.trim()
  const emailAluno = formulario.emailAluno.trim()
  const diasTreinamento = ordenarDatas(formulario.diasSelecionados)
  const diasEmProva = formulario.aluguelAparelho
    ? ordenarDatas(formulario.diasEmProvaSelecionados)
    : []
  const diasHospedagem = ordenarDatas(formulario.diasHospedagemSelecionados)
  const dias = criarDiasDerivadosTreinamento({
    diasTreinamento,
    diasEmProva,
    diasHospedagem,
  })

  if (!nomeAluno) {
    return { ok: false, mensagem: 'Informe o nome do aluno.' }
  }

  if (diasTreinamento.length === 0) {
    return { ok: false, mensagem: 'Selecione pelo menos um dia de treinamento.' }
  }

  if (formulario.aluguelAparelho && diasEmProva.length === 0) {
    return { ok: false, mensagem: 'Marque pelo menos uma data em prova para reservar aparelho.' }
  }

  return {
    ok: true,
    mensagem: '',
    dados: {
      nomeAluno,
      emailAluno,
      diasTreinamento,
      diasEmProva,
      diasHospedagem,
      dias,
    },
  }
}
