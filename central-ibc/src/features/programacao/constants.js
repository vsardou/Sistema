export const TOTAL_APARELHOS_DISPONIVEIS = 6
export const TOTAL_VAGAS_HOSPEDAGEM = 2

export const nomesMeses = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

export const opcoesCor = [
  {
    value: 'emerald',
    dotClass: 'bg-emerald-500',
    chipClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  {
    value: 'sky',
    dotClass: 'bg-sky-500',
    chipClass: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  {
    value: 'amber',
    dotClass: 'bg-amber-500',
    chipClass: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  {
    value: 'rose',
    dotClass: 'bg-rose-500',
    chipClass: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  {
    value: 'violet',
    dotClass: 'bg-violet-500',
    chipClass: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  {
    value: 'orange',
    dotClass: 'bg-orange-500',
    chipClass: 'bg-orange-50 text-orange-700 ring-orange-200',
  },
  {
    value: 'cyan',
    dotClass: 'bg-cyan-500',
    chipClass: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  },
  {
    value: 'lime',
    dotClass: 'bg-lime-500',
    chipClass: 'bg-lime-50 text-lime-700 ring-lime-200',
  },
  {
    value: 'pink',
    dotClass: 'bg-pink-500',
    chipClass: 'bg-pink-50 text-pink-700 ring-pink-200',
  },
]

export const coresPorValor = Object.fromEntries(opcoesCor.map((opcao) => [opcao.value, opcao]))
export const coresAutomaticas = opcoesCor.map((opcao) => opcao.value)

export const estiloCancelado = {
  dotClass: 'bg-slate-400',
  chipClass: 'bg-slate-100 text-slate-500 ring-slate-200',
}

export const estilosStatus = {
  confirmado: 'bg-[#EEF2F7] text-[#334155] ring-1 ring-[#D9D9D9]',
  'em andamento': 'bg-[#FEF3C7] text-[#92400E] ring-1 ring-[#F3D9A2]',
  planejado: 'bg-[#EEF2F7] text-[#475569] ring-1 ring-[#D9D9D9]',
  concluido: 'bg-[#E8F5EC] text-[#166534] ring-1 ring-[#CDE6D5]',
  cancelado: 'bg-[#FDECEC] text-[#991B1B] ring-1 ring-[#F2C9C9]',
}

export const cartaoPrincipalClass = 'rounded-lg border border-[#CFCFCF] bg-white p-5 shadow-sm md:p-7'
export const cartaoSecundarioClass = 'rounded-lg border border-[#CFCFCF] bg-[#F6F6F6] p-4'
export const botaoPrimarioClass =
  'min-h-[52px] rounded-lg bg-[#B40105] px-5 py-4 text-base font-bold leading-tight text-white transition-colors hover:bg-[#860104] disabled:cursor-not-allowed disabled:opacity-60'
export const botaoSecundarioClass =
  'min-h-[52px] rounded-lg border border-[#CFCFCF] bg-white px-5 py-4 text-base font-bold leading-tight text-[#222222] transition-colors hover:bg-[#FCFCFC] disabled:cursor-not-allowed disabled:opacity-60'
export const botaoSecundarioCompactoClass =
  'min-h-[44px] rounded-lg border border-[#CFCFCF] bg-white px-4 py-3 text-sm font-bold leading-tight text-[#222222] transition-colors hover:bg-[#FCFCFC] disabled:cursor-not-allowed disabled:opacity-60'
