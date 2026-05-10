export default function BarraTopo({ titulo, subtitulo, voltar, onVoltar, acoesRapidas = [] }) {
  return (
    <header className="mb-6">
      <div className="h-3 rounded-t-lg bg-[#B40105]" />
      <div className="rounded-b-lg border border-t-0 border-[#CFCFCF] bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="flex h-20 w-[132px] items-center justify-center rounded-lg border border-[#E5E5E5] bg-white p-3">
              <img
                src="/logo-sem-fundo.png"
                alt="IBC Qualidade"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
                IBC Qualidade
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-normal text-[#1F1F1F] md:text-5xl">
                {titulo}
              </h1>
              <p className="mt-3 max-w-3xl text-base font-medium text-[#374151] md:text-lg">
                {subtitulo}
              </p>
            </div>
          </div>

          {voltar ? (
            <div className="flex items-start">
              <button
                type="button"
                onClick={onVoltar}
                className="min-h-[52px] rounded-lg bg-[#B40105] px-5 py-4 text-lg font-bold text-white transition-colors hover:bg-[#860104]"
              >
                Voltar para o painel
              </button>
            </div>
          ) : acoesRapidas.length > 0 ? (
            <aside className="grid gap-4 rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] p-4 md:min-w-[360px]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#767676]">
                  Acesso rápido
                </p>
                <p className="mt-2 text-base font-medium leading-relaxed text-[#374151]">
                  Atalhos para as tarefas mais comuns do dia.
                </p>
              </div>

              <div className="grid gap-3">
                {acoesRapidas.map((acao, indice) => (
                  <button
                    key={acao.rotulo}
                    type="button"
                    onClick={acao.onClick}
                    className={
                      indice === 0
                        ? 'min-h-[52px] rounded-lg bg-[#B40105] px-4 py-4 text-base font-bold text-white transition-colors hover:bg-[#860104]'
                        : 'min-h-[52px] rounded-lg border border-[#CFCFCF] bg-white px-4 py-4 text-base font-bold text-[#222222] transition-colors hover:bg-[#FCFCFC]'
                    }
                  >
                    {acao.rotulo}
                  </button>
                ))}
              </div>
            </aside>
          ) : (
            <aside className="rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] p-4 md:min-w-[320px]">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#767676]">
                Modo V1
              </p>
              <p className="mt-2 text-base font-medium leading-relaxed text-[#374151]">
                Sistema local-first com dados do computador.
              </p>
            </aside>
          )}
        </div>
      </div>
    </header>
  )
}
