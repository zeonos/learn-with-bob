/* Danske tekster til Tankespind. Rettes her, ikke i koden. (Ordlister og ordanalogier står i puzzles.js.) */
window.STR = window.STR || {};
window.STR.tk = {
  title: 'Tankespind',
  tagline: 'Bob har et tårn fuld af tænkeopgaver. Find mønstret, og løs gåden.',
  chooseRoute: 'Vælg en etage i tårnet',
  noIq: 'Opgaverne ligner dem fra en IQ-test, men spillet giver aldrig et IQ-tal. Det handler om at træne tankegangen og have det sjovt.',
  next: 'Næste',
  level: 'Niveau {n} af {max}',
  step: 'Opgave {n} af {total}',
  readAloud: 'Læs højt',

  routes: {
    'm-naeste': ['Hvad kommer nu?', 'Find mønstret i figurrækken'],
    'm-tal': ['Talrækker', 'Hvilket tal kommer nu?'],
    'm-skaeve': ['Den skæve', 'Find den, der ikke passer'],
    'm-analogi': ['Analogier', 'Det ene er til det andet som …'],
    'm-drej': ['Drej og spejl', 'Den samme figur, bare drejet'],
    'm-kode': ['Hemmelige koder', 'Hver figur er et tal'],
    'u-tal': ['Talrækker', 'Spring, gange og flettede rækker'],
    'u-analogi': ['Analogier', 'Figurer og ord, der hører sammen'],
    'u-felt': ['Det manglende felt', 'Find reglerne i rækkerne'],
    'u-drej': ['Drej og spejl', 'Drejninger og spejlbilleder'],
    'u-fold': ['Fold og klip', 'Hvor kommer hullerne?'],
    'u-kode': ['Hemmelige koder', 'Flere figurer, flere regnestykker']
  },

  prompts: {
    figrow: 'Hvilken figur kommer nu?',
    numrow: 'Hvilket tal kommer nu?',
    odd: 'Hvilken passer ikke med de andre?',
    analogyFig: 'Den første figur bliver til den anden. Hvad bliver den tredje til?',
    analogyWord: 'Hvilket ord passer?',
    matrix: 'Hvilken figur mangler i det tomme felt?',
    turn: 'Hvilken figur er den samme, bare drejet?',
    mirror: 'Hvilken figur er spejlbilledet i den stiplede linje?',
    fold: 'Papiret foldes, og der bliver klippet hul. Hvordan ser det ud, når det foldes ud igen?',
    code: 'Hver figur står for et tal. Hvilket tal er {name}?'
  },
  analogyLine: '{a} : {b}  er som  {c} : ?',
  foldSteps: ['Fold', 'Klip hul'],
  optionLabel: 'Svar {l}',

  shapes: { cirkel: 'cirkel', kvadrat: 'kvadrat', trekant: 'trekant', stjerne: 'stjerne', pil: 'pil', sekskant: 'sekskant', kryds: 'kryds' },
  shapesPl: { cirkel: 'cirkler', kvadrat: 'kvadrater', trekant: 'trekanter', stjerne: 'stjerner', pil: 'pile', sekskant: 'sekskanter', kryds: 'krydser' },
  paints: { blaa: 'blå', roed: 'rød med striber', gul: 'gul med prikker', groen: 'grøn med tern', hvid: 'hvid' },
  sizes: ['lille', 'mellem', 'stor'],
  symDef: { trekant: 'trekanten', cirkel: 'cirklen', stjerne: 'stjernen', kvadrat: 'kvadratet' },
  symWord: { trekant: 'trekant', cirkel: 'cirkel', stjerne: 'stjerne', kvadrat: 'kvadrat' },

  rules: {
    nUp: 'Der kommer én figur mere hver gang.',
    nDown: 'Der forsvinder én figur hver gang.',
    rQuarter: 'Figuren drejer en kvart omgang med uret hver gang.',
    rEighth: 'Figuren drejer en ottendedel omgang med uret hver gang.',
    pCycle: 'Farven skifter i samme rækkefølge hele tiden: {list}',
    sCycle: 'Formen skifter i samme rækkefølge hele tiden: {list}',
    zCycle: 'Størrelsen skifter i samme rækkefølge hele tiden: {list}'
  },
  hints: {
    n: 'Tæl figurerne i hvert felt.',
    p: 'Se på farverne og mønstrene.',
    s: 'Se på formerne.',
    r: 'Se, hvilken vej figuren peger.',
    z: 'Se på, hvor store figurerne er.',
    num: 'Se på, hvor meget tallet ændrer sig fra det ene tal til det næste.',
    odd_s: 'Se på formerne.',
    odd_p: 'Se på farverne og mønstrene.',
    odd_n: 'Tæl figurerne i hvert felt.',
    odd_num: 'Tænk på lige og ulige tal og på tabellerne.',
    odd_word: 'Hvad har de fleste af ordene til fælles?',
    analogy: 'Se, hvad der ændrer sig fra den første til den anden figur.',
    analogyWord: 'Hvordan hænger de to første ord sammen?',
    matrix: 'Se på én ting ad gangen i hver række: formen, farven og antallet.',
    turn: 'Forestil dig, at du drejer figuren. En spejlvendt figur kan man ikke dreje på plads.',
    mirror: 'Hver firkant skal være lige langt fra den stiplede linje, bare på den anden side.',
    fold: 'Hullet går gennem alle lag papir. Hvor havner hullerne, når papiret foldes ud?',
    code: 'Start med det regnestykke, hvor der kun er én slags figur.'
  },
  num: {
    add: 'Tallene vokser med {d} hver gang: {a} + {d} = {ans}.',
    sub: 'Tallene bliver {d} mindre hver gang: {a} − {d} = {ans}.',
    mul: 'Tallene bliver ganget med {m} hver gang: {a} · {m} = {ans}.',
    alt: 'Der lægges skiftevis {d} og {e} til: {a} + {s} = {ans}.',
    inc: 'Springene bliver større og større: {diffs}. Næste spring er {s}: {a} + {s} = {ans}.',
    sq: 'Det er kvadrattallene: 1 · 1, 2 · 2, 3 · 3 og så videre. Det næste er {n} · {n} = {ans}.',
    tri: 'Springene vokser med én hver gang: {a} + {s} = {ans}.',
    inter: 'To rækker er flettet ind i hinanden, så hvert andet tal hører sammen: {b} + {s} = {ans}.',
    fib: 'Hvert tal er de to forrige tal lagt sammen: {a} + {b} = {ans}.',
    mul2add: 'Hvert tal ganges med 2, og så lægges {d} til: {a} · 2 + {d} = {ans}.',
    mul2sub: 'Hvert tal ganges med 2, og så trækkes {d} fra: {a} · 2 − {d} = {ans}.'
  },
  oddFig: {
    s: 'Fire af felterne har formen »{common}«, men ét har formen »{odd}«.',
    p: 'Fire af felterne har farven »{common}«, men ét har farven »{odd}«.',
    n: 'I fire af felterne er der lige mange figurer ({common}), men i ét er der {odd}.'
  },
  oddNum: {
    even: '{list} er lige tal, men {odd} er et ulige tal.',
    five: '{list} er alle i 5-tabellen, men {odd} er ikke.',
    ten: '{list} ender alle på 0, men {odd} gør ikke.',
    three: '{list} er alle i 3-tabellen, men {odd} er ikke.',
    square: '{list} er alle kvadrattal (fx 9 = 3 · 3), men {odd} er ikke.'
  },
  oddWord: '{list} er alle {cat}, men »{odd}« er {oddCat}.',
  anFig: 'Se på den første og den anden figur: {what} Det samme skal ske med den tredje figur.',
  transforms: {
    quarter: 'Figuren drejer en kvart omgang med uret.',
    half: 'Figuren drejer en halv omgang.',
    plus1: 'Der kommer én figur mere.',
    double: 'Der bliver dobbelt så mange figurer.',
    grow: 'Figuren bliver stor.',
    empty: 'Figuren bliver hvid.'
  },
  mx: {
    dist_s: 'I hver række er der én af hver form: {list}.',
    dist_p: 'I hver række er der én af hver farve: {list}.',
    rowconst_s: 'Alle figurerne i en række har samme form.',
    rowconst_p: 'Alle figurerne i en række har samme farve.',
    rowconst_z: 'Alle figurerne i en række har samme størrelse.',
    prog: 'Antallet vokser med én fra venstre mod højre.',
    turn: 'Figuren drejer en kvart omgang med uret for hvert felt mod højre.'
  },
  turnExplain: 'Den rigtige figur er den samme figur drejet {turn}. De andre er spejlvendte eller en anden figur, og dem kan man ikke dreje på plads.',
  turnNames: ['', 'en kvart omgang', 'en halv omgang', 'tre kvarte omgange'],
  mirrorExplain: 'I et spejlbillede er hver firkant lige langt fra den {axis} linje, bare på den anden side.',
  axisNames: { v: 'lodrette', h: 'vandrette' },
  foldExplain: 'Når papiret foldes ud, kommer der et hul på hver side af foldelinjen, som i et spejl. Derfor bliver der {n} huller i alt.',
  codeSteps: {
    found: '{eq}, så {name} er {v}.',
    system: 'Prøv dig frem, til alle regnestykkerne passer. Det gør de, når {names}.'
  },

  correct: ['Skarpt tænkt!', 'Rigtigt!', 'Flot!', 'Godt fundet!', 'Sådan!'],
  correctSecond: ['Godt, du fik den!', 'Ja, nu sidder den!'],
  tryAgain: 'Ikke helt. Se tippet, og prøv igen.',
  answerWas: 'Det rigtige svar er {a}.',
  continue: 'Videre',
  levelUp: 'Du er god til det her! Opgaverne bliver lidt sværere.',
  levelDown: 'Vi tager nogle lidt lettere opgaver et stykke tid.',
  bobStart: ['Velkommen i tænketårnet!', 'Lad os finde mønstret.', 'Tag den tid, du har brug for.'],

  resultTitle: ['Godt forsøg!', 'Du klarede det!', 'Skarpt tænkt!', 'Mesterhjerne!'],
  resultText: 'Du svarede rigtigt på {correct} af {total} i første forsøg.',
  resultLevel: 'Næste gang: niveau {n} af {max}.',
  resultTip: 'Øv lidt mere, så går det bedre næste gang.',
  newBest: 'Ny rekord!',
  playAgain: 'Spil igen',
  toMap: 'Til tårnet',
  leaveQ: 'Vil du stoppe opgaverne?',
  leave: 'Stop',
  stay: 'Fortsæt',
  reportHead: ['Opgave', 'Stjerner', 'Niveau']
};
