/*
 * Netdetektiven – sager om sikkerhed og god opførsel på nettet. Alt her er dansk tekst, som børnene ser.
 * ALLE firmaer, apps, hjemmesider og personer er opdigtede (fx Bumlebanken, Pakkebien, Kvidr).
 * Mobning og AI-billeder findes kun i udskolingen.
 * Tjekkes med node tools/test-netdetektiven.js.
 */
(function (root) {
  'use strict';

  /* ---------- 1. Beskeder i indbakken ----------
     safe: true/false. parts: dele, man kan trykke på for at undersøge dem (hvad detektiven ser).
     signs: forklaringen, der vises bagefter. */
  var mails = [
    // Mellemtrin
    { id: 'm1', b: 'M', safe: false, from: 'Spillefabrikken <gratis@spillefabrikken-gaver.net>', subject: 'DU HAR VUNDET 10.000 MØNTER!!!', body: 'Tillykke! Du er udvalgt. Skriv dit brugernavn og din adgangskode her inden 10 minutter, så får du mønterne.',
      parts: [['Afsender', 'Adressen ligner ikke spillets rigtige adresse.'], ['Inden 10 minutter', 'De vil have dig til at skynde dig, så du ikke når at tænke.']],
      signs: 'Ingen rigtige spil beder om din adgangskode. Gaver, der er for gode til at være sande, er næsten altid snyd.' },
    { id: 'm2', b: 'M', safe: true, from: 'Mor', subject: 'Husk tandlægen', body: 'Hej skat. Husk, at du skal til tandlæge i morgen kl. 10. Jeg henter dig ved skolen. Kh mor',
      parts: [['Afsender', 'Det er din mors nummer, som du kender.'], ['Indhold', 'Hun beder ikke om koder eller penge.']],
      signs: 'Beskeden er fra en, du kender, og den beder ikke om noget hemmeligt.' },
    { id: 'm3', b: 'M', safe: false, from: 'Ukendt nummer', subject: 'Hej, det er mig!', body: 'Hej, jeg har fået nyt nummer. Kan du sende mig koden, du lige har fået på sms? Jeg har brug for den nu!',
      parts: [['Ukendt nummer', 'Du ved ikke, hvem det er.'], ['Koden fra sms', 'En kode fra sms er hemmelig. Den kan bruges til at overtage din konto.']],
      signs: 'Giv aldrig koder fra sms videre. Spørg vennen på en anden måde, fx når I ses.' },
    { id: 'm4', b: 'M', safe: true, from: 'Klubben <info@bumlebold.dk>', subject: 'Træning flyttes', body: 'Hej alle. På torsdag er træningen kl. 17 i stedet for kl. 16. Vi ses på banen! Hilsen træneren',
      parts: [['Afsender', 'Det er klubbens normale adresse.'], ['Indhold', 'Der er ingen link, og de beder ikke om noget.']],
      signs: 'Det er en almindelig besked fra en klub, du er med i.' },
    { id: 'm5', b: 'M', safe: false, from: 'Kvidr Support <support@kvidr-sikkerhed.com>', subject: 'Din konto bliver LUKKET', body: 'Din konto bliver lukket i dag! Tryk på linket og log ind for at redde den: kvidr-login-hjaelp.com',
      parts: [['Bliver LUKKET', 'De prøver at gøre dig bange.'], ['Linket', 'Linket går ikke til Kvidrs rigtige side.']],
      signs: 'Rigtige apps truer ikke med at lukke din konto i en mail. Log hellere ind i appen, som du plejer.' },
    { id: 'm6', b: 'M', safe: false, from: 'Gratis-skins <skins@superskins.biz>', subject: 'Gratis skins til alle!', body: 'Download vores program, så får du alle skins gratis. Husk at slå antivirus fra, før du installerer.',
      parts: [['Slå antivirus fra', 'Det er et stort faresignal. Programmet kan være skadeligt.'], ['Gratis til alle', 'For godt til at være sandt.']],
      signs: 'Programmer, der vil have dig til at slå sikkerheden fra, kan indeholde virus. Spørg en voksen.' },
    { id: 'm7', b: 'M', safe: true, from: 'Skolen <kontor@bumleskolen.dk>', subject: 'Skolefoto på fredag', body: 'Kære elever og forældre. På fredag kommer fotografen. Husk et smil! Venlig hilsen kontoret',
      parts: [['Afsender', 'Det er skolens normale adresse.'], ['Indhold', 'De beder ikke om koder, penge eller at trykke på noget.']],
      signs: 'En almindelig besked fra skolen.' },
    { id: 'm8', b: 'M', safe: false, from: 'Ukendt profil', subject: 'Vil du være min ven?', body: 'Hej! Jeg er også 10 år. Hvad hedder din skole, og hvor bor du? Send gerne et billede af dig selv.',
      parts: [['Ukendt profil', 'Du ved ikke, hvem der i virkeligheden skriver.'], ['Hvor bor du', 'Din adresse og skole skal du ikke dele med nogen, du ikke kender.'],
        ['Send et billede', 'Send aldrig billeder af dig selv til nogen, du ikke kender og stoler på. Et billede kan blive delt videre, og du kan ikke få det tilbage.']],
      signs: 'Svar ikke, og send ikke billeder af dig selv. Fortæl det til en voksen, du stoler på. Det er aldrig din skyld, at du får sådan en besked.' },
    // Udskoling
    { id: 'u1', b: 'U', safe: false, from: 'Bumlebanken <service@bumleb4nken.dk>', subject: 'Bekræft dine oplysninger', body: 'Kære kunde. Vi har opdaget usædvanlig aktivitet. Bekræft dit kortnummer og din kode via linket inden for 24 timer: bumlebanken.sikker-bekraeft.net',
      parts: [['Afsender', '»bumleb4nken« er stavet med et 4-tal i stedet for et a.'], ['Linket', 'Domænet er sikker-bekraeft.net, ikke bankens. Det, der står før punktummet, kan snyde.'], ['Inden for 24 timer', 'Tidspres er et klassisk trick.']],
      signs: 'En bank beder aldrig om din kode eller dit kortnummer i en mail. Det er phishing.' },
    { id: 'u2', b: 'U', safe: true, from: 'Pakkebien <ikke-svar@pakkebien.dk>', subject: 'Din pakke er leveret', body: 'Din pakke er lagt i pakkeboksen ved Bumlecentret. Den kan hentes de næste 7 dage. Du skal ikke gøre andet.',
      parts: [['Afsender', 'Firmaets almindelige adresse.'], ['Indhold', 'Ingen link, ingen betaling, ingen koder.']],
      signs: 'Beskeden fortæller bare noget og beder dig ikke om at gøre noget risikabelt. Du havde bestilt en pakke.' },
    { id: 'u3', b: 'U', safe: false, from: 'Pakkebien <pakke@pakkebien-told.info>', subject: 'Din pakke venter: betal 19 kr. i told', body: 'Din pakke er stoppet i tolden. Betal 19 kr. med kort her, ellers sendes den retur: pakkebien-told.info/betal',
      parts: [['Afsender', 'Domænet er pakkebien-told.info, ikke pakkebien.dk.'], ['Lille beløb', 'Et lille beløb skal få dig til at tænke, at det er ufarligt. Svindlerne vil have dine kortoplysninger.']],
      signs: 'Falske pakke-beskeder er en af de mest almindelige former for svindel. Tjek hellere direkte i fragtfirmaets app.' },
    { id: 'u4', b: 'U', safe: false, from: 'Rektor Hansen <rektor.hansen.skole@postkassen-mail.com>', subject: 'Haster – kan du hjælpe?', body: 'Hej. Jeg sidder i møde og kan ikke ringe. Kan du købe tre gavekort på 500 kr. og sende mig koderne? Du får pengene igen i morgen.',
      parts: [['Afsender', 'En rektor skriver ikke fra en privat og mærkelig adresse.'], ['Gavekort', 'Svindlere beder ofte om gavekort, fordi de ikke kan spores.']],
      signs: 'Ring eller spørg personen på en anden måde. Køb aldrig gavekort til nogen, der beder om det i en besked.' },
    { id: 'u5', b: 'U', safe: true, from: 'Kvidr <no-reply@kvidr.com>', subject: 'Nyt login på din konto', body: 'Der er logget ind på din konto fra en ny telefon i Aarhus kl. 15.32. Var det dig? Hvis ikke, så skift din adgangskode i appen under Indstillinger.',
      parts: [['Afsender', 'Det er appens rigtige adresse.'], ['Indhold', 'De beder dig gøre det i appen, ikke via et link.']],
      signs: 'En rigtig sikkerhedsbesked beder dig gå ind i appen selv. Var det dig, der loggede ind, kan du se bort fra den.' },
    { id: 'u6', b: 'U', safe: false, from: 'Kvidr Konkurrence <vind@kvidr-præmier.click>', subject: 'Du har vundet en ny telefon!', body: 'Du er vores besøgende nummer 1.000.000! Udfyld navn, adresse og kortnummer for at betale fragten på 9 kr.',
      parts: [['Besøgende nummer 1.000.000', 'Det er en kendt fidus. Alle får den samme besked.'], ['Kortnummer for fragt', 'Kortoplysningerne kan bruges til at trække mange penge.']],
      signs: 'Du kan ikke vinde en konkurrence, du ikke har deltaget i.' },
    { id: 'u7', b: 'U', safe: false, from: 'Ven fra holdet', subject: 'Er det dig på den her video?? 😮', body: 'Haha, er det dig? Se videoen her: kvidr.video-se.net/watch',
      parts: [['Linket', 'Domænet er video-se.net. At der står »kvidr« forrest, betyder ikke, at det er Kvidr.'], ['Nysgerrighed', 'Beskeden prøver at gøre dig nysgerrig eller flov, så du trykker uden at tænke.']],
      signs: 'Vennens konto er måske blevet hacket. Tryk ikke, og sig det til vennen på en anden måde.' },
    { id: 'u8', b: 'U', safe: true, from: 'Bibliotek <bibliotek@bumlekommune.dk>', subject: 'Lånetid udløber', body: 'Bogen »Rejsen til Månen« skal afleveres på fredag. Du kan forny lånet, når du logger ind på bibliotekets side, som du plejer.',
      parts: [['Afsender', 'Kommunens almindelige adresse.'], ['Indhold', 'De beder dig logge ind, som du plejer, ikke via et link i mailen.']],
      signs: 'En almindelig påmindelse. Der er ingen tidspres, og ingen beder om koder.' }
  ];

  /* ---------- 2. Kodeord ---------- */
  // Hvilken er stærkest? [stærk, svag, hvorfor]
  var passwordPairs = [
    ['grøn-elefant-spiser-pandekager', 'Ida2015', 'Lange kodeord af flere tilfældige ord er svære at gætte. Navn og årstal er nemme at gætte.'],
    ['TrommeHavregrødKometSol', '123456', '123456 er et af de mest brugte kodeord i verden og bliver gættet med det samme.'],
    ['cykel-regnbue-pizza-måne', 'fodbold', 'Et enkelt ord fra ordbogen bliver gættet hurtigt. Fire tilfældige ord er meget stærkere.'],
    ['blå-kaktus-danser-salsa-7', 'Mads!', 'Korte kodeord kan prøves af en computer på et øjeblik, selv med et udråbstegn.'],
    ['sne-tiger-hopper-kage', 'qwerty', '»qwerty« er bare tasterne på række på tastaturet. Det kender svindlerne godt.'],
    ['ost-raket-banan-hat', 'kodeord', 'Ordet »kodeord« er et af de første, en tyv prøver.'],
    ['Pingvin-spiser-is-om-vinteren', 'Bob1', 'Et langt kodeord med flere ord er bedre end et kort med tal.'],
    ['solsikke-trappe-ugle-sko', 'MinHund', 'Navne på kæledyr og familie er nemme at finde på nettet.']
  ];
  // Byg et kodeord: kort med ord. personal = afslører noget om dig.
  var passwordCards = [
    { w: 'giraf', personal: false }, { w: 'kanelsnegl', personal: false }, { w: 'trampolin', personal: false }, { w: 'regnvejr', personal: false },
    { w: 'måneraket', personal: false }, { w: 'blyant', personal: false }, { w: 'pandekage', personal: false }, { w: 'snemand', personal: false },
    { w: 'dit navn', personal: true }, { w: 'dit fødselsår', personal: true }, { w: 'din hunds navn', personal: true }, { w: '123', personal: true }
  ];

  /* ---------- 3. Del eller lad være (sortering) ---------- */
  // bins: fint = fint at dele, spørg = spørg en voksen først, aldrig = del det aldrig
  var shareItems = [
    ['En tegning, du har lavet', 'fint'], ['Hvad din yndlingsfarve er', 'fint'], ['At du synes, filmen var sjov', 'fint'], ['Et billede af en solnedgang', 'fint'],
    ['Et billede af din ven', 'spoerg'], ['Et billede af dig i badetøj', 'spoerg'], ['At du skal på ferie i næste uge', 'spoerg'], ['En video fra klassens fest', 'spoerg'],
    ['Din adgangskode', 'aldrig'], ['Din adresse', 'aldrig'], ['Dit telefonnummer til en, du ikke kender', 'aldrig'], ['En kode fra en sms', 'aldrig'],
    ['Dit CPR-nummer', 'aldrig'], ['Et billede af dig selv til en, du ikke kender', 'aldrig'], ['Mors eller fars kortnummer', 'aldrig']
  ];
  var shareBins = [{ id: 'fint', name: 'Fint at dele' }, { id: 'spoerg', name: 'Spørg først' }, { id: 'aldrig', name: 'Del det aldrig' }];

  /* ---------- 4. Hvad gør du? (scenarier, multiple choice) ---------- */
  // [b, situation, rigtigt svar, forkerte svar, forklaring]
  var scenarios = [
    ['M', 'En voksen, du ikke kender, skriver til dig i et spil og vil give dig gratis ting, hvis du sender et billede.', 'Jeg svarer ikke og fortæller det til en voksen, jeg stoler på', ['Jeg sender et billede, for det er jo gratis', 'Jeg spørger om flere gratis ting'], 'Fremmede, der lover gaver for billeder, er et faresignal. Fortæl det altid til en voksen.'],
    ['M', 'Din ven vil gerne låne din adgangskode til et spil.', 'Jeg siger nej, for adgangskoder er hemmelige', ['Jeg giver den, fordi vi er venner', 'Jeg giver den, hvis han lover ikke at sige den til nogen'], 'En adgangskode er kun din. Dine forældre må gerne kende den, men ikke dine venner.'],
    ['M', 'Et vindue dukker op: »Din computer har virus! Ring til os nu!«', 'Jeg lukker vinduet og siger det til en voksen', ['Jeg ringer til nummeret', 'Jeg trykker på alle knapperne'], 'Rigtige virusadvarsler beder dig ikke om at ringe. Det er et trick.'],
    ['M', 'Du ser en video, der gør dig ked af det eller bange.', 'Jeg lukker den og taler med en voksen om det', ['Jeg ser den igen', 'Jeg sender den til mine venner'], 'Det er godt at sige det, når noget på nettet gør en ked af det. Du gør ikke noget forkert.'],
    ['M', 'Du vil købe noget i et spil, og det koster rigtige penge.', 'Jeg spørger mine forældre først', ['Jeg bruger mors kort, når hun ikke kigger', 'Jeg trykker bare køb'], 'Køb i spil koster rigtige penge. Aftal det altid med en voksen.'],
    ['M', 'Din ven har lagt et billede af dig på nettet, som du ikke kan lide.', 'Jeg beder vennen fjerne det og siger det til en voksen, hvis det ikke sker', ['Jeg lægger et dumt billede af vennen ud', 'Jeg lader det bare ligge, selvom jeg er ked af det'], 'Man skal spørge, før man deler billeder af andre. Du må gerne sige nej.'],
    ['M', 'Du har spillet på tablet i lang tid og har ondt i øjnene.', 'Jeg holder en pause og laver noget andet', ['Jeg spiller videre', 'Jeg skruer lysstyrken helt op'], 'Pauser er gode for både øjne og krop.'],
    ['M', 'Et spil beder om lov til at bruge din mikrofon og dine kontakter.', 'Jeg spørger en voksen, om spillet har brug for det', ['Jeg siger altid ja', 'Jeg giver spillet mine forældres kontakter'], 'Mange apps beder om mere, end de har brug for. Spørg hellere, før du siger ja.'],
    // Udskoling
    ['U', 'Nogen har lavet en falsk profil med dit navn og skriver grimme ting.', 'Jeg tager skærmbilleder, anmelder profilen og fortæller det til en voksen', ['Jeg laver en falsk profil af dem', 'Jeg sletter min egen profil og siger ingenting'], 'Skærmbilleder er beviser. Alle store apps har en knap til at anmelde. Det er ikke din skyld.'],
    ['U', 'I en gruppechat bliver en klassekammerat gjort til grin hver dag.', 'Jeg skriver til klassekammeraten, at jeg er på hans side, og siger det til en voksen', ['Jeg sender en griner, så jeg ikke selv bliver gjort til grin', 'Jeg forlader bare chatten'], 'Den, der bliver mobbet, får det bedre, når nogen støtter. En voksen kan hjælpe med at stoppe det.'],
    ['U', 'En, du har skrevet med i et stykke tid, vil gerne mødes, men vil ikke vise sig på video.', 'Jeg mødes ikke og fortæller det til en voksen', ['Jeg mødes alene et stille sted', 'Jeg giver min adresse, så han kan hente mig'], 'Man kan aldrig være sikker på, hvem der skriver. Mød aldrig en fra nettet alene.'],
    ['U', 'En kammerat sender et nøgenbillede af en fra skolen.', 'Jeg sletter det, sender det ikke videre og fortæller det til en voksen', ['Jeg gemmer det', 'Jeg sender det til en anden for at spørge, hvem det er'], 'Det er ulovligt at dele nøgenbilleder af andre. Den, der er på billedet, skal have hjælp, ikke skyld.'],
    ['U', 'Du vil gerne beskytte din konto bedst muligt.', 'Jeg slår totrinsbekræftelse til og bruger et langt kodeord', ['Jeg bruger samme kodeord overalt, så jeg ikke glemmer det', 'Jeg skriver kodeordet i min profil'], 'Med totrinsbekræftelse skal man også bruge en kode fra telefonen. Så hjælper et stjålet kodeord ikke tyven.'],
    ['U', 'Et datafirma tilbyder 50 kr., hvis du lader appen følge din placering hele tiden.', 'Jeg siger nej, for mine data er mere værd end 50 kr.', ['Jeg siger ja, det er gratis penge', 'Jeg siger ja og giver også mine venners numre'], 'Oplysninger om, hvor du er, kan sælges videre og sige meget om dig.'],
    ['U', 'Du læser et opslag: »Spis citron hver dag, så bliver du aldrig syg!«', 'Jeg tjekker, om en troværdig kilde siger det samme', ['Jeg deler det med det samme', 'Jeg tror på det, fordi mange har liket det'], 'Mange likes er ikke det samme som sandhed. Tjek påstande hos troværdige kilder.'],
    ['U', 'Du har sendt et billede, som du nu fortryder.', 'Jeg beder modtageren slette det og taler med en voksen om det', ['Jeg lader som ingenting', 'Jeg sender flere billeder for at gøre det mindre pinligt'], 'Det, der er sendt, kan være svært at få tilbage. Det er godt at få hjælp hurtigt.']
  ];

  /* ---------- 5. Kildejagten (udskoling): tre sider om samme påstand ---------- */
  // pages: [navn, beskrivelse]; best = indeks på den mest troværdige; why = [rigtig forklaring, forkerte]
  var sourceSets = [
    { claim: 'Hvor mange timer skal en 13-årig sove?', pages: [['En offentlig sundhedsside', 'Skrevet af læger. Henviser til undersøgelser. Opdateret i år.'], ['SuperSovn – en side, der sælger dyner', '»Du skal sove 12 timer – og bruge vores dyne!«'], ['Et opslag fra en influencer', '»Jeg sover 4 timer, og jeg har det fint!«']], best: 0,
      why: ['Den er skrevet af fagfolk, henviser til undersøgelser og vil ikke sælge noget', ['Den har de flotteste billeder', 'Den har flest følgere']] },
    { claim: 'Er der fundet vand på Mars?', pages: [['En nyhed fra en rumfartsorganisation', 'Beskriver målinger fra en Mars-sonde og linker til forskningen.'], ['Konspirationsforum.net', '»De skjuler sandheden! Mars er fuld af søer, men ingen tør sige det.«'], ['En sjov video', 'En tegnet video om rumvæsner, der svømmer på Mars.']], best: 0,
      why: ['Den bygger på målinger og viser, hvor oplysningerne kommer fra', ['Den er mest spændende', 'Den bruger mange udråbstegn']] },
    { claim: 'Var vikingerne ude at sejle helt til Amerika?', pages: [['Et museums hjemmeside', 'Fortæller om fundene ved L\'Anse aux Meadows i Canada og viser billeder af udgravningen.'], ['En spilside', '»I vores spil sejler vikinger til Månen!«'], ['Et anonymt opslag', '»Nej, det er løgn. Det har min onkel sagt.«']], best: 0,
      why: ['Museet bygger på fund fra udgravninger', ['Spillet er det sjoveste', 'Onklen virker sikker']] },
    { claim: 'Er energidrikke godt for unge?', pages: [['En reklame fra en drikkevareproducent', '»Giver dig energi til hele dagen!«'], ['En offentlig myndighed for fødevarer', 'Fraråder energidrikke til børn og unge på grund af det høje indhold af koffein.'], ['En kommentar på et forum', '»Jeg drikker fem om dagen, det er fint.«']], best: 1,
      why: ['Myndigheden har ingen interesse i at sælge drikken og bygger på viden om koffein', ['Reklamen ved mest om drikken', 'Kommentaren er skrevet af en, der har prøvet det']] }
  ];

  /* ---------- 6. Ægte eller redigeret? (udskoling) ---------- */
  // [beskrivelse af billede/opslag, rigtigt svar, forkerte svar, forklaring]
  var imageCases = [
    ['Et billede viser en politiker med seks fingre på den ene hånd. Teksten er ulæselig på skiltet bagved.', 'Billedet er sandsynligvis lavet med AI', ['Billedet er helt sikkert ægte', 'Politikeren er født sådan'], 'AI-billeder kan have fejl i hænder, tekst og baggrunde. Tjek også, om troværdige medier viser samme billede.'],
    ['En haj svømmer på en oversvømmet motorvej efter en storm. Det samme billede har været delt ved mange forskellige storme.', 'Det er et gammelt, redigeret billede, der deles igen og igen', ['Der svømmer altid hajer efter storme', 'Det er helt sikkert fra stormen i går'], 'En omvendt billedsøgning kan vise, hvor et billede først dukkede op.'],
    ['En video viser en kendt sanger sige noget mærkeligt. Munden passer ikke helt til ordene, og stemmen lyder flad.', 'Det kan være en deepfake', ['Det er ægte, for det er en video', 'Sangeren har nok bare en dårlig dag'], 'Videoer kan også forfalskes. Tjek, om sangeren selv eller troværdige medier har bekræftet det.'],
    ['Et billede af en solnedgang i Skagen er taget af en fotograf, der fortæller, hvor og hvornår det er taget. Andre har taget lignende billeder samme aften.', 'Billedet er sandsynligvis ægte', ['Alle solnedgangsbilleder er falske', 'Det er helt sikkert AI'], 'Når en afsender står frem, og andre billeder bekræfter det, er det mere troværdigt.'],
    ['En reklame viser en model med helt glat hud og meget lange ben. Under står der med lille skrift: »Billedet er retoucheret«.', 'Billedet er redigeret, så det ser anderledes ud end virkeligheden', ['Sådan ser alle mennesker ud', 'Billedet er ikke ændret'], 'Mange reklamer redigerer billeder. Det kan give et forkert billede af, hvordan kroppe ser ud.'],
    ['Et opslag viser et »billede fra i dag« af sne i Sahara. Opslaget har ingen afsender og ingen dato.', 'Jeg kan ikke vide, om det er ægte, før jeg har tjekket det', ['Det er ægte, for det har mange likes', 'Det er falsk, for det sner aldrig i Sahara'], 'Uden afsender og dato skal man være ekstra kritisk. Det sner faktisk sjældent i dele af Sahara, så man må tjekke det.']
  ];

  /* ---------- 7. Data og algoritmer (udskoling) ---------- */
  var dataQuiz = [
    ['Hvad er en cookie på en hjemmeside?', 'En lille fil, der husker, hvad du har gjort på siden', ['En kage, man kan vinde', 'Et virus, der altid er farligt'], 'Cookies kan huske din kurv, men også bruges til at følge dig på tværs af sider.'],
    ['Hvorfor er mange apps gratis?', 'De tjener penge på reklamer og på oplysninger om brugerne', ['Fordi firmaerne ikke vil tjene penge', 'Fordi staten betaler dem'], 'Når en app er gratis, betaler man ofte med sine data og sin tid.'],
    ['Hvad betyder det, at et feed styres af en algoritme?', 'Et program vælger, hvad du ser, ud fra hvad du har kigget og liket', ['At alle ser præcis det samme', 'At en person sidder og vælger opslag til dig'], 'Algoritmen vil holde dig længst muligt i appen.'],
    ['Hvad er en »filterboble«?', 'Når man mest ser indhold, der passer til det, man i forvejen mener', ['Et sjovt filter til billeder', 'En boble, der beskytter mod virus'], 'Det kan være godt at søge efter andre synspunkter.'],
    ['Hvad er en god idé, når du installerer en ny app?', 'At tjekke, hvilke tilladelser den beder om', ['At sige ja til alt', 'At give den adgang til alle kontakter'], 'En lommelygte-app har fx ikke brug for dine kontakter.'],
    ['Hvorfor er det smart at bruge forskellige kodeord til forskellige sider?', 'Hvis et kodeord bliver stjålet, kan tyven ikke komme ind andre steder', ['Så er det nemmere at huske', 'Det er ikke smart'], 'En kodeordsmanager kan hjælpe med at huske mange stærke kodeord.']
  ];
  // Feed-simulation: emner, der kan vises i feedet
  var feedTopics = ['Fodbold', 'Katte', 'Gaming', 'Mad', 'Musik', 'Natur'];

  /* ---------- Ruter ---------- */
  var routes = [
    { id: 'm-beskeder', b: 'M', name: 'Mærkelige beskeder', desc: 'Er beskeden sikker eller snyd?', kind: 'mail' },
    { id: 'm-kodeord', b: 'M', name: 'Kodeords­maskinen', desc: 'Byg et stærkt kodeord', kind: 'password' },
    { id: 'm-del', b: 'M', name: 'Del eller lad være', desc: 'Hvad må man dele?', kind: 'share' },
    { id: 'm-hvadgoer', b: 'M', name: 'Hvad gør du?', desc: 'Gode valg på nettet', kind: 'scenario' },
    { id: 'u-phishing', b: 'U', name: 'Phishing-jagt', desc: 'Find tegnene på svindel', kind: 'mail' },
    { id: 'u-kodeord', b: 'U', name: 'Kodeord og konti', desc: 'Lange kodeord og totrinsbekræftelse', kind: 'password' },
    { id: 'u-kilder', b: 'U', name: 'Kildejagten', desc: 'Hvem kan man stole på?', kind: 'sources' },
    { id: 'u-billeder', b: 'U', name: 'Ægte eller redigeret?', desc: 'AI, deepfakes og redigerede billeder', kind: 'images' },
    { id: 'u-data', b: 'U', name: 'Data og algoritmer', desc: 'Cookies, apps og dit feed', kind: 'data' },
    { id: 'u-mobning', b: 'U', name: 'Når det går galt', desc: 'Mobning, falske profiler og svære valg', kind: 'scenario' }
  ];

  var api = { mails: mails, passwordPairs: passwordPairs, passwordCards: passwordCards, shareItems: shareItems, shareBins: shareBins,
    scenarios: scenarios, sourceSets: sourceSets, imageCases: imageCases, dataQuiz: dataQuiz, feedTopics: feedTopics, routes: routes };
  root.ND_DATA = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
