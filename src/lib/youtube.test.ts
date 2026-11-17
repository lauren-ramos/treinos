import { describe, expect, it } from 'vitest'
import { extractExercises, parseVideoId } from './youtube'

const RESUMO = `* Aquecimento isolado: Sugere-se a realização de 15 repetições para cada lado ([01:45](https://www.youtube.com/watch?t=105s)-[02:00](https://www.youtube.com/watch?t=120s)).
* Cadeira Abdutora: A primeira série tem 20 repetições, a segunda 15, a terceira 12 e, na última série, é feito um drop set com mais 12 repetições ([02:22](https://www.youtube.com/watch?t=142s)-[05:52](https://www.youtube.com/watch?t=352s)).
* Elevação Pélvica: O exercício segue uma progressão que inclui 15 repetições na primeira série ([07:07](https://www.youtube.com/watch?t=427s)-[13:20](https://www.youtube.com/watch?t=800s)).
* Agachamento ao fundo (Passada): A regra mínima é de 20 repetições no total ([14:34](https://www.youtube.com/watch?t=874s)-[14:40](https://www.youtube.com/watch?t=880s)).
* Bom Dia (na máquina): São realizadas 15 repetições na primeira série e 12 nas seguintes ([19:44](https://www.youtube.com/watch?t=1184s)-[23:10](https://www.youtube.com/watch?t=1390s)).
* Agachamento Sumo: A orientação é realizar entre 12 a 15 repetições concentradas ([25:29](https://www.youtube.com/watch?t=1529s)-[25:32](https://www.youtube.com/watch?t=1532s)).
* Kickbacks: São feitas 3 séries de 15 repetições para cada perna ([28:44](https://www.youtube.com/watch?t=1724s)-[28:47](https://www.youtube.com/watch?t=1727s)).`

describe('extração de exercícios do vídeo', () => {
  it('reconhece cada exercício do resumo, na ordem, sem misturar', () => {
    const r = extractExercises(RESUMO)
    expect(r.map((x) => x.exercise_id)).toEqual(['cadeira-abdutora', 'hip-thrust', 'afundo', 'bom-dia', 'sumo', 'coice-polia'])
    expect(r[0].start).toBe(142)
    expect(r.find((x) => x.exercise_id === 'coice-polia')).toMatchObject({ sets: 3, reps: '15', start: 1724 })
    expect(r.find((x) => x.exercise_id === 'sumo')).toMatchObject({ sets: null, start: 1529 })
  })
  it('não inventa: texto sem exercícios conhecidos devolve vazio', () => {
    expect(extractExercises('[0:10] Olá pessoal, bem-vindos ao canal')).toEqual([])
  })
  it('lê o id do vídeo', () => {
    expect(parseVideoId('https://youtu.be/dQw4w9WgXcQ?t=5')).toBe('dQw4w9WgXcQ')
  })
})
