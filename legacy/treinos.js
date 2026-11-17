/*
  BASE DE TREINOS
  ----------------
  Cada treino vem da transcrição de um vídeo do YouTube.
  Para adicionar outro treino, copie um objeto abaixo e preencha.

  - video: link do vídeo (opcional). Se preencher, os minutos viram links que abrem o vídeo no ponto certo.
  - t: segundo do vídeo em que o exercício começa.
  - passos / dicas / cue: vêm da transcrição (versão "casa", como o vídeo faz).
  - academia: adaptação sugerida (NÃO vem do vídeo) para quem treina na academia.
  - igual: true  => o exercício é igual nos dois modos.
  - timer: segundos (mostra cronômetro regressivo).
*/
window.TREINOS = [
  {
    id: "gf5-t1",
    titulo: "Treino 1 — Pernas e Glúteos",
    projeto: "Guerreira Fit 5",
    foco: "Pernas e glúteos",
    duracao: "≈ 57 min",
    video: "", // cole aqui o link do YouTube, ex.: "https://www.youtube.com/watch?v=XXXXXXXXXXX"
    material: {
      casa: "Halteres (ou garrafas/mochila com peso), caneleiras, cadeira ou banco, tapete.",
      academia: "Halteres, barra/Smith, banco, polia baixa com tornozeleira, máquinas (abdutora, hip thrust), passadeira ou bicicleta."
    },
    secoes: [
      {
        id: "aquecimento",
        nome: "Aquecimento",
        resumo: "0:00 – 6:30",
        itens: [
          {
            id: "a1", nome: "Rotação da anca", t: 93, dose: "5 voltas para cada lado",
            passos: [
              "Em pé, mãos na cintura.",
              "Gira a anca desenhando um círculo grande, 5 vezes para o lado direito.",
              "Repete 5 vezes para o lado esquerdo.",
              "Solta as pernas no fim."
            ],
            dicas: ["Desenha mesmo o círculo com a anca para soltar a zona."],
            cue: "Vamos soltar o corpo.",
            igual: true
          },
          {
            id: "a2", nome: "Bom dia (flexão de tronco)", t: 128, dose: "10 repetições",
            passos: [
              "Mãos atrás da cabeça, pés afastados.",
              "Inclina o tronco para baixo, mandando o glúteo para trás.",
              "Sobe de novo. Aquece a parte de trás da coxa."
            ],
            dicas: ["Mantém as costas direitas o tempo todo."],
            cue: "Manda o glúteo para trás. Mantém as costas direitas comigo.",
            igual: true
          },
          {
            id: "a3", nome: "Agachamento lateral alternado", t: 167, dose: "10 repetições",
            passos: [
              "Pernas bem afastadas, mãos juntas à frente, costas direitas.",
              "Desce para a esquerda, sobe; desce para a direita, sobe.",
              "Joelho para fora, alternando os lados."
            ],
            dicas: ["Não precisa ir muito abaixo: o objetivo é só aquecer."],
            cue: "Joelho para fora. Mantém as costas direitas.",
            igual: true
          },
          {
            id: "a4", nome: "Cócoras (mobilidade)", t: 209, dose: "alguns segundos",
            passos: [
              "Mãos no chão, pés um pouco juntos, desce até ficar de cócoras.",
              "Junta as mãos e empurra os joelhos com os cotovelos.",
              "Balança suavemente de um lado para o outro.",
              "Mãos no chão, levanta o glúteo e o tronco, junta os pés e solta as pernas."
            ],
            dicas: ["Se preferir, pode apoiar as mãos no chão."],
            cue: "Fazemos força com os cotovelos nos joelhos.",
            igual: true
          },
          {
            id: "a5", nome: "Passo largo para trás", t: 245, dose: "5 por perna",
            passos: [
              "Fica na ponta dos pés, em pé.",
              "Dá um passo largo para trás e levanta as mãos para a frente.",
              "Volta e troca de perna.",
              "Última repetição com a outra perna."
            ],
            dicas: [],
            cue: "Passo largo para trás, para a frente.",
            igual: true
          },
          {
            id: "a6", nome: "Agachamento dinâmico", t: 283, dose: "50 repetições (ritmo rápido)",
            passos: [
              "Prepara em 3, 2, 1 e começa o agachamento em ritmo dinâmico.",
              "Vai trocando o movimento das mãos a cada série de 10.",
              "Respira fundo no fim."
            ],
            dicas: ["A transcrição não detalha o movimento dos braços — confere no vídeo (4:43)."],
            cue: "Troca as mãos.",
            academia: {
              nome: "Aquecimento cardio + agachamento",
              como: ["5 min de bicicleta ou elíptica em ritmo leve.", "Depois 20–30 agachamentos sem carga."],
              dose: "5 min + 20–30 reps"
            }
          }
        ]
      },
      {
        id: "principal",
        nome: "Treino principal",
        resumo: "6:30 – 38:00",
        itens: [
          {
            id: "e1", nome: "Agachamento", t: 435, dose: "50 repetições", descanso: "recupera alguns segundos",
            passos: [
              "Coloca a carga perto de ti, à frente.",
              "As primeiras 10 repetições são sem carga: agachamento normal, para baixo e para cima.",
              "Pega a carga e segura-a: movimento controlado.",
              "Completa 50 repetições em blocos de 10."
            ],
            dicas: ["Podes começar sem carga e só depois usar o peso.", "Movimento controlado, sem pressa."],
            cue: "Agachamento normal. Para baixo, para cima.",
            casa: { material: "1–2 halteres ou garrafas com água/areia" },
            academia: {
              nome: "Agachamento livre com barra (ou no Smith)",
              como: [
                "Barra apoiada nas costas, pés à largura dos ombros.",
                "Desce com controle até onde a técnica permitir e sobe empurrando o chão.",
                "Alternativa: agachamento goblet com um halter pesado."
              ],
              dose: "4 séries de 10–12 (carga mais pesada) — ou 50 reps no total"
            }
          },
          {
            id: "e2", nome: "Passada alternada (afundo)", t: 597, dose: "50 repetições", descanso: "recupera 20–30 s",
            passos: [
              "Em pé, costas direitas.",
              "Vai para trás e para a frente, trocando de perna a cada repetição.",
              "Mantém a postura e conta 50 seguidas, em blocos de 10.",
              "Pode fazer com ou sem carga."
            ],
            dicas: ["Costas direitas, postura firme até ao fim."],
            cue: "Costas direitas e comigo: para trás, para a frente. Troca.",
            casa: { material: "Halteres ou sem peso" },
            academia: {
              nome: "Passada com halteres ou afundo no Smith",
              como: [
                "Halteres nas mãos, passo largo à frente (ou para trás).",
                "Desce o joelho de trás perto do chão e volta.",
                "No Smith: pé da frente à frente da barra."
              ],
              dose: "3 séries de 10–12 por perna"
            }
          },
          {
            id: "e3", nome: "Agachamento sumô", t: 788, dose: "50 repetições", descanso: "recupera 20–30 s",
            passos: [
              "Pernas afastadas, pontas dos pés para fora, segura a carga à frente.",
              "Desce com os joelhos para fora, costas direitas.",
              "Quando ficar intenso demais, solta a carga e continua só com o peso do corpo.",
              "Completa 50 repetições."
            ],
            dicas: ["Joelhos para fora.", "Costas direitas."],
            cue: "Joelhos para fora. Mantém as costas direitas.",
            casa: { material: "Halteres ou garrafas" },
            academia: {
              nome: "Sumô com halter/kettlebell ou leg press pés altos",
              como: [
                "Halter pesado entre as pernas, pés bem afastados e pontas para fora.",
                "Desce com controle e sobe apertando o glúteo.",
                "Alternativa: leg press com os pés altos e afastados."
              ],
              dose: "3–4 séries de 12–15"
            }
          },
          {
            id: "e4", nome: "Elevação pélvica (ponte de glúteo)", t: 1019, dose: "50 repetições", descanso: "recupera e passa ao próximo",
            passos: [
              "Deitada de costas, pés no chão, carga sobre a anca (se tiveres).",
              "20 repetições completas: sobe, contrai o glúteo, desce. Algumas com pausa em cima.",
              "10 meias repetições: só desce até metade e volta a subir.",
              "Repete com repetições completas e lentas, depois mais 10 meias repetições.",
              "Termina em cima com isometria: aguenta contraindo bem o glúteo."
            ],
            dicas: ["Contrai o glúteo em cima.", "Deixa doer — é o sinal de que está a trabalhar."],
            cue: "Contrai o glúteo. Aguenta lá em cima.",
            casa: { material: "Tapete e um peso sobre a anca (opcional)" },
            academia: {
              nome: "Hip thrust na barra, no banco (ou máquina)",
              como: [
                "Costas apoiadas no banco, barra sobre a anca com protetor.",
                "Sobe até o tronco ficar alinhado, contrai o glúteo e desce com controle.",
                "Termina com uma série de meias repetições e 20–30 s de isometria."
              ],
              dose: "4 séries de 10–12 + 1 série de meias repetições"
            }
          },
          {
            id: "e5", nome: "Stiff", t: 1251, dose: "50 repetições", descanso: "pouco: mantém o glúteo ativo",
            passos: [
              "Pés afastados, uma carga em cada mão (ou uma só, segura com as duas).",
              "Manda o glúteo para trás e desce o peso junto às pernas.",
              "Sobe de forma controlada.",
              "Trabalha posterior da coxa, glúteo e lombar."
            ],
            dicas: ["Movimento controlado.", "Sem muito descanso entre blocos."],
            cue: "Manda o glúteo para trás.",
            casa: { material: "2 halteres (ou 1 segurado com as duas mãos)" },
            academia: {
              nome: "Stiff com barra ou halteres",
              como: [
                "Barra à frente das coxas, joelhos levemente dobrados.",
                "Empurra a anca para trás e desce a barra junto às pernas até sentir o posterior alongar.",
                "Sobe contraindo o glúteo."
              ],
              dose: "3–4 séries de 10–12"
            }
          },
          {
            id: "e6", nome: "Agachamento búlgaro", t: 1495, dose: "25 repetições por perna", descanso: "recupera entre pernas",
            passos: [
              "Cadeira atrás de ti (encosta-a à parede para não fugir).",
              "Apoia o pé de trás na cadeira, segura a carga e fica com as costas direitas.",
              "Desce e sobe: 10 + 10 + 5 repetições com a mesma perna.",
              "Respira, recupera e repete com a outra perna."
            ],
            dicas: ["É o mais exigente do treino.", "Costas direitas durante todo o movimento."],
            cue: "Costas direitas comigo, para baixo, para cima.",
            casa: { material: "Cadeira/banco estável + halteres" },
            academia: {
              nome: "Búlgaro no banco com halteres ou Smith",
              como: [
                "Pé de trás apoiado no banco, halteres nas mãos.",
                "Desce o joelho de trás em direção ao chão e sobe pelo calcanhar da frente.",
                "No Smith: dá mais estabilidade."
              ],
              dose: "3 séries de 8–10 por perna"
            }
          },
          {
            id: "e7", nome: "Kicks de glúteo (quatro apoios)", t: 1890, dose: "10 perna dobrada + 15 perna esticada, cada lado", descanso: "—",
            passos: [
              "Coloca as caneleiras e fica de quatro apoios.",
              "Perna dobrada: 10 repetições com a esquerda, 10 com a direita (movimento controlado).",
              "Perna esticada, dedos apontados para fora: 10 + 5 repetições com cada perna.",
              "Relaxa entre as pernas."
            ],
            dicas: ["Perna sempre esticada na segunda parte.", "Movimento controlado."],
            cue: "Perna dobrada, para cima. Movimento controlado.",
            casa: { material: "Caneleiras (ou sem peso)" },
            academia: {
              nome: "Coice na polia baixa ou máquina de glúteo",
              como: [
                "Tornozeleira presa à polia baixa, mãos apoiadas na estrutura.",
                "Estende a perna para trás contraindo o glúteo, sem arquear a lombar.",
                "Volta devagar."
              ],
              dose: "3 séries de 12–15 por perna"
            }
          },
          {
            id: "e8", nome: "Pélvica final (abre-fecha)", t: 2068, dose: "≈ 3 min", descanso: "—",
            passos: [
              "Tira as caneleiras, segura o peso sobre a anca e deita.",
              "Pélvica normal, depois levanta os dedos do chão e faz força só nos calcanhares.",
              "Em cima, abre e fecha os joelhos (abre-fecha) mantendo o glúteo levantado.",
              "Meias repetições curtinhas, depois repetições completas e lentas.",
              "Volta ao abre-fecha e termina devagar."
            ],
            dicas: ["Levanta mais a anca em cima.", "Última repetição bem devagar."],
            cue: "Abre, fecha. Levanta mais.",
            casa: { material: "Tapete + peso sobre a anca" },
            academia: {
              nome: "Cadeira abdutora + ponte",
              como: [
                "Máquina abdutora sentada: abre as pernas contra a resistência e volta devagar.",
                "Depois ponte de glúteo no tapete com mini-band (se houver)."
              ],
              dose: "3 séries de 15–20"
            }
          },
          {
            id: "e9", nome: "Prancha", t: 2338, dose: "2 min 30 s", timer: 150, descanso: "—",
            passos: [
              "Fica em prancha, corpo reto, abdominal contraído.",
              "Respira profundamente e aguenta até ao fim.",
              "Quando não conseguires mais, apoia os joelhos no chão, recupera um pouco e volta a subir.",
              "No fim do tempo, relaxa."
            ],
            dicas: ["Podes colocar os joelhos no chão sem desistir.", "Ajuda a vencer a mente: aguenta mais um pouco."],
            cue: "Mantém o corpo reto e fica.",
            igual: true
          }
        ]
      },
      {
        id: "cardio",
        nome: "Cárdio",
        resumo: "42:30 – 49:00",
        itens: [
          {
            id: "c1", nome: "Polichinelos", t: 2553, dose: "4 minutos por tempo", timer: 240,
            passos: [
              "Ajusta a ampulheta/temporizador para 4 minutos.",
              "Faz polichinelos o tempo todo, sem contar repetições.",
              "Podes abrandar o ritmo, mas não pares.",
              "Respira e entrega o teu melhor até ao fim."
            ],
            dicas: ["Se doerem as panturrilhas, abranda mas continua em movimento."],
            cue: "Podes abrandar, mas não para.",
            casa: { material: "Só tu — ou uma corda" },
            academia: {
              nome: "4 min de cárdio na máquina",
              como: [
                "Escolhe passadeira, elíptica, remo ou bicicleta.",
                "Ritmo forte e constante, ou 30 s rápido / 30 s leve."
              ],
              dose: "4 min"
            }
          }
        ]
      },
      {
        id: "alongamento",
        nome: "Alongamentos",
        resumo: "49:56 – 55:40 · máx. 5 min",
        itens: [
          {
            id: "s1", nome: "Posterior da coxa (sentada)", t: 2996, dose: "≈ 30 s",
            passos: [
              "Sentada, pernas esticadas, mãos nas pernas, costas direitas.",
              "Inspira e levanta as mãos ao teto.",
              "Expira e toca nos pés mantendo as pernas esticadas."
            ],
            dicas: ["Respira profundamente."],
            cue: "Alongamos o posterior da coxa.",
            igual: true
          },
          {
            id: "s2", nome: "Panturrilhas", t: 3039, dose: "≈ 20 s",
            passos: [
              "Pernas e joelhos esticados.",
              "Puxa os dedos dos pés na tua direção.",
              "Sente o alongamento da panturrilha."
            ],
            dicas: [],
            cue: "Puxa o pé para ti.",
            igual: true
          },
          {
            id: "s3", nome: "Joelhos laterais (rotação)", t: 3073, dose: "2 vezes cada lado",
            passos: [
              "Pernas dobradas, pés afastados, mãos atrás das costas, costas direitas.",
              "Inclina as pernas para a esquerda e tenta tocar o chão com os joelhos.",
              "Volta ao centro e repete para a direita.",
              "Faz uma segunda vez: o corpo já estará mais destravado."
            ],
            dicas: ["Peito para a frente, ombros para trás, não ficar curvada."],
            cue: "Mantém as costas direitas. Respira profundamente.",
            igual: true
          },
          {
            id: "s4", nome: "Quadríceps (sentada nos calcanhares)", t: 3176, dose: "≈ 30 s",
            passos: [
              "Senta com o glúteo nos pés, joelhos juntos e perto do chão (quase a tocar).",
              "Mãos apoiadas atrás.",
              "Inclina o tronco para trás, cabeça para cima.",
              "Respira profundamente e relaxa devagarinho."
            ],
            dicas: ["Alonga a parte da frente da perna."],
            cue: "Alongamos o quadríceps.",
            igual: true
          },
          {
            id: "s5", nome: "Coluna e lombar (posição de criança)", t: 3237, dose: "≈ 1 min",
            passos: [
              "Fica de quatro apoios e destrava a coluna, mexendo para os dois lados.",
              "Senta com o glúteo nos teus pés.",
              "Caminha com as mãos à frente e aproxima a cabeça (ou a testa) do chão, braços esticados.",
              "Depois inclina para a frente aproximando a bacia do chão, cabeça para cima: alonga o abdominal.",
              "Volta para trás e caminha com as mãos até às pernas; levanta o tronco."
            ],
            dicas: ["Alivia a tensão da lombar, sobretudo depois do stiff."],
            cue: "Aliviamos a tensão do lombar.",
            igual: true
          }
        ]
      }
    ]
  },
  {
    id: "gf-t2",
    titulo: "Treino 2 — Superiores, Abdominais e Cárdio",
    projeto: "Guerreira Fit 5",
    foco: "Superiores, abdominais e cárdio",
    duracao: "≈ 35 min",
    video: "",
    resumoApenas: true,
    material: {
      casa: "Halteres, tapete (confirma no vídeo).",
      academia: "Halteres, barra, polias, máquinas de peito/ombro, barra de elevação de pernas, tapete."
    },
    secoes: [
      {
        id: "aq2", nome: "Aquecimento", resumo: "0:47 – 5:20",
        itens: [
          {
            id: "b1", nome: "Aquecimento de superiores", t: 47, dose: "≈ 4 min 33 s no vídeo", resumo: true,
            passos: ["Rotação de braços, abertura de peito, torção de tronco e simulação de corda."],
            dicas: [], igual: true
          }
        ]
      },
      {
        id: "sup", nome: "Superiores", resumo: "6:16 – 18:56",
        itens: [
          {
            id: "b2", nome: "Costas — remada curvada", t: 376, dose: "≈ 1 min 56 s no vídeo", resumo: true,
            passos: ["Remada curvada com halteres."], dicas: [],
            casa: { material: "Halteres" },
            academia: { nome: "Remada curvada com barra ou polia", como: ["Tronco inclinado, costas retas.", "Puxa a barra (ou o cabo) até ao abdómen, aperta as costas e desce devagar."], dose: "3–4 séries de 10–12" }
          },
          {
            id: "b3", nome: "Bíceps — rosca martelo e rosca direta", t: 554, dose: "≈ 2 min 45 s no vídeo", resumo: true,
            passos: ["Rosca martelo com halteres.", "Rosca direta com halteres."], dicas: [],
            casa: { material: "Halteres" },
            academia: { nome: "Rosca na polia, barra W ou halteres", como: ["Cotovelos junto ao corpo.", "Sobe com controle e desce devagar, sem balançar o tronco."], dose: "3 séries de 10–12" }
          },
          {
            id: "b4", nome: "Ombros — elevações laterais e frontais", t: 781, dose: "≈ 2 min 27 s no vídeo", resumo: true,
            passos: ["Elevações laterais.", "Elevações frontais."], dicas: [],
            casa: { material: "Halteres leves" },
            academia: { nome: "Elevação lateral na polia ou máquina de ombros", como: ["Eleva até à altura dos ombros e desce devagar.", "Opcional: elevação frontal com anilha ou polia."], dose: "3 séries de 12–15" }
          },
          {
            id: "b5", nome: "Peitoral e core — flexões com transição para prancha", t: 988, dose: "≈ 2 min 28 s no vídeo", resumo: true,
            passos: ["Flexões de braços com transição para a posição de prancha."], dicas: ["Podes apoiar os joelhos no chão."],
            casa: { material: "Tapete" },
            academia: { nome: "Supino com halteres ou máquina + prancha", como: ["Supino: desce até ao peito e empurra.", "Termina com 30–45 s de prancha."], dose: "3 séries de 10–12" }
          }
        ]
      },
      {
        id: "abs2", nome: "Abdominais e prancha", resumo: "19:51 – 27:55",
        itens: [
          {
            id: "b6", nome: "Abdominal com carga (tronco inclinado para trás)", t: 1191, dose: "≈ 1 min 49 s no vídeo", resumo: true,
            passos: ["Exercício com carga, com o tronco inclinado para trás."], dicas: [],
            casa: { material: "Um peso" },
            academia: { nome: "Crunch na máquina ou na polia", como: ["Contrai o abdómen ao descer e volta devagar."], dose: "3 séries de 12–15" }
          },
          {
            id: "b7", nome: "Abdominal infra (pés elevados)", t: 1353, dose: "≈ 1 min 43 s no vídeo", resumo: true,
            passos: ["Abdominal infra com os pés elevados."], dicas: [],
            casa: { material: "Tapete" },
            academia: { nome: "Elevação de pernas na barra ou paralelas", como: ["Sobe as pernas controlando, sem balançar."], dose: "3 séries de 10–15" }
          },
          {
            id: "b8", nome: "Prancha isométrica", t: 1528, dose: "≈ 2 min 27 s (duração do trecho)", timer: 147, resumo: true,
            passos: ["Sustentação do corpo em prancha."], dicas: ["Se cansares, apoia os joelhos e volta a subir."],
            igual: true
          }
        ]
      },
      {
        id: "cardio2", nome: "Cárdio final", resumo: "30:31 – 35:09",
        itens: [
          {
            id: "b9", nome: "Burpees e polichinelos", t: 1831, dose: "≈ 4 min 38 s no vídeo", timer: 278, resumo: true,
            passos: ["Combinação de burpees e polichinelos."], dicas: [],
            casa: { material: "Só tu" },
            academia: { nome: "4–5 min de cárdio na máquina", como: ["Remo, bicicleta ou passadeira em ritmo forte.", "Ou mantém os burpees e polichinelos no tapete."], dose: "4–5 min" }
          }
        ]
      }
    ]
  }
];
