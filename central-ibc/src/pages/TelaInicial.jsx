import BarraTopo from '../components/BarraTopo'
import CardBotao from '../components/CardBotao'
import { carregarConfiguracaoSistema } from '../features/configuracoes/configuracaoSistema'

export default function TelaInicial({ onAbrir }) {
  const configuracaoSistema = carregarConfiguracaoSistema()
  const pastaBaseConfigurada = Boolean(configuracaoSistema.pastaRaiz)
  const cards = [
    {
      chave: 'programacao',
      codigo: '01',
      setor: 'Agenda',
      titulo: 'Programacao mensal',
      descricao: 'Cadastrar treinamentos, ajustar dias, provas, hospedagens e consultar o mes.',
      acao: 'Abrir programacao',
      status: 'Operacao principal',
      prioritario: true,
    },
    {
      chave: 'declaracoes',
      codigo: '02',
      setor: 'Documentos',
      titulo: 'Declaracoes',
      descricao: 'Emitir declaracoes com dados da programacao e PDF institucional.',
      acao: 'Emitir declaracao',
      status: 'PDF institucional',
      prioritario: true,
    },
    {
      chave: 'prestacao',
      codigo: '03',
      setor: 'Financeiro',
      titulo: 'Prestacao de contas',
      descricao: 'Fechar valores, conferir dias realizados e gerar documento financeiro.',
      acao: 'Fechar prestacao',
      status: 'Conferencia',
    },
    {
      chave: 'buscar',
      codigo: '04',
      setor: 'Historico',
      titulo: 'Documentos emitidos',
      descricao: 'Consultar PDFs gerados, abrir documentos e conferir o historico local.',
      acao: 'Ver documentos',
      status: 'Historico local',
    },
    {
      chave: 'modelos',
      codigo: '05',
      setor: 'Biblioteca',
      titulo: 'Biblioteca IBC',
      descricao: 'Modelos base, procedimentos e controle simples de revisoes.',
      acao: 'Abrir biblioteca',
      status: 'Consulta',
    },
    {
      chave: 'emails',
      codigo: '06',
      setor: 'Comunicacao',
      titulo: 'E-mails',
      descricao: 'Ler mensagens recebidas, responder conversas e anexar PDFs ja gerados.',
      acao: 'Abrir caixa IBC',
      status: 'Gmail API',
    },
    {
      chave: 'configuracoes',
      codigo: '07',
      setor: 'Sistema',
      titulo: 'Configuracoes',
      descricao: 'Escolher pasta compartilhada, organizar dados, documentos e backups.',
      acao: 'Configurar pastas',
      status: 'Instalacao',
    },
  ]

  return (
    <>
      <BarraTopo
        titulo="Painel principal"
        subtitulo="Agendar, emitir e consultar documentos."
      />

      <section className="rounded-lg border border-[#CFCFCF] bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B40105]">
              Rotina principal
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#1F1F1F]">
              Escolha o que vai fazer agora
            </h2>
          </div>
        </div>

        {!pastaBaseConfigurada ? (
          <div className="mb-6 rounded-[20px] border border-[#F3D9A2] bg-[#FFF7E4] px-4 py-4 text-sm font-semibold text-[#8C5A00]">
            A pasta base oficial ainda não foi configurada. O sistema vai usar uma pasta temporária
            em Downloads até você apontar a pasta principal ou OneDrive.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => onAbrir('configuracoes')}
                className="rounded-[16px] border border-[#D9D9D9] bg-white px-4 py-3 text-sm font-semibold text-[#222222]"
              >
                Configurar pasta do sistema
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <CardBotao
              key={card.chave}
              codigo={card.codigo}
              setor={card.setor}
              titulo={card.titulo}
              descricao={card.descricao}
              acao={card.acao}
              status={card.status}
              prioritario={card.prioritario}
              onClick={() => onAbrir(card.chave)}
            />
          ))}
        </div>
      </section>
    </>
  )
}
