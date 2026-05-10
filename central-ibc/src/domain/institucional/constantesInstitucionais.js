export const identidadeInstitucionalIbc = {
  empresa: 'IBC CONTROLE DA QUALIDADE LTDA',
  cnpj: '08.839.819/0001-59',
  cidadePadraoTreinamento: 'Rio de Janeiro',
  supervisor: {
    nome: 'Ivanderley Thomaz de Aquino',
    cpf: '319.181.157-53',
    snqc: '1299',
    qualificacoes: 'Inspetor US-Nivel 3, US-N2-AE 1 e USN2-S2.1 em Ultrassom',
  },
  assinaturasV1: [
    {
      id: 'assinatura-diretora',
      nome: 'Maria de Lourdes O.S de Aquino',
      cargo: 'IBC-Qualidade Diretora',
      imagem: '/assets/assinaturas/assinatura-lourdes.png',
    },
    {
      id: 'assinatura-diretor-tecnico',
      nome: 'Ivanderley Thomaz de Aquino',
      cargo: 'IBC-Qualidade Diretor Tecnico/Instrutor',
      imagem: '/assets/assinaturas/assinatura-ivanderley.png',
    },
  ],
  blocoInstitucional: [
    'IBC CONTROLE DA QUALIDADE LTDA',
    'CNPJ 08.839.819/0001-59',
    'Rio de Janeiro - RJ',
  ],
  rodapeLinhas: [
    'Rua Sao Joao Gualberto, 268 - Vila da Penha',
    'Tel. (21) 3459-2860',
    'Cel. (21) 9 8756-7216',
    'atendimento@ibcqualidade.com',
    'www.ibcqualidade.com',
  ],
}

export const rodapeInstitucionalPadrao = identidadeInstitucionalIbc.rodapeLinhas.join(' | ')
