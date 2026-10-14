/*
 * Robotkoden – baner. 5 verdener × 8 baner.
 * Hver bane er bygget ud fra en løsning (sol) skrevet i et lille sprog:
 *   F frem · L drej venstre · R drej højre · P kør funktion
 *   3( … ) gentag 3 gange · U( … ) gentag indtil målet · ?f( … | … ) hvis vej frem / ellers
 * Banen tegnes automatisk ud fra løsningen, så den altid kan løses.
 * Titler og tips er dansk tekst, som børnene ser.
 */
(function (root) {
  'use strict';
  var P1 = ['frem', 'venstre', 'hojre'], P2 = P1.concat(['gentag']), P4 = P1.concat(['indtil', 'hvis']), P5 = P1.concat(['gentag', 'kald']);

  var WORLDS = [
    { id: 1, name: 'Første skridt', desc: 'Frem og drej', from: 'Fra 8 år' },
    { id: 2, name: 'Gentag', desc: 'Løkker sparer blokke', from: 'Fra 8 år' },
    { id: 3, name: 'Fejlfinding', desc: 'Find og ret fejlen', from: 'Fra 9 år' },
    { id: 4, name: 'Hvis-så', desc: 'Robotten tjekker selv vejen', from: 'Fra 11 år' },
    { id: 5, name: 'Funktioner', desc: 'Løkker i løkker og egne funktioner', from: 'Fra 11 år' }
  ];

  var L = [
    // ---------- Verden 1: Første skridt ----------
    { id: '1-1', title: 'Lige ud', sol: 'FFFF', bat: 1, open: 0.2, hint: 'Tryk på Frem fire gange, og tryk så på Kør.' },
    { id: '1-2', title: 'Drej til højre', sol: 'FFRFF', bat: 1, open: 0.25, hint: 'Kør hen til hjørnet, drej til højre, og kør videre.' },
    { id: '1-3', title: 'Drej til venstre', sol: 'FFFLFF', bat: 1, open: 0.25, hint: 'Her skal robotten dreje til venstre. Tæl felterne før og efter svinget.' },
    { id: '1-4', title: 'Rundt om hjørnerne', sol: 'FFRFFRFF', bat: 2, open: 0.2, hint: 'Der er to sving. Tag ét sving ad gangen.' },
    { id: '1-5', title: 'Først et sving', sol: 'LFFRFFF', bat: 1, open: 0.25, hint: 'Robotten skal dreje, før den kører. Se, hvilken vej pilen peger.' },
    { id: '1-6', title: 'Den anden vej', sol: 'FFRRFFFFF', dir: 'W', revisit: true, bat: [2], open: 0.15, hint: 'Batteriet ligger bag robotten. Hent det, og vend så om ved at dreje to gange.' },
    { id: '1-7', title: 'Trappen', sol: 'FFRFLFRFLFRFLFF', bat: 2, open: 0.2, hint: 'Kør, drej, kør, drej … Kan du se mønsteret i trappen?' },
    { id: '1-8', title: 'Blindgyden', sol: 'FFRFLFRRFLF', revisit: true, bat: [4], open: 0.15, hint: 'Batteriet ligger i en blindgyde. Hent det, vend om, og kør videre til målet.' },

    // ---------- Verden 2: Gentag ----------
    { id: '2-1', title: 'Den lange gang', sol: '8(F)', limit: 3, bat: 2, open: 0.15, hint: 'Brug Gentag. Sæt Frem ind i Gentag-blokken, og vælg, hvor mange gange.' },
    { id: '2-2', title: 'Hjørnet', sol: '5(F)R5(F)', limit: 6, bat: 2, open: 0.2, hint: 'To lange stræk med et sving imellem. Brug en Gentag-blok til hvert stræk.' },
    { id: '2-3', title: 'Trappen igen', sol: '3(FRFL)F', limit: 8, bat: 2, open: 0.15, hint: 'Trappen er det samme mønster flere gange: Frem, Drej højre, Frem, Drej venstre.' },
    { id: '2-4', title: 'Rundt om søen', sol: '3(FFFR)', limit: 6, bat: 3, hint: 'Robotten kører tre sider rundt. Hvad gentager sig på hver side?' },
    { id: '2-5', title: 'Den store U-vending', sol: '6(F)L4(F)L6(F)', limit: 8, bat: 2, open: 0.15, hint: 'Tæl felterne på hver lige strækning, og brug Gentag til dem.' },
    { id: '2-6', title: 'Den store trappe', sol: '3(FFRFFL)', limit: 8, bat: 3, open: 0.15, hint: 'Hvert trin er: to frem, drej højre, to frem, drej venstre.' },
    { id: '2-7', title: 'Vend om', sol: 'RR4(F)L4(F)', limit: 8, bat: 2, open: 0.2, hint: 'Robotten kigger den forkerte vej fra start. Vend den først.' },
    { id: '2-8', title: 'Zigzag', sol: '3(FFLFFR)FF', limit: 9, bat: 3, open: 0.15, hint: 'Find det mønster, der gentager sig, og læg det i en Gentag-blok.' },

    // ---------- Verden 3: Fejlfinding ----------
    { id: '3-1', title: 'Forkert sving', sol: 'FFRFF', pre: 'FFLFF', bat: 1, open: 0.2, hint: 'Robotten drejer den forkerte vej. Hvilken blok skal skiftes ud?' },
    { id: '3-2', title: 'Et skridt mangler', sol: 'FFFRFF', pre: 'FFRFF', bat: 1, open: 0.15, hint: 'Robotten drejer for tidligt. Mangler der en Frem-blok?' },
    { id: '3-3', title: 'Tæl igen', sol: '6(F)', pre: '5(F)', limit: 3, bat: 1, open: 0.15, hint: 'Tallet i Gentag passer ikke helt. Tæl felterne.' },
    { id: '3-4', title: 'Byttet om', sol: '3(FRFL)F', pre: '3(FLFR)F', bat: 2, hint: 'To sving er byttet om inde i Gentag.' },
    { id: '3-5', title: 'Et sving for meget', sol: 'FFLFFRFF', pre: 'FFLFFLFF', bat: 1, open: 0.15, hint: 'Et af svingene går den forkerte vej.' },
    { id: '3-6', title: 'Glemt sving', sol: '4(F)R4(F)R4(F)', pre: '4(F)R4(F)4(F)', bat: 2, open: 0.15, hint: 'Der mangler et sving et sted i programmet.' },
    { id: '3-7', title: 'Fejl i løkken', sol: '2(FFRFFL)', pre: '2(FFRFF)', bat: 2, open: 0.15, hint: 'Mønsteret inde i Gentag er ikke helt færdigt.' },
    { id: '3-8', title: 'Den forkerte vej', sol: 'RR3(F)L3(F)', pre: '3(F)L3(F)', bat: 1, open: 0.15, hint: 'Robotten kører den forkerte vej fra start.' },

    // ---------- Verden 4: Hvis-så ----------
    { id: '4-1', title: 'Indtil målet', path: 'FFFFFFFFFF', sol: 'U(F)', limit: 2, bat: 1, palette: P1.concat(['indtil']), hint: 'Gentag indtil målet bliver ved, indtil robotten står på ladestationen.' },
    { id: '4-2', title: 'Højre om', path: 'FFFFFRFFFFRFFFFRFFRFF', sol: 'U(?f(F|R))', limit: 4, bat: 2, hint: 'Kør frem, hvis der er vej. Hvis ikke, så drej til højre. Læg det i Gentag indtil målet.' },
    { id: '4-3', title: 'Venstre om', path: 'FFFFFLFFFFLFFFFLFFLFF', sol: 'U(?f(F|L))', limit: 4, bat: 2, hint: 'Samme idé som før, men nu drejer vejen til venstre.' },
    { id: '4-4', title: 'Snoet vej', path: 'FFRFFLFFLFFRFFRFF', sol: 'U(?f(F|?l(L|R)))', limit: 6, bat: 2, hint: 'Vejen drejer begge veje. Sæt en Hvis ind i ellers-delen af en anden Hvis for at vælge sving.' },
    { id: '4-5', title: 'Batterijagt', path: 'FFFLFFFRFFRFFFFLFF', sol: 'U(?f(F|?l(L|R)))', limit: 6, bat: 3, hint: 'Det samme program kan køre hele vejen. Batterierne samles op undervejs.' },
    { id: '4-6', title: 'Den lange slange', path: 'FFFFRFFLFFLFFFFRFFRFFLFF', sol: 'U(?f(F|?l(L|R)))', limit: 6, bat: 3, hint: 'Et kort program kan klare en lang vej, hvis det tjekker, hvor der er vej.' },
    { id: '4-7', title: 'Start mod muren', path: 'RFFFLFFRFFFRFF', dir: 'N', sol: 'U(?f(F|?l(L|R)))', limit: 6, bat: 2, hint: 'Robotten starter med næsen mod en mur. Dit program skal kunne klare det.' },
    { id: '4-8', title: 'Labyrinten', path: 'FFLFFFRFFRFFLFFFLFFRFFFRFF', sol: 'U(?f(F|?l(L|R)))', limit: 6, bat: 3, hint: 'Byg et program, der altid finder vejen: frem, hvis det kan, ellers drej.' },

    // ---------- Verden 5: Funktioner ----------
    { id: '5-1', title: 'Løkke i løkke', sol: '3(5(F)R)', limit: 4, bat: 3, palette: P2, hint: 'Du kan sætte en Gentag inde i en anden Gentag.' },
    { id: '5-2', title: 'Store trin', sol: '2(3(F)L3(F)R)', limit: 7, bat: 2, palette: P2, open: 0.15, hint: 'Hvert trin er tre frem, et sving, tre frem og et sving. Brug Gentag inde i Gentag.' },
    { id: '5-3', title: 'Din første funktion', sol: 'PRP', f: 'FFRFFL', limit: 9, bat: 2, open: 0.1, hint: 'Byg et stykke program under Funktion. Brug så Kør funktion i programmet, hver gang du skal bruge det.' },
    { id: '5-4', title: 'Trappe, sving, trappe', sol: '2(P)FR2(P)', f: 'FFLFFR', limit: 12, bat: 2, open: 0.1, hint: 'Læg et trin i funktionen. Så kan du bruge det både før og efter svinget.' },
    { id: '5-5', title: 'Bølgen', sol: '3(P)FL3(P)FR3(P)', f: 'FRFL', limit: 14, bat: 3, hint: 'Ned, op og ned igen: et lille trin bruges mange gange.' },
    { id: '5-6', title: 'Bjerget', sol: '3(P)FR3(P)', f: 'FLFR', limit: 10, bat: 2, hint: 'Op ad bjerget og ned igen. Hvert lille trin er det samme.' },
    { id: '5-7', title: 'Tre og tre', sol: '2(P)L2(P)', f: '3(F)R', limit: 8, bat: 2, open: 0.1, hint: 'Funktionen kan selv indeholde en Gentag.' },
    { id: '5-8', title: 'Mesterprøven', sol: '2(P)FR2(P)', f: '2(F)L2(F)R', limit: 12, bat: 3, hint: 'Brug alt, du har lært: funktion, Gentag og sving.' }
  ];

  L.forEach(function (d) {
    d.world = +d.id.charAt(0);
    if (!d.palette) d.palette = d.world === 1 ? P1 : d.world <= 3 ? P2 : d.world === 4 ? P4 : P5;
  });

  var api = { worlds: WORLDS, defs: L };
  root.RK_LEVELS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
