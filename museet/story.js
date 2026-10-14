/*
 * Mysteriet på museet – historien, rummene, sporene, de mistænkte og Museets samling.
 * Alle personer og »Byens Museum« er opdigtede. Fakta på samlingskortene og i slutningen er tjekket mod kilderne,
 * der står ved hvert kort (se også tools/korrektur-museet.html).
 * {T} = det klokkeslæt, det store ur stoppede på (vælges, når Hallen spilles). {instr}, {place}, {start}, {end}: fra Mr. Smiths brev.
 */
(function (root) {
  'use strict';
  var MU_STORY = {
    // the rooms, in the order Bob walks through them
    rooms: [
      { id: 'hallen', name: 'Hallen', era: 'I dag',
        desc: { M: 'Det store ur og en kodelås', U: 'Det store ur, skiltene og en kodelås' },
        intro: { M: 'Hallen er mørk. Kun lommelygten lyser. Tryk på tingene i rummet for at se nærmere på dem.', U: 'Hallen er mørk. Kun lommelygten lyser. Undersøg rummet – og find koden til døren.' } },
      { id: 'oldtiden', name: 'Oldtiden', era: 'Sten-, bronze- og jernalder',
        desc: { M: 'Sæt fundene i rækkefølge', U: 'Fund med årstal før og efter Kristi fødsel' },
        intro: { M: 'Her står fund fra oldtiden. Døren har en tidslinje med tomme pladser.', U: 'Her står fund fra oldtiden. Døren har en tidslinje med tomme pladser – og årstallene er drillende.' } },
      { id: 'vikingetiden', name: 'Vikinge\u00adtiden', era: 'ca. 800–1050',
        desc: { M: 'Et ord skrevet med runer', U: 'En besked skrevet med runer' },
        intro: { M: 'Vikingesalen dufter af gammelt træ. Over døren står der noget med runer.', U: 'Vikingesalen dufter af gammelt træ. Over døren står en hel besked med runer.' } },
      { id: 'middelalderen', name: 'Middel\u00adalderen', era: 'ca. 1050–1536',
        desc: { M: 'Købmandens skålvægt', U: 'Skålvægt og ligninger' },
        intro: { M: 'En markedsplads fra middelalderen. Døren åbner kun, når købmandens vægt er i balance.', U: 'En markedsplads fra middelalderen. Døren åbner kun, når købmandens vægt er i balance.' } },
      { id: 'renaessancen', name: 'Renæs\u00adsancen', era: 'Christian 4.s tid',
        desc: { M: 'Et brev på engelsk', U: 'Et langt brev på engelsk' },
        intro: { M: 'En fin sal med malerier og en globus. På skrivepulten ligger et brev på engelsk.', U: 'En fin sal med malerier og en globus. På skrivepulten ligger et langt brev på engelsk.' } },
      { id: 'loftet', name: 'Loftet', era: '1800-tallet',
        desc: { M: 'Hvem er tyven?', U: 'Hvem er tyven? Bevis det!' },
        intro: { M: 'Loftet er støvet og fuldt af gamle ting. Et vindue står åbent, og månen skinner ind.', U: 'Loftet er støvet og fuldt af gamle ting. Et vindue står åbent, og månen skinner ind.' } }
    ],

    // the start of the story (shown the first time, and from the button »Historien«)
    intro: [
      'Skoleturen til Byens Museum var lang, og bænken i hallen var blød. Bob lukkede øjnene … bare et øjeblik.',
      'Da han vågnede, var der mørkt og helt stille. Alle var gået hjem, og dørene var låst. Heldigvis virker Bobs lommelygte stadig.',
      'Men hvad er det? Glasmontren med museets kopier af Guldhornene er tom! Nogen har taget dem.',
      'Dørene mellem salene er låst med gamle gådelåse. Bob må klare sig gennem seks sale – én for hver tid i historien – og skrive alle spor ned i sin notesbog. Kan han finde hornene og tyven, før det bliver morgen?'
    ],

    // the suspects. Exactly one is the culprit; the others are cleared by a clue each.
    suspects: [
      { id: 'vagt', name: 'Karl Lampe', role: 'natvagt', about: 'Passer på museet om natten.' },
      { id: 'inspektor', name: 'Lise Bang', role: 'museumsinspektør', about: 'Ved alt om museets ting.' },
      { id: 'smith', name: 'Mr. Smith', role: 'engelsk samler', about: 'Var på besøg i dag og elsker gamle ting.' },
      { id: 'urmager', name: 'Anton Fjeder', role: 'urmager', about: 'Reparerede det store ur i eftermiddags.', culprit: true }
    ],

    // clues for the notebook. when: 'spot' = found by tapping a thing, 'solve' = found when the room's lock opens.
    // clears: the suspect it gives an alibi; points: the suspect it points at; herring: a false track.
    clues: [
      { id: 'gaestebog', room: 'hallen', when: 'spot', points: 'urmager', text: 'Gæstebogen: Urmager Anton Fjeder skrev, at han gik kl. 16.30.' },
      { id: 'uret', room: 'hallen', when: 'solve', points: 'urmager', text: 'Det store ur i hallen stoppede kl. {T}. Nogen har åbnet uret.' },
      { id: 'billet', room: 'oldtiden', when: 'spot', clears: 'inspektor', text: 'Lise Bang tog toget til Aalborg kl. 17.42 og kommer først hjem i morgen.' },
      { id: 'logbog', room: 'vikingetiden', when: 'spot', clears: 'vagt', text: 'Natvagtens logbog: Kl. 17.00 slog det store ur fem. Fra kl. 21.00 til 22.30 var Karl i kælderen sammen med blikkenslageren.' },
      { id: 'tandhjul', room: 'middelalderen', when: 'spot', points: 'urmager', text: 'Et lille tandhjul af messing lå ved skålvægten. Sådan et sidder inde i et ur.' },
      { id: 'brev', room: 'renaessancen', when: 'solve', clears: 'smith', text: 'Mr. Smith spillede {instr} til en koncert {place} fra kl. {start} til kl. {end}. Mange mennesker så ham.' },
      { id: 'rede', room: 'loftet', when: 'spot', herring: true, text: 'Fjer og en skaderede ved det åbne vindue på loftet.' },
      { id: 'lup', room: 'loftet', when: 'spot', points: 'urmager', bands: ['U'], text: 'En urmagerlup lå ved kisten på loftet.' }
    ],

    // things to tap in each room. x, y = the centre in % of the picture; w, h = size in %.
    // clue: adds that clue; item: puts a thing in Bob's pocket; lock: opens the puzzle.
    spots: {
      hallen: [
        { id: 'ur', label: 'Det store ur', x: 17, y: 50, w: 13, h: 72, text: 'Det store standur er gået i stå. Viserne står helt stille. Udenfor er det mørkt, så det må være om aftenen.' },
        { id: 'skilt', label: 'Skiltet ved døren', x: 89, y: 20, w: 15, h: 16, text: 'På skiltet står der: »Åbent alle dage kl. 10.00–17.00«. Museet lukkede altså kl. 17.00.' },
        { id: 'montre', label: 'Den tomme montre', x: 50, y: 55, w: 20, h: 46, text: 'Montren er tom! Her lå museets kopier af Guldhornene. Glasset er helt – tyven må have haft en nøgle.' },
        { id: 'gaestebog', label: 'Gæstebogen', x: 33, y: 70, w: 12, h: 22, clue: 'gaestebog', text: 'I gæstebogen står der: »Urmager Anton Fjeder. Har repareret det store ur. Gik kl. 16.30.«' },
        { id: 'doer', label: 'Døren med kodelåsen', x: 80, y: 57, w: 16, h: 60, lock: true, text: 'Døren til næste sal har en kodelås. Over tasterne står reglen for koden.' }
      ],
      oldtiden: [
        { id: 'lurer', label: 'Instrumenterne af bronze', x: 14, y: 42, w: 16, h: 50, text: 'To lange, snoede blæseinstrumenter af bronze. Bob tør ikke blæse i dem – det ville vække hele byen!' },
        { id: 'bord', label: 'Museumsinspektørens bord', x: 37, y: 72, w: 18, h: 24, clue: 'billet', text: 'Museumsinspektøren har arbejdet på en ny udstilling her. På bordet ligger en kopi af hendes togbillet: »Lise Bang. Afgang kl. 17.42 til Aalborg. Hjem i morgen.«' },
        { id: 'hytte', label: 'Den lille hytte', x: 60, y: 46, w: 18, h: 40, text: 'En model af en lille hytte med tag af siv. Bob kigger ind. Ingen guldhorn her – kun en edderkop.' },
        { id: 'doer', label: 'Døren med tidslinjen', x: 85, y: 55, w: 16, h: 60, lock: true, text: 'Døren har en tidslinje med tomme pladser. Fundene skal stå i den rigtige rækkefølge.' }
      ],
      vikingetiden: [
        { id: 'skib', label: 'Vikingeskibet', x: 30, y: 63, w: 26, h: 26, text: 'En flot model af et vikingeskib med et stribet sejl. Bob ville ønske, han kunne sejle væk i det.' },
        { id: 'runesten', label: 'Runestenen', x: 9, y: 58, w: 13, h: 50, text: 'En kopi af den store Jellingsten. Den blev rejst af kong Harald Blåtand omkring år 965.' },
        { id: 'logbog', label: 'Bogen på stolen', x: 55, y: 74, w: 13, h: 20, clue: 'logbog', text: 'Natvagtens logbog! Der står: »Kl. 17.00: Låste dørene. Det store ur slog fem. Kl. 21.00–22.30: I kælderen med blikkenslageren. Et vandrør var sprunget.«' },
        { id: 'tavle', label: 'Runetavlen', x: 55, y: 26, w: 22, h: 26, text: 'En tavle med vikingetidens 16 runer. Under hver rune står det bogstav, den står for.' },
        { id: 'doer', label: 'Døren med runerne', x: 84, y: 55, w: 16, h: 62, lock: true, text: 'Over døren står der noget med runer. Måske siger det, hvor nøglen er?' }
      ],
      middelalderen: [
        { id: 'bod', label: 'Købmandens bod', x: 16, y: 52, w: 24, h: 46, text: 'En købmandsbod fra en markedsby. Her solgte købmanden salt, peber og klæde.' },
        { id: 'tandhjul', label: 'Noget, der glimter på gulvet', x: 38, y: 86, w: 9, h: 13, clue: 'tandhjul', item: 'tandhjul', text: 'På gulvet ligger et bitte lille tandhjul af messing. Sådan et sidder inde i et ur! Hvad laver det her?' },
        { id: 'vaegt', label: 'Skålvægten', x: 55, y: 52, w: 22, h: 50, lock: true, text: 'En stor skålvægt. Der hænger en seddel: »Døren åbner, når vægten er i balance.«' },
        { id: 'kiste', label: 'Pengekisten', x: 73, y: 79, w: 12, h: 18, text: 'En tung kiste med gamle mønter. Den er låst – og det er godt, for den er ikke Bobs.' },
        { id: 'doer', label: 'Den låste dør', x: 89, y: 52, w: 14, h: 60, lock: true, text: 'Døren er låst. Den er forbundet til skålvægten med en snor.' }
      ],
      renaessancen: [
        { id: 'maleri', label: 'Maleriet af tårnet', x: 21, y: 30, w: 18, h: 34, text: 'Et maleri af Rundetårn i København. Christian 4. lod det bygge, og det stod færdigt i 1642.' },
        { id: 'globus', label: 'Globussen og kikkerten', x: 14, y: 72, w: 16, h: 32, text: 'En gammel globus og en kikkert. Rundetårn blev bygget som observatorium – et sted, hvor man kiggede på stjernerne.' },
        { id: 'brev', label: 'Brevet på skrivepulten', x: 52, y: 64, w: 20, h: 30, lock: true, item: 'brev', text: 'Et brev på engelsk! Det er fra Mr. Smith. Døren har en lås med tre knapper – én for hvert spørgsmål om brevet.' },
        { id: 'doer', label: 'Den låste dør', x: 86, y: 54, w: 15, h: 62, lock: true, text: 'Døren har en lås med tre knapper. Svarene står i brevet.' }
      ],
      loftet: [
        { id: 'rede', label: 'Fjerene ved vinduet', x: 70, y: 32, w: 18, h: 26, clue: 'rede', text: 'Sorte og hvide fjer og en stor rede af grene ved det åbne vindue. Det er en skades rede! Er det skaden, der har taget hornene?' },
        { id: 'kiste', label: 'Den gamle kiste', x: 34, y: 72, w: 22, h: 30, text: 'Kisten er låst med en hængelås. Gennem en sprække glimter noget gult. Det er hornene! Men hvem har gemt dem her?' },
        { id: 'lup', label: 'Noget lille ved kisten', x: 51, y: 84, w: 8, h: 12, clue: 'lup', bands: ['U'], text: 'Ved kisten ligger en urmagerlup – et lille forstørrelsesglas, som man sætter for øjet, når man arbejder med små ting.' },
        { id: 'tavle', label: 'Bobs tavle', x: 14, y: 50, w: 18, h: 44, lock: true, text: 'Bob stiller en gammel tavle op og samler alle sporene. Nu skal sagen opklares!' }
      ]
    },

    // things in Bob's pocket
    items: {
      lygte: 'Lommelygte',
      noegle: 'Nøgle fra vikingesalen',
      tandhjul: 'Tandhjul af messing',
      brev: 'Brev fra Mr. Smith'
    },
    start: { lygte: 1 },

    // what Bob says when a lock opens
    opened: {
      hallen: 'Klik! Koden passer, og døren går op.',
      oldtiden: 'Tidslinjen lyser, og døren glider op.',
      vikingetiden: 'Bob kigger {where} … og der ligger en nøgle! Den passer i døren.',
      middelalderen: 'Vægten er i balance. Snoren strammer, og døren går op.',
      renaessancen: 'Tre knapper er trykket ned. Døren åbner med et knirk.',
      loftet: 'Sagen er opklaret!'
    },

    // the ending (both bands)
    ending: [
      'Knirk! Trappen til loftet knager. Natvagten Karl Lampe kommer op med sin lommelygte – og lige bag ham står urmager Anton Fjeder med en stor, tom taske. Han ville hente hornene, før museet åbnede.',
      '»Det var mig,« siger urmageren og kigger ned i gulvet. »Jeg troede, at hornene var af ægte guld. Da museet lukkede, gemte jeg mig. Kl. {T} kunne jeg ikke lade være med at åbne det store ur for at se, om min reparation holdt. Så kom jeg til at stoppe det. Undskyld!«',
      '»Men det er jo kopier,« siger natvagten venligt. »De rigtige guldhorn findes slet ikke mere.« Kopierne kommer tilbage i montren, urmageren lover at sige undskyld til hele museet, og Bob er nattens helt.',
      'Mens de venter på, at det bliver morgen, fortæller Bob den sande historie om Guldhornene.'
    ],
    trueStory: [
      'De to guldhorn blev fundet ved Gallehus nær Møgeltønder i Sønderjylland. Det lange horn fandt Kirsten Svendsdatter i 1639, og det korte fandt Erik Lassen i 1734. Hornene blev lavet omkring år 400 – i jernalderen.',
      'På det korte horn stod der med runer: »ek hlewagastiR holtijaR horna tawido«. Det betyder: »Jeg, Lægæst, Holtes søn (eller: fra Holt), gjorde hornet.«',
      'Hornene lå i Kunstkammeret i København. I natten mellem den 4. og 5. maj 1802 stjal guldsmeden Niels Heidenreich dem med nøgler, han selv havde lavet, og han smeltede dem om. Derfor er de horn, man ser i dag, kopier. Året efter blev han fanget. Sjovt nok var han både guldsmed og urmager!',
      'Digteren Adam Oehlenschläger skrev digtet »Guldhornene« om tyveriet. Og tænk: I 2007 blev kopierne også stjålet – men de blev fundet igen kort efter.',
      'Og skaden? Den var helt uskyldig. Forskere fra University of Exeter i England undersøgte i 2014, om skader stjæler skinnende ting. Det gjorde de ikke. Skaderne var faktisk bange for de nye, blanke ting.'
    ],
    trueStorySources: ['https://lex.dk/Guldhornene', 'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-late-iron-age/the-golden-horns/',
      'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-late-iron-age/the-golden-horns/the-theft-of-the-golden-horns', 'https://lex.dk/Niels_Heidenreich',
      'https://news-archive.exeter.ac.uk/2014/august/title_406690_en.html'],

    // the finds on the timeline (Oldtiden). year < 0 = f.Kr.
    finds: {
      koelbjerg: { name: 'Koelbjerg\u00admanden', what: 'Skelet fundet i en mose på Fyn', when: 'ca. 8500 f.Kr.', src: 'https://lex.dk/Koelbjergmanden' },
      solvognen: { name: 'Solvognen', what: 'Hest af bronze, der trækker en solskive', when: 'ca. 1400 f.Kr.', src: 'https://lex.dk/Solvognen' },
      egtved: { name: 'Egtved\u00adpigen', what: 'Pige begravet i en kiste af egetræ', when: '1370 f.Kr.', src: 'https://lex.dk/Egtvedpigen' },
      tollund: { name: 'Tollund\u00admanden', what: 'Mand fundet i en mose med en skindhue på', when: 'ca. 400 f.Kr.', src: 'https://lex.dk/Tollundmanden' },
      hjortspring: { name: 'Hjortspring\u00adbåden', what: 'Båd bygget af brede planker', when: 'ca. 350 f.Kr.', src: 'https://lex.dk/Hjortspringbåden' },
      guldhorn: { name: 'Guldhornene', what: 'To horn af guld med billeder', when: 'ca. 400 e.Kr.', src: 'https://lex.dk/Guldhornene' },
      jelling: { name: 'Den store Jelling\u00adsten', what: 'Runesten rejst af Harald Blåtand', when: 'ca. 965 e.Kr.', src: 'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/the-monuments-at-jelling/jelling-and-the-new-faith/' }
    },
    periods: {
      sten: { name: 'Stenalder', when: 'til ca. 1700 f.Kr.' },
      bronze: { name: 'Bronzealder', when: 'ca. 1700–500 f.Kr.' },
      jern: { name: 'Jernalder', when: 'ca. 500 f.Kr.–800 e.Kr.' },
      viking: { name: 'Vikingetid', when: 'ca. 800–1050' }
    },
    periodSources: ['https://lex.dk/Danmarks_forhistorie', 'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/', 'https://lex.dk/vikingetiden'],

    // the years on the signs in the hall (Udskoling's code)
    signs: [
      { year: 1241, text: 'Jyske Lov blev givet', src: 'https://lex.dk/Jyske_Lov' },
      { year: 1639, text: 'Det lange guldhorn blev fundet', src: 'https://lex.dk/Guldhornene' },
      { year: 1642, text: 'Rundetårn stod færdigt', src: 'https://lex.dk/Rundetårn' },
      { year: 1734, text: 'Det korte guldhorn blev fundet', src: 'https://lex.dk/Guldhornene' },
      { year: 1802, text: 'Guldhornene blev stjålet', src: 'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-late-iron-age/the-golden-horns/the-theft-of-the-golden-horns' },
      { year: 1902, text: 'Solvognen blev fundet', src: 'https://lex.dk/Solvognen' },
      { year: 1921, text: 'Egtvedpigen blev fundet', src: 'https://lex.dk/Egtvedpigen' },
      { year: 1941, text: 'Koelbjergmanden blev fundet', src: 'https://lex.dk/Koelbjergmanden' },
      { year: 1950, text: 'Tollundmanden blev fundet', src: 'https://lex.dk/Tollundmanden' }
    ],

    // Mr. Smith's letters (English – not spell-checked as Danish). The words in {} are filled in by puzzles.js.
    letters: {
      M: 'Dear Lise,\nThank you for a lovely day at the museum!\nTonight I am playing the {instr} in a concert at {place}. The concert starts at {start} and ends at {end}.\nMy sister {sis} is coming too.\nBest wishes,\nOliver Smith',
      U: 'Dear Lise,\nThank you so much for showing me around the museum today. I had to leave at four o\'clock to get ready for this evening.\nAt {dinner} I am having dinner with my sister {sis} at our hotel. After that, at {start}, I am playing the {instr} in a concert at {place}. It does not finish until {end}, so I am afraid I cannot visit the museum again tonight. More than {n} people have bought tickets, so please keep your fingers crossed for me!\nTomorrow my train leaves at {train} in the morning, and I will be back in London by the evening.\nWith best wishes,\nOliver Smith'
    },

    // Museets samling: one exhibit card per room and band (12 in all). Every fact is checked against the source.
    cards: {
      M: {
        hallen: { title: 'Guldhornene', era: 'Jernalder', icon: 'horn', fact: 'De to guldhorn blev fundet ved Gallehus i Sønderjylland: det lange i 1639 af Kirsten Svendsdatter og det korte i 1734 af Erik Lassen. De blev lavet omkring år 400.', src: 'https://lex.dk/Guldhornene' },
        oldtiden: { title: 'Solvognen', era: 'Bronzealder', icon: 'sol', fact: 'Solvognen blev pløjet op i Trundholm Mose i 1902. Den er fra omkring 1400 f.Kr. Finderen tog den med hjem, og hans børn legede med den, før museet fik den.', src: 'https://lex.dk/Solvognen' },
        vikingetiden: { title: 'Den store Jellingsten', era: 'Vikingetid', icon: 'sten', fact: 'Harald Blåtand rejste stenen omkring år 965. På den står der, at han vandt hele Danmark og Norge og gjorde danerne kristne. Derfor kaldes den »Danmarks dåbsattest«.', src: 'https://natmus.dk/historisk-viden/danmark/oldtid-indtil-aar-1050/vikingetiden-800-1050/monumenterne-i-jelling/jellingstenen/' },
        middelalderen: { title: 'Markedsbyen Ribe', era: 'Middelalder', icon: 'by', fact: 'Ribe er Danmarks ældste by, der stadig findes. Den begyndte omkring år 705 som en handelsplads, og i middelalderen var Ribe en vigtig by.', src: 'https://lex.dk/Ribe' },
        renaessancen: { title: 'Rundetårn', era: 'Renæssance', icon: 'taarn', fact: 'Christian 4. lod Rundetårn bygge fra 1637 til 1642 som observatorium. Gennem tårnet snor sig en lang gang uden trin: Sneglegangen.', src: 'https://lex.dk/Rundetårn' },
        loftet: { title: 'Skaden', era: '1800-tallet og i dag', icon: 'skade', fact: 'En husskade vejer ca. 210 gram. Forskere fra University of Exeter testede i 2014, om skader stjæler skinnende ting. Det gjorde de ikke – de holdt sig væk fra de nye, blanke ting.', src: 'https://news-archive.exeter.ac.uk/2014/august/title_406690_en.html', src2: 'https://naturhistoriskmuseum.dk/viden-forskning/naturlex/fugle/husskade' }
      },
      U: {
        hallen: { title: 'Tyveriet i 1802', era: '1800-tallet', icon: 'noegle', fact: 'I natten mellem den 4. og 5. maj 1802 brød guldsmeden Niels Heidenreich ind i Kunstkammeret med nøgler, han selv havde lavet. Han smeltede Guldhornene om og blev fanget året efter.', src: 'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-late-iron-age/the-golden-horns/the-theft-of-the-golden-horns', src2: 'https://lex.dk/Niels_Heidenreich' },
        oldtiden: { title: 'Egtvedpigen', era: 'Bronzealder', icon: 'pige', fact: 'Egtvedpigen blev begravet i 1370 f.Kr. Det ved man, fordi årringene i egekisten viser, hvornår træet blev fældet. En blomst i kisten viser, at det var om sommeren.', src: 'https://lex.dk/Egtvedpigen' },
        vikingetiden: { title: 'Runerne', era: 'Vikingetid', icon: 'rune', fact: 'I vikingetiden havde runerækken kun 16 runer. Derfor kunne én rune stå for flere lyde: i også for e og j, t også for d, k også for g og b også for p.', src: 'https://snl.no/runer', src2: 'https://lex.dk/runer' },
        middelalderen: { title: 'Jyske Lov', era: 'Middelalder', icon: 'lov', fact: 'Jyske Lov blev givet af kong Valdemar Sejr i 1241. Den begynder med ordene: »Med lov skal land bygges«.', src: 'https://lex.dk/Jyske_Lov' },
        renaessancen: { title: 'Christian 4.', era: 'Renæssance', icon: 'krone', fact: 'Christian 4. blev konge i 1588, da han var knap 11 år, og døde i 1648. Han lod blandt andet Rundetårn, Børsen og Rosenborg bygge, og han mistede synet på sit højre øje i et søslag i 1644.', src: 'https://lex.dk/Christian_4.' },
        loftet: { title: 'Indskriften på det korte horn', era: 'Jernalder', icon: 'horn', fact: 'Indskriften på det korte guldhorn er skrevet med den ældre runerække: »ek hlewagastiR holtijaR horna tawido« – »Jeg, Lægæst, Holtes søn (eller: fra Holt), gjorde hornet.«', src: 'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-late-iron-age/the-golden-horns/', src2: 'https://lex.dk/Guldhornene' }
      }
    },

    // proper names and old words the Danish dictionary does not know (allowed in the spelling test)
    names: ['Lampe', 'Fjeder', 'Bang', 'Lise', 'Karl', 'Anton', 'Smith', 'Mr', 'Oliver', 'Svendsdatter', 'Lassen', 'Erik', 'Gallehus', 'Møgeltønder', 'Heidenreich', 'Niels',
      'Oehlenschläger', 'Kunstkammeret', 'Trundholm', 'Koelbjergmanden', 'Egtvedpigen', 'Tollundmanden', 'Hjortspringbåden', 'Jellingsten', 'Jellingstenen', 'Harald', 'Blåtand',
      'Rundetårn', 'Sneglegangen', 'Ribe', 'Valdemar', 'Sejr', 'Børsen', 'Rosenborg', 'Exeter', 'University', 'of', 'Lægæst', 'Holtes', 'Holt', 'ek', 'hlewagastiR', 'holtijaR', 'horna', 'tawido',
      'Aalborg', 'Adam', 'Christian', 'Kristi', 'Fyn', 'London', 'urmagerlup', 'urmagerlupen']
  };
  root.MU_STORY = MU_STORY;
  if (typeof module !== 'undefined') module.exports = MU_STORY;
})(typeof window !== 'undefined' ? window : this);
