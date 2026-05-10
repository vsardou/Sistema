import { useMemo, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
} from '../features/programacao/constants'
import {
  carregarTabelaValoresPrestacao,
  getTabelaValoresPadraoPrestacao,
  salvarTabelaValoresPrestacao,
} from '../features/prestacao/utils/prestacaoUtils'

const camposValores = [
  {
    chave: 'valorDiariaUtil',
    rotulo: 'Diaria util',
    descricao: 'Valor usado em dias de treinamento de segunda a sexta.',
  },
  {
    chave: 'valorDiariaFimDeSemana',
    rotulo: 'Diaria fim de semana',
    descricao: 'Valor usado em sabados e domingos.',
  },
  {
    chave: 'valorHospedagemDia',
    rotulo: 'Hospedagem por dia',
    descricao: 'Valor somado quando o dia tiver hospedagem marcada.',
  },
  {
    chave: 'valorAluguelAparelho',
    rotulo: 'Aluguel de aparelho por dia',
    descricao: 'Valor somado nos dias marcados como aluguel de aparelho.',
  },
]

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor) || 0)
}

export default function TelaValores({ onVoltar }) {
  const [valores, setValores] = useState(() => carregarTabelaValoresPrestacao())
  const [mensagem, setMensagem] = useState('')

  const totalExemplo = useMemo(
    () =>
      Number(valores.valorDiariaUtil || 0) +
      Number(valores.valorHospedagemDia || 0) +
      Number(valores.valorAluguelAparelho || 0),
    [valores],
  )

  function handleAtualizarValor(campo, valor) {
    setMensagem('')
    setValores((atual) => ({
      ...atual,
      [campo]: Number(valor) || 0,
    }))
  }

  function handleSalvar() {
    const salvo = salvarTabelaValoresPrestacao(valores)

    if (!salvo) {
      setMensagem('Nao foi possivel salvar os valores.')
      return
    }

    setValores(salvo)
    setMensagem('Valores padrao salvos. As novas prestacoes vao usar esta tabela.')
  }

  function handleRestaurarPadrao() {
    const padrao = getTabelaValoresPadraoPrestacao()
    const salvo = salvarTabelaValoresPrestacao(padrao)
    setValores(salvo || padrao)
    setMensagem('Valores iniciais restaurados.')
  }

  return (
    <>
      <BarraTopo
        titulo="Valores padrao"
        subtitulo="Defina uma vez os valores usados nas prestacoes de contas."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
              Tabela de treinamento
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Valores que entram automaticamente na prestação
            </h2>
            <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-[#4B5563]">
              Altere aqui quando a tabela mudar. Na prestação, ficam apenas os dias e ajustes do
              fechamento.
            </p>
          </div>

          {mensagem ? (
            <div className="rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-3 text-sm font-semibold text-[#374151]">
              {mensagem}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 md:grid-cols-2">
            {camposValores.map((campo) => (
              <label key={campo.chave} className={`${cartaoSecundarioClass} grid gap-3`}>
                <span className="text-base font-bold text-[#222222]">{campo.rotulo}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valores[campo.chave] ?? 0}
                  onChange={(e) => handleAtualizarValor(campo.chave, e.target.value)}
                  className="min-h-[58px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-xl font-bold text-slate-900"
                />
                <span className="text-sm font-medium leading-relaxed text-[#4B5563]">
                  {campo.descricao}
                </span>
              </label>
            ))}
          </div>

          <aside className={cartaoSecundarioClass}>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
              Conferencia rapida
            </p>
            <div className="mt-4 space-y-3">
              {camposValores.map((campo) => (
                <div
                  key={campo.chave}
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-3 ring-1 ring-[#D9D9D9]"
                >
                  <span className="text-sm font-semibold text-[#4B5563]">{campo.rotulo}</span>
                  <span className="font-bold text-[#222222]">
                    {formatarMoeda(valores[campo.chave])}
                  </span>
                </div>
              ))}
              <div className="rounded-lg bg-[#FFF5F5] px-4 py-4 ring-1 ring-[#E5B5B8]">
                <span className="text-sm font-semibold text-[#B40105]">
                  Exemplo: 1 dia util + hospedagem + aparelho
                </span>
                <p className="mt-2 text-2xl font-black text-[#B40105]">
                  {formatarMoeda(totalExemplo)}
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleSalvar} className={botaoPrimarioClass}>
            Salvar valores
          </button>
          <button type="button" onClick={handleRestaurarPadrao} className={botaoSecundarioClass}>
            Restaurar padrao inicial
          </button>
        </div>
      </section>
    </>
  )
}
