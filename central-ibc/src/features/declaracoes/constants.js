import { carregarCamposInstitucionaisDeclaracao } from '../configuracoes/configuracaoInstitucional'

export const MODELO_DECLARACAO_PERIODO = 'declaracao_periodo'
export const MODELO_DECLARACAO_ABENDI = 'declaracao_abendi'

export const modelosDeclaracaoV1 = [
  {
    id: MODELO_DECLARACAO_PERIODO,
    label: 'Declaração de Treinamento / Retreinamento por período',
    descricao:
      'Modelo institucional por período para treinamento e retreinamento, com datas editáveis e cálculo automático de carga horária.',
    disponivel: true,
  },
  {
    id: MODELO_DECLARACAO_ABENDI,
    label: 'Declaração de Comprovação / ABENDI',
    descricao:
      'Comprovação institucional de atuação, experiência e vínculo técnico, sem tratar o profissional como aluno treinado.',
    disponivel: true,
  },
]

export const finalidadesTreinamentoDeclaracao = [
  'Treinamento prático',
  'Retreinamento prático',
  'Treinamento prático supervisionado para prova de qualificação do SNQC',
  'Treinamento prático para exame de certificação',
  'Treinamento prático para exame de recertificação',
  'Treinamento visando aplicação da norma AWS D1.1',
]

export const subniveisDeclaracao = [
  'S1',
  'S2',
  'S2.1',
  'S3',
  'S4',
  'AE1',
]

export { carregarCamposInstitucionaisDeclaracao }

export const camposInstitucionaisDeclaracao = carregarCamposInstitucionaisDeclaracao()

export const rotulosModeloDeclaracao = Object.fromEntries(
  modelosDeclaracaoV1.map((modelo) => [modelo.id, modelo.label]),
)
