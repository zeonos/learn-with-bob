/*
 * Laboratoriet – forsøg, spørgsmål og forklaringer. Alt her er dansk tekst, som børnene ser.
 * Hver opgave laves af en lille generator, så der kommer nye tal og ting hver gang.
 * Opgavetyper:
 *   poe   = forudsig → se forsøget → forklar (Predict–Observe–Explain)
 *   build = byg eller indstil noget, og tryk »Prøv«
 *   calc  = regn et tal ud
 *   order = sæt i rækkefølge
 *   sort  = sortér i kasser
 *   mc    = vælg det rigtige svar
 * Kilder til tallene står i tools/korrektur-laboratoriet.html.
 */
(function (root) {
  'use strict';
  var Sim = root.LabSim || (typeof require !== 'undefined' ? require('./sim.js') : null);

  /* ================= STATIONS ================= */
  var stations = [
    { id: 'tank', name: 'Vandtanken', desc: 'Flyde, synke og massefylde', color: '#3E8FC4' },
    { id: 'board', name: 'Strømbordet', desc: 'Pærer, ledninger og kontakter', color: '#E0A526' },
    { id: 'lever', name: 'Vægtstangen', desc: 'Vipper, kræfter og tandhjul', color: '#8A5A3B' },
    { id: 'kitchen', name: 'Kemikøkkenet', desc: 'Is, damp, syrer og baser', color: '#B0479B' },
    { id: 'eco', name: 'Økosystemet', desc: 'Fødekæder og dyrebestande', color: '#3F8A3A' }
  ];

  /* ================= FACTS (Opdagelser i logbogen) ================= */
  var facts = {
    float: { t: 'Flyde eller synke', x: 'En ting flyder, hvis den vejer mindre end den samme mængde vand. Vejer den mere, synker den. Det er tingens massefylde, der bestemmer det – ikke om den er stor eller lille.' },
    salt: { t: 'Saltvand bærer bedre', x: 'Saltvand vejer mere end den samme mængde almindeligt vand. Derfor kan et æg flyde i meget salt vand, selv om det synker i postevand.' },
    shape: { t: 'Formen betyder noget', x: 'En kugle af modellervoks synker, men formet som en båd flyder den. Båden skubber meget mere vand til side, og vandet skubber igen opad. Det kaldes opdrift.' },
    ice: { t: 'Isbjerge', x: 'Is vejer lidt mindre end vand, så isen flyder. Men ca. ni tiendedele af isen er under vandet. Derfor er isbjerge farlige for skibe.' },
    orange: { t: 'Luft i skrællen', x: 'Appelsinens skræl er fuld af små luftlommer. Med skræl flyder appelsinen. Uden skræl synker den.' },
    density: { t: 'Massefylde', x: 'Massefylde er, hvor meget 1 cm³ af et stof vejer. Man regner den ud som masse divideret med rumfang. Vand har massefylden 1 g/cm³.' },
    column: { t: 'Væsker i lag', x: 'Væsker, der ikke blander sig, lægger sig i lag. Den med den mindste massefylde ligger øverst, og den med den største ligger nederst.' },
    boat: { t: 'Hvor meget kan en båd bære?', x: 'En båd kan bære, indtil den vejer lige så meget som det vand, den kan skubbe til side. Et skib i saltvand kan bære mere end i ferskvand.' },
    river: { t: 'Skibe i ferskvand', x: 'Ferskvand har mindre massefylde end havvand. Når et skib sejler fra havet ind i en flod, synker det lidt dybere ned i vandet.' },

    circuit: { t: 'En lukket strømkreds', x: 'Strømmen skal kunne løbe hele vejen rundt fra batteriets ene pol, gennem pæren og tilbage til den anden pol. Er der et hul i kredsen, lyser pæren ikke.' },
    conductor: { t: 'Ledere og isolatorer', x: 'Metaller og grafit leder strøm. De kaldes ledere. Plastik, træ, gummi, glas og papir leder ikke strøm. De kaldes isolatorer.' },
    switch: { t: 'Kontakten', x: 'En kontakt åbner og lukker strømkredsen. Når kontakten er lukket, kan strømmen løbe, og pæren lyser.' },
    series: { t: 'Serieforbindelse', x: 'I en serieforbindelse sidder pærerne efter hinanden i én kreds. Pærerne lyser svagere, og går den ene ud, slukker de alle.' },
    parallel: { t: 'Parallelforbindelse', x: 'I en parallelforbindelse har hver pære sin egen vej til batteriet. Pærerne lyser lige så kraftigt som én pære alene, og går den ene ud, lyser de andre videre.' },
    short: { t: 'Kortslutning', x: 'En ledning direkte fra batteriets plus til minus giver en kortslutning. Næsten al strømmen løber uden om pæren, og batteriet bliver varmt. Det kan være farligt.' },
    ohm: { t: 'Ohms lov', x: 'Spænding = resistans · strømstyrke (U = R · I). Spændingen måles i volt (V), resistansen i ohm (Ω) og strømstyrken i ampere (A).' },
    energy: { t: 'Energi skifter form', x: 'Energi forsvinder ikke, den skifter bare form. En pære laver elektrisk energi om til lys og varme. Et batteri laver kemisk energi om til elektrisk energi.' },

    lever: { t: 'Vægtstangen', x: 'En vippe vipper mod den side, hvor vægt gange afstand til midten er størst. En lille vægt langt ude kan holde balance med en stor vægt tæt på midten.' },
    door: { t: 'Lange arme er lette', x: 'Jo længere fra omdrejningspunktet man skubber, jo mindre kraft skal man bruge. Derfor sidder dørhåndtaget langt fra hængslerne.' },
    gears: { t: 'Tandhjul', x: 'To tandhjul, der griber ind i hinanden, drejer hver sin vej. Det lille hjul drejer flere gange rundt, hver gang det store drejer én gang.' },
    moment: { t: 'Kraftmoment', x: 'Moment = kraft · arm. Der er balance, når momentet på venstre side er lige så stort som på højre side.' },
    ratio: { t: 'Udveksling', x: 'Udvekslingen er forholdet mellem antallet af tænder. Har det store hjul 40 tænder og det lille 10, drejer det lille hjul 4 gange rundt for hver omgang på det store.' },
    bike: { t: 'Cyklens gear', x: 'Med et stort tandhjul foran og et lille bagpå er det tungt at træde, men cyklen kører langt, hver gang pedalerne drejer en omgang. Et lille tandhjul foran og et stort bagpå er let at træde op ad bakke.' },

    states: { t: 'Tilstandsformer', x: 'Vand kan være fast (is), flydende (vand) og på gasform (vanddamp). Ved 0 °C smelter is, og ved 100 °C koger vand.' },
    words: { t: 'Smelte, fryse, fordampe', x: 'Is smelter til vand. Vand fryser til is. Vand fordamper til damp. Damp kondenserer til små dråber, når den bliver kølet af.' },
    cycle: { t: 'Vandets kredsløb', x: 'Solen varmer havet, og vandet fordamper. Dampen bliver kølet af højt oppe og bliver til skyer. Det regner, og vandet løber gennem åer tilbage til havet.' },
    cabbage: { t: 'Rødkålssaft som indikator', x: 'Rødkålssaft skifter farve: rød i syrer, lilla i neutrale væsker og blå, grøn eller gul i baser. Sådan et stof kaldes en indikator.' },
    fizz: { t: 'Eddike og natron', x: 'Når eddike og natron blandes, dannes gassen kuldioxid. Det er boblerne, du ser.' },
    ph: { t: 'pH-skalaen', x: 'pH går fra 0 til 14. Under 7 er surt, 7 er neutralt, og over 7 er basisk. Jo lavere pH, jo surere.' },
    neutral: { t: 'Neutralisation', x: 'En syre og en base ophæver hinanden. Hvis der kommer lige meget af dem, bliver væsken neutral, og der dannes salt og vand.' },
    btb: { t: 'Bromthymolblåt', x: 'Indikatoren bromthymolblåt (BTB) er gul i syrer, grøn i neutrale væsker og blå i baser.' },
    titration: { t: 'Titrering', x: 'Når syren og basen er lige stærke, skal man bruge lige mange milliliter af dem for at få en neutral væske.' },
    danger: { t: 'Pas på stærke baser', x: 'Afløbsrens er en meget stærk base og kan ætse huden. Brug altid handsker og briller, og lad en voksen hjælpe.' },

    chain: { t: 'Fødekæder', x: 'En fødekæde viser, hvem der spiser hvem. Den starter altid med en plante, som får sin energi fra solen.' },
    roles: { t: 'Producenter og forbrugere', x: 'Planter er producenter: de laver selv deres føde ved hjælp af sollys. Planteædere spiser planter, og rovdyr spiser andre dyr.' },
    decomp: { t: 'Nedbrydere', x: 'Nedbrydere som regnorme, bænkebidere og svampe spiser døde planter og dyr og laver dem om til næring i jorden.' },
    balance: { t: 'Balance i naturen', x: 'Hvis et dyr forsvinder fra en fødekæde, ændrer det hele kæden. Uden ræve bliver der flere harer, indtil der ikke er græs nok til dem alle.' },
    photo: { t: 'Fotosyntese', x: 'Planter bruger sollys, vand og kuldioxid til at lave sukker. Samtidig afgiver de ilt, som dyr og mennesker ånder.' },
    pyramid: { t: 'Energipyramiden', x: 'Kun ca. 10 % af energien går videre til næste led i en fødekæde. Resten bruges til at leve og forsvinder som varme. Derfor er der færre rovdyr end planteædere.' },
    web: { t: 'Fødenet', x: 'I naturen hænger mange fødekæder sammen i et fødenet. Ændres ét led, kan det mærkes flere led væk.' },
    cycles: { t: 'Bestande går op og ned', x: 'Når der er mange harer, får rævene meget mad og får flere unger. Så bliver der spist flere harer, og bagefter får rævene sværere ved at finde mad.' }
  };

  /* ================= helpers ================= */
  function pick(R, a) { return a[Math.floor(R() * a.length)]; }
  function shuffle(R, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function num(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }
  function opts(R, right, wrong) { return { options: shuffle(R, [right].concat(wrong)), answer: right }; }

  /* ================= 1. VANDTANKEN ================= */
  // massefylde i g/cm³ (afrundede værdier fra opslagsværker); pron = den/det
  var objects = {
    kork: { name: 'Kork', def: 'korken', pron: 'den', rho: 0.24 },
    trae: { name: 'Træklods', def: 'træklodsen', pron: 'den', rho: 0.5 },
    aeble: { name: 'Æble', def: 'æblet', pron: 'det', rho: 0.8 },
    is: { name: 'Isterning', def: 'isterningen', pron: 'den', rho: 0.92 },
    lys: { name: 'Stearinlys', def: 'stearinlyset', pron: 'det', rho: 0.9 },
    and: { name: 'Badeand', def: 'badeanden', pron: 'den', rho: 0.3, note: 'hul og fuld af luft' },
    flaske: { name: 'Tom flaske med låg', def: 'den tomme flaske', pron: 'den', rho: 0.1 },
    sten: { name: 'Sten', def: 'stenen', pron: 'den', rho: 2.6 },
    moent: { name: 'Mønt', def: 'mønten', pron: 'den', rho: 8.9 },
    noegle: { name: 'Nøgle', def: 'nøglen', pron: 'den', rho: 8.5 },
    glaskugle: { name: 'Glaskugle', def: 'glaskuglen', pron: 'den', rho: 2.5 },
    viskelaeder: { name: 'Viskelæder', def: 'viskelæderet', pron: 'det', rho: 1.4 },
    soem: { name: 'Søm', def: 'sømmet', pron: 'det', rho: 7.9 },
    aeg: { name: 'Æg', def: 'ægget', pron: 'det', rho: 1.05 },
    ler: { name: 'Modellervoks', def: 'modellervoksen', pron: 'den', rho: 1.6 },
    appelsin: { name: 'Appelsin', def: 'appelsinen', pron: 'den', rho: 0.85 },
    appelsin2: { name: 'Appelsin uden skræl', def: 'den skrællede appelsin', pron: 'den', rho: 1.05 }
  };
  var liquids = {
    vand: { name: 'Vand', def: 'vandet', rho: 1.0, color: '#9FD3EE' },
    saltvand: { name: 'Meget salt vand', def: 'det salte vand', rho: 1.2, color: '#BFE3F2' },
    olie: { name: 'Madolie', def: 'olien', rho: 0.92, color: '#F2D25C' },
    sirup: { name: 'Sirup', def: 'siruppen', rho: 1.4, color: '#C77B2A' }
  };
  var floaters = ['kork', 'trae', 'aeble', 'is', 'lys', 'and', 'flaske'], sinkers = ['sten', 'moent', 'noegle', 'glaskugle', 'viskelaeder', 'soem'];

  function explainFloat(R, o, floats) {
    var P = cap(o.pron), nt = o.pron === 'det' ? 't' : ''; // adjective agreement: den er hård / det er hårdt
    return floats
      ? Object.assign({ q: 'Hvad er den bedste forklaring?' }, opts(R, P + ' vejer mindre end den samme mængde vand.', [P + ' er lille og let.', P + ' er hård' + nt + '.', P + ' har en glat overflade.']))
      : Object.assign({ q: 'Hvad er den bedste forklaring?' }, opts(R, P + ' vejer mere end den samme mængde vand.', [P + ' er tung' + nt + '.', P + ' er stor' + nt + '.', P + ' har skarpe kanter.']));
  }
  var gen = {};
  gen['tank-float'] = function (R, used) {
    var pool = (R() < 0.5 ? floaters : sinkers).filter(function (k) { return !used[k]; });
    var id = pick(R, pool.length ? pool : floaters), o = objects[id], fl = Sim.floatIn(o.rho, 1).floats; used[id] = 1;
    return { type: 'poe', station: 'tank', scene: { kind: 'tank', liquid: 'vand', obj: id },
      q: 'Vi lægger ' + o.def + ' i vandet. Flyder eller synker ' + o.pron + '?',
      options: ['Flyder', 'Synker'], answer: fl ? 'Flyder' : 'Synker', result: cap(o.def) + (fl ? ' flyder.' : ' synker til bunds.'),
      explain: explainFloat(R, o, fl), fact: 'float' };
  };
  gen['tank-egg'] = function (R) {
    return { type: 'poe', station: 'tank', scene: { kind: 'tank', liquid: 'vand', obj: 'aeg', then: { liquid: 'saltvand' } },
      q: 'Ægget synker i almindeligt vand. Hvad sker der, når vi rører masser af salt ud i vandet?',
      options: ['Ægget flyder op', 'Ægget bliver liggende på bunden', 'Ægget går i stykker'], answer: 'Ægget flyder op', result: 'Ægget flyder op i det salte vand.',
      explain: Object.assign({ q: 'Hvorfor flyder ægget nu?' }, opts(R, 'Saltvand vejer mere end den samme mængde almindeligt vand.', ['Saltet gør ægget lettere.', 'Saltet gør vandet varmt.', 'Ægget kan lide salt.'])), fact: 'salt' };
  };
  gen['tank-clay'] = function (R) {
    return { type: 'poe', station: 'tank', scene: { kind: 'tank', liquid: 'vand', obj: 'ler', then: { boat: true } },
      q: 'En kugle af modellervoks synker. Hvad sker der, hvis vi former den samme modellervoks som en båd?',
      options: ['Båden flyder', 'Båden synker', 'Den synker halvt og bliver hængende'], answer: 'Båden flyder', result: 'Båden af modellervoks flyder.',
      explain: Object.assign({ q: 'Hvorfor flyder båden?' }, opts(R, 'Båden skubber meget mere vand til side end kuglen.', ['Modellervoksen bliver lettere, når man former den.', 'Båden er lavet af en anden slags modellervoks.', 'Vandet bliver tungere.'])), fact: 'shape' };
  };
  gen['tank-ice'] = function (R) {
    return { type: 'poe', station: 'tank', scene: { kind: 'tank', liquid: 'vand', obj: 'is', ruler: true },
      q: 'En isterning flyder. Hvor meget af den er under vandet?',
      options: ['Næsten det hele', 'Cirka halvdelen', 'Kun en lille smule'], answer: 'Næsten det hele', result: 'Ca. ni tiendedele af isterningen er under vandet.',
      explain: Object.assign({ q: 'Hvorfor ligger isen så dybt?' }, opts(R, 'Is vejer kun lidt mindre end den samme mængde vand.', ['Isen er kold.', 'Isen er glat.', 'Isen smelter i bunden.'])), fact: 'ice' };
  };
  gen['tank-orange'] = function (R) {
    return { type: 'poe', station: 'tank', scene: { kind: 'tank', liquid: 'vand', obj: 'appelsin', then: { obj: 'appelsin2' } },
      q: 'En appelsin med skræl flyder. Hvad sker der, når vi piller skrællen af og prøver igen?',
      options: ['Den synker', 'Den flyder højere oppe', 'Den flyder ligesom før'], answer: 'Den synker', result: 'Den skrællede appelsin synker.',
      explain: Object.assign({ q: 'Hvorfor synker den nu?' }, opts(R, 'Skrællen er fuld af små luftlommer, som holdt appelsinen oppe.', ['Appelsinen bliver tungere uden skræl.', 'Saften løber ud i vandet.', 'Skrællen var lavet af plastik.'])), fact: 'orange' };
  };
  gen['tank-sort'] = function (R) {
    var items = shuffle(R, floaters).slice(0, 3).concat(shuffle(R, sinkers).slice(0, 3));
    return { type: 'sort', station: 'tank', q: 'Hvad flyder, og hvad synker i vand? Tryk på den rigtige kasse.',
      bins: [{ id: 'f', name: 'Flyder' }, { id: 's', name: 'Synker' }],
      items: shuffle(R, items).map(function (k) { return { id: k, name: objects[k].name, bin: objects[k].rho < 1 ? 'f' : 's', icon: k }; }), fact: 'float' };
  };
  // Udskoling
  gen['tank-rho'] = function (R) {
    var rho = pick(R, [0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1.2, 1.5, 2, 2.5]), V = pick(R, [20, 40, 50, 80, 100, 120, 200]), m = Math.round(rho * V * 100) / 100;
    return { type: 'calc', station: 'tank', scene: { kind: 'scale', m: m, V: V },
      q: 'En klods vejer ' + num(m) + ' g og har rumfanget ' + V + ' cm³. Hvad er klodsens massefylde?', unit: 'g/cm³', answer: rho,
      hint: 'Massefylde = masse : rumfang', solution: num(m) + ' g : ' + V + ' cm³ = ' + num(rho) + ' g/cm³', fact: 'density',
      after: 'Klodsen ' + (rho < 1 ? 'flyder' : 'synker') + ' i vand, fordi ' + num(rho) + (rho < 1 ? ' er mindre' : ' er større') + ' end 1.' };
  };
  gen['tank-block'] = function (R) {
    var liq = pick(R, ['olie', 'vand', 'saltvand', 'sirup']), L = liquids[liq], rho;
    do { rho = Math.round((0.3 + R() * 1.5) * 10) / 10; } while (Math.abs(rho - L.rho) < 0.1);
    var fl = rho < L.rho;
    return { type: 'poe', station: 'tank', scene: { kind: 'tank', liquid: liq, obj: 'klods', rho: rho },
      q: 'En klods har massefylden ' + num(rho) + ' g/cm³. Den kommer i ' + L.name.toLowerCase() + ' med massefylden ' + num(L.rho) + ' g/cm³. Flyder eller synker den?',
      options: ['Flyder', 'Synker'], answer: fl ? 'Flyder' : 'Synker', result: 'Klodsen ' + (fl ? 'flyder.' : 'synker til bunds.'),
      explain: Object.assign({ q: 'Hvorfor?' }, opts(R, fl ? 'Klodsens massefylde er mindre end væskens.' : 'Klodsens massefylde er større end væskens.',
        [fl ? 'Klodsens massefylde er større end væskens.' : 'Klodsens massefylde er mindre end væskens.', 'Væsker kan aldrig bære en klods.', 'Det afhænger kun af, hvor stor klodsen er.'])), fact: 'density' };
  };
  gen['tank-column'] = function (R) {
    return { type: 'order', station: 'tank', scene: { kind: 'column' },
      q: 'Vi hælder sirup, vand og madolie i det samme glas. Hvilken rækkefølge lægger de sig i? Start med det øverste lag.',
      items: [{ id: 'olie', name: 'Madolie (0,92 g/cm³)' }, { id: 'vand', name: 'Vand (1,00 g/cm³)' }, { id: 'sirup', name: 'Sirup (1,40 g/cm³)' }],
      hint: 'Den væske, der har den mindste massefylde, ligger øverst.', fact: 'column' };
  };
  gen['tank-boat'] = function (R) {
    var V = pick(R, [400, 500, 600, 800]), m = pick(R, [50, 100, 150]), liq = pick(R, ['vand', 'saltvand']), w = 50;
    var capG = Sim.boatCapacity(V, m, liquids[liq].rho), max = Math.floor(capG / w + 1e-9);
    return { type: 'build', station: 'tank', scene: { kind: 'boat', V: V, m: m, liquid: liq, w: w, max: max },
      q: 'Båden har et rumfang på ' + V + ' cm³ og vejer ' + m + ' g. Den sejler i ' + liquids[liq].name.toLowerCase() + '. Læg så mange lodder på 50 g i båden som muligt, uden at den synker.',
      answer: max, hint: 'Båden kan bære, til den vejer lige så meget som ' + V + ' cm³ ' + liquids[liq].name.toLowerCase() + '. 1 cm³ ' + liquids[liq].name.toLowerCase() + ' vejer ' + num(liquids[liq].rho) + ' g.',
      solution: V + ' cm³ · ' + num(liquids[liq].rho) + ' g/cm³ = ' + num(V * liquids[liq].rho) + ' g. Minus bådens egen vægt: ' + num(capG) + ' g. Det er ' + max + ' lodder.', fact: 'boat' };
  };
  gen['tank-river'] = function (R) {
    return { type: 'poe', station: 'tank', scene: { kind: 'ship' },
      q: 'Et fragtskib sejler fra havet ind i en stor flod med ferskvand. Hvad sker der med skibet?',
      options: ['Det synker lidt dybere ned', 'Det ligger lidt højere i vandet', 'Det ligger præcis som før'], answer: 'Det synker lidt dybere ned', result: 'Skibet ligger dybere i ferskvandet.',
      explain: Object.assign({ q: 'Hvorfor?' }, opts(R, 'Ferskvand har mindre massefylde end havvand.', ['Ferskvand er koldere end havvand.', 'Floden er mere lavvandet.', 'Skibet bliver tungere i floden.'])), fact: 'river' };
  };

  /* ================= 2. STRØMBORDET ================= */
  var materials = {
    soem: { name: 'Søm', a: 'et søm', why: 'Sømmet er lavet af jern, og metaller leder strøm.', cond: true }, moent: { name: 'Mønt', a: 'en mønt', why: 'Mønten er lavet af metal, og metaller leder strøm.', cond: true }, folie: { name: 'Sølvpapir', a: 'et stykke sølvpapir', why: 'Sølvpapir er lavet af aluminium, og metaller leder strøm.', cond: true },
    blyant: { name: 'Blyantsstift', a: 'en blyantsstift', why: 'Blyantsstiften er lavet af grafit, og grafit leder strøm.', cond: true, R: 6 }, clips: { name: 'Papirclips', a: 'en papirclips', why: 'Papirclipsen er lavet af metal, og metaller leder strøm.', cond: true },
    viskelaeder: { name: 'Viskelæder', a: 'et viskelæder', stof: 'gummi', cond: false }, lineal: { name: 'Plastiklineal', a: 'en plastiklineal', stof: 'plastik', cond: false }, pind: { name: 'Træpind', a: 'en træpind', stof: 'træ', cond: false },
    glas: { name: 'Glas', a: 'et stykke glas', stof: 'glas', cond: false }, papir: { name: 'Papir', a: 'et stykke papir', stof: 'papir', cond: false }, elastik: { name: 'Elastik', a: 'en elastik', stof: 'gummi', cond: false }
  };
  // A loop on a 3×3 board: battery left, bulb right; 'gap' marks a slot the player fills.
  function loop(extra) {
    var parts = [{ slot: 'v:0:0', type: 'battery', lock: 1 }, { slot: 'v:1:0', type: 'wire', lock: 1 }, { slot: 'v:0:2', type: 'bulb', lock: 1 }, { slot: 'v:1:2', type: 'wire', lock: 1 },
      { slot: 'h:0:0', type: 'wire', lock: 1 }, { slot: 'h:0:1', type: 'wire', lock: 1 }, { slot: 'h:2:0', type: 'wire', lock: 1 }, { slot: 'h:2:1', type: 'wire', lock: 1 }];
    return parts.filter(function (p) { return !(extra || []).some(function (x) { return x === p.slot; }); });
  }
  gen['board-light'] = function (R) {
    // battery and bulb are placed; some wires are missing
    var all = loop(), missing = shuffle(R, all.filter(function (p) { return p.type === 'wire'; })).slice(0, 2 + Math.floor(R() * 2));
    var parts = all.filter(function (p) { return missing.indexOf(p) < 0; });
    return { type: 'build', station: 'board', scene: { kind: 'board', cols: 3, rows: 3, parts: parts, tools: { wire: missing.length + 2 }, goal: 'lit' },
      q: 'Pæren lyser ikke. Sæt ledninger på, så strømmen kan løbe hele vejen rundt, og tryk på »Tænd«.',
      hint: 'Følg vejen fra batteriets ene ende, gennem pæren og tilbage til batteriets anden ende. Hvor mangler der en ledning?', solution: { add: missing.map(function (p) { return p.slot; }) }, fact: 'circuit' };
  };
  gen['board-material'] = function (R, used) {
    var keys = Object.keys(materials).filter(function (k) { return !used['m' + k]; }), want = R() < 0.5;
    var pool = keys.filter(function (k) { return materials[k].cond === want; }); if (!pool.length) pool = keys;
    var id = pick(R, pool), m = materials[id]; used['m' + id] = 1;
    var parts = loop(['h:0:1']).concat([{ slot: 'h:0:1', type: 'material', mat: id, cond: m.cond, R: m.R, lock: 1 }]);
    return { type: 'poe', station: 'board', scene: { kind: 'board', cols: 3, rows: 3, parts: parts, run: true },
      q: 'Vi sætter ' + m.a + ' ind i strømkredsen. Lyser pæren?',
      options: ['Ja, pæren lyser', 'Nej, pæren lyser ikke'], answer: m.cond ? 'Ja, pæren lyser' : 'Nej, pæren lyser ikke',
      result: m.cond ? (m.R ? 'Pæren lyser svagt. Grafitten i blyanten leder strøm, men ikke så godt som metal.' : 'Pæren lyser.') : 'Pæren lyser ikke.',
      explain: Object.assign({ q: 'Hvorfor?' }, opts(R, m.cond ? m.why : cap(m.stof) + ' er en isolator og leder ikke strøm.',
        m.cond ? ['Alle hårde ting leder strøm.', 'Pæren lyser altid, når batteriet er nyt.', 'Strømmen hopper over stykket.'] : ['Stykket er for lille.', 'Batteriet er fladt.', 'Pæren er gået i stykker.'])), fact: 'conductor' };
  };
  gen['board-switch'] = function (R) {
    var parts = loop(['h:0:1']);
    return { type: 'build', station: 'board', scene: { kind: 'board', cols: 3, rows: 3, parts: parts, tools: { switch: 1, wire: 1 }, goal: 'switch' },
      q: 'Byg en kontakt ind i strømkredsen, så man kan tænde og slukke pæren. Tryk derefter på »Tænd«.',
      hint: 'Kontakten skal sidde der, hvor der mangler en ledning, så strømmen skal igennem den.', solution: { add: ['h:0:1'], type: 'switch' }, fact: 'switch' };
  };
  gen['board-series-out'] = function (R) {
    var parts = loop(['h:0:1']).concat([{ slot: 'h:0:1', type: 'bulb', lock: 1 }]);
    return { type: 'poe', station: 'board', scene: { kind: 'board', cols: 3, rows: 3, parts: parts, run: true, remove: 'h:0:1' },
      q: 'To pærer sidder efter hinanden i én strømkreds. Hvad sker der med den anden pære, når vi skruer den ene ud?',
      options: ['Den slukker også', 'Den lyser stærkere', 'Den lyser ligesom før'], answer: 'Den slukker også', result: 'Begge pærer slukker.',
      explain: Object.assign({ q: 'Hvorfor?' }, opts(R, 'Der kommer et hul i kredsen, så strømmen ikke kan komme hele vejen rundt.', ['Batteriet slukker af sig selv.', 'Pærerne deler én glødetråd.', 'Den anden pære bliver for varm.'])), fact: 'series' };
  };
  gen['board-insulator'] = function (R) {
    return { type: 'mc', station: 'board', q: 'Hvad kalder man et materiale, som ikke leder strøm?',
      options: shuffle(R, ['En isolator', 'En leder', 'En kontakt', 'Et batteri']), answer: 'En isolator', fact: 'conductor' };
  };
  // Udskoling
  function twoBulbs(parallel) {
    return parallel
      ? loop().concat([{ slot: 'v:0:1', type: 'bulb', lock: 1 }, { slot: 'v:1:1', type: 'wire', lock: 1 }])
      : loop(['h:0:1']).concat([{ slot: 'h:0:1', type: 'bulb', lock: 1 }]);
  }
  gen['board-series-par'] = function (R) {
    var par = R() < 0.5;
    return { type: 'poe', station: 'board', scene: { kind: 'board', cols: 3, rows: 3, parts: twoBulbs(par), run: true },
      q: par ? 'To pærer er parallelkoblet til ét batteri. Hvor kraftigt lyser de i forhold til én pære alene?' : 'To pærer er seriekoblet til ét batteri. Hvor kraftigt lyser de i forhold til én pære alene?',
      options: ['Svagere', 'Lige så kraftigt', 'Stærkere'], answer: par ? 'Lige så kraftigt' : 'Svagere', result: par ? 'Begge pærer lyser lige så kraftigt som én pære alene.' : 'Begge pærer lyser svagere end én pære alene.',
      explain: Object.assign({ q: 'Hvorfor?' }, par
        ? opts(R, 'Hver pære har sin egen vej til batteriet og får hele spændingen.', ['Batteriet bliver stærkere af to pærer.', 'Pærerne deler spændingen mellem sig.', 'Strømmen løber kun gennem den ene pære.'])
        : opts(R, 'Pærerne deler spændingen fra batteriet mellem sig.', ['Den første pære bruger al strømmen.', 'Batteriet bliver svagere af to pærer.', 'Pærerne får hver sin vej til batteriet.'])), fact: par ? 'parallel' : 'series' };
  };
  gen['board-parallel'] = function (R) {
    var parts = loop();
    return { type: 'build', station: 'board', scene: { kind: 'board', cols: 3, rows: 3, parts: parts, tools: { bulb: 1, wire: 2 }, goal: 'parallel' },
      q: 'Sæt en pære mere ind, så begge pærer lyser lige så kraftigt som én pære alene. Tryk på »Tænd«.',
      hint: 'Den nye pære skal have sin egen vej mellem de to ledninger, der går til batteriet – ikke sidde efter den første pære.', solution: { add: ['v:0:1', 'v:1:1'], types: ['bulb', 'wire'] }, fact: 'parallel' };
  };
  gen['board-ohm-i'] = function (R) {
    var c = pick(R, [[1.5, 3, 0.5], [3, 6, 0.5], [4.5, 9, 0.5], [6, 12, 0.5], [9, 3, 3], [12, 4, 3], [12, 6, 2], [6, 3, 2], [4.5, 3, 1.5], [9, 18, 0.5]]);
    return { type: 'calc', station: 'board', scene: { kind: 'meter', U: c[0], R: c[1] },
      q: 'Et batteri på ' + num(c[0]) + ' V er koblet til en pære med resistansen ' + c[1] + ' Ω. Hvor stor er strømstyrken?', unit: 'A', answer: c[2],
      hint: 'Ohms lov: I = U : R', solution: num(c[0]) + ' V : ' + c[1] + ' Ω = ' + num(c[2]) + ' A', fact: 'ohm' };
  };
  gen['board-ohm-r'] = function (R) {
    var c = pick(R, [[4.5, 0.5, 9], [6, 0.5, 12], [12, 2, 6], [9, 3, 3], [3, 0.25, 12], [12, 0.5, 24], [6, 1.5, 4], [230, 0.5, 460]]);
    return { type: 'calc', station: 'board', scene: { kind: 'meter', U: c[0], I: c[1] },
      q: 'Spændingen er ' + num(c[0]) + ' V, og der løber ' + num(c[1]) + ' A gennem pæren. Hvor stor er pærens resistans?', unit: 'Ω', answer: c[2],
      hint: 'Ohms lov: R = U : I', solution: num(c[0]) + ' V : ' + num(c[1]) + ' A = ' + num(c[2]) + ' Ω', fact: 'ohm' };
  };
  gen['board-short'] = function (R) {
    var parts = loop().concat([{ slot: 'v:0:1', type: 'wire', lock: 1, warn: 1 }, { slot: 'v:1:1', type: 'wire', lock: 1, warn: 1 }]);
    return { type: 'poe', station: 'board', scene: { kind: 'board', cols: 3, rows: 3, parts: parts, run: true },
      q: 'Vi sætter en ekstra ledning fra batteriets plus direkte til minus, ved siden af pæren. Hvad sker der?',
      options: ['Pæren slukker, og batteriet bliver varmt', 'Pæren lyser dobbelt så kraftigt', 'Der sker ingenting'], answer: 'Pæren slukker, og batteriet bliver varmt', result: 'Kortslutning! Pæren slukker.',
      explain: Object.assign({ q: 'Hvorfor slukker pæren?' }, opts(R, 'Strømmen tager den nemmeste vej gennem ledningen uden om pæren.', ['Ledningen suger strømmen ud af pæren.', 'Pæren springer.', 'Batteriet vender strømmen om.'])), fact: 'short' };
  };
  gen['board-energy'] = function (R) {
    var items = [
      ['i en glødepære', 'Elektrisk energi bliver til lys og varme'], ['i batteriet i en lommelygte', 'Kemisk energi bliver til elektrisk energi'],
      ['i en solcelle', 'Lysenergi bliver til elektrisk energi'], ['i en elmotor', 'Elektrisk energi bliver til bevægelsesenergi'], ['i en vindmølle', 'Bevægelsesenergi bliver til elektrisk energi']
    ], it = pick(R, items);
    return { type: 'mc', station: 'board', q: 'Hvad sker der med energien ' + it[0] + '?',
      options: shuffle(R, shuffle(R, items.map(function (x) { return x[1]; }).filter(function (x) { return x !== it[1]; })).slice(0, 3).concat([it[1]])),
      answer: it[1], fact: 'energy' };
  };

  /* ================= 3. VÆGTSTANGEN ================= */
  function weightsText(ws) {
    return ws.map(function (w) { return w.kg + ' kg på plads ' + Math.abs(w.pos) + ' til ' + (w.pos < 0 ? 'venstre' : 'højre'); }).join(' og ');
  }
  gen['lever-tilt'] = function (R) {
    var ws = [{ pos: -(1 + Math.floor(R() * 5)), kg: 1 + Math.floor(R() * 4) }, { pos: 1 + Math.floor(R() * 5), kg: 1 + Math.floor(R() * 4) }];
    if (R() < 0.4) { var p2; do { p2 = 1 + Math.floor(R() * 5); } while (p2 === ws[1].pos); ws.push({ pos: p2, kg: 1 + Math.floor(R() * 2) }); }
    var res = Sim.lever(ws);
    var right = { left: 'Mod venstre', right: 'Mod højre', balance: 'Den er i balance' }[res.tilt];
    // make the »heavier side« misconception a real trap: the side with most kilos is not always the side that goes down
    return { type: 'poe', station: 'lever', scene: { kind: 'lever', weights: ws },
      q: 'Hvilken vej vipper vippen, når vi slipper den?', options: ['Mod venstre', 'Den er i balance', 'Mod højre'], answer: right,
      result: 'Kilo gange plads giver ' + res.left + ' på venstre side og ' + res.right + ' på højre side. ' + (res.tilt === 'balance' ? 'Der er balance.' : 'Vippen vipper ' + right.toLowerCase() + '.'),
      explain: Object.assign({ q: 'Hvad bestemmer, hvilken vej den vipper?' }, opts(R, 'Vægten gange afstanden til midten på hver side.', ['Kun hvor mange kilo der er på hver side.', 'Kun hvor langt ude vægtene står.', 'Hvor mange lodder der er på hver side.'])), fact: 'lever' };
  };
  gen['lever-balance'] = function (R) {
    var sol, kg, pos, mine;
    do { kg = 1 + Math.floor(R() * 4); pos = 1 + Math.floor(R() * 5); mine = pick(R, [1, 2, 3, 4, 6]); sol = kg * pos / mine; } while (sol !== Math.round(sol) || sol < 1 || sol > 5 || sol === pos);
    return { type: 'build', station: 'lever', scene: { kind: 'lever', weights: [{ pos: -pos, kg: kg, lock: 1 }], tray: [mine], goal: 'balance' },
      q: 'Der står ' + kg + ' kg på plads ' + pos + ' til venstre. Sæt loddet på ' + mine + ' kg på højre side, så vippen kommer i balance.',
      answer: sol, hint: 'Venstre side: ' + kg + ' kg · ' + pos + ' = ' + kg * pos + '. Hvor langt ude skal ' + mine + ' kg stå for at give det samme?', solution: 'Plads ' + sol + ': ' + mine + ' kg · ' + sol + ' = ' + kg * pos + '.', fact: 'lever' };
  };
  gen['lever-gear-dir'] = function (R) {
    var n = 2 + Math.floor(R() * 3), teeth = []; for (var i = 0; i < n; i++) teeth.push(pick(R, [10, 12, 16, 20, 24]));
    var first = pick(R, ['med uret', 'mod uret']), lastSame = (n - 1) % 2 === 0, ans = lastSame ? first : (first === 'med uret' ? 'mod uret' : 'med uret');
    return { type: 'poe', station: 'lever', scene: { kind: 'gears', teeth: teeth, dir: first === 'med uret' ? 1 : -1 },
      q: ['To', 'Tre', 'Fire'][n - 2] + ' tandhjul griber ind i hinanden. Det første drejer ' + first + '. Hvilken vej drejer det sidste?',
      options: ['Med uret', 'Mod uret'], answer: cap(ans), result: 'Det sidste tandhjul drejer ' + ans + '.',
      explain: Object.assign({ q: 'Hvad er reglen?' }, opts(R, 'To tandhjul, der griber ind i hinanden, drejer hver sin vej.', ['Alle tandhjul drejer samme vej.', 'Store tandhjul drejer altid med uret.', 'Det afhænger af, hvor hurtigt man drejer.'])), fact: 'gears' };
  };
  gen['lever-door'] = function (R) {
    return { type: 'mc', station: 'lever', scene: { kind: 'door' }, q: 'Hvor er det lettest at skubbe en tung dør op?',
      options: shuffle(R, ['Langt fra hængslerne', 'Tæt ved hængslerne', 'Midt på døren', 'Det er lige let overalt']), answer: 'Langt fra hængslerne', fact: 'door' };
  };
  gen['lever-seesaw'] = function (R) {
    return { type: 'mc', station: 'lever', q: 'En far og hans lille datter vil vippe sammen. Hvor skal faren sidde?',
      options: shuffle(R, ['Tættere på midten end datteren', 'Lige så langt ude som datteren', 'Længere ude end datteren']), answer: 'Tættere på midten end datteren', fact: 'lever' };
  };
  // Udskoling
  gen['lever-calc-pos'] = function (R) {
    var kg, pos, mine, sol;
    do { kg = 2 + Math.floor(R() * 7); pos = 1 + Math.floor(R() * 6); mine = 1 + Math.floor(R() * 8); sol = kg * pos / mine; } while (sol !== Math.round(sol) || sol < 1 || sol > 8 || mine === kg);
    return { type: 'calc', station: 'lever', scene: { kind: 'lever', weights: [{ pos: -pos, kg: kg }], ask: mine },
      q: 'Et lod på ' + kg + ' kg står ' + pos + ' m til venstre for omdrejningspunktet. Hvor langt til højre skal et lod på ' + mine + ' kg stå for at give balance?', unit: 'm', answer: sol,
      hint: 'Kilo gange afstand skal være lige stort på begge sider. Venstre side: ' + kg + ' · ' + pos + ' = ' + kg * pos + '.', solution: kg * pos + ' : ' + mine + ' = ' + sol + ' m', fact: 'moment' };
  };
  gen['lever-calc-kg'] = function (R) {
    var kg, pos, at, sol;
    do { kg = 1 + Math.floor(R() * 9); pos = 1 + Math.floor(R() * 6); at = 1 + Math.floor(R() * 6); sol = kg * pos / at; } while (sol !== Math.round(sol) || at === pos || sol > 20);
    return { type: 'calc', station: 'lever', scene: { kind: 'lever', weights: [{ pos: -pos, kg: kg }], askAt: at },
      q: 'Et lod på ' + kg + ' kg står ' + pos + ' m til venstre. Hvor mange kilo skal der stå ' + at + ' m til højre for at give balance?', unit: 'kg', answer: sol,
      hint: 'Venstre side: ' + kg + ' · ' + pos + ' = ' + kg * pos + '. Hvad gange ' + at + ' giver det samme?', solution: kg * pos + ' : ' + at + ' = ' + sol + ' kg', fact: 'moment' };
  };
  gen['lever-ratio'] = function (R) {
    var c = pick(R, [[40, 10], [30, 10], [36, 12], [48, 12], [60, 20], [50, 10], [32, 8], [45, 15]]);
    return { type: 'calc', station: 'lever', scene: { kind: 'gears', teeth: c, dir: 1 },
      q: 'Et tandhjul med ' + c[0] + ' tænder driver et tandhjul med ' + c[1] + ' tænder. Hvor mange omgange drejer det lille hjul, når det store drejer én omgang?', unit: 'omgange', answer: c[0] / c[1],
      hint: 'Hver tand på det store hjul skubber én tand på det lille hjul videre. ' + c[0] + ' tænder skal passere.', solution: c[0] + ' : ' + c[1] + ' = ' + c[0] / c[1] + ' omgange', fact: 'ratio' };
  };
  gen['lever-fastest'] = function (R) {
    var teeth = shuffle(R, [12, 20, 36]);
    var small = teeth.indexOf(12), names = ['Hjul A', 'Hjul B', 'Hjul C'];
    return { type: 'poe', station: 'lever', scene: { kind: 'gears', teeth: teeth, dir: 1, labels: names },
      q: 'Tre tandhjul griber ind i hinanden: A har ' + teeth[0] + ' tænder, B har ' + teeth[1] + ' og C har ' + teeth[2] + '. Hvilket hjul drejer hurtigst rundt?',
      options: names, answer: names[small], result: names[small] + ' med 12 tænder drejer hurtigst.',
      explain: Object.assign({ q: 'Hvorfor?' }, opts(R, 'Det hjul, der har færrest tænder, skal dreje flest gange rundt.', ['Det første hjul drejer altid hurtigst.', 'Det største hjul drejer hurtigst.', 'Alle hjulene drejer lige hurtigt.'])), fact: 'gears' };
  };
  gen['lever-bike'] = function (R) {
    return { type: 'mc', station: 'lever', scene: { kind: 'bike' }, q: 'På en cykel sidder kæden på det største tandhjul foran og det mindste bagpå. Hvordan er det at træde?',
      options: shuffle(R, ['Tungt, men cyklen kører hurtigt', 'Let, men cyklen kører langsomt', 'Let, og cyklen kører hurtigt', 'Der er ingen forskel']), answer: 'Tungt, men cyklen kører hurtigt', fact: 'bike' };
  };
  gen['lever-balance2'] = function (R) {
    var kg, pos, a, b, guard = 0, sols;
    do {
      kg = 2 + Math.floor(R() * 5); pos = 2 + Math.floor(R() * 4); a = 1 + Math.floor(R() * 3); b = 1 + Math.floor(R() * 3);
      sols = []; for (var x = 1; x <= 5; x++) for (var y = 1; y <= 5; y++) if (a * x + b * y === kg * pos && x !== y) sols.push([x, y]);
    } while (!sols.length && guard++ < 200);
    return { type: 'build', station: 'lever', scene: { kind: 'lever', weights: [{ pos: -pos, kg: kg, lock: 1 }], tray: [a, b], goal: 'balance' },
      q: 'Der står ' + kg + ' kg på plads ' + pos + ' til venstre. Sæt begge lodder (' + a + ' kg og ' + b + ' kg) på højre side, så vippen kommer i balance.',
      answer: sols[0], hint: 'Venstre side giver ' + kg * pos + '. Lodderne på højre side skal tilsammen give ' + kg * pos + ' (kilo gange plads).', solution: a + ' kg på plads ' + sols[0][0] + ' og ' + b + ' kg på plads ' + sols[0][1] + ': ' + a * sols[0][0] + ' + ' + b * sols[0][1] + ' = ' + kg * pos + '.', fact: 'moment' };
  };

  /* ================= 4. KEMIKØKKENET ================= */
  // pH-værdier er afrundede typiske værdier
  var substances = {
    citron: { name: 'Citronsaft', pH: 2 }, eddike: { name: 'Eddike', pH: 3 }, cola: { name: 'Cola', pH: 3 }, danskvand: { name: 'Danskvand', pH: 5, n: 1 },
    maelk: { name: 'Mælk', pH: 6.5 }, vand: { name: 'Postevand', pH: 7, n: 1 }, natron: { name: 'Natron opløst i vand', pH: 8.5 },
    salmiak: { name: 'Salmiakspiritus', pH: 11 }, afloeb: { name: 'Afløbsrens', pH: 13, danger: true }
  };
  var acidName = { sur: 'Sur', neutral: 'Neutral', basisk: 'Basisk' };
  gen['kitchen-heat'] = function (R) {
    var g = pick(R, [
      { start: -10, goal: 'koge', q: 'Gryden er fuld af is ved −10 °C. Skru op for varmen, til vandet koger, og tryk på »Prøv«.', ok: function (t) { return t >= 100; }, hint: 'Vand koger ved 100 °C.' },
      { start: -15, goal: 'smelte', q: 'Gryden er fuld af is ved −15 °C. Indstil temperaturen, så isen smelter, men vandet ikke koger.', ok: function (t) { return t > 0 && t < 100; }, hint: 'Is smelter, når temperaturen kommer over 0 °C.' },
      { start: 20, goal: 'fryse', q: 'Gryden er fuld af vand ved 20 °C. Indstil temperaturen, så vandet fryser til is.', ok: function (t) { return t < 0; }, hint: 'Vand fryser, når temperaturen kommer under 0 °C.' }
    ]);
    return { type: 'build', station: 'kitchen', scene: { kind: 'thermo', start: g.start, goal: g.goal }, q: g.q, check: g.ok, hint: g.hint, solution: g.hint, fact: 'states' };
  };
  gen['kitchen-words'] = function (R) {
    var w = pick(R, [['Når is bliver til vand, hedder det, at isen …', 'smelter'], ['Når vand bliver til is, hedder det, at vandet …', 'fryser'],
      ['Når vand bliver til damp, hedder det, at vandet …', 'fordamper'], ['Når damp bliver til små dråber på et koldt spejl, hedder det, at dampen …', 'kondenserer']]);
    return { type: 'mc', station: 'kitchen', q: w[0], options: shuffle(R, ['smelter', 'fryser', 'fordamper', 'kondenserer']), answer: w[1], fact: 'words' };
  };
  gen['kitchen-cycle'] = function (R) {
    return { type: 'order', station: 'kitchen', scene: { kind: 'cycle' }, q: 'Sæt vandets kredsløb i rækkefølge. Start ved havet.',
      items: [{ id: 'a', name: 'Solen varmer havet, og vandet fordamper' }, { id: 'b', name: 'Dampen køles af og bliver til skyer' }, { id: 'c', name: 'Det regner eller sner' }, { id: 'd', name: 'Vandet løber gennem åer tilbage til havet' }],
      hint: 'Vandet skal først op i luften, før der kan komme skyer og regn.', fact: 'cycle' };
  };
  gen['kitchen-cabbage'] = function (R, used) {
    var keys = Object.keys(substances).filter(function (k) { return !used['s' + k] && !substances[k].danger && substances[k].pH !== 6.5 && substances[k].pH !== 5 && k !== 'cola'; });
    var id = pick(R, keys), s = substances[id], a = Sim.acidity(s.pH); used['s' + id] = 1;
    return { type: 'poe', station: 'kitchen', scene: { kind: 'beaker', sub: id, ind: 'cabbage' },
      q: 'Vi drypper rødkålssaft i ' + s.name.toLowerCase() + '. Er ' + s.name.toLowerCase() + (s.n ? ' surt, neutralt eller basisk?' : ' sur, neutral eller basisk?'),
      options: ['Sur', 'Neutral', 'Basisk'], answer: acidName[a], result: 'Rødkålssaften bliver ' + ({ sur: 'rød', neutral: 'lilla', basisk: s.pH > 10 ? 'grøn' : 'blå' })[a] + '. ' + s.name + ' er ' + a + (s.n && a !== 'basisk' ? 't' : '') + '.',
      explain: Object.assign({ q: 'Hvilken farve giver rødkålssaft i en syre?' }, opts(R, 'Rød', ['Lilla', 'Grøn', 'Blå'])), fact: 'cabbage' };
  };
  gen['kitchen-fizz'] = function (R) {
    return { type: 'poe', station: 'kitchen', scene: { kind: 'fizz' }, q: 'Vi hælder eddike ned i en flaske med natron og sætter en ballon over åbningen. Hvad sker der?',
      options: ['Ballonen bliver pustet op', 'Ballonen bliver suget ned i flasken', 'Der sker ingenting'], answer: 'Ballonen bliver pustet op', result: 'Det bobler, og ballonen bliver pustet op.',
      explain: Object.assign({ q: 'Hvad puster ballonen op?' }, opts(R, 'Der dannes gassen kuldioxid.', ['Eddiken fordamper.', 'Natronen bliver varm og udvider sig.', 'Der kommer luft ind udefra.'])), fact: 'fizz' };
  };
  gen['kitchen-mirror'] = function (R) {
    return { type: 'mc', station: 'kitchen', q: 'Efter et varmt bad dugger spejlet. Hvor kommer dråberne fra?',
      options: shuffle(R, ['Vanddamp i luften kondenserer på det kolde spejl', 'Spejlet sveder', 'Vandet kommer ud gennem glasset', 'Sæben laver dråber']), answer: 'Vanddamp i luften kondenserer på det kolde spejl', fact: 'words' };
  };
  // Udskoling
  gen['kitchen-titrate'] = function (R) {
    var va = pick(R, [10, 15, 20]), ca = pick(R, [0.1, 0.2]), cb = pick(R, [0.1, 0.2]); var vb = ca * va / cb;
    if (vb !== Math.round(vb) || vb > 40) { ca = 0.1; cb = 0.1; vb = va; }
    return { type: 'build', station: 'kitchen', scene: { kind: 'titration', ca: ca, va: va, cb: cb, target: vb },
      q: 'Bægerglasset indeholder ' + va + ' ml saltsyre (' + num(ca) + ' mol/L) med bromthymolblåt. Tilsæt natriumhydroxid (' + num(cb) + ' mol/L), til væsken bliver grøn og neutral. Tryk så på »Færdig«.',
      answer: vb, hint: 'Syren og basen ophæver hinanden. Med lige stærke væsker skal du bruge lige mange milliliter – ellers regn med koncentrationerne.',
      solution: 'Syre og base ophæver hinanden, når c₁ · V₁ = c₂ · V₂: ' + num(ca) + ' · ' + va + ' = ' + num(cb) + ' · ' + vb + '. Der skal bruges ' + vb + ' ml.', fact: 'titration' };
  };
  gen['kitchen-titrate-calc'] = function (R) {
    var c = pick(R, [[0.1, 20, 0.1, 20], [0.2, 10, 0.1, 20], [0.1, 30, 0.2, 15], [0.2, 25, 0.1, 50], [0.5, 10, 0.1, 50], [0.1, 40, 0.2, 20]]);
    return { type: 'calc', station: 'kitchen', scene: { kind: 'beaker', ph: 2, ind: 'btb' },
      q: 'Hvor mange ml natriumhydroxid (' + num(c[2]) + ' mol/L) skal der til for at neutralisere ' + c[1] + ' ml saltsyre (' + num(c[0]) + ' mol/L)?', unit: 'ml', answer: c[3],
      hint: 'Stofmængden af syre skal være lig med stofmængden af base: c₁ · V₁ = c₂ · V₂', solution: num(c[0]) + ' · ' + c[1] + ' : ' + num(c[2]) + ' = ' + c[3] + ' ml', fact: 'neutral' };
  };
  gen['kitchen-ph'] = function (R) {
    var a = pick(R, [1, 2, 3, 4, 5]), b; do { b = pick(R, [3, 4, 5, 6, 8, 9, 10, 12]); } while (b <= a);
    return { type: 'mc', station: 'kitchen', q: 'Væske A har pH ' + a + ', og væske B har pH ' + b + '. Hvilken væske er surest?',
      options: ['Væske A', 'Væske B', 'De er lige sure'], answer: 'Væske A', fact: 'ph' };
  };
  gen['kitchen-sort'] = function (R) {
    var ids = ['citron', 'eddike', 'cola', 'vand', 'natron', 'salmiak', 'afloeb'];
    return { type: 'sort', station: 'kitchen', q: 'Sortér væskerne: sur, neutral eller basisk?',
      bins: [{ id: 'sur', name: 'Sur' }, { id: 'neutral', name: 'Neutral' }, { id: 'basisk', name: 'Basisk' }],
      items: shuffle(R, ids).slice(0, 6).map(function (k) { return { id: k, name: substances[k].name, bin: Sim.acidity(substances[k].pH) }; }), fact: 'ph' };
  };
  gen['kitchen-salt'] = function (R) {
    return { type: 'mc', station: 'kitchen', q: 'Saltsyre og natriumhydroxid neutraliserer hinanden. Hvad dannes der?',
      options: shuffle(R, ['Salt og vand', 'Kuldioxid og ilt', 'Sukker og vand', 'Brint og ilt']), answer: 'Salt og vand', fact: 'neutral' };
  };
  gen['kitchen-drain'] = function (R) {
    return { type: 'poe', station: 'kitchen', scene: { kind: 'beaker', sub: 'afloeb', ind: 'cabbage' },
      q: 'Læreren drypper rødkålssaft i lidt fortyndet afløbsrens (pH 13). Hvilken farve bliver det?',
      options: ['Gul', 'Rød', 'Lilla'], answer: 'Gul', result: 'Rødkålssaften bliver gul. Afløbsrens er en meget stærk base.',
      explain: Object.assign({ q: 'Hvad skal man huske, når man arbejder med afløbsrens?' }, opts(R, 'Handsker og briller, for den ætser huden.', ['Den er ufarlig, fordi den ikke er en syre.', 'Den kan drikkes, hvis den er fortyndet.', 'Den skal varmes op først.'])), fact: 'danger' };
  };

  /* ================= 5. ØKOSYSTEMET ================= */
  var organisms = {
    graes: { name: 'Græs', def: 'græsset', role: 'producent' }, hare: { name: 'Hare', def: 'haren', role: 'planteæder' }, raev: { name: 'Ræv', def: 'ræven', role: 'rovdyr' },
    blade: { name: 'Egeblade', def: 'egebladene', role: 'producent' }, larve: { name: 'Sommerfuglelarve', def: 'sommerfuglelarven', role: 'planteæder' }, musvit: { name: 'Musvit', def: 'musvitten', role: 'rovdyr' }, spurvehoeg: { name: 'Spurvehøg', def: 'spurvehøgen', role: 'rovdyr' },
    alger: { name: 'Alger', def: 'algerne', role: 'producent' }, dafnier: { name: 'Dafnier', def: 'dafnierne', role: 'planteæder' }, skalle: { name: 'Skalle', def: 'skallen', role: 'rovdyr' }, gedde: { name: 'Gedde', def: 'gedden', role: 'rovdyr' },
    plankton: { name: 'Planteplankton', def: 'planteplanktonet', role: 'producent' }, dyreplankton: { name: 'Dyreplankton', def: 'dyreplanktonet', role: 'planteæder' }, sild: { name: 'Sild', def: 'silden', role: 'rovdyr' }, torsk: { name: 'Torsk', def: 'torsken', role: 'rovdyr' }, saelen: { name: 'Sæl', def: 'sælen', role: 'rovdyr' },
    salat: { name: 'Salat', def: 'salaten', role: 'producent' }, snegl: { name: 'Snegl', def: 'sneglen', role: 'planteæder' }, pindsvin: { name: 'Pindsvin', def: 'pindsvinet', role: 'rovdyr' },
    korn: { name: 'Korn', def: 'kornet', role: 'producent' }, mus: { name: 'Mus', def: 'musen', role: 'planteæder' }, taarnfalk: { name: 'Tårnfalk', def: 'tårnfalken', role: 'rovdyr' },
    regnorm: { name: 'Regnorm', def: 'regnormen', role: 'nedbryder' }, svamp: { name: 'Svamp', def: 'svampen', role: 'nedbryder' }, baenkebider: { name: 'Bænkebider', def: 'bænkebideren', role: 'nedbryder' }
  };
  var chains = [
    { where: 'på marken', ids: ['graes', 'hare', 'raev'] },
    { where: 'i skoven', ids: ['blade', 'larve', 'musvit', 'spurvehoeg'] },
    { where: 'i søen', ids: ['alger', 'dafnier', 'skalle', 'gedde'] },
    { where: 'i havet', ids: ['plankton', 'dyreplankton', 'sild', 'torsk', 'saelen'] },
    { where: 'i haven', ids: ['salat', 'snegl', 'pindsvin'] },
    { where: 'på kornmarken', ids: ['korn', 'mus', 'taarnfalk'] }
  ];
  var roleName = { producent: 'Producent', 'planteæder': 'Planteæder', rovdyr: 'Rovdyr', nedbryder: 'Nedbryder' };
  gen['eco-chain'] = function (R, used, band) {
    var pool = chains.filter(function (c) { return (band === 'U' ? c.ids.length >= 4 : c.ids.length <= 4) && !used['c' + c.where]; });
    var c = pick(R, pool.length ? pool : chains); used['c' + c.where] = 1;
    return { type: 'order', station: 'eco', scene: { kind: 'chain', where: c.where },
      q: 'Lav fødekæden ' + c.where + '. Start med den, der bliver spist først.', items: c.ids.map(function (k) { return { id: k, name: organisms[k].name, icon: k }; }),
      hint: 'En fødekæde starter altid med en plante.', fact: 'chain' };
  };
  gen['eco-roles'] = function (R) {
    var ids = shuffle(R, ['graes', 'blade', 'alger', 'korn']).slice(0, 2).concat(shuffle(R, ['hare', 'larve', 'snegl', 'mus']).slice(0, 2), shuffle(R, ['raev', 'spurvehoeg', 'gedde', 'taarnfalk']).slice(0, 2));
    return { type: 'sort', station: 'eco', q: 'Er det en producent, en planteæder eller et rovdyr?',
      bins: [{ id: 'producent', name: 'Producent' }, { id: 'planteæder', name: 'Planteæder' }, { id: 'rovdyr', name: 'Rovdyr' }],
      items: shuffle(R, ids).map(function (k) { return { id: k, name: organisms[k].name, bin: organisms[k].role, icon: k }; }), fact: 'roles' };
  };
  gen['eco-nofox'] = function (R) {
    return { type: 'poe', station: 'eco', scene: { kind: 'pop', hares: 60, foxes: 10, remove: 'foxes' },
      q: 'På en eng lever harer og ræve. Hvad sker der med antallet af harer, hvis alle rævene forsvinder?',
      options: ['Der kommer flere harer', 'Der kommer færre harer', 'Antallet af harer ændrer sig ikke'], answer: 'Der kommer flere harer', result: 'Harerne bliver flere og flere, til der ikke er græs nok til flere.',
      explain: Object.assign({ q: 'Hvorfor holder harerne op med at blive flere til sidst?' }, opts(R, 'Der er ikke græs nok til flere harer.', ['Harerne bliver trætte af at få unger.', 'Rævene kommer tilbage med det samme.', 'Harer kan kun blive 50.'])), fact: 'balance' };
  };
  gen['eco-nohare'] = function (R) {
    return { type: 'poe', station: 'eco', scene: { kind: 'pop', hares: 60, foxes: 10, remove: 'hares' },
      q: 'En sygdom får alle harerne på engen til at forsvinde. Hvad sker der med rævene, hvis de ikke kan finde anden mad?',
      options: ['De bliver færre', 'De bliver flere', 'Der sker ingenting med dem'], answer: 'De bliver færre', result: 'Rævene bliver færre, fordi de ikke kan finde mad nok.',
      explain: Object.assign({ q: 'Hvorfor?' }, opts(R, 'Rævene har ikke mad nok til at overleve og få unger.', ['Rævene spiser græsset i stedet.', 'Rævene bliver også syge af harerne.', 'Rævene flytter altid om vinteren.'])), fact: 'balance' };
  };
  gen['eco-decomp'] = function (R) {
    var right = pick(R, ['regnorm', 'svamp', 'baenkebider']);
    return { type: 'mc', station: 'eco', q: 'Hvem af dem er en nedbryder, som laver døde blade om til ny jord?',
      options: shuffle(R, [organisms[right].name, 'Ræv', 'Græs', 'Hare']), answer: organisms[right].name, fact: 'decomp' };
  };
  gen['eco-sun'] = function (R) {
    return { type: 'mc', station: 'eco', q: 'Hvor får planterne den energi fra, som de bruger til at vokse?',
      options: shuffle(R, ['Fra sollyset', 'Fra jorden', 'Fra regnormene', 'Fra luften om natten']), answer: 'Fra sollyset', fact: 'roles' };
  };
  // Udskoling
  gen['eco-pyramid'] = function (R) {
    var start = pick(R, [10000, 20000, 50000, 100000, 30000]), link = pick(R, [2, 3, 4]), ans = Sim.energyAt(start, link);
    var c = pick(R, chains.filter(function (x) { return x.ids.length >= link; }));
    function f(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    return { type: 'calc', station: 'eco', scene: { kind: 'pyramid', ids: c.ids.slice(0, link) },
      q: 'I fødekæden ' + c.ids.slice(0, link).map(function (k) { return organisms[k].name.toLowerCase(); }).join(' → ') + ' har ' + organisms[c.ids[0]].def + ' ' + f(start) + ' kJ energi. Ca. 10 % går videre til hvert nyt led. Hvor meget energi når frem til ' + organisms[c.ids[link - 1]].def + '?',
      unit: 'kJ', answer: Math.round(ans), hint: '10 % er det samme som at dividere med 10. Gør det for hvert led.', solution: c.ids.slice(0, link).map(function (k, i) { return organisms[k].name + ': ' + f(start / Math.pow(10, i)) + ' kJ'; }).join(' → '), fact: 'pyramid' };
  };
  gen['eco-photo'] = function (R) {
    var q = pick(R, [['Hvad bruger en plante til fotosyntesen?', 'Sollys, vand og kuldioxid', ['Sollys, vand og ilt', 'Sukker, vand og ilt', 'Jord, sukker og kuldioxid']],
      ['Hvad laver en plante ved fotosyntesen?', 'Sukker og ilt', ['Kuldioxid og vand', 'Jord og ilt', 'Sukker og kuldioxid']]]);
    return { type: 'mc', station: 'eco', q: q[0], options: shuffle(R, [q[1]].concat(q[2])), answer: q[1], fact: 'photo' };
  };
  gen['eco-web'] = function (R) {
    return { type: 'poe', station: 'eco', scene: { kind: 'chainview', ids: ['alger', 'dafnier', 'skalle', 'gedde'], remove: 'gedde' },
      q: 'I en sø lever alger, dafnier, skaller og gedder. Lystfiskere fanger næsten alle gedderne. Hvad sker der med algerne?',
      options: ['Der kommer flere alger', 'Der kommer færre alger', 'Algerne ændrer sig ikke'], answer: 'Der kommer flere alger',
      result: 'Uden gedder bliver der flere skaller. Skallerne spiser flere dafnier, og så er der færre dafnier til at spise algerne.',
      explain: Object.assign({ q: 'Hvad viser det?' }, opts(R, 'En ændring i ét led kan mærkes flere led væk i fødekæden.', ['Gedder spiser alger.', 'Alger vokser bedst om natten.', 'Fiskeri påvirker kun de fisk, der bliver fanget.'])), fact: 'web' };
  };
  gen['eco-cycles'] = function (R) {
    return { type: 'poe', station: 'eco', scene: { kind: 'pop', hares: 40, foxes: 8 },
      q: 'Vi følger harer og ræve på en eng i mange år. Hvad tror du, der sker med antallet af dem?',
      options: ['De går op og ned efter hinanden', 'Begge bliver ved med at stige', 'Begge er altid lige mange'], answer: 'De går op og ned efter hinanden',
      result: 'Først bliver harerne flere, så rævene. Så bliver harerne færre, og bagefter rævene.',
      explain: Object.assign({ q: 'Hvorfor kommer der flere ræve, kort efter at der er kommet mange harer?' }, opts(R, 'Rævene får meget mad og kan få flere unger.', ['Harerne lokker rævene til.', 'Ræve og harer får unger på samme tid.', 'Rævene spiser græsset fra harerne.'])), fact: 'cycles' };
  };
  gen['eco-fewer'] = function (R) {
    return { type: 'mc', station: 'eco', q: 'Hvorfor er der meget færre ræve end harer i naturen?',
      options: shuffle(R, ['Kun en lille del af energien går videre til næste led', 'Ræve får færre unger end harer', 'Ræve lever kortere end harer', 'Harer er bedre til at gemme sig']), answer: 'Kun en lille del af energien går videre til næste led', fact: 'pyramid' };
  };

  /* ================= ROUTES ================= */
  // Each round: 6 tasks, picked from the route's plan. Several ids in an array = one of them at random.
  var routes = [
    { id: 'm-tank', b: 'M', st: 'tank', name: 'Flyder eller synker?', plan: ['tank-float', 'tank-float', 'tank-egg', 'tank-clay', 'tank-sort', ['tank-ice', 'tank-orange']] },
    { id: 'm-board', b: 'M', st: 'board', name: 'Få pæren til at lyse', plan: ['board-light', 'board-material', 'board-material', 'board-switch', 'board-series-out', 'board-insulator'] },
    { id: 'm-lever', b: 'M', st: 'lever', name: 'Vipper og tandhjul', plan: ['lever-tilt', 'lever-balance', 'lever-tilt', 'lever-gear-dir', ['lever-door', 'lever-seesaw'], 'lever-balance'] },
    { id: 'm-kitchen', b: 'M', st: 'kitchen', name: 'Is, vand og damp', plan: ['kitchen-heat', 'kitchen-words', 'kitchen-cycle', 'kitchen-cabbage', 'kitchen-fizz', ['kitchen-mirror', 'kitchen-cabbage']] },
    { id: 'm-eco', b: 'M', st: 'eco', name: 'Fødekæder', plan: ['eco-chain', 'eco-roles', 'eco-nofox', 'eco-chain', ['eco-decomp', 'eco-sun'], 'eco-nohare'] },
    { id: 'u-tank', b: 'U', st: 'tank', name: 'Massefylde og opdrift', plan: ['tank-rho', 'tank-block', 'tank-column', 'tank-boat', 'tank-river', 'tank-block'] },
    { id: 'u-board', b: 'U', st: 'board', name: 'Serie, parallel og Ohms lov', plan: ['board-series-par', 'board-parallel', 'board-ohm-i', 'board-short', 'board-ohm-r', 'board-energy'] },
    { id: 'u-lever', b: 'U', st: 'lever', name: 'Moment og udveksling', plan: ['lever-calc-pos', 'lever-balance2', 'lever-ratio', 'lever-fastest', 'lever-calc-kg', 'lever-bike'] },
    { id: 'u-kitchen', b: 'U', st: 'kitchen', name: 'Syrer og baser', plan: ['kitchen-sort', 'kitchen-ph', 'kitchen-titrate', 'kitchen-titrate-calc', 'kitchen-salt', 'kitchen-drain'] },
    { id: 'u-eco', b: 'U', st: 'eco', name: 'Fødenet og energi', plan: ['eco-pyramid', 'eco-photo', 'eco-web', 'eco-chain', 'eco-cycles', 'eco-fewer'] }
  ];
  function buildRound(route, R) {
    R = R || Math.random; var used = {};
    return route.plan.map(function (g) { var id = Array.isArray(g) ? pick(R, g) : g; var c = gen[id](R, used, route.b); c.gen = id; return c; });
  }

  var api = { stations: stations, facts: facts, objects: objects, liquids: liquids, materials: materials, substances: substances,
    organisms: organisms, chains: chains, roleName: roleName, routes: routes, gen: gen, buildRound: buildRound, num: num };
  root.LAB = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
