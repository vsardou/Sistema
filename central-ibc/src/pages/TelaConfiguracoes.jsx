import { useMemo, useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  carregarConfiguracaoSistema,
  getStatusConfiguracaoSistema,
  pastasSistemaIbc,
  prepararPastasCompartilhadas,
  salvarConfiguracaoSistema,
  selecionarPastaRaizCompartilhada,
} from '../features/configuracoes/configuracaoSistema'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  botaoSecundarioCompactoClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
} from '../features/programacao/constants'

function formatarDataHora(dataIso) {
  if (!dataIso) {
    return 'Ainda não salvo'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso))
}

export default function TelaConfiguracoes({
  onVoltar,
  onAbrirValores,
  onAbrirOperacao,
  onAbrirInstitucional,
  onAbrirDocumentos,
}) {
  const [configuracao, setConfiguracao] = useState(() => carregarConfiguracaoSistema())
  const [pastaRaiz, setPastaRaiz] = useState(configuracao.pastaRaiz)
  const [mensagem, setMensagem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const status = useMemo(() => getStatusConfiguracaoSistema(configuracao), [configuracao])
  const resultadoPreparacao = configuracao.ultimoResultadoPreparacao

  async function handleSelecionarPasta() {
    setMensagem('')

    try {
      const pasta = await selecionarPastaRaizCompartilhada()

      if (pasta) {
        setPastaRaiz(pasta)
        return
      }

      setMensagem(
        'Seletor nativo disponível apenas no aplicativo instalado. No navegador, informe o caminho manualmente.',
      )
    } catch {
      setMensagem('Não foi possível abrir o seletor de pasta. Informe o caminho manualmente.')
    }
  }

  async function handleSalvarConfiguracao(event) {
    event.preventDefault()
    setMensagem('')
    setSalvando(true)

    try {
      const resultado = await prepararPastasCompartilhadas(pastaRaiz)
      const configuracaoAtualizada = salvarConfiguracaoSistema({
        pastaRaiz: resultado.pasta_raiz ?? pastaRaiz,
        computador: resultado.computador ?? '',
        ultimoResultadoPreparacao: resultado,
      })

      setConfiguracao(configuracaoAtualizada)
      setMensagem(
        resultado.modoSimulado
          ? 'Configuração salva no modo navegador. As pastas serão criadas pelo app instalado.'
          : 'Pastas compartilhadas criadas e configuração salva.',
      )
    } catch (erro) {
      setMensagem(erro?.message || 'Não foi possível salvar a configuração das pastas.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <BarraTopo
        titulo="Configurações"
        subtitulo="Definir onde o Sistema IBC guarda dados, documentos e backups."
        voltar
        onVoltar={onVoltar}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form className={cartaoPrincipalClass} onSubmit={handleSalvarConfiguracao}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
                Instalação
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#1F1F1F]">
                Pasta raiz compartilhada
              </h2>
              <p className="mt-3 max-w-3xl text-base font-medium leading-relaxed text-[#374151]">
                Escolha uma pasta que possa ser usada em outro computador. O sistema cria a
                estrutura padrão dentro dela e registra um controle simples de uso.
              </p>
            </div>

            <span
              className={[
                'rounded-full px-3 py-2 text-sm font-bold ring-1',
                status.estado === 'compartilhado'
                  ? 'bg-[#EEF7F2] text-[#166534] ring-[#CDE6D5]'
                  : 'bg-[#FFF7E4] text-[#8C5A00] ring-[#F3D9A2]',
              ].join(' ')}
            >
              {status.titulo}
            </span>
          </div>

          <label className="mt-6 grid gap-2">
            <span className="text-sm font-bold text-[#4B5563]">Caminho da pasta raiz</span>
            <input
              value={pastaRaiz}
              onChange={(event) => setPastaRaiz(event.target.value)}
              className="rounded-lg border border-[#CFCFCF] bg-white px-4 py-4 text-base font-semibold text-[#222222]"
              placeholder="Ex.: Z:\\IBC Compartilhado ou C:\\IBC Compartilhado"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={handleSelecionarPasta}
              className={botaoSecundarioClass}
            >
              Escolher pasta
            </button>
            <button type="submit" disabled={salvando} className={botaoPrimarioClass}>
              {salvando ? 'Salvando...' : 'Criar estrutura e salvar'}
            </button>
          </div>

          {mensagem ? (
            <div className="mt-5 rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm font-bold text-[#4B5563]">
              {mensagem}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pastasSistemaIbc.map((pasta) => (
              <div key={pasta.chave} className={cartaoSecundarioClass}>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#767676]">
                  {pasta.rotulo}
                </span>
                <p className="mt-2 break-all text-sm font-bold text-[#222222]">
                  {pasta.caminhoRelativo}
                </p>
              </div>
            ))}
          </div>
        </form>

        <aside className="grid content-start gap-5">
          <div className={cartaoPrincipalClass}>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Financeiro
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#1F1F1F]">Valores padrao</h3>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#4B5563]">
              Defina diarias, hospedagem e aluguel de aparelho que entram automaticamente nas
              novas prestacoes.
            </p>
            <button
              type="button"
              onClick={onAbrirValores}
              className={`mt-5 w-full ${botaoPrimarioClass}`}
            >
              Abrir valores padrao
            </button>
          </div>

          <div className={cartaoPrincipalClass}>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Operacao
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#1F1F1F]">Capacidade</h3>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#4B5563]">
              Configure aparelhos disponiveis e vagas de hospedagem usados nos avisos da agenda.
            </p>
            <button
              type="button"
              onClick={onAbrirOperacao}
              className={`mt-5 w-full ${botaoSecundarioClass}`}
            >
              Abrir operacao
            </button>
          </div>

          <div className={cartaoPrincipalClass}>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Institucional
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#1F1F1F]">Dados da IBC</h3>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#4B5563]">
              Edite empresa, CNPJ, responsavel tecnico, rodape e assinaturas dos documentos.
            </p>
            <button
              type="button"
              onClick={onAbrirInstitucional}
              className={`mt-5 w-full ${botaoSecundarioClass}`}
            >
              Abrir institucional
            </button>
          </div>

          <div className={cartaoPrincipalClass}>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Documentos
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#1F1F1F]">Declaracoes</h3>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#4B5563]">
              Ajuste a carga horaria automatica usada pelos dias treinados.
            </p>
            <button
              type="button"
              onClick={onAbrirDocumentos}
              className={`mt-5 w-full ${botaoSecundarioClass}`}
            >
              Abrir documentos
            </button>
          </div>

          <div className={cartaoPrincipalClass}>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Estado atual
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#1F1F1F]">{status.titulo}</h3>
            <p className="mt-3 break-all text-sm font-semibold leading-relaxed text-[#4B5563]">
              {status.descricao}
            </p>
            <div className="mt-5 grid gap-3 text-sm font-semibold text-[#4B5563]">
              <span>Atualizado: {formatarDataHora(configuracao.atualizadoEm)}</span>
              <span>Computador: {configuracao.computador || 'Não identificado'}</span>
            </div>
          </div>

          <div className={cartaoPrincipalClass}>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Uso em dois PCs
            </p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#4B5563]">
              A pasta criada inclui `Dados/configuracao.json` e `Dados/lock.json`. Isso é a base
              para avisar quando outro computador usou o sistema por último.
            </p>
            {resultadoPreparacao?.arquivos_criados?.length ? (
              <div className="mt-4 grid gap-2">
                {resultadoPreparacao.arquivos_criados.map((arquivo) => (
                  <span
                    key={arquivo}
                    className="break-all rounded-lg bg-[#F6F6F6] px-3 py-2 text-xs font-semibold text-[#4B5563] ring-1 ring-[#D9D9D9]"
                  >
                    {arquivo}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" onClick={onVoltar} className={botaoSecundarioCompactoClass}>
            Voltar
          </button>
        </aside>
      </section>
    </>
  )
}
