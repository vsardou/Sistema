import { useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
} from '../features/programacao/constants'
import {
  carregarConfiguracaoOperacional,
  getConfiguracaoOperacionalPadrao,
  salvarConfiguracaoOperacional,
} from '../features/configuracoes/configuracaoOperacional'

const camposOperacionais = [
  {
    chave: 'totalAparelhosDisponiveis',
    rotulo: 'Aparelhos disponiveis',
    descricao: 'Limite usado para alertar excesso de aluguel de aparelho na programacao.',
  },
  {
    chave: 'totalVagasHospedagem',
    rotulo: 'Vagas de hospedagem',
    descricao: 'Limite usado para alertar excesso de hospedagens no mesmo dia.',
  },
]

function formatarDataHora(dataIso) {
  if (!dataIso) {
    return 'Ainda nao salvo'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso))
}

export default function TelaOperacao({ onVoltar }) {
  const [configuracao, setConfiguracao] = useState(() => carregarConfiguracaoOperacional())
  const [mensagem, setMensagem] = useState('')

  function handleAtualizarCampo(campo, valor) {
    setMensagem('')
    setConfiguracao((atual) => ({
      ...atual,
      [campo]: Number(valor) || 0,
    }))
  }

  function handleSalvar() {
    const salva = salvarConfiguracaoOperacional(configuracao)
    setConfiguracao(salva)
    setMensagem('Configuracao operacional salva. A programacao vai usar estes limites.')
  }

  function handleRestaurarPadrao() {
    const padrao = getConfiguracaoOperacionalPadrao()
    const salva = salvarConfiguracaoOperacional(padrao)
    setConfiguracao(salva)
    setMensagem('Limites operacionais restaurados para o padrao inicial.')
  }

  return (
    <>
      <BarraTopo
        titulo="Operacao"
        subtitulo="Defina limites usados nos alertas da programacao."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
              Capacidade
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Limites que geram aviso na agenda
            </h2>
            <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-[#4B5563]">
              Estes numeros nao bloqueiam o cadastro. Eles avisam quando a agenda passou da
              capacidade combinada.
            </p>
          </div>

          <div className="rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-3 text-sm font-semibold text-[#374151]">
            Atualizado: {formatarDataHora(configuracao.atualizadoEm)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {camposOperacionais.map((campo) => (
            <label key={campo.chave} className={`${cartaoSecundarioClass} grid gap-3`}>
              <span className="text-base font-bold text-[#222222]">{campo.rotulo}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={configuracao[campo.chave]}
                onChange={(e) => handleAtualizarCampo(campo.chave, e.target.value)}
                className="min-h-[58px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-xl font-bold text-slate-900"
              />
              <span className="text-sm font-medium leading-relaxed text-[#4B5563]">
                {campo.descricao}
              </span>
            </label>
          ))}
        </div>

        {mensagem ? (
          <div className="mt-5 rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm font-bold text-[#4B5563]">
            {mensagem}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleSalvar} className={botaoPrimarioClass}>
            Salvar operacao
          </button>
          <button type="button" onClick={handleRestaurarPadrao} className={botaoSecundarioClass}>
            Restaurar padrao inicial
          </button>
        </div>
      </section>
    </>
  )
}
