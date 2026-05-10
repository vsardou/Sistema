import { nomesMeses } from '../constants'

export function criarChaveData(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function formatarMesAno(mes, ano) {
  return `${nomesMeses[mes - 1]} de ${ano}`
}

export function formatarDataExtensa(data) {
  const [ano, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${nomesMeses[mes - 1]} de ${ano}`
}

export function formatarDataCurta(data) {
  if (!data) return 'Sem data definida'

  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarQuantidadeAlunos(total) {
  if (total === 1) return '1 aluno'
  return `${total} alunos`
}

export function formatarQuantidadeAparelhos(total) {
  if (total === 1) return '1 aparelho'
  return `${total} aparelhos`
}

export function formatarQuantidadeDatas(total) {
  if (total === 1) return '1 data'
  return `${total} datas`
}

export function getInfoMes(ano, mes) {
  const primeiroDia = new Date(ano, mes - 1, 1)
  const totalDias = new Date(ano, mes, 0).getDate()
  const deslocamentoInicial = (primeiroDia.getDay() + 6) % 7

  return { totalDias, deslocamentoInicial }
}

export function ordenarDatas(datas = []) {
  return [...new Set(datas)].sort()
}

export function getDatasDoMes(datas = [], ano, mes) {
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}-`
  return ordenarDatas(datas.filter((data) => data.startsWith(prefixo)))
}
