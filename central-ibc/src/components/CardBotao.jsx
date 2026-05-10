export default function CardBotao({
  codigo,
  setor,
  titulo,
  descricao,
  acao,
  status = '',
  onClick,
  prioritario = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group rounded-lg border bg-white p-5 text-left shadow-sm transition-colors hover:border-[#B40105] hover:bg-[#FFFDFD] md:p-6',
        prioritario ? 'border-[#B40105]/35' : 'border-[#CFCFCF]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B40105]">
            {setor.toUpperCase()}
          </p>
          <h2 className="mt-3 text-[26px] font-black leading-tight text-[#1F1F1F]">{titulo}</h2>
        </div>

        <span
          className={`min-w-[56px] rounded-lg px-3 py-2 text-center text-sm font-black ${
            prioritario
              ? 'bg-[#B40105] text-white'
              : 'bg-[#F6F6F6] text-[#222222] ring-1 ring-[#CFCFCF]'
          }`}
        >
          {codigo}
        </span>
      </div>

      <p className="mt-4 min-h-[72px] text-base font-medium leading-relaxed text-[#374151]">
        {descricao}
      </p>

      {status ? (
        <div className="mt-3">
          <span className="rounded-full bg-[#F6F6F6] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#4B5563] ring-1 ring-[#CFCFCF]">
            {status}
          </span>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
        <span className="text-base font-bold text-[#222222]">{acao}</span>
        <span
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            prioritario
              ? 'bg-[#B40105] text-white group-hover:bg-[#860104]'
              : 'border border-[#CFCFCF] bg-[#F6F6F6] text-[#B40105] group-hover:border-[#B40105]'
          }`}
        >
          Abrir
        </span>
      </div>
    </button>
  )
}
