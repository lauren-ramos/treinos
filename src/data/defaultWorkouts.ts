import type { Location } from '../lib/types'

/**
 * Treinos padrão (segunda a sexta), montados a partir das transcrições dos vídeos informados.
 * Séries/repetições seguem o que o vídeo diz; quando o vídeo não diz, vale a sugestão da biblioteca.
 * O minuto indicado em cada observação é o ponto aproximado do vídeo.
 */
export interface DefaultItem { ex: string; sets?: number; reps?: string; rest?: number; note?: string; group?: 'a' }
export interface DefaultWorkout {
  key: string
  dow: number // 1 = segunda … 5 = sexta
  name: string
  kind: string
  location: Location
  notes: string
  items: DefaultItem[]
}

export const DEFAULT_WORKOUTS: DefaultWorkout[] = [
  {
    key: 'seg', dow: 1, name: 'Segunda · Pernas e glúteos (em casa)', kind: 'Pernas e glúteos', location: 'casa',
    notes: 'Treino por repetições, sem equipamento obrigatório; a carga é opcional (pode ser só o peso do corpo). Termina com alongamento.',
    items: [
      { ex: 'joelho-alto', sets: 1, reps: '30', note: 'Aquecimento: corrida leve por 30 segundos (0:25).' },
      { ex: 'polichinelo', sets: 1, reps: '40', note: 'Aquecimento: "estrelinhas" (1:00).' },
      { ex: 'agachamento-corporal', sets: 1, reps: '50', rest: 30, note: 'Pés na largura dos ombros, sem carga, em blocos de 10 (4:12).' },
      { ex: 'agachamento-goblet', sets: 1, reps: '40', rest: 30, note: 'Com carga à frente (opcional), pés mais juntos (7:31).' },
      { ex: 'sumo', sets: 1, reps: '50', rest: 30, note: 'Pés mais afastados; parte sem peso e parte com carga (11:24).' },
      { ex: 'stiff', sets: 3, reps: '20', rest: 30, note: 'Pés mais afastados, movimento controlado (16:47).' },
      { ex: 'afundo', sets: 3, reps: '12 por perna', rest: 30, note: 'Agachamento profundo alternado: 12 de um lado e troca (27:18).' },
      { ex: 'ponte', sets: 3, reps: '15', rest: 30, note: 'Deitada, pernas dobradas; movimento curto contraindo o glúteo (37:55).' },
    ],
  },
  {
    key: 'ter', dow: 2, name: 'Terça · Superiores (academia)', kind: 'Superiores', location: 'academia',
    notes: 'Objetivo de manter e tonificar, sem aumentar muita carga. Aquecimento: corrida leve de 5 a 10 minutos e mobilidade de ombros. Finalizar com 15 a 20 minutos de caminhada rápida na esteira.',
    items: [
      { ex: 'supino-halteres', sets: 3, reps: '10-20', rest: 45, note: 'No vídeo é com barra: 20 repetições só com a barra (20 kg), depois 15 e 10 com 5 kg de cada lado (1:34).' },
      { ex: 'desenvolvimento', sets: 4, reps: '12-15', rest: 30, note: 'Halteres de 5 kg; última série em drop set, baixando para 2,5 kg (4:07).' },
      { ex: 'elevacao-frontal', sets: 3, reps: '10', rest: 30, group: 'a', note: 'Combinação de 3 exercícios sem descanso, 3 rodadas (8:21).' },
      { ex: 'elevacao-lateral', sets: 3, reps: '10', rest: 30, group: 'a', note: 'Sem descanso após a frontal (9:03).' },
      { ex: 'crucifixo-inverso', sets: 3, reps: '10', rest: 30, group: 'a', note: 'Inclinado para frente; descanso de 30 s ao fim da rodada (9:28).' },
      { ex: 'triceps-coice', sets: 3, reps: '15', rest: 30, note: 'Tríceps com halteres, 15 repetições; confira o exercício no vídeo (13:36).' },
      { ex: 'mergulho-banco', sets: 3, reps: '10', rest: 30, note: 'Afundos no banco, glúteo perto do banco; pernas esticadas ou dobradas (14:30).' },
      { ex: 'elevacao-pernas', sets: 2, reps: '10', rest: 20, note: 'Elevação de joelhos na barra fixa, pés sempre no ar; no chão ou no banco se não conseguir (17:52).' },
      { ex: 'prancha', sets: 1, reps: '60', note: 'Um minuto de prancha, respirando fundo (20:56).' },
    ],
  },
  {
    key: 'qua', dow: 3, name: 'Quarta · Glúteos (academia)', kind: 'Glúteos', location: 'academia',
    notes: 'Aquecimento de 5 a 10 minutos na esteira inclinada (inclinação 15, velocidade 4,5) e alongamento dinâmico. Termina com alongamento.',
    items: [
      { ex: 'abducao-pe', sets: 1, reps: '15 por lado', note: 'Aquecimento isolado de glúteos; ideal com mini banda (1:45).' },
      { ex: 'cadeira-abdutora', sets: 4, reps: '12-20', rest: 20, note: '20, 15 e 12 repetições aumentando a carga; última série em drop set com mais 12 (2:12).' },
      { ex: 'hip-thrust', sets: 4, reps: '12-15', rest: 45, note: 'Barra com protetor, pés na largura dos ombros; 15, 12, 12 e séries curtas finais (5:52).' },
      { ex: 'afundo', sets: 3, reps: '10 por perna', rest: 45, note: 'Passada com passo largo (mínimo de 20 repetições no total); pode usar step (13:45).' },
      { ex: 'bom-dia', sets: 3, reps: '12-15', rest: 30, note: 'Na máquina, pés na ponta da plataforma, joelhos flexionados; carga baixa (18:41).' },
      { ex: 'sumo', sets: 3, reps: '12-15', rest: 30, note: 'Com halter/kettlebell (20 kg) (25:04).' },
      { ex: 'coice-polia', sets: 3, reps: '15', rest: 0, note: 'Com caneleira; sem descanso, alternando as pernas (28:32).' },
    ],
  },
  {
    key: 'qui', dow: 4, name: 'Quinta · Queima de gordura e abdômen (em casa)', kind: 'Cardio e abdômen', location: 'casa',
    notes: 'Sem equipamento. Três circuitos com descanso de 15 a 30 segundos. Começa com mobilidade (giros de tronco e braços) e termina com alongamento e relaxamento.',
    items: [
      { ex: 'polichinelo', sets: 3, reps: '20', rest: 15, note: 'Três estrelinhas alternando com um afundo para trás (2:00).' },
      { ex: 'afundo', sets: 3, reps: '20', rest: 15, note: 'Afundo para trás alternado, em ritmo (2:00).' },
      { ex: 'joelho-alto', sets: 3, reps: '30', rest: 15, note: 'Corridinha/corrida no lugar (4:24).' },
      { ex: 'abdominal-crunch', sets: 3, reps: '20', rest: 15, note: 'Pés afastados, tocando a mão no pé alternando (5:48).' },
      { ex: 'elevacao-pernas', sets: 3, reps: '20', rest: 15, note: 'Pernas levantadas, respirando: solta o ar na subida (8:03).' },
      { ex: 'burpee', sets: 3, reps: '10', rest: 15, note: 'Joelho para a frente, abdominal, volta e salta (9:24).' },
      { ex: 'prancha', sets: 3, reps: '30', rest: 15, note: 'Prancha de 20 a 30 segundos; pode apoiar os joelhos (11:12).' },
    ],
  },
  {
    key: 'sex', dow: 5, name: 'Sexta · Pernas com foco em quadríceps (academia)', kind: 'Pernas', location: 'academia',
    notes: 'Aquecimento de 5 a 10 minutos na escada e alongamento dinâmico. Termina com alongamento de posterior e quadríceps.',
    items: [
      { ex: 'stiff', sets: 4, reps: '12-15', rest: 30, note: 'Começa com 20 repetições só com a barra (20 kg) e vai aumentando a carga (3:06).' },
      { ex: 'agachamento-livre', sets: 4, reps: '6-12', rest: 60, note: '15 só com a barra, depois 10 e 12 repetições, e uma série pesada de 6 a 8 com cinto (9:18).' },
      { ex: 'leg-press', sets: 4, reps: '10-20', rest: 40, note: 'Foco em quadríceps: 20 repetições e agachamentos curtos de 15, com isometria de 10 s; no vídeo é uma máquina de agachamento, ajuste ao que tiver (14:19).' },
      { ex: 'bulgaro', sets: 3, reps: '10 por perna', rest: 45, note: 'Pode inclinar o tronco para focar mais no glúteo (22:04).' },
      { ex: 'hip-thrust', sets: 3, reps: '10-15', rest: 45, note: 'Na máquina: 15, depois 10 repetições com mais carga (27:17).' },
      { ex: 'panturrilha', sets: 3, reps: '10', rest: 30, note: 'Com isometria de 10 segundos no alto (32:53).' },
    ],
  },
]
