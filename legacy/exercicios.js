/*
  BIBLIOTECA DE EXERCÍCIOS (técnica geral de academia)
  ----------------------------------------------------
  Texto escrito como guia geral de técnica — NÃO vem dos vídeos.
  carga:true  => o app mostra um campo para registar a carga (kg).
  LIGACAO liga o id de cada exercício dos treinos aos exercícios desta biblioteca.
*/
window.EXERCICIOS = [
  /* ---------- PERNAS ---------- */
  { id:"agachamento-livre", nome:"Agachamento livre com barra", grupo:"Pernas", musculos:"Quadríceps, glúteos, posteriores, core", equip:"Barra + rack (ou Smith)", carga:true, series:"3–4 × 8–12",
    passos:["Ajusta a barra à altura do peito/ombros e apoia-a no trapézio, não no pescoço.","Pés à largura dos ombros, pontas ligeiramente para fora. Tira a barra do rack e dá 1–2 passos atrás.","Inspira, aperta o abdómen e começa a descer empurrando a anca para trás e os joelhos para fora.","Desce até as coxas ficarem paralelas ao chão (ou até onde mantiveres as costas neutras).","Sobe empurrando o chão com o pé todo, expirando no fim. Mantém o peito aberto."],
    erros:["Joelhos a cair para dentro.","Calcanhares a levantar do chão.","Arredondar a lombar no fundo do movimento."],
    dica:"Se és iniciante, treina primeiro só com o peso do corpo ou com um halter à frente (goblet)." },
  { id:"leg-press", nome:"Leg press 45°", grupo:"Pernas", musculos:"Quadríceps, glúteos", equip:"Máquina leg press", carga:true, series:"3–4 × 10–15",
    passos:["Senta com as costas e a lombar bem encostadas ao banco.","Pés na plataforma à largura dos ombros. Mais altos e afastados = mais glúteo; mais baixos = mais quadríceps.","Destranca a máquina e desce devagar até os joelhos formarem cerca de 90°.","Empurra a plataforma sem esticar totalmente os joelhos no topo."],
    erros:["Deixar a anca levantar do banco no fundo.","Bloquear os joelhos em cima.","Carga excessiva com amplitude curta."],
    dica:"A lombar deve ficar sempre apoiada. Se descolar, reduz a amplitude." },
  { id:"passada", nome:"Passada / afundo com halteres", grupo:"Pernas", musculos:"Quadríceps, glúteos", equip:"Halteres (ou barra Smith)", carga:true, series:"3 × 10–12 por perna",
    passos:["Halteres ao lado do corpo, postura direita, olhar em frente.","Dá um passo largo à frente (ou atrás, se for afundo).","Desce o joelho de trás até perto do chão, com o tronco direito.","Empurra pelo calcanhar da perna da frente para voltar ao início.","Alterna as pernas ou completa todas as repetições de um lado."],
    erros:["Passo curto demais (joelho passa muito à frente dos pés).","Tronco a inclinar para a frente.","Joelho da frente a cair para dentro."],
    dica:"Passo mais largo trabalha mais o glúteo; passo mais curto, mais o quadríceps." },
  { id:"sumo", nome:"Agachamento sumô", grupo:"Pernas", musculos:"Glúteos, adutores, quadríceps", equip:"Halter / kettlebell", carga:true, series:"3–4 × 12–15",
    passos:["Pés bem afastados, pontas dos pés viradas para fora.","Segura um halter pesado com as duas mãos entre as pernas.","Desce com o tronco direito, empurrando os joelhos na direção dos pés.","Sobe apertando o glúteo e os adutores."],
    erros:["Joelhos para dentro.","Inclinar o tronco muito para a frente.","Pés demasiado virados para fora para a tua mobilidade."],
    dica:"Imagina que estás a afastar o chão com os pés." },
  { id:"stiff", nome:"Stiff (levantamento romeno)", grupo:"Glúteos", musculos:"Posteriores da coxa, glúteos, lombar", equip:"Barra ou halteres", carga:true, series:"3–4 × 8–12",
    passos:["Em pé, pés à largura da anca, barra à frente das coxas.","Joelhos ligeiramente dobrados e fixos; costas neutras.","Empurra a anca para trás e desce a barra rente às pernas, até sentires o posterior da coxa alongar.","Sobe contraindo o glúteo e levando a anca para a frente."],
    erros:["Arredondar as costas.","Agachar em vez de dobrar a anca.","Afastar a barra do corpo."],
    dica:"Desce só até onde as costas se mantêm retas — normalmente a meio da canela." },
  { id:"bulgaro", nome:"Agachamento búlgaro", grupo:"Pernas", musculos:"Quadríceps, glúteos", equip:"Banco + halteres", carga:true, series:"3 × 8–10 por perna",
    passos:["Fica de costas para o banco, a cerca de um passo e meio.","Apoia o peito do pé de trás no banco.","Com halteres nas mãos, desce o joelho de trás em direção ao chão.","Sobe empurrando pelo calcanhar da perna da frente."],
    erros:["Pé da frente demasiado perto do banco.","Joelho da frente a cair para dentro.","Perder o equilíbrio por tronco inclinado."],
    dica:"Tronco ligeiramente inclinado à frente = mais glúteo; mais vertical = mais quadríceps." },
  { id:"extensora", nome:"Cadeira extensora", grupo:"Pernas", musculos:"Quadríceps", equip:"Máquina", carga:true, series:"3 × 12–15",
    passos:["Ajusta o encosto para os joelhos ficarem alinhados com o eixo da máquina.","Almofada sobre o peito do pé, perto do tornozelo.","Estende as pernas até quase esticar e aperta o quadríceps um segundo.","Desce devagar, sem deixar o peso cair."],
    erros:["Balançar o corpo para ajudar.","Descer rápido, sem controlo."], dica:"Movimento lento e controlado protege os joelhos." },
  { id:"flexora", nome:"Cadeira flexora", grupo:"Pernas", musculos:"Posteriores da coxa", equip:"Máquina", carga:true, series:"3 × 12–15",
    passos:["Ajusta a máquina: eixo alinhado com o joelho.","Almofada logo acima do calcanhar.","Dobra os joelhos puxando os calcanhares em direção ao glúteo.","Volta devagar até quase esticar."],
    erros:["Levantar a anca do banco.","Usar impulso."], dica:"Aperta o posterior da coxa no fim de cada repetição." },
  { id:"panturrilha", nome:"Elevação de gémeos em pé", grupo:"Pernas", musculos:"Gémeos / panturrilhas", equip:"Degrau ou máquina", carga:true, series:"4 × 15–20",
    passos:["Apoia a parte da frente dos pés num degrau, calcanhares livres.","Sobe o mais alto que conseguires, em pontas dos pés.","Pausa 1 segundo em cima.","Desce devagar abaixo do nível do degrau, alongando."],
    erros:["Amplitude curta.","Ressaltar sem controlo."], dica:"Fica um segundo em cima e um segundo em baixo, sem pressa." },

  /* ---------- GLÚTEOS ---------- */
  { id:"hip-thrust", nome:"Hip thrust (elevação pélvica na barra)", grupo:"Glúteos", musculos:"Glúteos, posteriores", equip:"Barra + banco (ou máquina)", carga:true, series:"4 × 10–12",
    passos:["Senta no chão com as costas (omoplatas) apoiadas na borda do banco.","Barra sobre a anca, com protetor. Pés no chão, à largura da anca.","Sobe a anca até o tronco ficar paralelo ao chão, com as canelas na vertical.","Contrai bem o glúteo em cima durante 1–2 segundos, queixo ligeiramente para o peito.","Desce com controlo, sem pousar o peso."],
    erros:["Hiperextender a lombar em cima.","Pés demasiado perto ou longe (joelhos não ficam a 90°).","Empurrar com a lombar em vez do glúteo."],
    dica:"Termina a série com meias repetições e isometria de 20–30 s, como no vídeo." },
  { id:"ponte-gluteo", nome:"Ponte de glúteo (pélvica no chão)", grupo:"Glúteos", musculos:"Glúteos, posteriores", equip:"Tapete (peso opcional)", carga:false, series:"3 × 15–20",
    passos:["Deitada de costas, joelhos dobrados e pés no chão.","Sobe a anca contraindo o glúteo.","Pausa em cima e desce devagar."], erros:["Arquear a lombar.","Empurrar com os dedos dos pés."], dica:"Levanta os dedos dos pés para focar nos calcanhares." },
  { id:"coice-polia", nome:"Coice de glúteo na polia", grupo:"Glúteos", musculos:"Glúteos", equip:"Polia baixa + tornozeleira", carga:true, series:"3 × 12–15 por perna",
    passos:["Prende a tornozeleira ao tornozelo e liga-a à polia baixa.","Apoia as mãos na estrutura, tronco ligeiramente inclinado.","Estende a perna para trás contraindo o glúteo.","Volta devagar, sem pousar o peso."],
    erros:["Arquear a lombar.","Rodar a anca para o lado."], dica:"Pára a subida quando a anca começar a rodar." },
  { id:"abdutora", nome:"Cadeira abdutora", grupo:"Glúteos", musculos:"Glúteo médio e mínimo", equip:"Máquina", carga:true, series:"3 × 15–20",
    passos:["Senta com as costas bem apoiadas.","Almofadas no lado externo dos joelhos.","Abre as pernas contra a resistência e aperta o glúteo.","Volta devagar até quase fechar."],
    erros:["Usar impulso.","Descolar as costas do encosto."], dica:"Inclina ligeiramente o tronco para a frente para sentir mais o glúteo." },

  /* ---------- COSTAS ---------- */
  { id:"remada-curvada", nome:"Remada curvada", grupo:"Costas", musculos:"Dorsais, romboides, bíceps", equip:"Barra ou halteres", carga:true, series:"3–4 × 8–12",
    passos:["Pés à largura dos ombros, joelhos ligeiramente dobrados.","Inclina o tronco à frente (cerca de 45°) com as costas retas.","Puxa a barra/halteres em direção ao abdómen, cotovelos junto ao corpo.","Aperta as omoplatas no fim e desce devagar."],
    erros:["Arredondar as costas.","Usar balanço do tronco.","Puxar com os braços em vez das costas."],
    dica:"Imagina que levas os cotovelos para o bolso de trás." },
  { id:"puxada-frente", nome:"Puxada na frente (pulley)", grupo:"Costas", musculos:"Dorsais, bíceps", equip:"Polia alta", carga:true, series:"3–4 × 10–12",
    passos:["Ajusta o apoio das coxas e agarra a barra um pouco mais larga que os ombros.","Peito aberto, ligeiramente inclinado para trás.","Puxa a barra até à parte alta do peito, levando os cotovelos para baixo e para trás.","Volta devagar até esticar os braços."],
    erros:["Puxar a barra atrás da nuca.","Balançar o corpo."], dica:"Pensa em puxar com os cotovelos, não com as mãos." },
  { id:"remada-sentada", nome:"Remada sentada na polia", grupo:"Costas", musculos:"Dorsais, romboides, bíceps", equip:"Polia baixa", carga:true, series:"3 × 10–12",
    passos:["Senta com os pés apoiados e joelhos ligeiramente dobrados.","Costas direitas, peito aberto.","Puxa o triângulo até ao abdómen, aproximando as omoplatas.","Volta devagar sem arredondar as costas."], erros:["Inclinar o tronco muito para trás.","Encolher os ombros."], dica:"Pausa 1 segundo com as omoplatas juntas." },

  /* ---------- PEITO ---------- */
  { id:"supino-halteres", nome:"Supino com halteres", grupo:"Peito", musculos:"Peitoral, tríceps, ombro anterior", equip:"Banco + halteres", carga:true, series:"3–4 × 8–12",
    passos:["Deita no banco com os pés no chão e as omoplatas juntas e para baixo.","Halteres ao lado do peito, cotovelos a cerca de 45–60° do corpo.","Empurra para cima até os braços quase esticarem.","Desce devagar até sentires alongar o peito."], erros:["Cotovelos muito abertos (a 90°).","Arquear demasiado a lombar."], dica:"Mantém as omoplatas fixas durante toda a série." },
  { id:"flexao", nome:"Flexão de braços", grupo:"Peito", musculos:"Peitoral, tríceps, core", equip:"Tapete (peso do corpo)", carga:false, series:"3 × 8–15",
    passos:["Mãos no chão, ligeiramente mais largas que os ombros.","Corpo reto da cabeça aos calcanhares, abdómen contraído.","Desce o peito em direção ao chão, cotovelos a cerca de 45°.","Empurra o chão para voltar."], erros:["Anca a cair.","Cabeça à frente do corpo."], dica:"Se for difícil, apoia os joelhos no chão ou usa um banco." },

  /* ---------- OMBROS ---------- */
  { id:"elevacao-lateral", nome:"Elevação lateral", grupo:"Ombros", musculos:"Deltoide lateral", equip:"Halteres ou polia", carga:true, series:"3 × 12–15",
    passos:["Em pé, um haltere em cada mão ao lado do corpo.","Cotovelos ligeiramente dobrados.","Sobe os braços para os lados até à altura dos ombros.","Desce devagar."], erros:["Balançar o tronco.","Subir acima dos ombros com os ombros encolhidos."], dica:"Usa carga leve e foca-te em levar os cotovelos para cima." },
  { id:"elevacao-frontal", nome:"Elevação frontal", grupo:"Ombros", musculos:"Deltoide anterior", equip:"Halteres, anilha ou polia", carga:true, series:"3 × 12",
    passos:["Em pé, halteres à frente das coxas.","Sobe os braços à frente até à altura dos ombros.","Pausa e desce devagar."], erros:["Usar impulso das costas."], dica:"Alterna os braços para mais controlo." },
  { id:"desenvolvimento", nome:"Desenvolvimento de ombros", grupo:"Ombros", musculos:"Deltoides, tríceps", equip:"Halteres ou máquina", carga:true, series:"3–4 × 8–12",
    passos:["Sentada com as costas apoiadas, halteres à altura dos ombros.","Empurra para cima até quase esticar os braços.","Desce devagar até à altura das orelhas."], erros:["Arquear a lombar.","Descer pouco."], dica:"Aperta o abdómen para proteger a lombar." },

  /* ---------- BRAÇOS ---------- */
  { id:"rosca-direta", nome:"Rosca direta", grupo:"Braços", musculos:"Bíceps", equip:"Halteres, barra ou polia", carga:true, series:"3 × 10–12",
    passos:["Em pé, palmas das mãos viradas para a frente.","Cotovelos colados ao corpo.","Sobe o peso em direção aos ombros contraindo o bíceps.","Desce devagar até esticar os braços."], erros:["Balançar o tronco.","Afastar os cotovelos do corpo."], dica:"Controla a descida: é metade do trabalho." },
  { id:"rosca-martelo", nome:"Rosca martelo", grupo:"Braços", musculos:"Bíceps, braquial, antebraço", equip:"Halteres", carga:true, series:"3 × 10–12",
    passos:["Em pé, halteres com as palmas viradas uma para a outra.","Cotovelos junto ao corpo.","Sobe os halteres mantendo essa pegada.","Desce devagar."], erros:["Balançar o corpo.","Girar o punho."], dica:"Podes alternar braço a braço." },
  { id:"triceps-corda", nome:"Tríceps na polia (corda)", grupo:"Braços", musculos:"Tríceps", equip:"Polia alta + corda", carga:true, series:"3 × 12–15",
    passos:["Em pé, frente à polia, cotovelos colados ao corpo.","Empurra a corda para baixo até esticar os braços, abrindo as pontas.","Volta devagar até os antebraços ficarem a 90°."], erros:["Cotovelos a afastar do corpo.","Inclinar o tronco para ajudar."], dica:"Só os antebraços se movem." },

  /* ---------- CORE ---------- */
  { id:"prancha", nome:"Prancha", grupo:"Core", musculos:"Abdómen, ombros, glúteos", equip:"Tapete", carga:false, series:"3 × 30–60 s (ou 2 min 30 s seguido)",
    passos:["Apoia os antebraços no chão, cotovelos debaixo dos ombros.","Pernas esticadas, apoio nas pontas dos pés.","Corpo reto da cabeça aos calcanhares; abdómen e glúteo contraídos.","Respira com calma e mantém o tempo."], erros:["Anca a cair ou subir demais.","Prender a respiração."], dica:"Se não aguentas mais, apoia os joelhos, recupera e volta." },
  { id:"crunch-polia", nome:"Abdominal na polia / máquina", grupo:"Core", musculos:"Reto abdominal", equip:"Polia alta ou máquina", carga:true, series:"3 × 12–15",
    passos:["De joelhos, frente à polia, corda junto à cabeça.","Encolhe o abdómen levando os cotovelos aos joelhos.","Sobe devagar, mantendo a tensão."], erros:["Puxar com os braços.","Dobrar só a anca."], dica:"Arredonda a coluna, não é um movimento de anca." },
  { id:"elevacao-pernas", nome:"Elevação de pernas (abdominal infra)", grupo:"Core", musculos:"Abdómen inferior", equip:"Barra, paralelas ou tapete", carga:false, series:"3 × 10–15",
    passos:["Pendurada na barra (ou deitada com a lombar no chão).","Sobe as pernas esticadas ou dobradas até à altura da anca.","Desce devagar, sem balançar."], erros:["Balançar o corpo.","Arquear a lombar no tapete."], dica:"No tapete, mantém a lombar sempre colada ao chão." },

  /* ---------- CÁRDIO ---------- */
  { id:"polichinelo", nome:"Polichinelo", grupo:"Cárdio", musculos:"Corpo todo", equip:"Sem equipamento", carga:false, series:"4 minutos por tempo",
    passos:["Em pé, pés juntos e braços ao lado.","Salta abrindo as pernas e levantando os braços acima da cabeça.","Salta de volta à posição inicial.","Mantém um ritmo constante e respira."], erros:["Aterrar com as pernas esticadas."], dica:"Aterra suave, com os joelhos ligeiramente dobrados." },
  { id:"burpee", nome:"Burpee", grupo:"Cárdio", musculos:"Corpo todo", equip:"Tapete", carga:false, series:"30–45 s de trabalho",
    passos:["Em pé, agacha e apoia as mãos no chão.","Salta ou leva os pés para trás, ficando em posição de prancha.","(Opcional) faz uma flexão.","Traz os pés de volta às mãos e salta, levantando os braços."], erros:["Lombar a cair na prancha.","Aterrar com os joelhos rígidos."], dica:"Faz uma versão sem salto e sem flexão se estiveres a começar." }
];

/* id do exercício nos treinos -> exercícios da biblioteca */
window.LIGACAO = {
  e1:["agachamento-livre","leg-press"], e2:["passada"], e3:["sumo"], e4:["hip-thrust","ponte-gluteo"],
  e5:["stiff"], e6:["bulgaro"], e7:["coice-polia"], e8:["abdutora"], e9:["prancha"], c1:["polichinelo"],
  b2:["remada-curvada","puxada-frente","remada-sentada"], b3:["rosca-martelo","rosca-direta"],
  b4:["elevacao-lateral","elevacao-frontal","desenvolvimento"], b5:["flexao","supino-halteres"],
  b6:["crunch-polia"], b7:["elevacao-pernas"], b8:["prancha"], b9:["burpee","polichinelo"]
};

/* exercício da biblioteca -> pasta com as 2 fotos (posição inicial e final), em images/
   Fotos: free-exercise-db (domínio público). anim = desenho animado próprio (sem foto disponível).
   nota = aviso quando a foto é de um exercício parecido, não idêntico. */
window.IMAGENS = {
  "agachamento-livre":{p:"Barbell_Full_Squat"},
  "leg-press":{p:"Leg_Press"},
  "passada":{p:"Dumbbell_Lunges"},
  "sumo":{p:"Plie_Dumbbell_Squat"},
  "bulgaro":{p:"Split_Squat_with_Dumbbells"},
  "extensora":{p:"Leg_Extensions"},
  "flexora":{p:"Seated_Leg_Curl"},
  "panturrilha":{p:"Standing_Calf_Raises"},
  "stiff":{p:"Romanian_Deadlift"},
  "hip-thrust":{p:"Barbell_Hip_Thrust"},
  "ponte-gluteo":{p:"Butt_Lift_Bridge"},
  "coice-polia":{p:"One-Legged_Cable_Kickback"},
  "abdutora":{p:"Thigh_Abductor"},
  "remada-curvada":{p:"Bent_Over_Two-Dumbbell_Row"},
  "puxada-frente":{p:"Wide-Grip_Lat_Pulldown"},
  "remada-sentada":{p:"Seated_Cable_Rows"},
  "supino-halteres":{p:"Dumbbell_Bench_Press"},
  "flexao":{p:"Pushups"},
  "elevacao-lateral":{p:"Side_Lateral_Raise"},
  "elevacao-frontal":{p:"Front_Dumbbell_Raise"},
  "desenvolvimento":{p:"Dumbbell_Shoulder_Press"},
  "rosca-direta":{p:"Dumbbell_Alternate_Bicep_Curl"},
  "rosca-martelo":{p:"Hammer_Curls"},
  "triceps-corda":{p:"Triceps_Pushdown_-_Rope_Attachment"},
  "prancha":{p:"Plank"},
  "crunch-polia":{p:"Cable_Crunch"},
  "elevacao-pernas":{p:"Hanging_Leg_Raise",nota:"Foto da elevação de pernas na barra. No tapete, fazes o mesmo movimento deitada."},
  "polichinelo":{anim:"jack"},
  "burpee":{anim:"burpee"}
};
