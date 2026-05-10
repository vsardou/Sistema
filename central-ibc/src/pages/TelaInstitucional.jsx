import { useState } from 'react'
import BarraTopo from '../components/BarraTopo'
import {
  botaoPrimarioClass,
  botaoSecundarioClass,
  cartaoPrincipalClass,
  cartaoSecundarioClass,
} from '../features/programacao/constants'
import {
  carregarConfiguracaoInstitucional,
  getConfiguracaoInstitucionalPadrao,
  salvarConfiguracaoInstitucional,
} from '../features/configuracoes/configuracaoInstitucional'

function formatarDataHora(dataIso) {
  if (!dataIso) {
    return 'Ainda nao salvo'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dataIso))
}

function CampoTexto({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#4B5563]">{label}</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="rounded-lg border border-[#D9D9D9] bg-white px-4 py-4 text-base font-semibold text-[#222222]"
      />
    </label>
  )
}

export default function TelaInstitucional({ onVoltar }) {
  const [configuracao, setConfiguracao] = useState(() => carregarConfiguracaoInstitucional())
  const [mensagem, setMensagem] = useState('')

  function handleAtualizarCampo(campo, valor) {
    setMensagem('')
    setConfiguracao((atual) => ({
      ...atual,
      [campo]: valor,
    }))
  }

  function handleAtualizarSupervisor(campo, valor) {
    setMensagem('')
    setConfiguracao((atual) => ({
      ...atual,
      supervisor: {
        ...atual.supervisor,
        [campo]: valor,
      },
    }))
  }

  function handleAtualizarRodape(indice, valor) {
    setMensagem('')
    setConfiguracao((atual) => ({
      ...atual,
      rodapeLinhas: atual.rodapeLinhas.map((linha, indiceLinha) =>
        indiceLinha === indice ? valor : linha,
      ),
    }))
  }

  function handleAtualizarAssinatura(indice, campo, valor) {
    setMensagem('')
    setConfiguracao((atual) => ({
      ...atual,
      assinaturas: atual.assinaturas.map((assinatura, indiceAssinatura) =>
        indiceAssinatura === indice
          ? {
              ...assinatura,
              [campo]: valor,
            }
          : assinatura,
      ),
    }))
  }

  function handleSalvar() {
    const salva = salvarConfiguracaoInstitucional(configuracao)
    setConfiguracao(salva)
    setMensagem('Dados institucionais salvos. Novos documentos e e-mails usam estes dados.')
  }

  function handleRestaurarPadrao() {
    const padrao = getConfiguracaoInstitucionalPadrao()
    const salva = salvarConfiguracaoInstitucional(padrao)
    setConfiguracao(salva)
    setMensagem('Dados institucionais restaurados para o padrao inicial.')
  }

  return (
    <>
      <BarraTopo
        titulo="Institucional"
        subtitulo="Dados usados em declaracoes, prestacoes e mensagens de e-mail."
        voltar
        onVoltar={onVoltar}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={cartaoPrincipalClass}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
                Dados da empresa
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                Identidade dos documentos
              </h2>
            </div>
            <div className="rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-3 text-sm font-semibold text-[#374151]">
              Atualizado: {formatarDataHora(configuracao.atualizadoEm)}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <CampoTexto
              label="Empresa"
              value={configuracao.empresa}
              onChange={(e) => handleAtualizarCampo('empresa', e.target.value)}
            />
            <CampoTexto
              label="CNPJ"
              value={configuracao.cnpj}
              onChange={(e) => handleAtualizarCampo('cnpj', e.target.value)}
            />
            <CampoTexto
              label="Cidade padrao"
              value={configuracao.cidadePadraoTreinamento}
              onChange={(e) => handleAtualizarCampo('cidadePadraoTreinamento', e.target.value)}
            />
            <div className="md:col-span-2">
              <CampoTexto
                label="Link do e-mail IBC"
                value={configuracao.webmailUrl}
                onChange={(e) => handleAtualizarCampo('webmailUrl', e.target.value)}
                placeholder="https://mail.google.com/"
              />
            </div>
            <CampoTexto
              label="Nome para avisos de programacao"
              value={configuracao.nomeAvisoProgramacao}
              onChange={(e) => handleAtualizarCampo('nomeAvisoProgramacao', e.target.value)}
              placeholder="Vinicius ou Haroldo"
            />
            <CampoTexto
              label="E-mail para avisos de programacao"
              value={configuracao.emailAvisoProgramacao}
              onChange={(e) => handleAtualizarCampo('emailAvisoProgramacao', e.target.value)}
              placeholder="nome@email.com"
            />
          </div>

          <div className={`mt-6 ${cartaoSecundarioClass}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
              Responsavel tecnico
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <CampoTexto
                label="Nome"
                value={configuracao.supervisor.nome}
                onChange={(e) => handleAtualizarSupervisor('nome', e.target.value)}
              />
              <CampoTexto
                label="CPF"
                value={configuracao.supervisor.cpf}
                onChange={(e) => handleAtualizarSupervisor('cpf', e.target.value)}
              />
              <CampoTexto
                label="SNQC"
                value={configuracao.supervisor.snqc}
                onChange={(e) => handleAtualizarSupervisor('snqc', e.target.value)}
              />
              <CampoTexto
                label="Qualificacoes"
                value={configuracao.supervisor.qualificacoes}
                onChange={(e) => handleAtualizarSupervisor('qualificacoes', e.target.value)}
              />
            </div>
          </div>

          <div className={`mt-6 ${cartaoSecundarioClass}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
              Rodape dos documentos e e-mails
            </p>
            <div className="mt-4 grid gap-4">
              {configuracao.rodapeLinhas.map((linha, indice) => (
                <CampoTexto
                  key={`rodape-${indice}`}
                  label={`Linha ${indice + 1}`}
                  value={linha}
                  onChange={(e) => handleAtualizarRodape(indice, e.target.value)}
                />
              ))}
            </div>
          </div>

          <div className={`mt-6 ${cartaoSecundarioClass}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#767676]">
              Assinaturas
            </p>
            <div className="mt-4 grid gap-4">
              {configuracao.assinaturas.map((assinatura, indice) => (
                <div key={assinatura.id} className="rounded-lg bg-white p-4 ring-1 ring-[#D9D9D9]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <CampoTexto
                      label="Nome"
                      value={assinatura.nome}
                      onChange={(e) => handleAtualizarAssinatura(indice, 'nome', e.target.value)}
                    />
                    <CampoTexto
                      label="Cargo"
                      value={assinatura.cargo}
                      onChange={(e) => handleAtualizarAssinatura(indice, 'cargo', e.target.value)}
                    />
                    <div className="md:col-span-2">
                      <CampoTexto
                        label="Imagem da assinatura"
                        value={assinatura.imagem}
                        onChange={(e) =>
                          handleAtualizarAssinatura(indice, 'imagem', e.target.value)
                        }
                        placeholder="/assets/assinaturas/arquivo.png"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {mensagem ? (
            <div className="mt-5 rounded-lg border border-[#D9D9D9] bg-[#F6F6F6] px-4 py-4 text-sm font-bold text-[#4B5563]">
              {mensagem}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleSalvar} className={botaoPrimarioClass}>
              Salvar institucional
            </button>
            <button type="button" onClick={handleRestaurarPadrao} className={botaoSecundarioClass}>
              Restaurar padrao inicial
            </button>
          </div>
        </div>

        <aside className={cartaoPrincipalClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B40105]">
            Preview
          </p>
          <div className="mt-5 rounded-lg border border-[#D9D9D9] bg-white p-4 text-sm leading-6 text-[#374151]">
            <p className="font-bold text-[#222222]">{configuracao.empresa}</p>
            <p>CNPJ {configuracao.cnpj}</p>
            <p>{configuracao.cidadePadraoTreinamento}</p>
            <p className="mt-2 break-all font-semibold">E-mail: {configuracao.webmailUrl}</p>
            <p className="mt-2 break-all font-semibold">
              Avisos de programacao: {configuracao.emailAvisoProgramacao || 'Nao configurado'}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-[#D9D9D9] bg-white p-4 text-sm leading-6 text-[#374151]">
            <p className="font-bold text-[#222222]">Responsavel tecnico</p>
            <p>{configuracao.supervisor.nome}</p>
            <p>CPF {configuracao.supervisor.cpf}</p>
            <p>SNQC {configuracao.supervisor.snqc}</p>
          </div>

          <div className="mt-4 rounded-lg border border-[#D9D9D9] bg-white p-4 text-sm leading-6 text-[#374151]">
            {configuracao.rodapeLinhas.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
          </div>
        </aside>
      </section>
    </>
  )
}
