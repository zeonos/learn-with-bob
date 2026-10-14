/* Danske tekster til Verdensrejsen. Rettes her, ikke i koden. (Stednavne og spor står i places.js.) */
window.STR = window.STR || {};
window.STR.vr = {
  title: 'Verdensrejsen',
  tagline: 'Flyv jorden rundt med Bob, og saml stempler i dit pas.',
  chooseRoute: 'Vælg en rejse',
  next: 'Næste',
  passport: 'Mit pas',
  passportTitle: 'Mit rejsepas',
  passportEmpty: 'Dit pas er tomt. Tag på en rejse for at få dit første stempel!',
  passportPlaces: 'Steder, du har fundet: {n}',
  passportTap: 'Tryk på et sted for at læse mere om det.',
  step: 'Opgave {n} af {total}',

  // prompts
  find: 'Find {name} på kortet.',
  findCapital: 'Find {cap} på kortet.',
  capitalOf: '{land} hovedstad',
  findContinent: 'Find verdensdelen {name}.',
  findSea: 'Find {name}.',
  kinds: { bjerge: 'Bjergkæde', 'ørken': 'Ørken', flod: 'Flod', by: 'By i Danmark', oe: 'Ø i Danmark', halvoe: 'Halvø i Danmark', verdensdel: 'Verdensdel', ocean: 'Ocean', hav: 'Hav' },
  compassQ: 'Flyet skal fra {a} til {b}. Hvilken retning skal det flyve?',
  capitalQ: 'Hvad hedder {land} hovedstad?',
  cluesQ: 'Hvilket land leder vi efter?',
  clue: 'Spor {n}',
  tapHint: 'Tryk på kortet. Du kan zoome med knapperne eller med to fingre.',

  dirs: ['nord', 'nordøst', 'øst', 'sydøst', 'syd', 'sydvest', 'vest', 'nordvest'],
  dirsShort: ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'],
  dirsLong: ['Nord', 'Nordøst', 'Øst', 'Sydøst', 'Syd', 'Sydvest', 'Vest', 'Nordvest'],

  // feedback
  correct: ['Flot!', 'Lige i plet!', 'Sådan!', 'Godt fundet!', 'Perfekt landing!'],
  correctSecond: ['Godt, nu ramte du rigtigt!', 'Ja, sådan!'],
  missKm: 'Det var {km} km fra {name}. Prøv længere mod {dir}.',
  missLand: 'Det var {name}. Prøv længere mod {dir}.',
  missWater: 'Det var vand. Prøv længere mod {dir}.',
  missOther: 'Ikke helt. Prøv længere mod {dir}.',
  wrongChoice: 'Ikke helt. Prøv igen.',
  wrongClue: 'Ikke helt. Her er et spor mere.',
  answerWas: 'Her ligger {name}.',
  answerIs: 'Det rigtige svar er {a}.',
  continue: 'Videre',
  zoomIn: 'Zoom ind',
  zoomOut: 'Zoom ud',
  zoomReset: 'Vis hele kortet',
  bobStart: ['Spænd sikkerhedsselen. Vi letter!', 'Klar til afgang!'],

  // facts
  factCapital: 'Hovedstad: {cap}',
  factContinent: 'Verdensdel: {c}',
  factPop: 'Indbyggere: ca. {pop} ({year})',
  mio: '{n} mio.',
  mia: '{n} mia.',
  continents: { Europe: 'Europa', Asia: 'Asien', Africa: 'Afrika', 'North America': 'Nordamerika', 'South America': 'Sydamerika', Oceania: 'Oceanien', Antarctica: 'Antarktis' },
  clueContinent: 'Landet ligger i {c}, og der bor ca. {pop} mennesker.',
  clueCapital: 'Hovedstaden hedder {cap}.',
  quickContinentQ: 'I hvilken verdensdel ligger {land}?',
  quickClueQ: 'Hvilket land er det?',
  quickHintCapital: 'Tænk på den største og mest kendte by i landet.',
  quickHintContinent: 'Tænk på, hvor landet ligger på jordkloden.',
  source: 'Kilder: Natural Earth (kort og indbyggertal), GeoNames (byer) og Lex (danske navne).',

  // results
  resultTitle: ['Godt forsøg!', 'Du klarede det!', 'Godt fløjet!', 'Fantastisk rejse!'],
  resultText: 'Du svarede rigtigt på {correct} af {total} i første forsøg.',
  resultTip: 'Øv lidt mere, så går det bedre næste gang.',
  stamp: 'Du har fået et stempel i dit pas!',
  newBest: 'Ny rekord!',
  playAgain: 'Rejs igen',
  toMap: 'Til oversigten',
  leaveQ: 'Vil du afbryde rejsen?',
  leave: 'Afbryd',
  stay: 'Fortsæt',

  reportHead: ['Rejse', 'Stjerner', 'Rigtige i første forsøg']
};
