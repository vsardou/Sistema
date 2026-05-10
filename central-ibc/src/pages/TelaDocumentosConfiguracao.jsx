import { useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
} from '../features/programacao/constants'
import {
  carregarConfiguracaoDocumentos,
  getConfiguracaoDocumentosPadrao,
  salvarConfiguracaoDocumentos,
} from '../features/configuracoes/configuracaoDocumentos'

function formatarDataHora(dataIso) {
  if (!dataIso) {
    return 'Ainda nao salvo'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso))
}

export default function TelaDocumentosConfiguracao({ onVoltar }) {
  const [configuracao, setConfiguracao] = useState(() => carregarConfiguracaoDocumentos())
  const [mensagem, setMensagem] = useState('')

  function handleAtualizarHoras(valor) {
    setMensagem('')
    setConfiguracao((atual) => ({
      ...atual,
      horasPorDiaDeclaracao: Number(valor) || 0,
    }))
  }

  function handleSalvar() {
    const salva = salvarConfiguracaoDocumentos(configuracao)
    setConfiguracao(salva)
    setMensagem('Configuracao de documentos salva. Novas declaracoes usam esta carga horaria.')
  }

  function handleRestaurarPadrao() {
    const padrao = getConfiguracaoDocumentosPadrao()
    const salva = salvarConfiguracaoDocumentos(padrao)
    setConfiguracao(salva)
    setMensagem('Configuracao de documentos restaurada para o padrao inicial.')
  }

  return (
    <>
      <BarraTopo
        titulo="Documentos"
        subtitulo="Configuracoes simples usadas na emissao de documentos."
        voltar
        onVoltar={onVoltar}
      />

      <section className={cartaoPrincipalClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
              Declaracoes
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Carga horaria automatica
            </h2>
            <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-[#4B5563]">
              Quando os dias treinados sao marcados, o sistema multiplica a quantidade de dias por
              este valor.
            </p>
          </div>

          <div className="rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-3 text-sm font-semibold text-[#374151]">
            Atualizado: {formatarDataHora(configuracao.atualizadoEm)}
          </div>
        </div>

        <label className={`mt-6 grid gap-3 ${cartaoSecundarioClass}`}>
          <span className="text-base font-bold text-[#222222]">Horas por dia treinado</span>
          <input
            type="number"
            min="1"
            step="0.5"
            value={configuracao.horasPorDiaDeclaracao}
            onChange={(e) => handleAtualizarHoras(e.target.value)}
            className="min-h-[58px] rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-xl font-bold text-slate-900"
          />
          <span className="text-sm font-medium leading-relaxed text-[#4B5563]">
            Exemplo: 3 dias selecionados com 8 horas por dia geram 24 horas.
          </span>
        </label>

        {mensagem ? (
          <div className="mt-5 rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm font-bold text-[#4B5563]">
            {mensagem}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleSalvar} className={botaoPrimarioClass}>
            Salvar documentos
          </button>
          <button type="button" onClick={handleRestaurarPadrao} className={botaoSecundarioClass}>
            Restaurar padrao inicial
          </button>
        </div>
      </section>
    </>
  )
}
