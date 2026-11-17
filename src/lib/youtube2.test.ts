import { describe, expect, it } from 'vitest'
import { extractExercises, normalizeTranscript } from './youtube'

// Trecho real do formato "copiar transcrição" do YouTube (tempo grudado no rótulo de acessibilidade)
const COLADO = `Olá minha gente sejam bem-vindos a mais um vídeo hoje é segunda-feira vou fazer meu treino de glúteos por isso sem demoras vamos começar o
0:088 segundostreino Então vamos começar com aquecimento pode ser entre 5 a 10 minutos e aqui eu inclino a passadeira
1:031 minuto e 3 segundosvamos preparar a anca aqui ser bem os glúteos aqui emcos eu gosto de fazer
2:122 minutos e 12 segundosprimeiro exercício do treino de hoje que vai ser na abdutora é uma das minhas máquinas
2:192 minutos e 19 segundosfavoritas começando com pouca carga Vou fazer 20 repetições aqui
5:525 minutos e 52 segundosmassacrei segundo exercício vai ser elevação pélvica com a barra esponjinha para não lejar vou
6:016 minutos e 1 segundocomeçar já com 10 cada lado Bora
13:4513 minutos e 45 segundosaqui est na minha zona de conforto agachamento ao fundo em passada agachamento ao fundo normal para mim é
14:3414 minutos e 34 segundosfazendo no mínimo 20 repetições que dá 10 para cada lado
18:4918 minutos e 49 segundosexercício mais parecido com bom dia bom dia na máquina e a posição dos
20:3920 minutos e 39 segundosagachamento no Sumo elevação pélvica tá bem para quem não tem Instagram
25:0425 minutos e 4 segundoshoje Deia fazer agachamento Sum com o sk H usei aqui o cutal b acaba por ser um
25:2825 minutos e 28 segundosfazer entre 12 a 15 repetições concentradas
28:5928 minutos e 59 segundosnão faço muito no ginásio nem elevação pélvica nem os kicks nos treinos em casa eu faço mas nos meus treinos no ginásio
Sincronizar com o momento do vídeo`

describe('transcrição colada do YouTube', () => {
  it('normaliza para "[m:ss] texto" e ignora o rodapé', () => {
    const n = normalizeTranscript(COLADO)
    expect(n).toContain('[0:08] treino Então vamos começar')
    expect(n).toContain('[1:03] vamos preparar a anca')
    expect(n).toContain('[2:12] primeiro exercício')
    expect(n).not.toContain('Sincronizar')
    expect(n).not.toMatch(/segundostreino/)
  })

  it('reconhece os exercícios do treino com o minuto certo (formato colado e normalizado)', () => {
    for (const texto of [COLADO, normalizeTranscript(COLADO)]) {
      const r = extractExercises(texto)
      const by = (id: string) => r.find((x) => x.exercise_id === id)
      expect(by('cadeira-abdutora')).toMatchObject({ start: 132, reps: '20' })
      expect(by('hip-thrust')?.start).toBe(352)
      expect(by('afundo')).toMatchObject({ start: 825, reps: '20' })
      expect(by('bom-dia')?.start).toBe(1129)
      expect(by('sumo')?.start).toBe(1239)
      expect(by('coice-polia')?.start).toBe(1739)
      expect(by('agachamento-corporal')).toBeUndefined() // "agachamento ao fundo/sumô" não é agachamento comum
      const ids = r.map((x) => x.exercise_id)
      expect(ids.indexOf('cadeira-abdutora')).toBeLessThan(ids.indexOf('hip-thrust'))
      expect(ids.indexOf('hip-thrust')).toBeLessThan(ids.indexOf('afundo'))
      expect(ids.indexOf('afundo')).toBeLessThan(ids.indexOf('bom-dia'))
    }
  })
})
