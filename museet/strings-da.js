/* Danske tekster til Mysteriet på museet. Rettes her, ikke i koden.
 * Historien, rummene, sporene og samlingskortene står i story.js. Opgaveteksterne (pz) bruges af puzzles.js.
 * {T} = klokkeslættet, hvor det store ur stoppede. */
window.STR = window.STR || {};
window.STR.mu = {
  title: 'Mysteriet på museet',
  tagline: 'Bob er låst inde på museet om natten, og Guldhornene er væk. Klar gådelåsene, saml spor og find tyven!',
  storyBtn: 'Historien',
  notebook: 'Notesbog',
  collection: 'Museets samling',
  chooseRoom: 'Museets plan',
  planNote: 'Salene åbner én ad gangen. Klar en sal for at låse den næste op.',
  next: 'Næste',
  locked: 'Låst',
  lockedNote: 'Klar salen før for at låse op',
  roomNo: 'Sal {n}',
  done: 'Klaret',
  readAloud: 'Læs højt',
  readEnglish: 'Læs brevet højt på engelsk',
  close: 'Luk',
  start: 'Find tyven!',
  storyTitle: 'Mysteriet begynder',
  suspectsTitle: 'Fire personer var på museet i dag',
  bandName: { M: 'Mellemtrin', U: 'Udskoling' },

  // play screen
  spotsLabel: 'Se på:',
  pocket: 'I lommen:',
  sceneLabel: '{room} med de ting, du kan trykke på',
  seen: 'set',
  lockSpot: 'gådelås',
  tip: 'Tip',
  noMoreTips: 'Ikke flere tip',
  showSolution: 'Vis løsningen',
  helpNote: '»Tip« giver højst 2 stjerner. »Vis løsningen« kommer frem efter 3 forkerte forsøg og giver 1 stjerne.',
  wrongCount: 'Forkerte forsøg: {n}',
  tipHead: 'Tip {n}',
  solutionHead: 'Løsningen',
  lessonHead: 'Sådan virker det',
  newClue: 'Nyt spor i notesbogen',
  newItem: 'Ny ting i lommen',
  continue: 'Videre',
  stepOf: 'Spørgsmål {n} af {total}',
  openLockFirst: 'Find låsen i rummet – eller tryk her.',
  openLock: 'Prøv gådelåsen',

  // code lock
  del: 'Slet',
  tryCode: 'Prøv koden',
  codeFields: 'Koden',
  fieldLabel: '{label}: {value}',
  closedSign: 'Lukket kl. 17.00',
  guestSign: 'Gæstebogen: »Gik kl. 16.30«',
  signsHead: 'Skiltene i hallen',
  clockLabel: 'Det store ur',
  wrongCode: 'Låsen siger »bip« – koden passer ikke.',
  wrongCodePart: 'Låsen siger »bip«. Den første del passer, men ikke resten.',
  emptyField: 'Udfyld alle felterne først.',

  // timeline
  placeHint: 'Tryk på fundene i den rækkefølge, de skal stå. Tryk på et fund på tidslinjen for at tage det af igen.',
  checkOrder: 'Tjek rækkefølgen',
  slot: 'Plads {n}',
  oldest: 'Ældst',
  newest: 'Nyest',
  emptySlot: 'Tom plads {n}',
  wrongOrder: 'Ikke helt. {n} af {total} fund står på den rigtige plads.',
  periodsHead: 'Perioderne',

  // runes
  keyTitle: 'Runetavlen',
  keyNoteU: 'Én rune kan stå for flere lyde.',
  typeWord: 'Skriv ordet:',
  checkWord: 'Tjek ordet',
  wrongWord: 'Det står der ikke. Se på runerne én ad gangen.',
  letterBox: 'Bogstav {n}',

  // scale
  chooseWeight: 'Vælg et lod',
  heavyLeft: 'Den venstre skål er tungest.',
  heavyRight: 'Den højre skål er tungest.',
  wrongSacks: 'Hvis en pose vejede {v}, ville venstre side veje {l} og højre side {r}.',

  // mc and strike
  wrongPick: 'Det passer ikke. Prøv igen.',
  strikeHelp: 'Tryk på et kort for at strege en person ud. Tryk igen for at sætte personen ind igen.',
  checkStrike: 'Tjek',
  strikeNone: 'Stryg mindst én person først.',
  strikeWrong: 'Ikke helt. Se på sporene igen: Hvem var et andet sted, da uret stoppede?',
  struck: 'har alibi',
  helpClues: 'Sporene, der giver et alibi:',

  // Bob
  bobStart: ['Lad os se os omkring.', 'Tag den tid, du har brug for.', 'Tryk på tingene i rummet.', 'Hvad mon der gemmer sig her?'],
  bobRight: ['Ja! Det er rigtigt.', 'Flot klaret!', 'Præcis!', 'Godt tænkt!'],
  bobWrong: ['Nej, ikke helt.', 'Den passer ikke. Prøv igen.', 'Næsten – kig en gang til.'],
  bobWrong3: 'Du kan bruge »Vis løsningen« nu, hvis du sidder fast.',
  bobTip: 'Her er et tip.',
  bobShown: 'Her er løsningen. Læs den, så kan du klare det næste gang.',
  bobLock: 'Lad os prøve gådelåsen.',

  // results
  resultTitle: ['Godt forsøg!', 'Salen er klaret!', 'Flot opklaret!', 'Mesterdetektiv!'],
  starsRule: '3 stjerner: uden tip. 2 stjerner: med tip. 1 stjerne: med »Vis løsningen«.',
  newBest: 'Ny rekord!',
  newCard: 'Ny genstand i Museets samling!',
  toMap: 'Til museets plan',
  nextRoom: 'Næste sal',
  playAgain: 'Spil salen igen',
  seeCollection: 'Se samlingen',
  leaveQ: 'Vil du forlade salen?',
  leaveNote: 'Sporene i notesbogen bliver gemt.',
  leave: 'Forlad salen',
  stay: 'Bliv',
  reportHead: ['Sal', 'Stjerner', 'Gange spillet'],

  // notebook
  nbTitle: 'Bobs notesbog',
  nbClues: 'Spor',
  nbNone: 'Ingen spor endnu. Tryk på tingene i salene.',
  nbSuspects: 'De mistænkte',
  nbHelp: 'Tryk på et kort for at strege en person ud – eller for at sætte personen ind igen.',
  nbStruck: '{name} er streget ud',
  nbOpen: '{name} er stadig mistænkt',

  // collection
  colTitle: 'Museets samling',
  colIntro: 'Hver gang du klarer en sal, får du en genstand med en sand historie. Mellemtrin og udskoling har hver sine seks genstande.',
  colCount: 'Du har {n} af {max} genstande.',
  colEmpty: 'Samlingen er tom endnu. Klar den første sal for at få en genstand.',
  cardLocked: 'Klar {room} ({band}) for at få genstanden.',
  source: 'Kilde',
  colBand: 'Genstande fra {band}',

  // the ending
  endingTitle: 'Sagen er opklaret!',
  trueTitle: 'Den sande historie om Guldhornene',
  endingGo: 'Se, hvordan det ender',

  // what each room teaches (»Sådan virker det«)
  lesson: {
    hallen: {
      M: 'Et ur med visere viser kun 12 timer. Om aftenen lægger man 12 til: 9.40 om aftenen er kl. 21.40. Tid, der er gået, regner man ud ved først at tælle de hele timer og så minutterne.',
      U: 'Når man regner tid ud, tæller man hele timer først og så de minutter, der er tilbage. Går man forbi en hel time, er det lettest at stoppe ved den hele time undervejs, for en time har 60 minutter – ikke 100.'
    },
    oldtiden: {
      M: 'Oldtiden deles i perioder efter det, folk lavede redskaber af: Først stenalderen, så bronzealderen og jernalderen – og til sidst vikingetiden.',
      U: 'Før Kristi fødsel tæller årene baglæns: 1400 f.Kr. er ældre end 400 f.Kr. Alt med f.Kr. er ældre end alt med e.Kr. Og der er ikke noget år 0 – året før år 1 e.Kr. er år 1 f.Kr.'
    },
    vikingetiden: {
      M: 'Vikingerne skrev med runer. Hver rune svarer til en lyd, så man kan læse runer med en runetavle – bogstav for bogstav.',
      U: 'Vikingetidens runerække havde kun 16 runer. Derfor måtte én rune stå for flere lyde, fx t og d eller k og g. Man må bruge sammenhængen for at finde ud af, hvilken lyd der er ment.'
    },
    middelalderen: {
      M: 'En skålvægt er i balance, når begge skåle vejer lige meget. ½ kg er det halve af 1 kg, og ¼ kg er en fjerdedel af 1 kg.',
      U: 'En ligning er ligesom en skålvægt: Gør du det samme på begge sider, bliver den i balance. Fjern lige meget fra begge sider, til x står alene.'
    },
    renaessancen: {
      M: 'Man behøver ikke kende alle ord for at forstå en tekst. Find de ord, der svarer på spørgsmålet. Og pm betyder om eftermiddagen eller aftenen: 11 pm er kl. 23.',
      U: 'I en lang tekst er det ikke alt, der er vigtigt. Læs spørgsmålet først, og led så efter de ord og tider, der svarer på det.'
    },
    loftet: {
      M: 'Sådan opklarer man en sag: Man stryger dem, der har et alibi – et bevis på, at de var et andet sted. Og man tjekker, om det, folk siger, passer.',
      U: 'Et alibi viser, at en person var et andet sted. Når man har strøget alle med et alibi, ser man på sporene mod den sidste: Passer forklaringen med tiderne?'
    }
  },

  // texts for puzzles.js
  pz: {
    hours: 'Timer',
    minutes: 'Minutter',
    years: 'År',
    hallenQM: 'Hvor lang tid gik der, fra museet lukkede, til uret stoppede?',
    hallenRuleM: 'Koden er den tid, der gik, fra museet lukkede kl. 17.00, til det store ur stoppede: først timerne, så minutterne.',
    hallenHintM1: 'Se på uret. Den lille viser peger på timen, og den store viser peger på minutterne. Husk, at det er aften.',
    hallenHintM2: 'Uret viser {clock}, og det er aften – altså kl. {T}. Tæl de hele timer fra kl. 17.00, og tæl så minutterne.',
    hallenExplainM: 'Uret viser {clock}, og om aftenen er det kl. {T}. Fra kl. 17.00 til kl. {full} er der {h} timer, og fra kl. {full} til kl. {T} er der {m} minutter. Koden er {h} timer og {m} minutter.',
    hallenQU: 'Find koden ud fra uret, gæstebogen og skiltene.',
    hallenRuleU: 'Koden har tre felter: Timer og minutter fra det tidspunkt, hvor urmageren skrev, at han gik, til uret stoppede. Og antal år mellem det ældste og det nyeste årstal på skiltene.',
    hallenHintU1: 'Del koden op. Tiden: Tæl først hele timer fra kl. 16.30, og så minutterne. Årene: Find det ældste og det nyeste årstal, og træk dem fra hinanden.',
    hallenHintU2: 'Uret stoppede kl. {T}. Fra kl. 16.30 til kl. {hh} er der {n} hele timer – hvor mange minutter er der så tilbage? Årstallene, du skal bruge, er {lo} og {hi}.',
    hallenExplainU: 'Uret stoppede kl. {T}. Fra kl. 16.30 til kl. {hh} er der {h} timer, og fra kl. {hh} til kl. {T} er der {m} minutter. Det ældste årstal er {lo}, og det nyeste er {hi}: {hi} − {lo} = {diff}. Koden er {h} – {m} – {diff}.',

    oldQM: 'Sæt fundene på tidslinjen. Det ældste skal stå først.',
    oldQU: 'Sæt fundene på tidslinjen efter årstal. Det ældste skal stå først.',
    oldHintM1: 'Stenalderen kom først. Så kom bronzealderen, så jernalderen og til sidst vikingetiden.',
    oldHintM2: 'Det ældste fund er {first}, og det nyeste er {last}.',
    oldHintU1: 'Før Kristi fødsel (f.Kr.) tæller man baglæns: Jo større tal, jo ældre. Alt med f.Kr. er ældre end alt med e.Kr.',
    oldHintU2: 'Det ældste fund er {first}, og det næstældste er {second}.',
    oldExplainM: 'Den rigtige rækkefølge er: {order}. Stenalder kommer før bronzealder, så jernalder og så vikingetid.',
    oldExplainU: 'Den rigtige rækkefølge er: {order}. Ved f.Kr. er det største tal det ældste, og alt med f.Kr. kommer før alt med e.Kr.',

    runeLetters: ['F', 'U', 'Þ', 'O', 'R', 'K', 'H', 'N', 'I', 'A', 'S', 'T', 'B', 'M', 'L'],
    vikQM: 'Hvad står der over døren? Find hver rune på runetavlen, og skriv ordet.',
    vikHintM1: 'Tag én rune ad gangen. Find den samme rune på tavlen, og se, hvilket bogstav der står under den.',
    vikHintM2: 'Ordet begynder med {a}, og det har {n} bogstaver.',
    vikExplainM: 'Runerne betyder {list}. Der står {w}.',
    places: { SKIB: 'i skibet', SKAB: 'i skabet', KRUS: 'i kruset', HUS: 'i det lille hus', TRIN: 'under trinnet' },
    vikQU: 'Hvad står der over døren? Brug runetavlen. Husk, at en rune kan stå for flere lyde.',
    vikHintU1: 'Sammenlign svarene. De er næsten ens – find de ord, hvor de er forskellige, og læs kun dem med runer.',
    vikHintU2: 'Det sidste ord er {w}. Se nu på de andre ord.',
    vikExplainU: 'Der står: »{s}«. Her er nogle runer brugt for flere lyde: {twist}.',
    twistOne: '{r}-runen for {c}',

    scaleQA: 'Hvilket lod skal i den højre skål, så vægten kommer i balance?',
    scaleHintA1: 'Læg lodderne sammen i hver skål. Begge skåle skal veje lige meget.',
    scaleHintA2: 'Den venstre skål vejer {L}. Den højre skål vejer {Rr} uden det sidste lod. Hvor meget mangler der?',
    scaleExplainA: 'Venstre skål: {l} = {L}. Højre skål har {Rr}, så der mangler {a}. Med et lod på {a} vejer begge skåle {L}.',
    scaleQB: 'De {n} poser peber vejer lige meget, og vægten er i balance. Hvad vejer én pose?',
    scaleHintB1: 'Poserne vejer tilsammen det samme som lodderne i den anden skål.',
    scaleHintB2: 'Lodderne vejer {W} tilsammen. Del det ligeligt mellem {n} poser.',
    scaleExplainB: 'Lodderne vejer {W}. {W} delt mellem {n} poser giver {a} i hver pose.',
    scaleWords: 'Venstre skål: {l}. Højre skål: {r}.',
    sacksN: '{n} poser',
    sacksX: '{n} × x',
    eqQ: 'Alle poserne vejer lige meget (x kg), og vægten er i balance: {eq}. Hvad vejer én pose?',
    eqHint1: 'Tag lige meget af i begge skåle. Start med at fjerne lige mange poser fra hver side.',
    eqHint2: 'Fjern {c} pose(r) fra hver side: {lhs2} = {d}. Fjern så lige meget fra begge sider, så x står alene.',
    eqExplain: '{eq}. Fjern {c} pose(r) fra hver side: {lhs2} = {d}. Fjern {b} kg fra hver side: {kx} = {db}. Del med {k}: x = {x}. Én pose vejer {x} kg.',
    eqExplain0: '{eq}. Fjern {c} pose(r) fra hver side: {kx} = {d}. Del med {k}: x = {x}. Én pose vejer {x} kg.',

    letQ1M: 'Hvad laver Mr. Smith i aften?',
    letA1M: 'Han spiller {i} til en koncert.',
    letW1M: ['Han spiser på en restaurant.', 'Han kører med toget til London.', 'Han kommer tilbage til museet.', 'Han sover på sit hotel.'],
    letHint1M1: 'Find ordet »Tonight« i brevet. Det betyder »i aften«.',
    letHint1M2: 'Der står »I am playing the {i}«. »Playing« betyder, at han spiller.',
    letExplain1M: 'Der står »Tonight I am playing the {i} in a concert«: Han spiller {d} til en koncert i aften.',
    letQ2M: 'Hvor er koncerten?',
    letHint2M1: 'Find ordet »concert« i brevet. Hvad står der lige efter »at«?',
    letHint2M2: 'Der står »at {p}«.',
    letExplain2M: 'Der står »a concert at {p}«. Det betyder {d}.',
    letQ3M: 'Hvornår slutter koncerten?',
    letHint3M1: 'Find ordet »ends« i brevet. Det betyder »slutter«.',
    letHint3M2: 'Der står »ends at {e}«. »pm« betyder om eftermiddagen eller aftenen, så du skal lægge 12 til.',
    letExplain3M: 'Der står »ends at {e}«. pm betyder om aftenen, så det er kl. {d}.',
    letQ1U: 'Hvor var Mr. Smith, da uret stoppede kl. {T}?',
    letA1U: 'Han spillede til en koncert {p}.',
    letW1U: ['Han spiste middag med sin søster.', 'Han var på museet.', 'Han sad i toget til London.', 'Han sov på sit hotel.'],
    letHint1U1: 'Find alle tiderne i brevet, og sæt dem i rækkefølge: middag, koncert og tog.',
    letHint1U2: 'Koncerten begynder »at {s}« (kl. {sd}) og slutter først »{e}« (kl. {ed}).',
    letExplain1U: 'Koncerten begynder »at {s}« (kl. {sd}) og slutter først »{e}« (kl. {ed}). Uret stoppede kl. {T}, så da spillede han koncert.',
    letQ2U: 'Hvorfor er koncerten et godt alibi?',
    letA2U: 'Over {n} mennesker kunne se ham spille.',
    letW2U: ['Natvagten var med til koncerten.', 'Hans søster spillede også med.', 'Han spillede alene i sit hotelværelse.', 'Lise Bang sad ved siden af ham.'],
    letHint2U1: 'Et godt alibi er, når andre kan se, at man var et andet sted.',
    letHint2U2: 'Find ordet »people« i brevet.',
    letExplain2U: 'Der står »More than {n} people have bought tickets«. Så mange mennesker kan se, at han var til koncerten.',
    letQ3U: 'Hvornår kører hans tog i morgen?',
    letHint3U1: 'Find ordet »train« i brevet.',
    letHint3U2: 'Der står »my train leaves at {tr} in the morning«. »in the morning« betyder om morgenen.',
    letExplain3U: 'Der står »my train leaves at {tr} in the morning«, altså kl. {d} om morgenen.',

    magpieM: ['Nej. En skade vejer kun ca. 200 gram. Den kan ikke bære et horn.', 'Ja. Skader stjæler alt, der skinner.', 'Ja. Den kan bære begge horn på én gang.'],
    magpieU: ['Nej. En skade vejer kun ca. 200 gram, og selv en kopi af et guldhorn er alt for tung.', 'Ja. Vinduet stod åbent, så den kunne flyve ind.', 'Ja. Alle ved, at skader stjæler skinnende ting.', 'Ja. Skaden bar hornene ét ad gangen.'],
    loftQ1: 'Ved vinduet er der fjer fra en skade. Kan skaden have taget Guldhornene?',
    loftHint1a: 'Hvor stor er en skade – og hvor tungt er et horn af metal?',
    loftHint1b: 'En skade vejer ca. 200 gram – lige så meget som et stort æble. Kan den bære noget, der vejer flere kilo?',
    loftExplain1: 'En skade vejer kun ca. 200 gram. Den kan ikke bære et horn, der vejer flere kilo. Skaden er uskyldig!',
    loftQ2M: 'Stryg de mistænkte, der har et alibi. Tryk på deres kort, og tryk så på »Tjek«.',
    loftQ2U: 'Stryg de mistænkte, der har et alibi. Brug din notesbog. Tryk på deres kort, og tryk så på »Tjek«.',
    loftHint2a: 'Se i notesbogen. Hvem var et andet sted, da uret stoppede kl. {T}?',
    loftHint2b: 'Natvagten var i kælderen med blikkenslageren, Lise sad i toget, og Mr. Smith spillede koncert. De har alle et alibi.',
    loftExplain2: 'Natvagten var i kælderen med blikkenslageren, Lise Bang var på vej til Aalborg, og Mr. Smith spillede koncert. Kun urmageren har ikke noget alibi.',
    loftQ3U: 'Urmageren skrev i gæstebogen, at han gik kl. 16.30. Hvorfor kan det ikke passe?',
    whyU: ['Uret slog fem kl. 17.00 og stoppede først kl. {T}, fordi nogen åbnede det. Og hans lup lå ved kisten.', 'Tandhjulet viser, at han kom for sent til museet.', 'Uret stoppede kl. 16.30, lige da han gik.', 'Han skrev i gæstebogen på engelsk.'],
    loftHint3a: 'Se på logbogen og på uret: Hvornår gik uret stadig, og hvornår stoppede det?',
    loftHint3b: 'Uret slog fem kl. 17.00, men stoppede kl. {T}. Hvem kan finde ud af at åbne et standur?',
    loftExplain3: 'Uret gik stadig kl. 17.00 og blev stoppet kl. {T}. Det må en, der kender til ure, have gjort – og urmagerens lup lå ved kisten med hornene. Han var der altså længe efter kl. 16.30.',
    loftQ4: 'Hvem er tyven?',
    loftHint4a: 'Hvem er tilbage, når du har strøget alle med et alibi?',
    loftHint4b: 'Tandhjulet, uret og gæstebogen peger alle på den samme person.',
    loftExplain4: 'Urmager Anton Fjeder skrev, at han gik kl. 16.30, men uret blev stoppet kl. {T}, og tandhjulet fra et ur lå ved vægten. Han er tyven!'
  },

  // the daily challenge
  q: {
    time: 'Museet lukkede kl. 17.00. Om aftenen stoppede det store ur – se uret. Hvor lang tid gik der fra lukketid, til uret stoppede?',
    timeHint: 'Det er aften, så læg 12 til timen på uret. Tæl så de hele timer fra kl. 17.00 og til sidst minutterne.',
    timeExplain: 'Uret viser {clock}, og om aftenen er det kl. {T}. Fra kl. 17.00 til kl. {full} er der {h} timer, og så er der {m} minutter mere: {h} timer og {m} minutter.',
    timeOpt: '{h} timer og {m} minutter',
    oldest: 'Hvilket af fundene er ældst?',
    oldestHint: 'Stenalder er ældre end bronzealder, og bronzealder er ældre end jernalder. Ved f.Kr. er det største tal ældst.',
    oldestExplain: '{a} er ældst ({w}).',
    rune: 'Hvad står der med runer? Brug runetavlen under ordet.',
    runeHint: 'Find hver rune i tavlen, og læs bogstaverne i rækkefølge.',
    runeExplain: 'Runerne betyder {list}: {w}.',
    balanceHint: 'Begge skåle skal veje lige meget.',
    english: 'Mr. Smith skriver: »{s}« Hvad betyder det?',
    englishHint: '»pm« betyder om eftermiddagen eller aftenen. Læg 12 til.',
    englishExplain: '»{s}« betyder: {a}.',
    englishItems: [
      ['The concert ends at 11 pm.', 'Koncerten slutter kl. 23.', ['Koncerten slutter kl. 11.', 'Koncerten begynder kl. 23.', 'Koncerten slutter kl. 21.']],
      ['My train leaves at 9 am.', 'Mit tog kører kl. 9 om morgenen.', ['Mit tog kører kl. 21.', 'Mit tog kommer kl. 9 om aftenen.', 'Jeg kører med bus kl. 9.']],
      ['Tonight I am playing the violin.', 'I aften spiller jeg violin.', ['I morgen spiller jeg violin.', 'I aften køber jeg en violin.', 'I aften lytter jeg til violin.']],
      ['My sister is coming too.', 'Min søster kommer også.', ['Min søster kommer ikke.', 'Min bror kommer også.', 'Min søster kommer i morgen.']],
      ['The concert starts at 8 pm.', 'Koncerten begynder kl. 20.', ['Koncerten begynder kl. 8.', 'Koncerten slutter kl. 20.', 'Koncerten begynder kl. 18.']]
    ],
    logic: 'Uret stoppede kl. {T}. Hvem af dem kan IKKE have stoppet uret?',
    logicOpts: ['Natvagten. Han var i kælderen med blikkenslageren fra kl. 21.00 til 22.30.', 'Urmageren. Han skrev, at han gik kl. 16.30.', 'Ingen af dem. Alle kan have gjort det.'],
    logicHint: 'Et alibi er et bevis på, at man var et andet sted. Et navn i gæstebogen er ikke et bevis.',
    logicExplain: 'Natvagten var i kælderen sammen med blikkenslageren fra kl. 21.00 til 22.30 – det er et alibi. At urmageren selv skrev, at han gik, er ikke et bevis.'
  }
};
