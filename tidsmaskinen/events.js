/*
 * Tidsmaskinen – begivenheder, perioder, ting og kilder. Alt her er dansk tekst, som børnene ser.
 * År: negative tal = før Kristi fødsel. »y« bruges til at sortere og placere; »yt« er det, der vises.
 * canon: true = punkt i folkeskolens historiekanon. world: true = verdenshistorie.
 * Tjekkes med node tools/test-tidsmaskinen.js. Kilder står i tools/korrektur-tidsmaskinen.html.
 */
(function (root) {
  'use strict';

  var periods = [
    { id: 'sten', name: 'Stenalder', from: -12500, to: -1700, yt: 'ca. 12.500–1700 f.Kr.', color: '#B9A58A' },
    { id: 'bronze', name: 'Bronzealder', from: -1700, to: -500, yt: '1700–500 f.Kr.', color: '#D9A441' },
    { id: 'jern', name: 'Jernalder', from: -500, to: 800, yt: '500 f.Kr.–800 e.Kr.', color: '#8C8C8C' },
    { id: 'viking', name: 'Vikingetid', from: 800, to: 1050, yt: '800–1050', color: '#5B8DB8' },
    { id: 'middel', name: 'Middelalder', from: 1050, to: 1536, yt: '1050–1536', color: '#8E5BA8' },
    { id: 'renaes', name: 'Renæssance', from: 1536, to: 1660, yt: '1536–1660', color: '#C9644A' },
    { id: 'enev', name: 'Enevælde', from: 1660, to: 1849, yt: '1660–1849', color: '#B08A3E' },
    { id: 'demo', name: 'Demokrati og industri', from: 1849, to: 1945, yt: '1849–1945', color: '#4E9A62' },
    { id: 'nu', name: 'Efter krigen', from: 1945, to: 2030, yt: '1945 til i dag', color: '#3E7CB1' }
  ];

  // b: 'M' = begge trin, 'U' = kun udskoling
  var events = [
    { id: 'jaegere', y: -12500, yt: 'ca. 12.500 f.Kr.', t: 'De første mennesker kommer til Danmark', d: 'Efter istiden følger rensdyrjægere rensdyrene op til det, der i dag er Danmark.', b: 'M' },
    { id: 'ertebolle', y: -5400, yt: 'ca. 5400–4000 f.Kr.', t: 'Ertebøllekulturen', d: 'Jægere og fiskere bor ved kysterne og efterlader store dynger af østersskaller.', b: 'M', canon: true },
    { id: 'bonder', y: -3900, yt: 'ca. 3900 f.Kr.', t: 'De første bønder', d: 'Folk begynder at dyrke korn og holde køer, får og grise.', b: 'M' },
    { id: 'pyramider', y: -2560, yt: 'ca. 2560 f.Kr.', t: 'Den store pyramide i Giza bygges', d: 'Farao Kheops får bygget den største af pyramiderne i Egypten.', b: 'M', world: true },
    { id: 'tutankhamon', y: -1330, yt: 'ca. 1330 f.Kr.', t: 'Tutankhamon er farao', d: 'Drengekongen Tutankhamon regerer i Egypten. Hans grav blev fundet i 1922.', b: 'M', world: true, canon: true },
    { id: 'egtved', y: -1370, yt: '1370 f.Kr.', t: 'Egtvedpigen begraves', d: 'En ung kvinde begraves i en egekiste ved Egtved. Hendes tøj er bevaret til i dag.', b: 'M' },
    { id: 'solvognen', y: -1400, yt: 'ca. 1400 f.Kr.', t: 'Solvognen', d: 'En hest trækker en solskive af guld og bronze. Den blev fundet i Trundholm Mose i 1902.', b: 'M', canon: true },
    { id: 'ol', y: -776, yt: '776 f.Kr.', t: 'De første olympiske lege', d: 'De gamle grækere holder idrætskonkurrencer i Olympia.', b: 'U', world: true },
    { id: 'tollund', y: -400, yt: 'ca. 400 f.Kr.', t: 'Tollundmanden', d: 'En mand lægges i en mose ved Silkeborg. Han er så godt bevaret, at man kan se hans skægstubbe.', b: 'M' },
    { id: 'augustus', y: -27, yt: '27 f.Kr.', t: 'Augustus bliver romersk kejser', d: 'Romerriget får sin første kejser.', b: 'U', world: true, canon: true },
    { id: 'guldhorn', y: 400, yt: 'ca. 400', t: 'Guldhornene laves', d: 'To store horn af guld med billeder og runer. De blev stjålet og smeltet om i 1802.', b: 'M' },
    { id: 'rom', y: 476, yt: '476', t: 'Vestromerriget går under', d: 'Den sidste kejser i Vestromerriget bliver afsat.', b: 'U', world: true },
    { id: 'lindisfarne', y: 793, yt: '793', t: 'Vikingerne angriber Lindisfarne', d: 'Vikinger plyndrer klostret på øen Lindisfarne i England. Det regnes ofte som starten på vikingetiden.', b: 'M', world: true, noPeriod: true },
    { id: 'gorm', y: 958, yt: '958', t: 'Gorm den Gamle dør', d: 'Kong Gorm begraves i Jelling.', b: 'U' },
    { id: 'jelling', y: 965, yt: 'ca. 965', t: 'Den store Jellingsten', d: 'Harald Blåtand rejser en runesten og skriver, at han gjorde danerne kristne.', b: 'M', canon: true },
    { id: 'knud', y: 1016, yt: '1016', t: 'Knud den Store bliver konge af England', d: 'Den danske konge Knud hersker over et stort rige omkring Nordsøen.', b: 'U' },
    { id: 'absalon', y: 1167, yt: '1167', t: 'Absalon bygger en borg i København', d: 'Biskop Absalon får en borg ved den lille by, der bliver til København.', b: 'M', canon: true },
    { id: 'valdemar', y: 1219, yt: '1219', t: 'Dannebrog falder ned fra himlen', d: 'Ifølge sagnet falder Dannebrog ned fra himlen under et slag i Estland.', b: 'M' },
    { id: 'jyskelov', y: 1241, yt: '1241', t: 'Jyske Lov', d: 'Kong Valdemar 2. giver en lov, der begynder: »Med lov skal land bygges«.', b: 'U' },
    { id: 'pest', y: 1349, yt: '1349–1350', t: 'Den Sorte Død', d: 'Pesten kommer til Danmark, og rigtig mange mennesker dør.', b: 'M' },
    { id: 'kalmar', y: 1397, yt: '1397', t: 'Kalmarunionen', d: 'Dronning Margrete 1. samler Danmark, Norge og Sverige under én konge.', b: 'M', canon: true },
    { id: 'gutenberg', y: 1450, yt: 'ca. 1450', t: 'Gutenberg trykker bøger', d: 'Johann Gutenberg trykker bøger med løse typer, så bøger bliver meget billigere.', b: 'U', world: true },
    { id: 'universitet', y: 1479, yt: '1479', t: 'Københavns Universitet grundlægges', d: 'Danmark får sit første universitet.', b: 'U' },
    { id: 'columbus', y: 1492, yt: '1492', t: 'Columbus når Amerika', d: 'Christoffer Columbus sejler over Atlanterhavet og når øerne i Caribien.', b: 'M', world: true, canon: true },
    { id: 'luther', y: 1517, yt: '1517', t: 'Martin Luthers 95 teser', d: 'Luther kritiserer kirken. Det bliver starten på reformationen.', b: 'U', world: true },
    { id: 'reformation', y: 1536, yt: '1536', t: 'Reformationen', d: 'Danmark bliver protestantisk, og kongen tager kirkens jord.', b: 'M', canon: true },
    { id: 'christian4', y: 1588, yt: '1588', t: 'Christian 4. bliver konge', d: 'Han regerer i 60 år og bygger blandt andet Rundetårn og Rosenborg.', b: 'M', canon: true },
    { id: 'rundetaarn', y: 1642, yt: '1642', t: 'Rundetårn står færdigt', d: 'Tårnet i København bliver brugt som observatorium. Man kan køre op ad en snoet gang.', b: 'M' },
    { id: 'westfalen', y: 1648, yt: '1648', t: 'Den Westfalske Fred', d: 'Freden slutter Trediveårskrigen i Europa.', b: 'U', canon: true },
    { id: 'roskildefred', y: 1658, yt: '1658', t: 'Roskildefreden', d: 'Danmark mister Skåne, Halland og Blekinge til Sverige.', b: 'U' },
    { id: 'enevaelde', y: 1660, yt: '1660', t: 'Enevælden indføres', d: 'Kongen får al magt. Det kaldes også statskuppet i 1660.', b: 'M', canon: true },
    { id: 'brand1728', y: 1728, yt: '1728', t: 'Den store brand i København', d: 'En stor del af byen brænder ned i løbet af få dage.', b: 'U' },
    { id: 'usa', y: 1776, yt: '1776', t: 'USA\'s uafhængighedserklæring', d: 'De amerikanske kolonier erklærer sig uafhængige af Storbritannien.', b: 'U', world: true },
    { id: 'stavnsbaand', y: 1788, yt: '1788', t: 'Stavnsbåndet ophæves', d: 'Bondekarle er ikke længere bundet til det gods, de er født på, og godsejerne bestemmer ikke mere, hvem der skal være soldat.', b: 'M', canon: true },
    { id: 'bastillen', y: 1789, yt: '1789', t: 'Stormen på Bastillen', d: 'Folket i Paris stormer et fængsel. Den franske revolution begynder.', b: 'U', world: true, canon: true },
    { id: 'slavehandel', y: 1792, yt: '1792', t: 'Forbud mod dansk slavehandel', d: 'En lov forbyder handel med slaver over Atlanterhavet fra 1803. Slaveriet i Dansk Vestindien fortsætter.', b: 'U', canon: true },
    { id: 'hca', y: 1805, yt: '1805', t: 'H.C. Andersen bliver født', d: 'Den senere eventyrforfatter bliver født i Odense.', b: 'M' },
    { id: 'bombardement', y: 1807, yt: '1807', t: 'Københavns bombardement', d: 'Briterne skyder København i brand og tager den danske flåde.', b: 'U', canon: true },
    { id: 'skole1814', y: 1814, yt: '1814', t: 'Alle børn skal have undervisning', d: 'Nye skolelove siger, at alle børn skal undervises, fra de er syv år, til de bliver konfirmeret.', b: 'M' },
    { id: 'norge', y: 1814, yt: '1814', t: 'Danmark mister Norge', d: 'Danmark har kæmpet på Napoleons side og må ved freden i Kiel afgive Norge til den svenske konge.', b: 'U' },
    { id: 'slaveri', y: 1848, yt: '1848', t: 'Slaveriet ophæves i Dansk Vestindien', d: 'Efter et oprør bliver de slavegjorte på øerne erklæret frie.', b: 'U' },
    { id: 'grundlov', y: 1849, yt: '1849', t: 'Grundloven', d: 'Danmark får sin første grundlov, og enevælden slutter.', b: 'M', canon: true },
    { id: 'dybbol', y: 1864, yt: '1864', t: 'Stormen på Dybbøl', d: 'Prøjsiske soldater indtager de danske skanser. Efter krigen mister Danmark Slesvig og Holsten.', b: 'M', canon: true },
    { id: 'faelleden', y: 1872, yt: '1872', t: 'Slaget på Fælleden', d: 'Politiet stopper et møde for arbejdere i København. Arbejderbevægelsen vokser.', b: 'U', canon: true },
    { id: 'andel', y: 1882, yt: '1882', t: 'Det første andelsmejeri', d: 'Bønderne i Hjedding ejer mejeriet sammen.', b: 'U' },
    { id: 'systemskifte', y: 1901, yt: '1901', t: 'Systemskiftet', d: 'Kongen udnævner en regering, som flertallet i Folketinget kan acceptere. Det bliver skik fra nu af.', b: 'U', canon: true },
    { id: 'wright', y: 1903, yt: '1903', t: 'Brødrene Wright flyver', d: 'Den første styrede flyvning med et motordrevet fly.', b: 'M', world: true },
    { id: 'titanic', y: 1912, yt: '1912', t: 'Titanic synker', d: 'Det store passagerskib rammer et isbjerg på sin første tur.', b: 'M', world: true },
    { id: 'ww1', y: 1914, yt: '1914–1918', t: 'Første Verdenskrig', d: 'En stor krig i Europa. Danmark holder sig neutralt.', b: 'M', world: true },
    { id: 'valgret', y: 1915, yt: '1915', t: 'Kvinder får valgret til Rigsdagen', d: 'Kvinder får lov at stemme ved valg til Folketing og Landsting.', b: 'M', canon: true },
    { id: 'vestindien', y: 1917, yt: '1917', t: 'Dansk Vestindien overdrages til USA', d: 'Danmark har solgt øerne i Caribien til USA, og den 31. marts 1917 bliver de overdraget.', b: 'U' },
    { id: 'genforening', y: 1920, yt: '1920', t: 'Genforeningen', d: 'Efter en afstemning bliver Sønderjylland igen dansk.', b: 'M', canon: true },
    { id: 'kanslergade', y: 1933, yt: '1933', t: 'Kanslergadeforliget', d: 'Partierne laver en stor aftale under den økonomiske krise.', b: 'U', canon: true },
    { id: 'ww2', y: 1939, yt: '1939–1945', t: 'Anden Verdenskrig', d: 'Den største krig i verdenshistorien.', b: 'M', world: true },
    { id: 'besaettelse', y: 1940, yt: '1940', t: 'Tyskland besætter Danmark', d: 'Den 9. april 1940 rykker tyske soldater ind i Danmark.', b: 'M' },
    { id: 'august1943', y: 1943, yt: '1943', t: 'Augustoprøret og jødeaktionen', d: 'Samarbejdet med tyskerne bryder sammen, og de fleste danske jøder flygter til Sverige.', b: 'U', canon: true },
    { id: 'befrielse', y: 1945, yt: '1945', t: 'Befrielsen', d: 'Den 5. maj 1945 er Danmark fri igen.', b: 'M' },
    { id: 'fn', y: 1948, yt: '1948', t: 'FN\'s Verdenserklæring om Menneskerettighederne', d: 'Landene i FN bliver enige om rettigheder, som alle mennesker har.', b: 'U', world: true, canon: true },
    { id: 'faeroerne', y: 1948, yt: '1948', t: 'Færøerne får hjemmestyre', d: 'Færøerne får selv lov at bestemme over mange ting.', b: 'U', canon: true },
    { id: 'nato', y: 1949, yt: '1949', t: 'Danmark går med i NATO', d: 'Danmark bliver medlem af en forsvarsalliance med blandt andet USA.', b: 'U' },
    { id: 'lego', y: 1958, yt: '1958', t: 'LEGO-klodsen bliver patenteret', d: 'Klodsen fra Billund får sit patent.', b: 'M' },
    { id: 'maanen', y: 1969, yt: '1969', t: 'Mennesker lander på Månen', d: 'Neil Armstrong er det første menneske, der går på Månen.', b: 'M', world: true },
    { id: 'ef', y: 1973, yt: '1973', t: 'Danmark bliver medlem af EF', d: 'Danmark går med i det, der senere bliver til EU.', b: 'U' },
    { id: 'energikrise', y: 1973, yt: '1973', t: 'Energikrisen og de bilfri søndage', d: 'Olien bliver dyr og knap. Om søndagen må man ikke køre bil.', b: 'M', canon: true },
    { id: 'groenland', y: 1979, yt: '1979', t: 'Grønland får hjemmestyre', d: 'Grønland får selv lov at bestemme over mange ting.', b: 'U', canon: true },
    { id: 'muren', y: 1989, yt: '1989', t: 'Berlinmuren falder', d: 'Muren mellem Øst- og Vestberlin bliver åbnet.', b: 'M', world: true, canon: true },
    { id: 'www', y: 1991, yt: '1991', t: 'Den første hjemmeside', d: 'Den første hjemmeside på World Wide Web kommer på nettet.', b: 'M', world: true },
    { id: 'maastricht', y: 1992, yt: '1992', t: 'Danmark stemmer nej til Maastricht', d: 'Et lille flertal stemmer nej til en ny EU-traktat.', b: 'U', canon: true },
    { id: 'storebaelt', y: 1998, yt: '1998', t: 'Storebæltsbroen åbner for biler', d: 'Nu kan man køre i bil mellem Fyn og Sjælland.', b: 'M' },
    { id: 'oresund', y: 2000, yt: '2000', t: 'Øresundsbroen åbner', d: 'En bro og en tunnel forbinder København og Malmø.', b: 'M' },
    { id: 'sep11', y: 2001, yt: '2001', t: 'Terrorangrebet den 11. september', d: 'Terrorister flyver fly ind i bygninger i USA.', b: 'U', world: true, canon: true },
    { id: 'selvstyre', y: 2009, yt: '2009', t: 'Grønland får selvstyre', d: 'Grønland får endnu flere ting at bestemme over selv.', b: 'U' },
    { id: 'frederik10', y: 2024, yt: '2024', t: 'Frederik 10. bliver konge', d: 'Dronning Margrethe 2. går af, og hendes søn bliver konge.', b: 'M' }
  ];

  // Livet dengang: ting og hverdag → periode
  var things = [
    ['En økse af flint', 'sten'], ['En dysse af store sten', 'sten'], ['Kyster med dynger af østersskaller', 'sten'],
    ['En lur af bronze', 'bronze'], ['Et sværd af bronze', 'bronze'], ['En gravhøj med en egekiste', 'bronze'],
    ['En mand lagt i en mose, ligesom Tollundmanden', 'jern'], ['Et guldhorn med runer', 'jern'], ['Romerske glas i en rig grav', 'jern'],
    ['Et langskib med stribet sejl', 'viking'], ['En runesten', 'viking'], ['Et marked i Hedeby', 'viking'],
    ['En ridder i rustning', 'middel'], ['Munke i et kloster', 'middel'], ['En kirke af kampesten', 'middel'],
    ['Den første bibel trykt på dansk', 'renaes'], ['Christian 4. bygger Rosenborg Slot', 'renaes'], ['Tycho Brahe ser på stjerner på øen Hven', 'renaes'],
    ['En konge med pudret paryk', 'enev'], ['Stavnsbåndet binder bondekarle til godset', 'enev'], ['Et skib, der sejler med slaver', 'enev'],
    ['En fabrik med dampmaskine', 'demo'], ['Et andelsmejeri', 'demo'], ['Et valg, hvor kvinder stemmer for første gang', 'demo'],
    ['Et fjernsyn i stuen', 'nu'], ['En mobiltelefon', 'nu'], ['Charterferie med fly til Spanien', 'nu']
  ];

  // Kildedetektiven (udskoling). Kilderne er OPDIGTEDE til spillet, men handler om virkelige begivenheder.
  // Undtagelse: runestenen (real: true) er den rigtige indskrift på Jellingstenen.
  // qs: [spørgsmål, rigtigt svar, forkerte svar]
  var sources = [
    { id: 'brev1864', kind: 'Et brev', title: 'Brev fra skanserne ved Dybbøl, april 1864',
      text: 'Kære mor. Vi har ikke sovet i tre nætter, for prøjserne skyder hele tiden. Vores skanse er fuld af mudder. Men vi giver ikke op! Hils far og de små. Din søn Hans.',
      qs: [['Hvem har skrevet kilden?', 'En dansk soldat', ['En prøjsisk general', 'En historiker i dag']],
           ['Hvad kan kilden fortælle os mest om?', 'Hvordan det føltes at være soldat i skanserne', ['Hvor mange soldater der i alt deltog', 'Hvorfor krigen startede']],
           ['Hvorfor skriver Hans, at de ikke giver op?', 'Han vil måske berolige sin mor', ['Han ved, at Danmark vinder', 'Han skriver til en avis']]] },
    { id: 'avis1920', kind: 'En avisoverskrift', title: 'Forsiden af en dansk avis, juli 1920',
      text: 'GLÆDESDAG! Kongen red over den gamle grænse. Sønderjylland er hjemme igen! Tusinder jublede med flag langs vejen.',
      qs: [['Hvornår er kilden lavet?', 'Lige da det skete i 1920', ['Mange år efter, i 1970', 'Før afstemningen i 1920']],
           ['Hvordan ser avisen på genforeningen?', 'Meget positivt', ['Neutralt og nøgternt', 'Kritisk']],
           ['Hvad ville en kilde fra en tysk avis i Flensborg måske fortælle?', 'En anden side af sagen', ['Præcis det samme', 'Ingenting om grænsen']]] },
    { id: 'dagbog1940', kind: 'En dagbog', title: 'Dagbog skrevet af en pige i Aalborg, 9. april 1940',
      text: 'Jeg vågnede ved, at der fløj fly lavt over huset. Far sagde, at det var tyske fly. I skolen sagde læreren, at vi skulle tage hjem. Alle var stille. Jeg er bange for, hvad der sker nu.',
      qs: [['Hvad slags kilde er det?', 'En personlig beretning', ['En officiel rapport', 'En lærebog']],
           ['Hvad kan vi bruge dagbogen til?', 'At forstå, hvordan en almindelig familie oplevede dagen', ['At finde ud af, hvor mange tyske soldater der kom', 'At læse, hvad regeringen besluttede']],
           ['Hvorfor er det vigtigt, at den er skrevet samme dag?', 'Hun har ikke glemt noget eller ændret mening endnu', ['Så er alt i den helt sikkert rigtigt', 'Det er det ikke']]] },
    { id: 'reklame1951', kind: 'En reklame', title: 'Reklame fra en radioforhandler, 1954',
      text: 'FJERNSYNET ER KOMMET! Se levende billeder i Deres egen stue. Hele familien vil elske det. Kom ind og se det nye vidunder – nu på afbetaling!',
      qs: [['Hvorfor er kilden lavet?', 'For at sælge fjernsyn', ['For at fortælle om fjernsynets historie', 'For at advare mod fjernsyn']],
           ['Kan man stole på, at »hele familien vil elske det«?', 'Nej, det er reklamens mening, ikke et faktum', ['Ja, det står i kilden', 'Ja, fordi det er fra 1951']],
           ['Hvad fortæller reklamen os om 1954?', 'At fjernsyn var nyt og dyrt for mange', ['At alle allerede havde fjernsyn', 'At fjernsyn var gratis']]] },
    { id: 'film2010', kind: 'En film', title: 'Plakat for en actionfilm om vikinger, 2010',
      text: 'VIKINGERNES SIDSTE SLAG – vilde krigere med horn på hjelmene kæmper for ære og guld. Se den i biografen nu!',
      qs: [['Hvornår er kilden lavet?', 'Næsten tusind år efter vikingetiden', ['I vikingetiden', 'Lige efter vikingetiden']],
           ['Fortæller filmplakaten sandheden om vikingernes hjelme?', 'Nej, der er ikke fundet vikingehjelme med horn', ['Ja, alle vikinger havde horn', 'Ja, fordi det er en film']],
           ['Hvad kan filmplakaten bruges til?', 'At se, hvordan folk i dag forestiller sig vikinger', ['At lære præcis, hvordan vikinger levede', 'At finde vikingernes rigtige navne']]] },
    { id: 'runesten', real: true, kind: 'En runesten', title: 'Indskriften på den store Jellingsten, ca. 965 (oversat)',
      text: 'Kong Harald bød gøre disse kumler efter Gorm, sin fader, og efter Thyra, sin moder – den Harald, som vandt sig hele Danmark og Norge og gjorde danerne kristne.',
      qs: [['Hvem står bag teksten?', 'Kongen selv', ['En fattig bonde', 'En udenlandsk rejsende']],
           ['Hvorfor skriver kongen, at han »vandt sig hele Danmark og Norge«?', 'Han vil vise, hvor mægtig han er', ['Det er en tilfældig sætning', 'Han vil skjule sine sejre']],
           ['Hvad skal man huske, når man læser stenen?', 'Den fortæller kongens egen version', ['Den er skrevet af en neutral historiker', 'Den er fra i dag']]] }
  ];

  var routes = [
    { id: 'm-perioder', b: 'M', name: 'Perioderne', desc: 'Fra stenalder til i dag', kind: 'period' },
    { id: 'm-forst', b: 'M', name: 'Hvem kom først?', desc: 'Vælg den begivenhed, der skete først', kind: 'first' },
    { id: 'm-livet', b: 'M', name: 'Livet dengang', desc: 'Hvornår hører tingene hjemme?', kind: 'life' },
    { id: 'm-tidslinje', b: 'M', name: 'Tidslinjen', desc: 'Sæt begivenhederne i rækkefølge', kind: 'order' },
    { id: 'm-verden', b: 'M', name: 'Imens i verden', desc: 'Danmark og verden på samme tid', kind: 'world' },
    { id: 'u-kanon', b: 'U', name: 'Kanonen', desc: 'Historiekanonens begivenheder', kind: 'year', filter: 'canon' },
    { id: 'u-aarstal', b: 'U', name: 'Årstal', desc: 'Hvornår skete det?', kind: 'year' },
    { id: 'u-tidslinje', b: 'U', name: 'Tidslinjen', desc: 'Fire begivenheder i rækkefølge', kind: 'order' },
    { id: 'u-samtidig', b: 'U', name: 'Hvad skete samtidig?', desc: 'Danmark og verden', kind: 'world' },
    { id: 'u-kilder', b: 'U', name: 'Kilde­detektiven', desc: 'Hvem lavede kilden, og hvorfor?', kind: 'source' }
  ];

  var api = { periods: periods, events: events, things: things, sources: sources, routes: routes };
  root.TM_DATA = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
