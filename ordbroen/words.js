/*
 * Ordbroen – engelske ord, sætninger og regler. Alt engelsk er britisk engelsk; amerikanske stavemåder
 * står i »us« og bliver også godkendt. Danske oversættelser står i »da«.
 * Rettes her; tjekkes med node tools/test-ordbroen.js (hunspell en_GB, en_US og da_DK).
 */
(function (root) {
  'use strict';

  // [engelsk, dansk, amerikansk stavemåde (hvis anderledes)]
  var themes = [
    { id: 'farver', b: 'M', name: 'Farver', words: [['red', 'rød'], ['blue', 'blå'], ['green', 'grøn'], ['yellow', 'gul'], ['black', 'sort'], ['white', 'hvid'], ['brown', 'brun'], ['pink', 'lyserød'], ['purple', 'lilla'], ['orange', 'orange'], ['grey', 'grå', 'gray']] },
    { id: 'tal', b: 'M', name: 'Tal', words: [['one', 'en'], ['two', 'to'], ['three', 'tre'], ['four', 'fire'], ['five', 'fem'], ['six', 'seks'], ['seven', 'syv'], ['eight', 'otte'], ['nine', 'ni'], ['ten', 'ti'], ['eleven', 'elleve'], ['twelve', 'tolv'], ['fifteen', 'femten'], ['twenty', 'tyve'], ['hundred', 'hundrede']] },
    { id: 'familie', b: 'M', name: 'Familie', words: [['mother', 'mor'], ['father', 'far'], ['sister', 'søster'], ['brother', 'bror'], ['grandmother', 'bedstemor'], ['grandfather', 'bedstefar'], ['baby', 'baby'], ['family', 'familie'], ['friend', 'ven'], ['aunt', 'tante'], ['uncle', 'onkel'], ['boy', 'dreng'], ['girl', 'pige']] },
    { id: 'krop', b: 'M', name: 'Kroppen', words: [['head', 'hoved'], ['hand', 'hånd'], ['foot', 'fod'], ['leg', 'ben'], ['eye', 'øje'], ['ear', 'øre'], ['nose', 'næse'], ['mouth', 'mund'], ['hair', 'hår'], ['tooth', 'tand'], ['knee', 'knæ'], ['back', 'ryg'], ['stomach', 'mave'], ['neck', 'hals']] },
    { id: 'mad', b: 'M', name: 'Mad og drikke', words: [['bread', 'brød'], ['milk', 'mælk'], ['water', 'vand'], ['apple', 'æble'], ['banana', 'banan'], ['cheese', 'ost'], ['egg', 'æg'], ['fish', 'fisk'], ['cake', 'kage'], ['chicken', 'kylling'], ['potato', 'kartoffel'], ['carrot', 'gulerod'], ['soup', 'suppe'], ['ice cream', 'is'], ['breakfast', 'morgenmad'], ['dinner', 'aftensmad']] },
    { id: 'dyr', b: 'M', name: 'Dyr', words: [['dog', 'hund'], ['cat', 'kat'], ['horse', 'hest'], ['cow', 'ko'], ['pig', 'gris'], ['sheep', 'får'], ['bird', 'fugl'], ['mouse', 'mus'], ['rabbit', 'kanin'], ['duck', 'and'], ['frog', 'frø'], ['bee', 'bi'], ['bear', 'bjørn'], ['lion', 'løve'], ['elephant', 'elefant'], ['monkey', 'abe'], ['snake', 'slange'], ['owl', 'ugle']] },
    { id: 'skole', b: 'M', name: 'Skolen', words: [['school', 'skole'], ['teacher', 'lærer'], ['book', 'bog'], ['pencil', 'blyant'], ['classroom', 'klasseværelse'], ['ruler', 'lineal'], ['homework', 'lektier'], ['paper', 'papir'], ['scissors', 'saks'], ['lesson', 'lektion'], ['maths', 'matematik', 'math'], ['break', 'frikvarter'], ['bag', 'taske']] },
    { id: 'fritid', b: 'M', name: 'Fritid', words: [['football', 'fodbold'], ['music', 'musik'], ['game', 'spil'], ['bike', 'cykel'], ['ball', 'bold'], ['park', 'park'], ['beach', 'strand'], ['holiday', 'ferie'], ['film', 'film'], ['swim', 'svømme'], ['dance', 'danse'], ['read', 'læse'], ['sing', 'synge'], ['draw', 'tegne']] },
    { id: 'hjem', b: 'M', name: 'Hjemme', words: [['house', 'hus'], ['kitchen', 'køkken'], ['bedroom', 'soveværelse'], ['bathroom', 'badeværelse'], ['garden', 'have'], ['door', 'dør'], ['window', 'vindue'], ['table', 'bord'], ['chair', 'stol'], ['bed', 'seng'], ['lamp', 'lampe'], ['stairs', 'trappe'], ['floor', 'gulv']] },
    { id: 'toej', b: 'M', name: 'Tøj', words: [['shirt', 'skjorte'], ['trousers', 'bukser'], ['dress', 'kjole'], ['shoes', 'sko'], ['socks', 'sokker'], ['hat', 'hat'], ['jacket', 'jakke'], ['skirt', 'nederdel'], ['scarf', 'halstørklæde'], ['gloves', 'handsker'], ['boots', 'støvler'], ['T-shirt', 'T-shirt']] },
    { id: 'tid', b: 'M', name: 'Dage og tid', words: [['Monday', 'mandag'], ['Tuesday', 'tirsdag'], ['Wednesday', 'onsdag'], ['Thursday', 'torsdag'], ['Friday', 'fredag'], ['Saturday', 'lørdag'], ['Sunday', 'søndag'], ['today', 'i dag'], ['tomorrow', 'i morgen'], ['yesterday', 'i går'], ['morning', 'morgen'], ['evening', 'aften'], ['night', 'nat'], ['week', 'uge'], ['month', 'måned'], ['year', 'år']] },
    { id: 'vejr', b: 'M', name: 'Vejret', words: [['sun', 'sol'], ['rain', 'regn'], ['snow', 'sne'], ['wind', 'vind'], ['cloud', 'sky'], ['weather', 'vejr'], ['rainbow', 'regnbue'], ['cold', 'kold'], ['warm', 'varm'], ['storm', 'storm']] },
    { id: 'verber', b: 'M', name: 'Det gør vi', words: [['run', 'løbe'], ['jump', 'hoppe'], ['eat', 'spise'], ['drink', 'drikke'], ['sleep', 'sove'], ['walk', 'gå'], ['write', 'skrive'], ['help', 'hjælpe'], ['open', 'åbne'], ['close', 'lukke'], ['listen', 'lytte'], ['buy', 'købe'], ['cook', 'lave mad'], ['laugh', 'grine']] },
    { id: 'adjektiver', b: 'M', name: 'Sådan er det', words: [['big', 'stor'], ['small', 'lille'], ['happy', 'glad'], ['fast', 'hurtig'], ['slow', 'langsom'], ['new', 'ny'], ['old', 'gammel'], ['young', 'ung'], ['good', 'god'], ['bad', 'dårlig'], ['funny', 'sjov'], ['tired', 'træt'], ['hungry', 'sulten'], ['beautiful', 'smuk'], ['easy', 'let'], ['difficult', 'svær']] },
    // Udskoling
    { id: 'byen', b: 'U', name: 'I byen', words: [['station', 'station'], ['ticket', 'billet'], ['street', 'gade'], ['library', 'bibliotek'], ['hospital', 'hospital'], ['bridge', 'bro'], ['traffic lights', 'trafiklys'], ['pavement', 'fortov', 'sidewalk'], ['shop', 'butik'], ['church', 'kirke'], ['square', 'torv'], ['crossroads', 'vejkryds'], ['neighbour', 'nabo', 'neighbor'], ['queue', 'kø'], ['underground', 'metro', 'subway']] },
    { id: 'natur', b: 'U', name: 'Natur og miljø', words: [['forest', 'skov'], ['mountain', 'bjerg'], ['river', 'flod'], ['island', 'ø'], ['coast', 'kyst'], ['field', 'mark'], ['environment', 'miljø'], ['pollution', 'forurening'], ['recycle', 'genbruge'], ['climate', 'klima'], ['energy', 'energi'], ['waste', 'affald'], ['wildlife', 'dyreliv'], ['flood', 'oversvømmelse']] },
    { id: 'foelelser', b: 'U', name: 'Følelser og meninger', words: [['angry', 'vred'], ['proud', 'stolt'], ['nervous', 'nervøs'], ['bored', 'keder sig'], ['surprised', 'overrasket'], ['jealous', 'jaloux'], ['embarrassed', 'flov'], ['grateful', 'taknemmelig'], ['lonely', 'ensom'], ['excited', 'spændt'], ['scared', 'bange'], ['relieved', 'lettet'], ['agree', 'være enig'], ['opinion', 'mening']] }
  ];

  // Byg sætningen. Første ord står med stort, så rækkefølgen er entydig; »alts« = andre rigtige rækkefølger.
  var sentences = [
    { b: 'M', en: 'I have a dog.', da: 'Jeg har en hund.' },
    { b: 'M', en: 'My name is Bob.', da: 'Jeg hedder Bob.' },
    { b: 'M', en: 'I like apples.', da: 'Jeg kan lide æbler.' },
    { b: 'M', en: 'The cat is black.', da: 'Katten er sort.' },
    { b: 'M', en: 'Can you swim?', da: 'Kan du svømme?' },
    { b: 'M', en: 'We play football.', da: 'Vi spiller fodbold.' },
    { b: 'M', en: 'She is my sister.', da: 'Hun er min søster.' },
    { b: 'M', en: 'Where is the school?', da: 'Hvor er skolen?' },
    { b: 'M', en: 'I am ten years old.', da: 'Jeg er ti år gammel.' },
    { b: 'M', en: 'It is cold today.', da: 'Det er koldt i dag.' },
    { b: 'M', en: 'Do you like pizza?', da: 'Kan du lide pizza?' },
    { b: 'M', en: 'He has a red bike.', da: 'Han har en rød cykel.' },
    { b: 'M', en: 'The dog is in the garden.', da: 'Hunden er i haven.' },
    { b: 'M', en: 'We eat breakfast at seven.', da: 'Vi spiser morgenmad klokken syv.' },
    { b: 'M', en: 'What is your name?', da: 'Hvad hedder du?' },
    { b: 'M', en: 'My brother is very tall.', da: 'Min bror er meget høj.' },
    { b: 'M', en: 'They live in a big house.', da: 'De bor i et stort hus.' },
    { b: 'M', en: 'I can see a bird.', da: 'Jeg kan se en fugl.' },
    { b: 'M', en: 'It is my birthday.', da: 'Det er min fødselsdag.' },
    { b: 'M', en: 'How old are you?', da: 'Hvor gammel er du?' },
    { b: 'U', en: 'Yesterday I went to the beach.', da: 'I går tog jeg til stranden.' },
    { b: 'U', en: 'I have never been to London.', da: 'Jeg har aldrig været i London.' },
    { b: 'U', en: 'She always drinks tea in the morning.', da: 'Hun drikker altid te om morgenen.' },
    { b: 'U', en: 'We usually play football on Fridays.', da: 'Vi spiller som regel fodbold om fredagen.' },
    { b: 'U', en: 'Do you know where the station is?', da: 'Ved du, hvor stationen er?' },
    { b: 'U', en: 'He does not like spiders.', da: 'Han kan ikke lide edderkopper.' },
    { b: 'U', en: 'Did you see the film last night?', da: 'Så du filmen i går aftes?' },
    { b: 'U', en: 'My sister is older than me.', da: 'Min søster er ældre end mig.' },
    { b: 'U', en: 'There are three books on the table.', da: 'Der er tre bøger på bordet.' },
    { b: 'U', en: 'What time does the train leave?', da: 'Hvornår kører toget?' },
    { b: 'U', en: 'In Denmark we often ride our bikes.', da: 'I Danmark cykler vi tit.' },
    { b: 'U', en: 'I have lived here for five years.', da: 'Jeg har boet her i fem år.' },
    { b: 'U', en: 'Can you help me with my homework?', da: 'Kan du hjælpe mig med mine lektier?' },
    { b: 'U', en: 'Tomorrow we are going to visit my grandmother.', da: 'I morgen skal vi besøge min bedstemor.' },
    { b: 'U', en: 'I think it is going to rain.', da: 'Jeg tror, det begynder at regne.' }
  ];

  // Grammatikregler, vist efter et forkert svar
  var rules = {
    aan: { name: 'a eller an', text: 'Man bruger »an« foran ord, der udtales med en vokallyd (an apple, an hour), og »a« foran ord, der starter med en konsonantlyd (a dog, a uniform).' },
    isare: { name: 'is eller are', text: 'Én ting eller person: is (the dog is). Flere: are (the dogs are). Med »I« hedder det »am«, og med »you« hedder det »are«.' },
    s3: { name: 's i tredje person', text: 'Når det handler om he, she, it eller én person, får verbet et -s i nutid: she plays, he likes, it eats.' },
    hashave: { name: 'has eller have', text: 'He, she og it: has. I, you, we og they: have.' },
    does: { name: 'do eller does', text: 'Spørgsmål og nægtelser i nutid laves med do. Ved he, she og it bruges does: Does she like it? He does not know.' },
    past: { name: 'Datid', text: 'Datid bruges om noget, der er sket og afsluttet (yesterday, last week). Mange verber får -ed (played), men de uregelmæssige har deres egen form (went, saw, ate).' },
    there: { name: 'there, their eller they\'re', text: '»There« betyder der (there is). »Their« betyder deres (their house). »They\'re« er en forkortelse af they are.' },
    your: { name: 'your eller you\'re', text: '»Your« betyder din eller jeres (your bag). »You\'re« er en forkortelse af you are.' },
    its: { name: 'its eller it\'s', text: '»Its« betyder dens eller dets (the dog wagged its tail). »It\'s« er en forkortelse af it is eller it has.' },
    to: { name: 'to, too eller two', text: '»Two« er tallet 2. »Too« betyder også eller for meget (too hot). »To« bruges foran verber og om retning (to school).' },
    than: { name: 'than eller then', text: '»Than« bruges, når man sammenligner (bigger than). »Then« betyder så eller derefter.' },
    much: { name: 'much eller many', text: '»Many« bruges om ting, man kan tælle (many apples). »Much« bruges om ting, man ikke kan tælle (much water).' },
    order: { name: 'Ordstilling', text: 'På engelsk står grundleddet før udsagnsleddet, også når sætningen starter med et tidsord: Yesterday I went (ikke Yesterday went I). Ord som always, never og usually står foran verbet: She always drinks tea.' },
    verb: { name: 'Uregelmæssige verber', text: 'De fleste engelske verber får -ed i datid (play, played, played). De uregelmæssige har deres egne former, som man skal lære udenad: go, went, gone.' },
    false: { name: 'Falske venner', text: 'Nogle engelske ord ligner danske ord, men betyder noget helt andet. Dem skal man lære særskilt.' },
    idiom: { name: 'Faste udtryk', text: 'Faste udtryk kan ikke oversættes ord for ord. Man skal kende hele udtrykket for at forstå det.' },
    read: { name: 'Læs efter', text: 'Svaret står i teksten. Læs den igen, og find den sætning, der handler om spørgsmålet.' },
    word: { name: 'Ordet', text: 'Lyt eller læs ordet igen, og tænk på, hvilket emne det hører til.' },
    compare: { name: 'Gradbøjning', text: 'Korte ord får -er og -est (big, bigger, biggest). Lange ord får more og most (more beautiful). Nogle er uregelmæssige: good, better, best og bad, worse, worst.' }
  };
  // Hul i sætningen: a = rigtigt, x = forkerte
  var gaps = [
    { b: 'M', r: 'aan', s: 'I have ___ apple.', a: 'an', x: ['a'] },
    { b: 'M', r: 'aan', s: 'She has ___ dog.', a: 'a', x: ['an'] },
    { b: 'M', r: 'aan', s: 'It is ___ elephant.', a: 'an', x: ['a'] },
    { b: 'M', r: 'aan', s: 'He is eating ___ banana.', a: 'a', x: ['an'] },
    { b: 'M', r: 'aan', s: 'We waited for ___ hour.', a: 'an', x: ['a'] },
    { b: 'M', r: 'aan', s: 'My mum wears ___ uniform at work.', a: 'a', x: ['an'] },
    { b: 'M', r: 'isare', s: 'The cat ___ hungry.', a: 'is', x: ['are', 'am'] },
    { b: 'M', r: 'isare', s: 'The children ___ in the park.', a: 'are', x: ['is', 'am'] },
    { b: 'M', r: 'isare', s: 'I ___ nine years old.', a: 'am', x: ['is', 'are'] },
    { b: 'M', r: 'isare', s: 'You ___ my best friend.', a: 'are', x: ['is', 'am'] },
    { b: 'M', r: 'isare', s: 'My shoes ___ new.', a: 'are', x: ['is', 'am'] },
    { b: 'M', r: 'isare', s: 'The weather ___ nice today.', a: 'is', x: ['are', 'am'] },
    { b: 'M', r: 's3', s: 'She ___ in London.', a: 'lives', x: ['live', 'living'] },
    { b: 'M', r: 's3', s: 'My dog ___ bones.', a: 'likes', x: ['like', 'liking'] },
    { b: 'M', r: 's3', s: 'We ___ football every day.', a: 'play', x: ['plays', 'playing'] },
    { b: 'M', r: 's3', s: 'He ___ to school by bike.', a: 'goes', x: ['go', 'going'] },
    { b: 'M', r: 's3', s: 'They ___ English and Danish.', a: 'speak', x: ['speaks', 'speaking'] },
    { b: 'M', r: 'hashave', s: 'She ___ two brothers.', a: 'has', x: ['have'] },
    { b: 'M', r: 'hashave', s: 'I ___ a new bike.', a: 'have', x: ['has'] },
    { b: 'M', r: 'hashave', s: 'The rabbit ___ long ears.', a: 'has', x: ['have'] },
    { b: 'M', r: 'hashave', s: 'We ___ a big garden.', a: 'have', x: ['has'] },
    { b: 'U', r: 'does', s: '___ you like cats?', a: 'Do', x: ['Does', 'Are'] },
    { b: 'U', r: 'does', s: '___ she play the piano?', a: 'Does', x: ['Do', 'Is'] },
    { b: 'U', r: 'does', s: 'He ___ not eat meat.', a: 'does', x: ['do', 'is'] },
    { b: 'U', r: 'does', s: 'We ___ not have any homework today.', a: 'do', x: ['does', 'are'] },
    { b: 'U', r: 'does', s: 'Where ___ your parents work?', a: 'do', x: ['does', 'are'] },
    { b: 'U', r: 'does', s: 'What time ___ the film start?', a: 'does', x: ['do', 'is'] },
    { b: 'U', r: 'past', s: 'Yesterday we ___ to the zoo.', a: 'went', x: ['go', 'goed', 'gone'] },
    { b: 'U', r: 'past', s: 'Last week I ___ a great book.', a: 'read', x: ['readed', 'reads', 'reading'] },
    { b: 'U', r: 'past', s: 'She ___ her keys on the bus yesterday.', a: 'lost', x: ['lose', 'losed', 'loses'] },
    { b: 'U', r: 'past', s: 'We ___ football after school yesterday.', a: 'played', x: ['play', 'plays', 'playing'] },
    { b: 'U', r: 'past', s: 'Two days ago he ___ his arm.', a: 'broke', x: ['breaked', 'breaks', 'broken'] },
    { b: 'U', r: 'past', s: 'They ___ pizza for dinner last night.', a: 'ate', x: ['eat', 'eated', 'eaten'] },
    { b: 'U', r: 'past', s: 'I ___ my grandmother last Sunday.', a: 'visited', x: ['visit', 'visits', 'visiting'] },
    { b: 'U', r: 's3', s: 'My sister never ___ her room.', a: 'tidies', x: ['tidy', 'tidys'] },
    { b: 'U', r: 's3', s: 'He usually ___ the bus to school.', a: 'catches', x: ['catch', 'catchs'] },
    { b: 'U', r: 'there', s: '___ is a cat on the roof.', a: 'There', x: ['Their', 'They\'re'] },
    { b: 'U', r: 'there', s: 'The twins forgot ___ lunch boxes.', a: 'their', x: ['there', 'they\'re'] },
    { b: 'U', r: 'there', s: 'Look at the boys! ___ playing in the rain.', a: 'They\'re', x: ['There', 'Their'] },
    { b: 'U', r: 'there', s: 'I put the books over ___.', a: 'there', x: ['their', 'they\'re'] },
    { b: 'U', r: 'your', s: 'Is this ___ jacket?', a: 'your', x: ['you\'re'] },
    { b: 'U', r: 'your', s: '___ going to love this film!', a: 'You\'re', x: ['Your'] },
    { b: 'U', r: 'your', s: 'Don\'t forget ___ homework.', a: 'your', x: ['you\'re'] },
    { b: 'U', r: 'its', s: 'The bird hurt ___ wing.', a: 'its', x: ['it\'s'] },
    { b: 'U', r: 'its', s: '___ raining again.', a: 'It\'s', x: ['Its'] },
    { b: 'U', r: 'its', s: 'The company changed ___ logo.', a: 'its', x: ['it\'s'] },
    { b: 'U', r: 'to', s: 'I have ___ cats and a dog.', a: 'two', x: ['to', 'too'] },
    { b: 'U', r: 'to', s: 'This soup is ___ hot to eat.', a: 'too', x: ['to', 'two'] },
    { b: 'U', r: 'to', s: 'We walk ___ school every morning.', a: 'to', x: ['too', 'two'] },
    { b: 'U', r: 'to', s: 'Can I come ___?', a: 'too', x: ['to', 'two'] },
    { b: 'U', r: 'than', s: 'My brother is taller ___ me.', a: 'than', x: ['then'] },
    { b: 'U', r: 'than', s: 'First we had dinner, and ___ we watched a film.', a: 'then', x: ['than'] },
    { b: 'U', r: 'than', s: 'A cheetah is faster ___ a horse.', a: 'than', x: ['then'] },
    { b: 'U', r: 'much', s: 'How ___ apples are there?', a: 'many', x: ['much'] },
    { b: 'U', r: 'much', s: 'How ___ water do you drink a day?', a: 'much', x: ['many'] },
    { b: 'U', r: 'much', s: 'There were too ___ people on the bus.', a: 'many', x: ['much'] },
    { b: 'U', r: 'much', s: 'We don\'t have ___ time.', a: 'much', x: ['many'] },
    { b: 'U', r: 'compare', s: 'This is the ___ day of my life!', a: 'best', x: ['goodest', 'better', 'most good'] },
    { b: 'U', r: 'compare', s: 'An elephant is ___ than a mouse.', a: 'bigger', x: ['more big', 'biggest', 'big'] },
    { b: 'U', r: 'compare', s: 'This book is ___ than the last one.', a: 'more interesting', x: ['interestinger', 'most interesting', 'interesting'] },
    { b: 'U', r: 'compare', s: 'My cold is ___ today than yesterday.', a: 'worse', x: ['badder', 'worst', 'more bad'] }
  ];

  // Uregelmæssige verber: [nutid, datid, førnutid (kort tillægsform), dansk, amerikansk førnutid (hvis anderledes)]
  var verbs = [
    ['be', 'was', 'been', 'være'], ['have', 'had', 'had', 'have'], ['do', 'did', 'done', 'gøre'], ['go', 'went', 'gone', 'gå'],
    ['see', 'saw', 'seen', 'se'], ['come', 'came', 'come', 'komme'], ['get', 'got', 'got', 'få', 'gotten'], ['give', 'gave', 'given', 'give'],
    ['take', 'took', 'taken', 'tage'], ['make', 'made', 'made', 'lave'], ['say', 'said', 'said', 'sige'], ['know', 'knew', 'known', 'vide'],
    ['think', 'thought', 'thought', 'tænke'], ['find', 'found', 'found', 'finde'], ['eat', 'ate', 'eaten', 'spise'], ['drink', 'drank', 'drunk', 'drikke'],
    ['swim', 'swam', 'swum', 'svømme'], ['run', 'ran', 'run', 'løbe'], ['sing', 'sang', 'sung', 'synge'], ['begin', 'began', 'begun', 'begynde'],
    ['write', 'wrote', 'written', 'skrive'], ['ride', 'rode', 'ridden', 'ride'], ['drive', 'drove', 'driven', 'køre'], ['fly', 'flew', 'flown', 'flyve'],
    ['buy', 'bought', 'bought', 'købe'], ['bring', 'brought', 'brought', 'tage med'], ['teach', 'taught', 'taught', 'undervise'], ['catch', 'caught', 'caught', 'fange'],
    ['sell', 'sold', 'sold', 'sælge'], ['tell', 'told', 'told', 'fortælle'], ['sleep', 'slept', 'slept', 'sove'], ['keep', 'kept', 'kept', 'beholde'],
    ['feel', 'felt', 'felt', 'føle'], ['leave', 'left', 'left', 'tage af sted'], ['meet', 'met', 'met', 'møde'], ['sit', 'sat', 'sat', 'sidde'],
    ['stand', 'stood', 'stood', 'stå'], ['win', 'won', 'won', 'vinde'], ['lose', 'lost', 'lost', 'tabe'], ['pay', 'paid', 'paid', 'betale'],
    ['break', 'broke', 'broken', 'brække'], ['speak', 'spoke', 'spoken', 'tale'], ['choose', 'chose', 'chosen', 'vælge'], ['forget', 'forgot', 'forgotten', 'glemme'],
    ['wear', 'wore', 'worn', 'have på'], ['throw', 'threw', 'thrown', 'kaste'], ['grow', 'grew', 'grown', 'vokse'], ['draw', 'drew', 'drawn', 'tegne'],
    ['fall', 'fell', 'fallen', 'falde'], ['hide', 'hid', 'hidden', 'gemme sig'], ['send', 'sent', 'sent', 'sende'], ['spend', 'spent', 'spent', 'bruge'],
    ['build', 'built', 'built', 'bygge'], ['hear', 'heard', 'heard', 'høre'], ['understand', 'understood', 'understood', 'forstå'], ['wake', 'woke', 'woken', 'vågne'],
    ['steal', 'stole', 'stolen', 'stjæle'], ['shake', 'shook', 'shaken', 'ryste'], ['blow', 'blew', 'blown', 'blæse'], ['bite', 'bit', 'bitten', 'bide']
  ];

  // Falske venner: et engelsk ord, der ligner et dansk ord, men betyder noget andet.
  // [engelsk ord, rigtig dansk betydning, det danske ord, det ligner, hvad det danske ord betyder på engelsk, to andre forkerte]
  var falseFriends = [
    ['eventually', 'til sidst', 'eventuelt', 'possibly', ['aldrig', 'straks']],
    ['actually', 'faktisk', 'aktuelt', 'current', ['måske', 'sjældent']],
    ['gift', 'gave', 'gift', 'married eller poison', ['brev', 'fest']],
    ['sensible', 'fornuftig', 'sensibel', 'sensitive', ['sjov', 'doven']],
    ['fabric', 'stof', 'fabrik', 'factory', ['papir', 'maskine']],
    ['chef', 'kok', 'chef', 'boss', ['tjener', 'læge']],
    ['novel', 'roman', 'novelle', 'short story', ['digt', 'avis']],
    ['brave', 'modig', 'brav', 'well-behaved', ['bange', 'træt']],
    ['rent', 'husleje', 'rent', 'clean', ['regning', 'skat']],
    ['mist', 'tåge', 'mist', 'lost', ['regn', 'sne']],
    ['kind', 'venlig', 'kind', 'cheek', ['vred', 'stille']],
    ['hug', 'kram', 'hug', 'cut eller blow', ['kys', 'håndtryk']],
    ['photograph', 'fotografi', 'fotograf', 'photographer', ['maleri', 'kamera']],
    ['physician', 'læge', 'fysiker', 'physicist', ['lærer', 'sygeplejerske']],
    ['chips', 'pommes frites', 'chips', 'crisps', ['pandekager', 'boller']],
    ['art', 'kunst', 'art', 'kind eller species', ['musik', 'historie']],
    ['barn', 'lade', 'barn', 'child', ['stald', 'have']],
    ['sky', 'himmel', 'sky', 'cloud', ['sol', 'regn']],
    ['pine', 'fyrretræ', 'pine', 'torment', ['egetræ', 'blomst']],
    ['time', 'tid', 'time', 'hour', ['uge', 'dag']],
    ['tag', 'mærkat', 'tag', 'roof', ['dør', 'væg']]
  ];

  // Faste udtryk: [engelsk, dansk betydning, forkerte]
  var idioms = [
    ['It\'s raining cats and dogs.', 'Det styrtregner.', ['Der er mange dyr ude.', 'Det regner en lille smule.']],
    ['Break a leg!', 'Held og lykke! (siges før en optræden)', ['Pas på, du ikke falder!', 'Løb hurtigere!']],
    ['It\'s a piece of cake.', 'Det er meget let.', ['Det er tid til kage.', 'Det er kun en lille del.']],
    ['I\'m feeling under the weather.', 'Jeg føler mig lidt syg.', ['Jeg er glad for regnvejr.', 'Jeg står udenfor.']],
    ['once in a blue moon', 'meget sjældent', ['hver nat', 'når det er fuldmåne']],
    ['It costs an arm and a leg.', 'Det er meget dyrt.', ['Det gør ondt.', 'Det er gratis.']],
    ['to spill the beans', 'at afsløre en hemmelighed', ['at lave mad', 'at være klodset']],
    ['to be on cloud nine', 'at være meget glad', ['at være meget træt', 'at flyve i et fly']],
    ['to feel blue', 'at være ked af det', ['at fryse', 'at være vred']],
    ['Better late than never.', 'Bedre sent end aldrig.', ['Kom aldrig for sent.', 'Det er for sent nu.']],
    ['Let\'s call it a day.', 'Lad os stoppe for i dag.', ['Lad os ringe i morgen.', 'Lad os starte forfra.']],
    ['to have butterflies in your stomach', 'at være nervøs', ['at have ondt i maven', 'at være sulten']],
    ['to keep an eye on something', 'at holde øje med noget', ['at lukke det ene øje', 'at gemme noget']],
    ['The ball is in your court.', 'Det er din tur til at bestemme.', ['Du har tabt bolden.', 'Kampen er slut.']],
    ['No pain, no gain.', 'Man må anstrenge sig for at opnå noget.', ['Det gør ikke ondt.', 'Man skal undgå at blive skadet.']],
    ['to hit the books', 'at læse lektier', ['at smide bøgerne', 'at købe bøger']]
  ];

  // Læs og forstå. M: spørgsmål på dansk, U: på engelsk.
  var texts = [
    { b: 'M', title: 'Emma', text: 'My name is Emma. I am nine years old. I live in a small house with my mum, my dad and my little brother, Tom. We have a cat called Fluffy. Fluffy is white and very lazy. She sleeps all day!',
      qs: [['Hvor gammel er Emma?', 'Ni år', ['Ti år', 'Syv år']], ['Hvad hedder Emmas lillebror?', 'Tom', ['Fluffy', 'Tim']], ['Hvad laver katten hele dagen?', 'Den sover', ['Den leger', 'Den spiser']]] },
    { b: 'M', title: 'I parken', text: 'Today is Saturday. The sun is shining, so Ali and his friends go to the park. They play football for two hours. Then they eat ice cream. Ali likes chocolate ice cream best.',
      qs: [['Hvilken dag er det?', 'Lørdag', ['Søndag', 'Fredag']], ['Hvad spiller de i parken?', 'Fodbold', ['Tennis', 'Kort']], ['Hvilken is kan Ali bedst lide?', 'Chokoladeis', ['Jordbæris', 'Vaniljeis']]] },
    { b: 'M', title: 'Bobs dag', text: 'Bob the bee wakes up at seven o\'clock. He eats honey for breakfast. Then he flies to school. His favourite subject is English. After school he helps his mother in the garden.',
      qs: [['Hvornår vågner Bob?', 'Klokken syv', ['Klokken otte', 'Klokken seks']], ['Hvad spiser Bob til morgenmad?', 'Honning', ['Brød', 'Æbler']], ['Hvad er Bobs yndlingsfag?', 'Engelsk', ['Matematik', 'Musik']]] },
    { b: 'M', title: 'Min nye cykel', text: 'Last week I got a new bike. It is blue and it has a big basket. Every morning I ride my bike to school. My friend Sara rides with me. We always stop at the bakery and buy a bun.',
      qs: [['Hvilken farve har cyklen?', 'Blå', ['Rød', 'Grøn']], ['Hvem cykler med i skole?', 'Sara', ['Mor', 'Tom']], ['Hvad køber de hos bageren?', 'En bolle', ['Et brød', 'En kage']]] },
    { b: 'U', title: 'A holiday in Scotland', text: 'Last summer, Freya went on holiday to Scotland with her family. They stayed in a small cottage near a lake. Every morning they went hiking in the hills, and in the evenings they played cards. On the last day it rained so much that they stayed inside and baked scones. Freya says it was the best holiday ever.',
      qs: [['Where did Freya\'s family stay?', 'In a cottage near a lake', ['In a hotel in the city', 'In a tent on the beach']], ['What did they do in the evenings?', 'They played cards', ['They went hiking', 'They watched films']], ['Why did they stay inside on the last day?', 'Because it rained a lot', ['Because Freya was ill', 'Because it was too hot']]] },
    { b: 'U', title: 'Phones and sleep', text: 'Many teenagers spend several hours a day on their phones. Some experts say this can make it harder to fall asleep, because the light from the screen keeps the brain awake. A simple tip is to put your phone in another room an hour before bedtime. Many people who try it say they fall asleep faster.',
      qs: [['According to some experts, why can phones make it harder to sleep?', 'The light from the screen keeps the brain awake', ['Phones are too loud', 'Teenagers go to bed too early']], ['What is the tip in the text?', 'Put your phone in another room an hour before bedtime', ['Turn the screen brighter', 'Use your phone in bed']], ['What do many people who try the tip say?', 'They fall asleep faster', ['They sleep less', 'They forget their phones']]] },
    { b: 'U', title: 'The dog walker', text: 'Oliver wanted to earn some money, so he started walking his neighbour\'s dog, Max, three times a week. At first Max pulled on the lead all the time, but after a few weeks he learned to walk nicely. Now two other neighbours have asked Oliver to walk their dogs too.',
      qs: [['Why did Oliver start walking the dog?', 'He wanted to earn some money', ['His parents told him to', 'He wanted a dog of his own']], ['What was the problem at first?', 'Max pulled on the lead', ['Max was afraid of cars', 'Max ran away']], ['What has happened now?', 'Two other neighbours want Oliver to walk their dogs', ['Oliver has stopped walking Max', 'Max has learned to fetch the newspaper']]] },
    { b: 'U', title: 'The school garden', text: 'This spring, class 7B started a school garden. They planted potatoes, carrots and sunflowers. The hardest part was remembering to water the plants during the Easter holiday, so they made a rota where two pupils came in every day. In June they cooked a soup with their own vegetables and invited their parents.',
      qs: [['What did the class plant?', 'Potatoes, carrots and sunflowers', ['Apples and pears', 'Tomatoes and roses']], ['What was the hardest part?', 'Watering the plants during the Easter holiday', ['Digging the soil', 'Finding seeds']], ['What did they do in June?', 'They cooked soup and invited their parents', ['They sold the vegetables', 'They went on a trip']]] }
  ];

  var routes = [
    { id: 'm-farver', b: 'M', name: 'Farver og tal', desc: 'Hør ordet, og find det danske', kind: 'words', themes: ['farver', 'tal'] },
    { id: 'm-familie', b: 'M', name: 'Familie og krop', desc: 'Mor, far, hoved og hænder', kind: 'words', themes: ['familie', 'krop'] },
    { id: 'm-mad', b: 'M', name: 'Mad og dyr', desc: 'Fra æbler til elefanter', kind: 'words', themes: ['mad', 'dyr'] },
    { id: 'm-skole', b: 'M', name: 'Skole og fritid', desc: 'Lektier, fodbold og ferie', kind: 'words', themes: ['skole', 'fritid'] },
    { id: 'm-hjem', b: 'M', name: 'Hjemme, tøj og vejr', desc: 'Huset, tøjet og vejret', kind: 'words', themes: ['hjem', 'toej', 'vejr'] },
    { id: 'm-tid', b: 'M', name: 'Dage og handlinger', desc: 'Ugedage, verber og tillægsord', kind: 'words', themes: ['tid', 'verber', 'adjektiver'] },
    { id: 'm-grammatik', b: 'M', name: 'Små ord', desc: 'a eller an, is eller are, has eller have', kind: 'gap', rules: ['aan', 'isare', 's3', 'hashave'] },
    { id: 'm-saetning', b: 'M', name: 'Byg sætninger', desc: 'Sæt ordene i den rigtige rækkefølge', kind: 'build' },
    { id: 'm-stav', b: 'M', name: 'Lyt og stav', desc: 'Skriv de engelske ord', kind: 'spell' },
    { id: 'm-laes', b: 'M', name: 'Læs og forstå', desc: 'Korte tekster på engelsk', kind: 'read' },
    { id: 'u-ord', b: 'U', name: 'By, natur og følelser', desc: 'Nye ord begge veje', kind: 'words', themes: ['byen', 'natur', 'foelelser'] },
    { id: 'u-verber1', b: 'U', name: 'Uregel­mæssige verber 1', desc: 'go, went, gone', kind: 'verbs', range: [0, 30] },
    { id: 'u-verber2', b: 'U', name: 'Uregel­mæssige verber 2', desc: 'break, broke, broken', kind: 'verbs', range: [30, 60] },
    { id: 'u-grammatik1', b: 'U', name: 'do, does og datid', desc: 'Spørgsmål, nægtelser og datid', kind: 'gap', rules: ['does', 'past', 's3'] },
    { id: 'u-grammatik2', b: 'U', name: 'Små ord, der driller', desc: 'there, their, your, its, to, than', kind: 'gap', rules: ['there', 'your', 'its', 'to', 'than', 'much', 'compare'] },
    { id: 'u-falske', b: 'U', name: 'Falske venner', desc: 'Ord, der ligner dansk, men ikke er det', kind: 'false' },
    { id: 'u-udtryk', b: 'U', name: 'Faste udtryk', desc: 'Raining cats and dogs?', kind: 'idiom' },
    { id: 'u-saetning', b: 'U', name: 'Byg sætninger', desc: 'Ordstilling på engelsk', kind: 'build' },
    { id: 'u-laes', b: 'U', name: 'Read and answer', desc: 'Læs, og svar på engelsk', kind: 'read' }
  ];

  // Bob roser også på engelsk (bruges sammen med de danske ord i strings-da.js)
  var praise = ['Well done!', 'Great!', 'Perfect!', 'Brilliant!', 'Good job!'];
  var startLines = ['Let\'s build a bridge!', 'Ready, steady, go!'];

  // Svarmuligheder til verbe-opgaverne: den rigtige form, den anden form, en forkert -ed-form og grundformen.
  // For verber, hvor -ed-formen er et rigtigt ord (fx »seed«, »waked«), bruges i stedet 3. person (fx »sees«).
  var NO_ED = ['be', 'see', 'sing', 'sit', 'win', 'wake', 'fly', 'leave', 'pay', 'hide'];
  function verbOptions(v, form) {
    var right = v[form], other = v[form === 1 ? 2 : 1], base = v[0];
    if (base === 'be') return form === 1 ? ['was', 'been', 'is', 'be'] : ['been', 'was', 'is', 'be'];
    var reg = /e$/.test(base) ? base + 'd' : /[^aeiou]y$/.test(base) ? base.slice(0, -1) + 'ied' : base + 'ed';
    var third = /(s|sh|ch|x|o)$/.test(base) ? base + 'es' : /[^aeiou]y$/.test(base) ? base.slice(0, -1) + 'ies' : base + 's';
    var out = [right];
    var dbl = base + base.slice(-1) + 'ed'; // sitted, winned: wrong, but not real words
    [other, NO_ED.indexOf(base) >= 0 ? third : reg, base, third, dbl].forEach(function (o) { if (out.indexOf(o) < 0 && out.length < 4) out.push(o); });
    return out;
  }

  var api = { verbOptions: verbOptions, praise: praise, startLines: startLines, themes: themes, sentences: sentences, rules: rules, gaps: gaps, verbs: verbs, falseFriends: falseFriends, idioms: idioms, texts: texts, routes: routes };
  root.OB_DATA = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
