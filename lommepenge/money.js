/*
 * Lommepenge – penge, priser, varer og opgavegeneratorer. Ren logik uden DOM (bruges af game.js og af node-testen).
 * Alle beløb med kontanter regnes i øre (heltal), så der ikke opstår afrundingsfejl.
 * Priserne er cirkapriser fra 2026 og kan rettes her. Alle butikker, banker, selskaber og navne er opdigtede.
 * Fakta: mønter 50 øre, 1, 2, 5, 10 og 20 kr. (Lex: Mønt); sedler 50, 100, 200 og 500 kr. (Nationalbanken – 1000-kroneseddelen
 * er ikke gyldig længere); kontantbetaling rundes af til nærmeste 50 øre; moms 25 % (Skattestyrelsen).
 */
(function (root) {
  'use strict';
  // Moms i procent som decimaltal. Der er 25 % moms på alt i Danmark (2026). Der er politiske planer om lavere moms på fødevarer,
  // derfor bruger momsopgaverne kun varer, der ikke er mad (NONFOOD), så opgaverne stadig passer, hvis madmomsen ændres.
  var MOMS = 0.25;
  function S() { return root.STR.lp; }

  /* ---------- mønter og sedler (værdi i øre) ---------- */
  var DENOMS = [
    { v: 50, coin: true, metal: 'copper', mm: 21.5, hole: false },
    { v: 100, coin: true, metal: 'silver', mm: 20.25, hole: true },
    { v: 200, coin: true, metal: 'silver', mm: 24.5, hole: true },
    { v: 500, coin: true, metal: 'silver', mm: 28.5, hole: true },
    { v: 1000, coin: true, metal: 'gold', mm: 23.35, hole: false },
    { v: 2000, coin: true, metal: 'gold', mm: 27, hole: false },
    { v: 5000, coin: false, color: '#7B5EA7' },
    { v: 10000, coin: false, color: '#D9772B' },
    { v: 20000, coin: false, color: '#3E8E4F' },
    { v: 50000, coin: false, color: '#3E6DAE' }
  ];
  var VALUES = DENOMS.map(function (d) { return d.v; });
  var TILL = VALUES.filter(function (v) { return v <= 20000; }); // kasseapparatet og pungen: 50 øre til 200 kr.
  function denom(v) { return DENOMS.filter(function (d) { return d.v === v; })[0]; }

  /* ---------- data (indhold) ---------- */
  var NAMES = ['Ida', 'Noah', 'Freja', 'Oscar', 'Alma', 'Emil', 'Clara', 'Karl', 'Ella', 'Malik', 'Sofia', 'William', 'Aya', 'Lucas', 'Liva', 'Ali', 'Asta', 'Elias'];
  var SHOPS = ['Bobs Butik', 'Hjørnekiosken', 'Torvebutikken', 'Købmand Mønt', 'Lavprisladen'];
  var BANKS = ['Klokkebanken', 'Mågebanken', 'Lynlånet', 'Egernkassen'];
  var CARRIERS = ['Snakkesalig', 'Mobilmågen', 'Ringeklokken', 'Pladdermobil'];

  // Varer i Bobs butik. p = mulige priser i kr. (cirkapriser 2026). offer = bruges i tilbudsopgaver (hele kroner).
  var ITEMS = [
    { id: 'is', a: 'en is', pl: 'is', label: 'Is', p: [15, 18, 20, 22], cat: 'kiosk', offer: true },
    { id: 'sodavand', a: 'en sodavand', pl: 'sodavand', label: 'Sodavand', p: [15, 18, 20], cat: 'kiosk', offer: true },
    { id: 'chips', a: 'en pose chips', pl: 'poser chips', label: 'Pose chips', p: [20, 22, 25], cat: 'kiosk', offer: true },
    { id: 'slik', a: 'en pose slik', pl: 'poser slik', label: 'Pose slik', p: [20, 25, 30], cat: 'kiosk', offer: true },
    { id: 'kanelsnegl', a: 'en kanelsnegl', pl: 'kanelsnegle', label: 'Kanelsnegl', p: [18, 22, 25], cat: 'kiosk', offer: true },
    { id: 'muffin', a: 'en muffin', pl: 'muffins', label: 'Muffin', p: [15, 18, 20], cat: 'kiosk', offer: true },
    { id: 'bolle', a: 'en bolle', pl: 'boller', label: 'Bolle', p: [6, 7, 8], cat: 'food', offer: true },
    { id: 'banan', a: 'en banan', pl: 'bananer', label: 'Banan', p: [3, 3.5, 4], cat: 'food' },
    { id: 'aeble', a: 'et æble', pl: 'æbler', label: 'Æble', p: [4, 4.5, 5], cat: 'food', offer: true },
    { id: 'maelk', a: 'en liter mælk', pl: 'liter mælk', label: 'Mælk, 1 liter', p: [12.5, 13.5, 14], cat: 'food' },
    { id: 'rugbroed', a: 'et rugbrød', pl: 'rugbrød', label: 'Rugbrød', p: [22, 25, 28.5], cat: 'food' },
    { id: 'ost', a: 'et stykke ost', pl: 'stykker ost', label: 'Ost', p: [35, 42.5, 49.5], cat: 'food' },
    { id: 'blyant', a: 'en blyant', pl: 'blyanter', label: 'Blyant', p: [8, 10, 12], cat: 'school', offer: true },
    { id: 'viskelaeder', a: 'et viskelæder', pl: 'viskelædere', label: 'Viskelæder', p: [8, 10, 12.5], cat: 'school' },
    { id: 'haefte', a: 'et kladdehæfte', pl: 'kladdehæfter', label: 'Kladdehæfte', p: [15, 18, 22], cat: 'school', offer: true },
    { id: 'tusser', a: 'en pakke tusser', pl: 'pakker tusser', label: 'Pakke tusser', p: [30, 39.5, 45], cat: 'school' },
    { id: 'tegneserie', a: 'et tegneseriehæfte', pl: 'tegneseriehæfter', label: 'Tegneseriehæfte', p: [49.5, 55], cat: 'toy' },
    { id: 'klistermaerker', a: 'et ark klistermærker', pl: 'ark klistermærker', label: 'Ark klistermærker', p: [15, 19.5, 25], cat: 'toy' },
    { id: 'saebebobler', a: 'en flaske sæbebobler', pl: 'flasker sæbebobler', label: 'Sæbebobler', p: [15, 20, 25], cat: 'toy' },
    { id: 'badebold', a: 'en badebold', pl: 'badebolde', label: 'Badebold', p: [29.5, 35, 39.5], cat: 'toy' },
    { id: 'fodbold', a: 'en fodbold', pl: 'fodbolde', label: 'Fodbold', p: [119.5, 149.5, 179.5], cat: 'toy' },
    { id: 'bog', a: 'en bog', pl: 'bøger', label: 'Bog', p: [99.5, 129.5, 149.5, 179.5], cat: 'toy' }
  ];

  // Indkøb til en fest m.m.: én ting i hver række. Priser i kr.
  var BASKETS = [
    { id: 'fest', intro: 'Bob holder fødselsdag for sin klasse.', rows: [
      ['Kage', [['Lagkage', 120], ['Kagemand', 150], ['12 muffins', 90], ['Chokoladekage', 75]]],
      ['Drikke', [['Saftevand', 30], ['6 sodavand', 72], ['Juice', 40]]],
      ['Snacks', [['Popcorn', 20], ['Chips', 25], ['Slikposer til alle', 80]]],
      ['Pynt', [['Balloner', 30], ['Flagguirlande', 45], ['Servietter', 20]]],
      ['Leg', [['Præmier til fiskedam', 75], ['Sæbebobler', 25], ['Kort til skattejagt', 40]]]
    ] },
    { id: 'film', intro: 'Bob holder filmaften med sine venner.', rows: [
      ['Film', [['Leje en film', 49], ['Købe en film', 99]]],
      ['Snacks', [['Popcorn', 20], ['Chips', 25], ['Vingummi', 30]]],
      ['Drikke', [['Saftevand', 30], ['3 sodavand', 45], ['Kakao', 35]]],
      ['Hygge', [['Stearinlys', 25], ['Lyskæde', 60], ['Tæppe', 120]]]
    ] },
    { id: 'skov', intro: 'Bob tager på skovtur med sin klub.', rows: [
      ['Mad', [['Madpakker', 40], ['Sandwich fra bageren', 90], ['Pølser til bålet', 45]]],
      ['Drikke', [['Vand på flaske', 20], ['Saftevand', 30], ['Kakao i termokande', 35]]],
      ['Bål', [['Snobrødsdej', 25], ['Skumfiduser', 20], ['Popcorn til bålet', 30]]],
      ['Leg', [['Fodbold', 120], ['Frisbee', 45], ['Sæbebobler', 25]]]
    ] }
  ];

  // Pakninger til kilopris og literpris. sizes i gram eller milliliter, per = kilopris/literpris i kr. (cirka 2026).
  var PACKS = [
    { id: 'kaffe', product: 'kaffe', pack: 'pose', unit: 'kg', sizes: [250, 400, 500, 1000], per: [110, 180] },
    { id: 'havregryn', product: 'havregryn', pack: 'pose', unit: 'kg', sizes: [500, 750, 1000, 1500], per: [12, 26] },
    { id: 'ris', product: 'ris', pack: 'pose', unit: 'kg', sizes: [500, 1000, 2000], per: [16, 36] },
    { id: 'pasta', product: 'pasta', pack: 'pose', unit: 'kg', sizes: [400, 500, 1000], per: [14, 32] },
    { id: 'ost', product: 'skiveost', pack: 'pakke', unit: 'kg', sizes: [250, 400, 500, 1000], per: [90, 150] },
    { id: 'vingummi', product: 'vingummi', pack: 'pose', unit: 'kg', sizes: [100, 250, 500], per: [60, 130] },
    { id: 'mel', product: 'hvedemel', pack: 'pose', unit: 'kg', sizes: [1000, 2000], per: [7, 15] },
    { id: 'juice', product: 'appelsinjuice', pack: 'karton', unit: 'l', sizes: [250, 1000, 1500, 2000], per: [15, 32] },
    { id: 'maelk', product: 'mælk', pack: 'karton', unit: 'l', sizes: [500, 1000], per: [11, 18] },
    { id: 'vaskemiddel', product: 'flydende vaskemiddel', pack: 'flaske', unit: 'l', sizes: [750, 1000, 1500, 2000], per: [25, 60] },
    { id: 'shampoo', product: 'shampoo', pack: 'flaske', unit: 'l', sizes: [250, 400, 500, 1000], per: [60, 140] }
  ];

  // Ting, der ikke er mad (bruges til rabat og moms). Priser i kr. med moms, alle delelige med 40.
  var NONFOOD = [
    { id: 'cykel', a: 'en cykel', p: [2400, 3200, 4000, 4800] },
    { id: 'hovedtelefoner', a: 'et par hovedtelefoner', p: [400, 600, 800, 1200] },
    { id: 'fodbold', a: 'en fodbold', p: [160, 200, 240] },
    { id: 'lampe', a: 'en lampe', p: [240, 400, 600] },
    { id: 'rygsaek', a: 'en rygsæk', p: [320, 400, 480, 600] },
    { id: 'skateboard', a: 'et skateboard', p: [480, 600, 800] },
    { id: 'regnjakke', a: 'en regnjakke', p: [400, 560, 800] },
    { id: 'hoejttaler', a: 'en højttaler', p: [400, 600, 800] },
    { id: 'cykelhjelm', a: 'en cykelhjelm', p: [240, 320, 400] },
    { id: 'braetspil', a: 'et brætspil', p: [200, 240, 320] },
    { id: 'loebesko', a: 'et par løbesko', p: [600, 800, 1000] },
    { id: 'kontorstol', a: 'en kontorstol', p: [800, 1200, 1600] }
  ];

  // Sparemål (samles i sparebøssen). p i kr.
  var GOALS = [
    { id: 'drage', b: 'M', a: 'en drage', p: 120 },
    { id: 'fodbold', b: 'M', a: 'en fodbold', p: 160 },
    { id: 'bog', b: 'M', a: 'en tyk eventyrbog', p: 180 },
    { id: 'braetspil', b: 'M', a: 'et brætspil', p: 240 },
    { id: 'hovedtelefoner', b: 'M', a: 'et par hovedtelefoner', p: 300 },
    { id: 'cykelhjelm', b: 'M', a: 'en cykelhjelm', p: 320 },
    { id: 'akvarium', b: 'M', a: 'et lille akvarium', p: 350 },
    { id: 'byggesaet', b: 'M', a: 'et stort byggesæt', p: 450 },
    { id: 'skateboard', b: 'M', a: 'et skateboard', p: 480 },
    { id: 'rulleskoejter', b: 'M', a: 'et par rulleskøjter', p: 500 },
    { id: 'hoejttaler', b: 'U', a: 'en god højttaler', p: 2000 },
    { id: 'festival', b: 'U', a: 'en festivalbillet', p: 2400 },
    { id: 'telefon', b: 'U', a: 'en ny mobiltelefon', p: 4000 },
    { id: 'sofa', b: 'U', a: 'en sofa til lejligheden', p: 4500 },
    { id: 'togrejse', b: 'U', a: 'en togrejse rundt i Europa', p: 5000 },
    { id: 'computer', b: 'U', a: 'en bærbar computer', p: 6000 },
    { id: 'elcykel', b: 'U', a: 'en brugt elcykel', p: 7500 },
    { id: 'koerekort', b: 'U', a: 'et kørekort', p: 18000 }
  ];

  // Budget for Bobs første lejlighed: [nøgle, min, max, trin] i kr. pr. måned (cirka 2026, lille lejlighed uden for de dyreste byer).
  var BUDGET = [
    ['husleje', 4200, 6200, 100], ['el', 350, 650, 50], ['mad', 2400, 3200, 100], ['mobil', 99, 199, 50],
    ['internet', 149, 249, 50], ['transport', 375, 600, 25], ['forsikring', 90, 150, 10], ['streaming', 89, 149, 30], ['fitness', 199, 299, 50]
  ];
  var INCOME = [11500, 16000, 500]; // løn efter skat pr. måned (fx lærling eller ung med fuldtidsjob)

  // Mobilabonnementer: [GB data (999 = fri data), laveste og højeste månedspris i kr.]
  var PLANS = [[5, 79, 99], [10, 99, 129], [20, 119, 149], [30, 129, 169], [50, 149, 189], [100, 169, 229], [999, 199, 279]];
  var SETUP = [0, 0, 49, 99, 199];

  // Faktaspørgsmål: [spørgsmål, rigtigt svar, [forkerte svar], hjælp, forklaring]
  var FACTS = {
    coin: [
      ['Hvilke mønter har hul i midten?', '1, 2 og 5 kroner', ['10 og 20 kroner', '50 øre og 20 kroner'], 'Tænk på de sølvfarvede mønter.', 'Mønterne til 1, 2 og 5 kroner er sølvfarvede og har hul i midten. 10 og 20 kroner er guldfarvede uden hul.'],
      ['Hvilken farve har 10-kronen og 20-kronen?', 'Guldfarvet', ['Sølvfarvet', 'Kobberfarvet'], 'De har ikke hul i midten.', '10-kronen og 20-kronen er guldfarvede og har ikke hul.'],
      ['Hvilken mønt er kobberfarvet?', '50 øre', ['1 krone', '20 kroner'], 'Det er den mønt, der er mindst værd.', '50-øren er den eneste kobberfarvede mønt.'],
      ['Hvilken mønt er mindst værd i Danmark?', '50 øre', ['25 øre', '1 krone'], 'Der findes ingen mønt under en halv krone.', '50 øre er den mønt, der er mindst værd. 25-øren blev afskaffet i 2008.'],
      ['Hvilken af de her mønter findes ikke?', '3 kroner', ['2 kroner', '20 kroner'], 'Mønterne er 50 øre, 1, 2, 5, 10 og 20 kroner.', 'Danske mønter: 50 øre, 1, 2, 5, 10 og 20 kroner. Der er ingen 3-krone.'],
      ['Hvor mange øre er 1 krone?', '100 øre', ['10 øre', '50 øre'], 'To 50-ører er det samme som 1 krone.', '1 krone = 100 øre. Derfor er 50 øre en halv krone.'],
      ['Hvilke sedler bruger vi i Danmark i dag?', '50, 100, 200 og 500 kroner', ['20, 50, 100 og 200 kroner', '10, 50, 100 og 500 kroner'], 'Den mindste seddel er 50 kroner.', 'I dag bruger vi sedler til 50, 100, 200 og 500 kroner. Mindre beløb er mønter.']
    ],
    kasse: [
      ['Hvorfor runder man af, når man betaler kontant?', 'Fordi den mindste mønt er 50 øre', ['Fordi butikken vil tjene mere', 'Fordi kortet ikke virker'], 'Hvilken mønt er mindst værd?', 'Den mindste mønt er 50 øre. Derfor kan man ikke betale fx 19,95 kr. med mønter, og beløbet rundes af til nærmeste 50 øre.'],
      ['Hvornår runder man beløbet af til nærmeste 50 øre?', 'Når man betaler med kontanter', ['Når man betaler med kort', 'Altid'], 'Med kort kan man betale helt præcist.', 'Kun kontante betalinger rundes af. Med kort betaler man det præcise beløb.'],
      ['Hvad er byttepenge?', 'De penge, du får tilbage, når du betaler med for meget', ['Penge, du låner af butikken', 'Rabat på en vare'], 'Tænk på, hvad der sker, når du betaler med en stor seddel.', 'Byttepenge er forskellen mellem det, du betaler med, og prisen.']
    ],
    aop: [
      ['Hvad betyder ÅOP?', 'Årlige omkostninger i procent', ['Årlig opsparing i procent', 'Åben opsparing på papir'], 'Det handler om, hvad et lån koster.', 'ÅOP står for årlige omkostninger i procent. Den viser, hvad et lån koster om året, med både rente og gebyrer.'],
      ['Hvorfor er det smart at sammenligne lån med ÅOP og ikke kun med renten?', 'ÅOP tager både rente og gebyrer med', ['ÅOP er altid lavere end renten', 'Renten er altid forkert'], 'Et lån kan have lav rente, men store gebyrer.', 'Et lån med lav rente kan have store gebyrer. ÅOP lægger det hele sammen, så du kan se, hvilket lån der er billigst.'],
      ['Hvad er et kviklån?', 'Et lån, der er hurtigt at få, men ofte dyrt', ['Et lån helt uden renter', 'En opsparing i banken'], 'Navnet siger noget om, hvor hurtigt det går.', 'Et kviklån er nemt og hurtigt at få, men det er ofte dyrt. Tjek altid ÅOP og det samlede beløb, du skal betale tilbage.'],
      ['Hvad er billigst, hvis du kan vente med at købe noget?', 'At spare op først', ['At tage et kviklån', 'At låne af flere banker på én gang'], 'Når du sparer op, betaler du ingen renter.', 'Når du sparer op, betaler du ingen renter og gebyrer. Du venter lidt længere, men tingen bliver billigere.']
    ]
  };

  /* ---------- tilfældighed (kun Math.random, så Core.seeded virker) ---------- */
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function near(p, lo, hi) { return Math.round(p * (1 + lo + Math.random() * (hi - lo)) * 2) / 2; } // pris tæt på p, afrundet til 50 øre
  function step(a, b, s) { return a + s * rnd(0, Math.floor((b - a) / s)); }

  /* ---------- formattering (dansk) ---------- */
  function round2(x) { return Math.round(x * 100) / 100; }
  // num(1250) -> '1.250', num(12.5) -> '12,5', num(12.5, 2) -> '12,50'
  function num(x, dec) {
    var neg = x < 0; x = Math.abs(x);
    var s = dec === undefined ? String(round2(x)) : x.toFixed(dec);
    var parts = s.split('.'), whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + whole + (parts[1] ? ',' + parts[1] : '');
  }
  function kr(ore) { ore = Math.round(ore); return num(ore / 100, ore % 100 === 0 ? 0 : 2) + ' kr.'; } // øre -> '12,50 kr.'
  function krk(k) { return kr(Math.round(k * 100)); }                                                // kroner -> tekst
  function pct(x) { return num(x) + ' %'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fill(tpl, v) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] !== undefined ? v[k] : m; }).replace(/([^.])\.\.(?!\.)/g, '$1.');
  }
  function sizeText(size, unit) {
    if (unit === 'kg') return size >= 1000 ? num(size / 1000) + ' kg' : size + ' g';
    return size >= 1000 ? num(size / 1000) + ' l' : size + ' ml';
  }
  // Fortolker et tal, som et barn har skrevet: '12,5', '12.5', '1.250', '1 250', '12,50 kr.' -> tal (eller NaN)
  function parseDa(str) {
    var s = String(str == null ? '' : str).trim().replace(/\s+/g, '').replace(/[a-zæøå%.]*$/i, function (m) { return /^\.\d/.test(m) ? m : ''; });
    s = s.replace(/(kr|kroner|uger|måneder|stk)\.?$/i, '').replace(/−/g, '-');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }

  /* ---------- matematik ---------- */
  // Færrest mulige mønter og sedler til et beløb (dynamisk programmering over 50-øre-enheder). Returnerer listen, største først.
  function minChange(amount, list) {
    list = (list || TILL).slice().sort(function (a, b) { return b - a; });
    if (amount % 50) throw new Error('beløb skal være deleligt med 50 øre');
    var N = amount / 50, best = [0], from = [0];
    for (var a = 1; a <= N; a++) {
      best[a] = Infinity;
      for (var i = 0; i < list.length; i++) { var k = list[i] / 50; if (k <= a && best[a - k] + 1 < best[a]) { best[a] = best[a - k] + 1; from[a] = list[i]; } }
    }
    if (best[N] === Infinity) return null;
    var out = []; for (var r = N; r > 0; r -= from[r] / 50) out.push(from[r]);
    return out.sort(function (x, y) { return y - x; });
  }
  function cashRound(ore) { return Math.floor((ore + 25) / 50) * 50; } // til nærmeste 50 øre
  function simpleInterest(K, r, n) { return K * r / 100 * n; }
  function compound(K, r, n) { return K * Math.pow(1 + r / 100, n); }
  function annuity(L, ratePct, n) { var m = ratePct / 1200; return m ? L * m / (1 - Math.pow(1 + m, -n)) : L / n; }
  // ÅOP i procent: den årlige rente, der gør nutidsværdien af alle ydelser lig med det beløb, man reelt får (lån minus gebyr).
  function aop(received, payment, n) {
    function pv(i) { var s = 0; for (var k = 1; k <= n; k++) s += payment / Math.pow(1 + i, k); return s; }
    var lo = 0, hi = 1;
    for (var it = 0; it < 200; it++) { var mid = (lo + hi) / 2; if (pv(mid) > received) lo = mid; else hi = mid; }
    return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
  }
  function combo(list) { return list.map(kr).join(' + '); }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }

  /* ---------- opgaver ---------- */
  function wrongs(ans, cands) {
    var out = [];
    cands.forEach(function (c) { c = round2(c); if (c > 0 && Math.abs(c - ans) > 0.004 && out.every(function (o) { return Math.abs(o - c) > 0.004; })) out.push(c); });
    for (var k = 1; out.length < 3; k++) { var c = round2(ans + k * (ans >= 100 ? 10 : 1)); if (out.indexOf(c) < 0) out.push(c); }
    return out.slice(0, 3);
  }
  function choice(kind, q, right, wrong, hint, explain, extra) {
    var tk = { type: 'choice', kind: kind, q: q, answer: right, options: shuffle([right].concat(wrong)), hint: hint, explain: explain };
    for (var k in extra || {}) tk[k] = extra[k];
    return tk;
  }
  function number(kind, q, ans, unit, cands, hint, explain, extra) {
    var tk = { type: 'number', kind: kind, q: q, answer: round2(ans), unit: unit, wrong: wrongs(round2(ans), cands), hint: hint, explain: explain };
    for (var k in extra || {}) tk[k] = extra[k];
    return tk;
  }
  // Viser et svar med enhed: 1250 'kr.' -> '1.250 kr.'
  function fmtAnswer(v, unit) {
    if (unit === 'kr.') return krk(v);
    if (unit === '%') return pct(v);
    if (/^kr\. pr\./.test(unit)) return num(v, v % 1 ? 2 : 0) + ' ' + unit;
    return num(v) + ' ' + unit;
  }
  function itemPrice(it) { return Math.round(pick(it.p) * 100); }
  function goalsOf(b) { return GOALS.filter(function (g) { return g.b === b; }); }

  var gen = {
    /* --- Pengepungen --- */
    mostWorth: function () {
      var most = Math.random() < 0.6, set;
      if (Math.random() < 0.5) set = shuffle([500, pick([1000, 2000])].concat(shuffle(VALUES.filter(function (v) { return v !== 500 && v !== 1000 && v !== 2000; })).slice(0, 2)));
      else set = shuffle(VALUES).slice(0, 4);
      var ans = most ? Math.max.apply(null, set) : Math.min.apply(null, set);
      var tricky = set.indexOf(500) >= 0 && (set.indexOf(1000) >= 0 || set.indexOf(2000) >= 0);
      return choice(most ? 'mostWorth' : 'leastWorth', S().q[most ? 'mostWorth' : 'leastWorth'], String(ans), set.filter(function (v) { return v !== ans; }).map(String), S().h.worth,
        fill(S().x[most ? 'mostWorth' : 'leastWorth'], { name: cap(S().denomDef[ans]), value: kr(ans) }) + (tricky ? ' ' + S().x.sizeNote : ''), { optKind: 'money' });
    },
    coinFact: function () { return fact('coin'); },
    kasseFact: function () { return fact('kasse'); },
    aopFact: function () { return fact('aop'); },
    sameAs: function () {
      var pr = pick([[50, 100], [50, 500], [100, 500], [200, 1000], [500, 2000], [100, 1000], [200, 2000], [1000, 5000], [2000, 10000], [1000, 10000], [5000, 20000], [10000, 50000], [5000, 10000]]);
      var s = pr[0], b = pr[1], n = b / s;
      return number('sameAs', fill(S().q.sameAs, { pl: S().denomPlural[s], amount: kr(b) }), n, 'stk.', [n - 1, n + 1, n * 2, n / 2],
        fill(S().h.sameAs, { small: kr(s), seq: [1, 2, 3].map(function (k) { return kr(k * s); }).join(', '), big: kr(b) }),
        fill(S().x.sameAs, { n: n, small: kr(s), big: kr(b) }), { fig: { t: 'coins', list: [b] }, p: { small: s, big: b } });
    },
    count: function () {
      var list, total;
      do {
        list = []; var k = rnd(3, 6);
        for (var i = 0; i < k; i++) list.push(pick([50, 100, 200, 500, 500, 1000, 1000, 2000, 2000, 5000, 10000]));
        total = sum(list);
      } while (total > 25000 || list.filter(function (v) { return v === 50; }).length > 1);
      var sorted = list.slice().sort(function (a, b) { return b - a; });
      return number('count', S().q.count, total / 100, 'kr.', [(total - sorted[sorted.length - 1]) / 100, total / 100 + 1, total / 100 - 1, total / 100 + 10], S().h.count,
        fill(S().x.count, { sum: combo(sorted), total: kr(total) }), { fig: { t: 'coins', list: shuffle(list) }, p: { list: list } });
    },
    pay: function () {
      var it = pick(ITEMS), p = itemPrice(it), sol = minChange(p, TILL);
      return { type: 'pay', kind: 'pay', q: fill(S().q.pay, { item: it.a, price: kr(p) }), answer: p, tray: TILL.slice(), solution: sol, hint: S().h.pay,
        explain: fill(S().x.pay, { combo: combo(sol) + (sol.length > 1 ? ' = ' + kr(p) : '') }), fig: { t: 'tag', name: it.label, price: p }, p: { item: it.id, price: p } };
    },
    /* --- Kassen --- */
    change: function () {
      var it = null, P;
      if (Math.random() < 0.55) { it = pick(ITEMS); P = itemPrice(it); }
      else P = step(2000, 45000, 50) + pick([0, 0, 50]);
      if (P % 100 === 0 && Math.random() < 0.4) P -= 50;
      var notes = [2000, 5000, 10000, 20000, 50000].filter(function (v) { return v > P; }), paid = notes[0];
      if (notes.length > 1 && Math.random() < 0.3) paid = notes[1];
      var C = paid - P, sol = minChange(C, TILL), name = pick(NAMES);
      var q = it ? fill(S().q.change, { name: name, item: it.a, price: kr(P), paid: S().denomIndef[paid] }) : fill(S().q.changeBig, { name: name, price: kr(P), paid: S().denomIndef[paid] });
      return { type: 'change', kind: 'change', q: q, answer: C, tray: TILL.slice(), solution: sol, minCount: sol.length, price: P, paid: paid,
        hint: fill(S().h.change, { price: kr(P), paid: kr(paid) }), explain: fill(S().x.change, { paid: kr(paid), price: kr(P), change: kr(C), combo: combo(sol) }),
        fig: { t: 'pay', price: P, paid: paid }, p: { price: P, paid: paid } };
    },
    changeNum: function () {
      var it = pick(ITEMS), P = itemPrice(it), notes = [2000, 5000, 10000, 20000].filter(function (v) { return v > P; }), paid = notes[Math.random() < 0.7 ? 0 : Math.min(1, notes.length - 1)], C = paid - P;
      return number('changeNum', fill(S().q.changeNum, { item: it.a, price: kr(P), paid: S().denomIndef[paid] }), C / 100, 'kr.', [C / 100 + 1, C / 100 - 1, C / 100 + 10, C / 100 - 10, (paid + P) / 100],
        S().h.changeNum, fill(S().x.changeNum, { paid: kr(paid), price: kr(P), change: kr(C) }), { fig: { t: 'pay', price: P, paid: paid }, p: { price: P, paid: paid } });
    },
    cashRound: function () {
      var p = rnd(10, 149) * 100 + pick([5, 10, 15, 20, 30, 35, 40, 45, 55, 60, 65, 70, 80, 85, 90, 95]), r = cashRound(p), other = r > p ? r - 50 : r + 50;
      return choice('cashRound', fill(S().q.cashRound, { price: kr(p) }), kr(r), [kr(other), kr(p)], S().h.cashRound, fill(S().x.cashRound, { price: kr(p), rounded: kr(r) }), { p: { price: p } });
    },
    /* --- Indkøbslisten --- */
    basket: function () {
      for (;;) {
        var ctx = pick(BASKETS), idx = shuffle(ctx.rows.map(function (r, i) { return i; })).slice(0, Math.min(ctx.rows.length, rnd(3, 4))).sort();
        var rows = idx.map(function (i) {
          var r = ctx.rows[i];
          return { title: r[0], opts: shuffle(r[1]).slice(0, 3).map(function (o) { return { name: o[0], price: o[1] * 100 }; }) };
        });
        var mins = rows.map(function (r) { return Math.min.apply(null, r.opts.map(function (o) { return o.price; })); });
        var maxs = rows.map(function (r) { return Math.max.apply(null, r.opts.map(function (o) { return o.price; })); });
        var lo = sum(mins), hi = sum(maxs);
        if (hi - lo < 4000) continue;
        var budget = Math.ceil((lo + (hi - lo) * (0.25 + Math.random() * 0.4)) / 1000) * 1000;
        if (budget < lo || budget >= hi) continue;
        var sol = rows.map(function (r, i) { return r.opts.map(function (o) { return o.price; }).indexOf(mins[i]); });
        return { type: 'basket', kind: 'basket', q: ctx.intro + ' ' + fill(S().q.basket, { budget: kr(budget) }), rows: rows, budget: budget, solution: sol, answer: budget,
          hint: S().h.basket, explain: fill(S().x.basketShow, { combo: rows.map(function (r, i) { return r.opts[sol[i]].name + ' ' + kr(r.opts[sol[i]].price); }).join(', '), sum: kr(lo), budget: kr(budget) }),
          p: { ctx: ctx.id } };
      }
    },
    listTotal: function () { return list('listTotal'); },
    listLeft: function () { return list('listLeft'); },
    afford: function () { return list('afford'); },
    /* --- Bedste køb (mellemtrin) --- */
    offerSave: function () { return offer(true); },
    offerPay: function () { return offer(false); },
    bestShop: function () { return bestShop('M'); },
    bestShopU: function () { return bestShop('U'); },
    perPiece: function () {
      for (;;) {
        var it = pick(ITEMS.filter(function (x) { return x.offer && x.cat !== 'school'; })), base = pick(it.p);
        var a = pick([2, 3, 4, 5, 6, 8, 10]), b = pick([2, 3, 4, 5, 6, 8, 10]);
        if (a === b) continue;
        var pa = Math.max(1, base - rnd(0, 6) * 0.5), pb = Math.max(1, base - rnd(0, 6) * 0.5);
        if (Math.abs(pa - pb) < 0.5) continue;
        var X = a * pa, Y = b * pb, la = fill('{n} {pl} for {p}', { n: a, pl: it.pl, p: krk(X) }), lb = fill('{n} {pl} for {p}', { n: b, pl: it.pl, p: krk(Y) });
        var best = pa < pb ? la : lb;
        return choice('perPiece', S().q.perPiece, best, [pa < pb ? lb : la], S().h.perPiece,
          fill(S().x.perPiece, { lines: krk(X) + ' : ' + a + ' = ' + krk(pa) + '; ' + krk(Y) + ' : ' + b + ' = ' + krk(pb), best: best }),
          { p: { packs: [[a, X], [b, Y]] }, fig: { t: 'packs', unit: 'stk', packs: [{ label: a + ' stk.', price: X * 100 }, { label: b + ' stk.', price: Y * 100 }] } });
      }
    },
    /* --- Sparegrisen --- */
    weeks: function () {
      for (;;) {
        var g = pick(goalsOf('M')), start = Math.random() < 0.5 ? 0 : pick([20, 30, 50, 75, 100]), w = pick([10, 15, 20, 25, 30, 40, 50]);
        if (start >= g.p / 2) continue;
        var need = g.p - start, weeks = Math.ceil(need / w);
        if (weeks < 3 || weeks > 16) continue;
        var name = pick(NAMES), calc = (start ? kr(g.p * 100) + ' − ' + kr(start * 100) + ' = ' + kr(need * 100) + '. ' : '') + kr(need * 100) + ' : ' + kr(w * 100) + (need % w ? ' ≈ ' : ' = ') + num(round2(need / w));
        var ex = fill(S().x.weeks, { calc: calc, weeks: weeks }) + (need % w ? ' ' + fill(S().x.weeksRest, { weeks: weeks, sum: kr((start + weeks * w) * 100) }) : '');
        return number('weeks', fill(S().q[start ? 'weeksStart' : 'weeks'], { name: name, goal: g.a, price: krk(g.p), start: krk(start), w: krk(w) }), weeks, 'uger', [weeks - 1, weeks + 1, Math.floor(g.p / w)],
          S().h.weeks, ex, { goal: g.id, chart: { goal: g.p, start: start, step: w, n: weeks, unit: 'w' }, p: { price: g.p, start: start, w: w } });
      }
    },
    plan: function () {
      for (;;) {
        var g = pick(goalsOf('M')), n = rnd(4, 12), right = Math.ceil(g.p / n / 5) * 5, lower = right - 5;
        if (lower <= 0 || n * lower >= g.p || right > 100) continue;
        var opts = [right, lower, right + 5, right + 10].map(String), name = pick(NAMES);
        return choice('plan', fill(S().q.plan, { name: name, goal: g.a, price: krk(g.p), n: n }), String(right), opts.slice(1), fill(S().h.plan, { n: n, price: krk(g.p) }),
          fill(S().x.plan, { n: n, right: krk(right), tot: krk(n * right), lower: krk(lower), lowTot: krk(n * lower) }),
          { optKind: 'kr', goal: g.id, chart: { goal: g.p, start: 0, step: null, n: n, unit: 'w', deadline: n }, p: { price: g.p, n: n } });
      }
    },
    total: function () {
      var start = pick([0, 20, 35, 50, 80, 100]), w = pick([10, 15, 20, 25, 30, 40]), n = rnd(3, 10), tot = start + w * n, name = pick(NAMES);
      return number('total', fill(S().q.total, { name: name, start: krk(start), w: krk(w), n: n }), tot, 'kr.', [w * n, tot + w, tot - w, start + w * (n - 1)], S().h.total,
        fill(S().x.total, { start: krk(start), n: n, w: krk(w), total: krk(tot) }), { chart: { goal: tot, start: start, step: w, n: n, unit: 'w' }, p: { start: start, w: w, n: n } });
    },
    missing: function () {
      for (;;) {
        var g = pick(goalsOf('M')), w = pick([10, 15, 20, 25, 30, 40, 50]), n = rnd(2, 10), saved = w * n;
        if (saved >= g.p - 5) continue;
        var name = pick(NAMES);
        return number('missing', fill(S().q.missing, { name: name, goal: g.a, price: krk(g.p), w: krk(w), n: n }), g.p - saved, 'kr.', [saved, g.p - saved + w, g.p - saved - w, g.p - w],
          S().h.missing, fill(S().x.missing, { n: n, w: krk(w), saved: krk(saved), price: krk(g.p), missing: krk(g.p - saved) }),
          { goal: g.id, chart: { goal: g.p, start: 0, step: w, n: n, unit: 'w' }, p: { price: g.p, w: w, n: n } });
      }
    },
    /* --- Bedste køb (udskoling): kilopris og literpris --- */
    unitCalc: function () {
      for (;;) {
        var pk = pick(PACKS), size = pick(pk.sizes.filter(function (s) { return s !== 1000; }));
        if (!size) continue;
        var U = rnd(pk.per[0], pk.per[1]), price = U * size / 1000;
        if (Math.abs(price * 2 - Math.round(price * 2)) > 1e-9 || price < 5) continue;
        var kg = pk.unit === 'kg', sizeNum = num(size / 1000), unitTxt = kg ? 'kr. pr. kg' : 'kr. pr. liter';
        return number('unitCalc', fill(S().q.unitCalc, { pack: pk.pack, size: sizeText(size, pk.unit), product: pk.product, price: krk(price), kind: kg ? 'kiloprisen' : 'literprisen' }), U, unitTxt,
          [round2(price * size / 1000), U + 10, U * 10, round2(U / 10)],
          fill(S().h.unitCalc, { kind: kg ? 'Kiloprisen' : 'Literprisen', unit: kg ? 'kg' : 'liter', size: sizeText(size, pk.unit), sizeIn: sizeNum + (kg ? ' kg' : ' l'), sizeNum: sizeNum }),
          fill(S().x.unitCalc, { price: krk(price), sizeNum: sizeNum, unit: num(U) + ' ' + unitTxt }), { fig: { t: 'packs', unit: pk.unit, packs: [{ label: sizeText(size, pk.unit), price: price * 100 }] }, p: { size: size, price: price, unit: pk.unit } });
      }
    },
    cheapest: function () {
      for (;;) {
        var pk = pick(PACKS), sizes = shuffle(pk.sizes).slice(0, Math.min(pk.sizes.length, rnd(2, 3))).sort(function (a, b) { return a - b; });
        if (sizes.length < 2) continue;
        var packs = sizes.map(function (s) {
          var U = pk.per[0] + Math.random() * (pk.per[1] - pk.per[0]), price = Math.max(1, Math.round(U * s / 1000 * 2) / 2);
          return { size: s, price: price, unitPrice: price / (s / 1000), label: fill('{s} til {p}', { s: sizeText(s, pk.unit), p: krk(price) }) };
        });
        var sorted = packs.slice().sort(function (a, b) { return a.unitPrice - b.unitPrice; });
        if (sorted[1].unitPrice < sorted[0].unitPrice * 1.03) continue;
        var per = pk.unit === 'kg' ? 'kilo' : 'liter', best = sorted[0];
        return choice('cheapest', fill(S().q.cheapest, { pack: pk.pack, product: pk.product, per: per }), best.label, packs.filter(function (p) { return p !== best; }).map(function (p) { return p.label; }),
          fill(S().h.cheapest, { per: per, pack: pk.pack, unitWord: per }),
          fill(S().x.cheapest, { lines: packs.map(function (p) { return krk(p.price) + ' : ' + num(p.size / 1000) + ' = ' + num(p.unitPrice, 2) + ' kr. pr. ' + (pk.unit === 'kg' ? 'kg' : 'liter'); }).join('; '), per: per, best: best.label }),
          { fig: { t: 'packs', unit: pk.unit, packs: packs.map(function (p) { return { label: sizeText(p.size, pk.unit), price: Math.round(p.price * 100) }; }) }, p: { packs: packs.map(function (p) { return [p.size, p.price]; }) } });
      }
    },
    /* --- Rabat og moms --- */
    discount: function () {
      var it = pick(NONFOOD), P = pick(it.p), r = pick([10, 15, 20, 25, 30, 40, 50]), off = P * r / 100, after = P - off;
      return number('discount', fill(S().q.discount, { item: it.a, price: krk(P), r: r }), after, 'kr.', [off, P - r, P * (1 + r / 100), after - 10], fill(S().h.discount, { r: r }),
        fill(S().x.discount, { r: r, price: krk(P), off: krk(off), after: krk(after) }), { item: it.id, fig: { t: 'tag', name: cap(it.a), price: P * 100, badge: '−' + r + ' %' }, p: { price: P, r: r } });
    },
    discountPct: function () {
      var it = pick(NONFOOD), P = pick(it.p), r = pick([10, 20, 25, 30, 40, 50]), after = P * (1 - r / 100), off = P - after;
      return number('discountPct', fill(S().q.discountPct, { item: it.a, before: krk(P), after: krk(after) }), r, '%', [100 - r, r / 2, r + 5, round2(off / after * 100)], S().h.discountPct,
        fill(S().x.discountPct, { before: krk(P), after: krk(after), off: krk(off), r: r }), { item: it.id, fig: { t: 'tag', name: cap(it.a), price: after * 100, old: P * 100 }, p: { before: P, after: after } });
    },
    momsAdd: function () {
      var it = pick(NONFOOD), incl = pick(it.p), excl = round2(incl / (1 + MOMS));
      return number('momsAdd', fill(S().q.momsAdd, { item: it.a, excl: krk(excl), moms: num(MOMS * 100) }), incl, 'kr.', [excl * MOMS, excl * 1.2, excl + 25, excl * 1.5],
        fill(S().h.momsAdd, { moms: num(MOMS * 100), factor: num(1 + MOMS) }), fill(S().x.momsAdd, { excl: krk(excl), factor: num(1 + MOMS), incl: krk(incl) }),
        { item: it.id, moms: true, fig: { t: 'tag', name: cap(it.a), price: excl * 100, note: S().withoutMoms }, p: { excl: excl } });
    },
    momsRemove: function () {
      var it = pick(NONFOOD), incl = pick(it.p), excl = round2(incl / (1 + MOMS));
      return number('momsRemove', fill(S().q.momsRemove, { item: it.a, incl: krk(incl) }), excl, 'kr.', [incl * (1 - MOMS), incl * MOMS, incl - 25, incl * MOMS / (1 + MOMS)],
        fill(S().h.momsRemove, { p100: num(100 + MOMS * 100), factor: num(1 + MOMS) }), fill(S().x.momsRemove, { incl: krk(incl), factor: num(1 + MOMS), excl: krk(excl) }),
        { item: it.id, moms: true, fig: { t: 'tag', name: cap(it.a), price: incl * 100, note: S().withMoms }, p: { incl: incl } });
    },
    momsPart: function () {
      var it = pick(NONFOOD), incl = pick(it.p), excl = round2(incl / (1 + MOMS)), part = round2(incl - excl);
      var w = wrongs(part, [incl * MOMS, excl, part * 2]).slice(0, 2);
      return choice('momsPart', fill(S().q.momsPart, { item: it.a, incl: krk(incl) }), krk(part), w.map(krk), fill(S().h.momsPart, { factor: num(1 + MOMS) }),
        fill(S().x.momsPart, { incl: krk(incl), factor: num(1 + MOMS), excl: krk(excl), part: krk(part), pIncl: num(round2(MOMS / (1 + MOMS) * 100)), moms: num(MOMS * 100) }),
        { item: it.id, moms: true, fig: { t: 'tag', name: cap(it.a), price: incl * 100, note: S().withMoms }, p: { incl: incl } });
    },
    momsFact: function () {
      var it = pick(NONFOOD), right = pct(MOMS * 100), wrong = ['20 %', '12,5 %', '50 %', '25 %', '10 %'].filter(function (x) { return x !== right; });
      return choice('momsFact', fill(S().q.momsFact, { item: it.a }), right, shuffle(wrong).slice(0, 2), S().h.momsFact, fill(S().x.momsFact, { moms: num(MOMS * 100) }), { item: it.id, moms: true });
    },
    pctVsKr: function () {
      for (;;) {
        var it = pick(NONFOOD), P = pick(it.p), r = pick([10, 15, 20, 25, 30]), offA = P * r / 100, d = Math.round((offA + rnd(-4, 4) * 10) / 10) * 10;
        if (d <= 0 || Math.abs(d - offA) < 10) continue;
        var shops = shuffle(SHOPS).slice(0, 2), best = offA > d ? shops[0] : shops[1];
        return choice('pctVsKr', fill(S().q.pctVsKr, { item: it.a, price: krk(P), shopA: shops[0], r: r, shopB: shops[1], d: krk(d) }), best, [best === shops[0] ? shops[1] : shops[0]], S().h.pctVsKr,
          fill(S().x.pctVsKr, { r: r, price: krk(P), off: krk(offA), d: krk(d), afterB: krk(P - d), afterA: krk(P - offA), best: best }), { item: it.id, p: { price: P, r: r, d: d, a: shops[0] } });
      }
    },
    /* --- Renter --- */
    simple: function () {
      var K = pick([1000, 2000, 2500, 4000, 5000, 8000, 10000, 20000]), r = rnd(1, 5), n = pick([2, 3, 4, 5, 10]), year = K * r / 100, tot = year * n;
      return number('simple', fill(S().q.simple, { K: krk(K), r: r, n: n }), tot, 'kr.', [year, K + tot, round2(compound(K, r, n) - K), tot * 10], S().h.simple,
        fill(S().x.simple, { r: r, K: krk(K), year: krk(year), n: n, total: krk(tot) }), { p: { K: K, r: r, n: n } });
    },
    compound: function () {
      var K = pick([1000, 2000, 5000, 8000, 10000, 20000]), r = rnd(2, 6), n = rnd(2, 5), f = 1 + r / 100, res = Math.round(compound(K, r, n)), simp = K + simpleInterest(K, r, n);
      var w = wrongs(res, [simp, Math.round(compound(K, r, n + 1)), Math.round(compound(K, r, n - 1)), res + K * r / 100]).slice(0, 2);
      var steps = [K]; for (var i = 1; i <= n; i++) steps.push(compound(K, r, i));
      return choice('compound', fill(S().q.compound, { K: krk(K), r: r, n: n }), krk(res), w.map(krk), fill(S().h.compound, { f: num(f), n: n }),
        fill(S().x.compound, { f: num(f), steps: steps.map(function (v) { return krk(round2(v)); }).join(' → '), simple: krk(simp) }), { p: { K: K, r: r, n: n } });
    },
    compound2: function () {
      var K = rnd(10, 200) * 100, r = rnd(2, 6), f = 1 + r / 100, exact = round2(compound(K, r, 2)), res = Math.round(exact);
      return number('compound2', fill(S().q.compound2, { K: krk(K), r: r }), res, 'kr.', [K + 2 * K * r / 100, K * f, res + 10], fill(S().h.compound, { f: num(f), n: 2 }),
        fill(S().x.compound2, { K: krk(K), f: num(f), exact: krk(exact), result: krk(res) }), { tol: 1, p: { K: K, r: r } });
    },
    compare: function () {
      var K = pick([2000, 5000, 10000, 20000, 50000]), r = rnd(2, 6), n = rnd(3, 10), comp = compound(K, r, n), simp = K + simpleInterest(K, r, n), diff = Math.round(comp - simp);
      return number('compare', fill(S().q.compare, { K: krk(K), r: r, n: n }), diff, 'kr.', [Math.round(comp - K), simpleInterest(K, r, n), diff * 2, diff + 10], S().h.compare,
        fill(S().x.compare, { comp: krk(round2(comp)), simp: krk(simp), diff: krk(diff) }), { tol: 1, p: { K: K, r: r, n: n } });
    },
    saveMonths: function () {
      for (;;) {
        var g = pick(goalsOf('U')), m = step(250, 1500, 50), months = Math.ceil(g.p / m);
        if (months < 3 || months > 24) continue;
        var calc = krk(g.p) + ' : ' + krk(m) + (g.p % m ? ' ≈ ' : ' = ') + num(round2(g.p / m));
        return number('saveMonths', fill(S().q.saveMonths, { name: 'Bob', goal: g.a, price: krk(g.p), m: krk(m) }), months, 'måneder', [months - 1, months + 1, Math.floor(g.p / m) + 2],
          S().h.saveMonths, fill(S().x.saveMonths, { calc: calc, months: months }), { goal: g.id, chart: { goal: g.p, start: 0, step: m, n: months, unit: 'm' }, p: { price: g.p, m: m } });
      }
    },
    /* --- Lån og ÅOP --- */
    loanTotal: function () {
      var L = pick([5000, 8000, 10000, 12000, 15000, 20000]), n = pick([12, 24, 36]), r = rnd(6, 14), A = Math.round(annuity(L, r, n)), tot = A * n;
      return number('loanTotal', fill(S().q.loanTotal, { L: krk(L), A: krk(A), n: n }), tot, 'kr.', [tot - L, L + A, A * 12, tot + A], S().h.loanTotal,
        fill(S().x.loanTotal, { n: n, A: krk(A), total: krk(tot) }), { p: { L: L, A: A, n: n, r: r } });
    },
    loanCost: function () {
      var L = pick([5000, 8000, 10000, 12000, 15000, 20000]), n = pick([12, 24, 36]), r = rnd(6, 16), F = pick([200, 500, 750, 1000]), A = Math.round(annuity(L, r, n)), tot = F + A * n, cost = tot - L;
      return number('loanCost', fill(S().q.loanCost, { L: krk(L), F: krk(F), A: krk(A), n: n }), cost, 'kr.', [A * n - L, tot, cost - F, cost + A], S().h.loanCost,
        fill(S().x.loanCost, { F: krk(F), n: n, A: krk(A), total: krk(tot), L: krk(L), cost: krk(cost) }), { p: { L: L, F: F, A: A, n: n, r: r } });
    },
    aopPick: function () {
      for (;;) {
        var L = pick([10000, 15000, 20000, 30000]), n = pick([12, 24, 36]), banks = shuffle(BANKS).slice(0, 3);
        var loans = banks.map(function (b) {
          var r = rnd(5, 20), F = pick([0, 0, 300, 500, 1000, 1500, 2500]), A = Math.round(annuity(L, r, n));
          return { bank: b, rate: r, fee: F, A: A, total: F + A * n, aop: aop(L - F, A, n) };
        });
        var byAop = loans.slice().sort(function (a, b) { return a.aop - b.aop; }), byRate = loans.slice().sort(function (a, b) { return a.rate - b.rate; }), byTotal = loans.slice().sort(function (a, b) { return a.total - b.total; });
        if (byAop[1].aop - byAop[0].aop < 0.5 || byAop[2].aop - byAop[1].aop < 0.5 || byAop[2].aop > 35) continue;
        if (byTotal[0] !== byAop[0] || byTotal[1].total - byTotal[0].total < 50) continue;
        if (byRate[0] === byAop[0] || byRate[0].rate === byRate[1].rate) continue; // laveste rente er ikke det billigste lån
        var best = byAop[0];
        return choice('aopPick', fill(S().q.aopPick, { L: krk(L), n: n }), best.bank, loans.filter(function (l) { return l !== best; }).map(function (l) { return l.bank; }), S().h.aopPick,
          fill(S().x.aopPick, { lines: loans.map(function (l) { return l.bank + ': ' + krk(l.fee) + ' + ' + n + ' · ' + krk(l.A) + ' = ' + krk(l.total); }).join('; '), best: best.bank }) + ' ' + fill(S().x.aopTrap, { low: byRate[0].bank }),
          { fig: { t: 'table', head: S().loanHead, rows: loans.map(function (l) { return [l.bank, pct(l.rate), krk(l.fee), krk(l.A), pct(Math.round(l.aop * 10) / 10)]; }) }, p: { L: L, n: n, loans: loans } });
      }
    },
    kvikCost: function () { return kvik(true); },
    kvikSave: function () { return kvik(false); },
    /* --- Første lejlighed --- */
    budgetLeft: function () { return budget(false); },
    budgetGap: function () { return budget(true); },
    rentShare: function () {
      var inc = pick([12000, 13000, 14000, 15000, 16000]), p = pick([25, 30, 35, 40]), rent = inc * p / 100;
      return number('rentShare', fill(S().q.rentShare, { income: krk(inc), rent: krk(rent) }), p, '%', [p + 5, p - 5, round2(inc / rent), 100 - p], S().h.rentShare,
        fill(S().x.rentShare, { rent: krk(rent), income: krk(inc), pct: p }), { p: { income: inc, rent: rent } });
    },
    phonePick: function () { return phone(true); },
    phoneYear: function () { return phone(false); }
  };

  function fact(tag) {
    var f = pick(FACTS[tag]);
    return choice(tag + 'Fact', f[0], f[1], f[2], f[3], f[4]);
  }
  function list(kind) {
    var items = shuffle(ITEMS.filter(function (x) { return x.cat !== 'toy'; })).slice(0, 3), lines = items.map(function (it) {
      var p = itemPrice(it), q = p <= 1000 ? rnd(1, 4) : p <= 2500 ? rnd(1, 2) : 1;
      return { name: it.label, qty: q, price: p };
    });
    var total = sum(lines.map(function (l) { return l.qty * l.price; }));
    var fig = { t: 'receipt', lines: lines.map(function (l) { return [l.name, l.qty, l.price]; }) }, p = { lines: fig.lines };
    var calc = lines.map(function (l) { return l.qty + ' · ' + kr(l.price) + ' = ' + kr(l.qty * l.price); }).join('; ');
    if (kind === 'listTotal') return number('listTotal', S().q.listTotal, total / 100, 'kr.', [total / 100 + 1, total / 100 - 1, sum(lines.map(function (l) { return l.price; })) / 100, total / 100 + 10], S().h.listTotal,
      fill(S().x.listTotal, { lines: calc, total: kr(total) }), { fig: fig, p: p });
    if (kind === 'listLeft') {
      var money = [5000, 10000, 20000].filter(function (v) { return v > total; })[0], left = money - total;
      p.money = money;
      return number('listLeft', fill(S().q.listLeft, { money: kr(money) }), left / 100, 'kr.', [total / 100, left / 100 + 1, left / 100 - 1, left / 100 + 10], S().h.listLeft,
        fill(S().x.listLeft, { total: kr(total), money: kr(money), left: kr(left) }), { fig: fig, p: p });
    }
    var m = Math.max(1000, Math.round((total + rnd(-3, 3) * 500 + (Math.random() < 0.5 ? 200 : -200)) / 1000) * 1000);
    if (m === total) m += 1000;
    p.money = m;
    var yes = m >= total;
    return choice('afford', fill(S().q.afford, { money: kr(m) }), yes ? S().yes : S().no, [yes ? S().no : S().yes], S().h.afford,
      fill(S().x[yes ? 'affordYes' : 'affordNo'], { total: kr(total), money: kr(m), diff: kr(total - m) }), { fig: fig, p: p });
  }
  function offerText(o) {
    if (o.type === '3for2') return S().offer3for2;
    if (o.type === '2for') return fill(S().offer2for, { x: krk(o.x) });
    if (o.type === 'krOff') return fill(S().offerKrOff, { x: krk(o.x) });
    return fill(S().offerPct, { r: o.r });
  }
  function offer(save) {
    for (;;) {
      var it = pick(ITEMS.filter(function (x) { return x.offer; })), p = pick(it.p), type = pick(['3for2', '2for', 'krOff']), o = { type: type }, n, cost, hint;
      if (type === '3for2') { n = 3; cost = 2 * p; hint = S().h.offer3for2; }
      else if (type === '2for') { var s = rnd(2, Math.min(8, p - 1)); o.x = 2 * p - s; n = pick([2, 4]); cost = n / 2 * o.x; hint = fill(S().h.offer2for, { x: krk(o.x) }); }
      else { o.x = pick([1, 2, 3, 5].filter(function (x) { return x < p / 2; })); if (!o.x) continue; n = rnd(2, 4); cost = n * (p - o.x); hint = fill(S().h.offerKrOff, { x: krk(o.x) }); }
      var normal = n * p, sv = normal - cost;
      var q = fill(S().q[save ? 'offerSave' : 'offerPay'], { plural: it.pl, offer: offerText(o), price: krk(p), n: n });
      var ex = fill(S().x.offer, { n: n, normal: krk(normal), offerCost: krk(cost), save: krk(sv) });
      return number(save ? 'offerSave' : 'offerPay', q, save ? sv : cost, 'kr.', save ? [p * 2, sv + 1, sv * 2, cost] : [normal, cost + p, sv, cost - 1], hint, ex,
        { fig: { t: 'shops', shops: [{ name: SHOPS[0], item: it.label, offer: offerText(o), price: p * 100 }] }, p: { price: p, offer: o, n: n } });
    }
  }
  function shopCost(o, n) { // pris for n = 3 stk.
    if (o.type === '3for2') return 2 * o.p;
    if (o.type === '2for') return o.x + o.p;
    if (o.type === 'fixed') return n * o.p;
    return round2(n * o.p * (1 - o.r / 100));
  }
  function shopCalc(o) {
    if (o.type === '3for2') return '2 · ' + krk(o.p);
    if (o.type === '2for') return krk(o.x) + ' + ' + krk(o.p);
    if (o.type === 'fixed') return '3 · ' + krk(o.p);
    return '3 · ' + krk(o.p) + ' − ' + o.r + ' %';
  }
  function bestShop(band) {
    for (;;) {
      var it = pick(ITEMS.filter(function (x) { return x.offer; })), p = pick(it.p), names = shuffle(SHOPS).slice(0, 3);
      var A = { type: '3for2', p: near(p, 0, 0.4) }, B = { type: '2for', p: near(p, -0.1, 0.25) }, C;
      B.x = 2 * B.p - Math.max(1, near(B.p, -0.9, -0.6));
      if (band === 'M') C = { type: 'fixed', p: near(p, -0.3, -0.05) };
      else C = { type: 'pct', p: near(p, 0, 0.4), r: pick([20, 25, 30]) };
      var offers = shuffle([A, B, C]);
      offers.forEach(function (o, i) { o.shop = names[i]; o.cost = shopCost(o, 3); });
      if (offers.some(function (o) { return o.p < 2 || Math.abs(o.cost * 2 - Math.round(o.cost * 2)) > 1e-9; })) continue;
      var sorted = offers.slice().sort(function (a, b) { return a.cost - b.cost; });
      if (sorted[1].cost - sorted[0].cost < 1) continue;
      var best = sorted[0];
      return choice(band === 'M' ? 'bestShop' : 'bestShopU', fill(S().q.bestShop, { n: 3, plural: it.pl }), best.shop, offers.filter(function (o) { return o !== best; }).map(function (o) { return o.shop; }),
        fill(S().h.bestShop, { n: 3 }), fill(S().x.bestShop, { lines: offers.map(function (o) { return o.shop + ': ' + shopCalc(o) + ' = ' + krk(o.cost); }).join('; '), shop: best.shop }),
        { fig: { t: 'shops', shops: offers.map(function (o) { return { name: o.shop, item: it.label, offer: o.type === 'fixed' ? S().shopNormal : offerText(o), price: o.p * 100 }; }) },
          p: { offers: offers.map(function (o) { return { type: o.type, p: o.p, x: o.x, r: o.r, shop: o.shop }; }) } });
    }
  }
  function kvik(cost) {
    for (;;) {
      var g = pick(goalsOf('U').filter(function (x) { return x.p <= 8000; })), L = g.p, r = rnd(14, 24), F = pick([0, 100, 200, 300, 500]), A = Math.round(annuity(L, r, 12));
      var a = aop(L - F, A, 12);
      if (a > 35) continue;
      var tot = F + 12 * A, extra = tot - L, months = Math.ceil(L / A);
      var base = { p: { L: L, F: F, A: A, r: r } };
      if (cost) return number('kvikCost', fill(S().q.kvikCost, { goal: g.a, price: krk(L), F: krk(F), A: krk(A) }), extra, 'kr.', [12 * A - L, tot, extra - F, extra + A], S().h.kvikCost,
        fill(S().x.kvikCost, { F: krk(F), A: krk(A), total: krk(tot), price: krk(L), extra: krk(extra), aop: pct(Math.round(a * 10) / 10) }), base);
      base.chart = { goal: L, start: 0, step: A, n: months, unit: 'm' }; base.goal = g.id; // saving up reaches the goal
      return number('kvikSave', fill(S().q.kvikSave, { goal: g.a, price: krk(L), A: krk(A) }), months, 'måneder', [months - 1, months + 1, 12, months + 2], S().h.kvikSave,
        fill(S().x.kvikSave, { price: krk(L), A: krk(A), div: num(Math.round(L / A * 10) / 10), m: months, extra: krk(extra) }), base);
    }
  }
  function budget(gap) {
    for (;;) {
      var keys = BUDGET.filter(function (b, i) { return i < 6 || Math.random() < 0.5; });
      var rows = keys.map(function (b) { return [b[0], step(b[1], b[2], b[3])]; });
      var exp = sum(rows.map(function (r) { return r[1]; })), inc;
      if (gap) { inc = Math.round((exp - step(200, 1500, 50)) / 500) * 500; if (inc >= exp || inc < 9000) continue; }
      else { inc = step(INCOME[0], INCOME[1], INCOME[2]); if (inc - exp < 500 || inc - exp > 4500) continue; }
      var fig = { t: 'budget', income: inc, rows: rows };
      if (gap) return number('budgetGap', S().q.budgetGap, exp - inc, 'kr.', [exp, inc - exp + 100, exp - inc + 100, exp - inc - 100], S().h.budgetGap,
        fill(S().x.budgetGap, { exp: krk(exp), inc: krk(inc), gap: krk(exp - inc) }), { fig: fig, p: { income: inc, rows: rows } });
      return number('budgetLeft', S().q.budgetLeft, inc - exp, 'kr.', [exp, inc - exp + 100, inc - exp - 100, inc - exp + 1000], S().h.budgetLeft,
        fill(S().x.budgetLeft, { exp: krk(exp), inc: krk(inc), left: krk(inc - exp) }), { fig: fig, p: { income: inc, rows: rows } });
    }
  }
  function gbText(gb) { return gb >= 999 ? S().unlimited : gb + ' GB'; }
  function phone(choose) {
    for (;;) {
      var carriers = shuffle(CARRIERS), plans = shuffle(PLANS).slice(0, 4).sort(function (a, b) { return a[0] - b[0]; }).map(function (pl, i) {
        var m = step(pl[1], pl[2], 10), setup = pick(SETUP);
        return { carrier: carriers[i], gb: pl[0], m: m, setup: setup, year: 12 * m + setup };
      });
      var fig = { t: 'table', head: S().phoneHead, rows: plans.map(function (p) { return [p.carrier, gbText(p.gb), krk(p.m), krk(p.setup)]; }) };
      if (!choose) {
        var pl = pick(plans);
        return number('phoneYear', fill(S().q.phoneYear, { carrier: pl.carrier }), pl.year, 'kr.', [12 * pl.m, pl.m + pl.setup, pl.year + pl.m, 10 * pl.m + pl.setup], S().h.phoneYear,
          fill(S().x.phoneYear, { m: krk(pl.m), setup: krk(pl.setup), total: krk(pl.year) }), { fig: fig, p: { m: pl.m, setup: pl.setup, carrier: pl.carrier } });
      }
      var need = pick([8, 15, 25, 40, 70]), ok = plans.filter(function (p) { return p.gb >= need; }), bad = plans.filter(function (p) { return p.gb < need; });
      if (ok.length < 2 || !bad.length) continue;
      var sorted = ok.slice().sort(function (a, b) { return a.year - b.year; });
      if (sorted[1].year - sorted[0].year < 12) continue;
      var best = sorted[0];
      var lines = plans.map(function (p) { return p.gb >= need ? fill(S().x.phoneLine, { carrier: p.carrier, m: krk(p.m), setup: krk(p.setup), year: krk(p.year) }) : fill(S().x.phoneTooLittle, { carrier: p.carrier }); }).join('; ');
      return choice('phonePick', fill(S().q.phonePick, { gb: need }), best.carrier, plans.filter(function (p) { return p !== best; }).map(function (p) { return p.carrier; }), S().h.phonePick,
        fill(S().x.phonePick, { lines: lines, best: best.carrier }), { fig: fig, p: { need: need, plans: plans } });
    }
  }

  /* ---------- ruter ---------- */
  var ROUTES = [
    { id: 'pung', b: 'M', mix: [['coinFact', 2], ['mostWorth', 2], ['sameAs', 1], ['count', 2], ['pay', 3]], quick: ['coinFact', 'sameAs', 'count'] },
    { id: 'kasse', b: 'M', mix: [['change', 6], ['changeNum', 2], ['cashRound', 1], ['kasseFact', 1]], quick: ['changeNum', 'cashRound'] },
    { id: 'liste', b: 'M', mix: [['basket', 4], ['listTotal', 2], ['listLeft', 2], ['afford', 1]], quick: ['listTotal', 'listLeft'] },
    { id: 'tilbud', b: 'M', mix: [['offerSave', 2], ['offerPay', 2], ['bestShop', 3], ['perPiece', 2]], quick: ['offerSave', 'offerPay', 'bestShop', 'perPiece'] },
    { id: 'spare', b: 'M', mix: [['weeks', 3], ['plan', 3], ['total', 2], ['missing', 2]], quick: ['weeks', 'total', 'missing'] },
    { id: 'kilopris', b: 'U', mix: [['unitCalc', 4], ['cheapest', 4], ['bestShopU', 2]], quick: ['unitCalc', 'cheapest', 'bestShopU'] },
    { id: 'moms', b: 'U', mix: [['discount', 2], ['discountPct', 1], ['momsAdd', 2], ['momsRemove', 2], ['momsPart', 1], ['momsFact', 1], ['pctVsKr', 1]], quick: ['discount', 'discountPct', 'momsAdd', 'momsRemove', 'momsPart'] },
    { id: 'renter', b: 'U', mix: [['simple', 2], ['compound', 3], ['compound2', 1], ['compare', 2], ['saveMonths', 2]], quick: ['simple', 'compound', 'compound2'] },
    { id: 'laan', b: 'U', mix: [['aopFact', 1], ['loanTotal', 2], ['loanCost', 2], ['aopPick', 3], ['kvikCost', 1], ['kvikSave', 1]], quick: ['loanTotal', 'loanCost', 'aopPick', 'kvikCost'] },
    { id: 'lejlighed', b: 'U', mix: [['budgetLeft', 2], ['budgetGap', 1], ['rentShare', 2], ['phonePick', 2], ['phoneYear', 1], ['kvikCost', 1]], quick: ['budgetLeft', 'rentShare', 'phonePick', 'phoneYear'] }
  ];
  function route(id) { return ROUTES.filter(function (r) { return r.id === id; })[0]; }
  // En runde: opgaverne fra rutens blanding, uden gentagelser, i tilfældig rækkefølge (faktaspørgsmål først).
  function buildRound(r) {
    var seen = {}, facts = [], rest = [];
    r.mix.forEach(function (m) {
      for (var k = 0; k < m[1]; k++) {
        var tk, tries = 0;
        do { tk = gen[m[0]](); tries++; } while (seen[tk.q + '|' + tk.answer] && tries < 40);
        seen[tk.q + '|' + tk.answer] = 1;
        (/Fact$/.test(tk.kind) ? facts : rest).push(tk);
      }
    });
    return facts.concat(shuffle(rest));
  }

  var M = {
    MOMS: MOMS, DENOMS: DENOMS, VALUES: VALUES, TILL: TILL, denom: denom,
    NAMES: NAMES, SHOPS: SHOPS, BANKS: BANKS, CARRIERS: CARRIERS, ITEMS: ITEMS, BASKETS: BASKETS, PACKS: PACKS, NONFOOD: NONFOOD, GOALS: GOALS,
    BUDGET: BUDGET, INCOME: INCOME, PLANS: PLANS, SETUP: SETUP, FACTS: FACTS,
    num: num, kr: kr, krk: krk, pct: pct, fill: fill, sizeText: sizeText, parseDa: parseDa, fmtAnswer: fmtAnswer, round2: round2, gbText: gbText, offerText: offerText,
    minChange: minChange, cashRound: cashRound, simpleInterest: simpleInterest, compound: compound, annuity: annuity, aop: aop,
    gen: gen, ROUTES: ROUTES, route: route, buildRound: buildRound
  };
  root.LP_MONEY = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : global);
