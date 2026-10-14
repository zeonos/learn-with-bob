/*
 * Verdensrejsen – stednavne og spor. Alt er dansk tekst, som børnene ser.
 * Landenavne og hovedstæder følger Lex (Den Store Danske), fx »Europas hovedstæder«.
 * Koordinater kommer fra Natural Earth og GeoNames (se tools/build-verdensrejsen.js).
 */
(function (root) {
  'use strict';

  // Danske byer: geo = navnet i GeoNames-data (hvis det er anderledes)
  var towns = [
    { id: 'kobenhavn', da: 'København', geo: 'Copenhagen' }, { id: 'aarhus', da: 'Aarhus', geo: 'Århus' }, { id: 'odense', da: 'Odense', geo: 'Odense' },
    { id: 'aalborg', da: 'Aalborg', geo: 'Aalborg' }, { id: 'esbjerg', da: 'Esbjerg', geo: 'Esbjerg' }, { id: 'randers', da: 'Randers', geo: 'Randers' },
    { id: 'kolding', da: 'Kolding', geo: 'Kolding' }, { id: 'horsens', da: 'Horsens', geo: 'Horsens' }, { id: 'vejle', da: 'Vejle', geo: 'Vejle' },
    { id: 'roskilde', da: 'Roskilde', geo: 'Roskilde' }, { id: 'herning', da: 'Herning', geo: 'Herning' }, { id: 'silkeborg', da: 'Silkeborg', geo: 'Silkeborg' },
    { id: 'naestved', da: 'Næstved', geo: 'Næstved' }, { id: 'fredericia', da: 'Fredericia', geo: 'Fredericia' }, { id: 'viborg', da: 'Viborg', geo: 'Viborg' },
    { id: 'koege', da: 'Køge', geo: 'Køge' }, { id: 'holstebro', da: 'Holstebro', geo: 'Holstebro' }, { id: 'slagelse', da: 'Slagelse', geo: 'Slagelse' },
    { id: 'hilleroed', da: 'Hillerød', geo: 'Hillerød' }, { id: 'soenderborg', da: 'Sønderborg', geo: 'Sønderborg' }, { id: 'svendborg', da: 'Svendborg', geo: 'Svendborg' },
    { id: 'hjoerring', da: 'Hjørring', geo: 'Hjørring' }, { id: 'frederikshavn', da: 'Frederikshavn', geo: 'Frederikshavn' }, { id: 'helsingoer', da: 'Helsingør', geo: 'Helsingør' },
    { id: 'ribe', da: 'Ribe', geo: 'Ribe' }, { id: 'skagen', da: 'Skagen', geo: 'Skagen' }, { id: 'roenne', da: 'Rønne', geo: 'Rønne' },
    { id: 'nykoebing', da: 'Nykøbing Falster', geo: 'Nykøbing Falster' }, { id: 'thisted', da: 'Thisted', geo: 'Thisted' }, { id: 'haderslev', da: 'Haderslev', geo: 'Haderslev' },
    { id: 'aabenraa', da: 'Aabenraa', geo: 'Aabenraa' }, { id: 'toender', da: 'Tønder', geo: 'Tønder' }, { id: 'grenaa', da: 'Grenaa', geo: 'Grenaa' },
    { id: 'kalundborg', da: 'Kalundborg', geo: 'Kalundborg' }, { id: 'ringkoebing', da: 'Ringkøbing', geo: 'Ringkøbing' }, { id: 'hirtshals', da: 'Hirtshals', geo: 'Hirtshals' },
    { id: 'skive', da: 'Skive', geo: 'Skive' }, { id: 'nakskov', da: 'Nakskov', geo: 'Nakskov' }, { id: 'billund', da: 'Billund', geo: 'Billund' }
  ];

  // Danske øer og landsdele: et punkt, der ligger på øen (bruges til at finde den i kortdata)
  var islands = [
    { id: 'jylland', da: 'Jylland', lat: 56.2, lon: 9.3 }, { id: 'sjaelland', da: 'Sjælland', lat: 55.5, lon: 11.8 }, { id: 'fyn', da: 'Fyn', lat: 55.3, lon: 10.35 },
    { id: 'lolland', da: 'Lolland-Falster', lat: 54.8, lon: 11.3 }, { id: 'bornholm', da: 'Bornholm', lat: 55.13, lon: 14.92 }, { id: 'mors', da: 'Mors', lat: 56.81, lon: 8.73 },
    { id: 'als', da: 'Als', lat: 54.97, lon: 9.87 }, { id: 'langeland', da: 'Langeland', lat: 54.92, lon: 10.78 }, { id: 'moen', da: 'Møn', lat: 54.97, lon: 12.33 },
    { id: 'laesoe', da: 'Læsø', lat: 57.27, lon: 11.02 }, { id: 'samsoe', da: 'Samsø', lat: 55.86, lon: 10.58 }, { id: 'aeroe', da: 'Ærø', lat: 54.89, lon: 10.35 },
    { id: 'amager', da: 'Amager', lat: 55.62, lon: 12.59 }, { id: 'fanoe', da: 'Fanø', lat: 55.41, lon: 8.42 }, { id: 'anholt', da: 'Anholt', lat: 56.70, lon: 11.57 }
  ];

  var norden = {
    DNK: { da: 'Danmark', cap: 'København' }, NOR: { da: 'Norge', cap: 'Oslo' }, SWE: { da: 'Sverige', cap: 'Stockholm' }, FIN: { da: 'Finland', cap: 'Helsinki' },
    ISL: { da: 'Island', cap: 'Reykjavík' }, FRO: { da: 'Færøerne', cap: 'Tórshavn' }, GRL: { da: 'Grønland', cap: 'Nuuk' }, ALD: { da: 'Åland', cap: 'Mariehamn' }
  };
  // Hovedstæder, som Natural Earth ikke har som landets hovedstad (koordinater fra GeoNames)
  var extraCapitals = { FRO: { lat: 62.0097, lon: -6.7716 }, GRL: { lat: 64.1835, lon: -51.7216 }, ALD: { lat: 60.0973, lon: 19.9348 } };

  // Europa (quiz: false = vises på kortet, men spørges der ikke om)
  var europe = {
    ALB: { da: 'Albanien', cap: 'Tirana' }, BEL: { da: 'Belgien', cap: 'Bruxelles' }, BIH: { da: 'Bosnien-Hercegovina', cap: 'Sarajevo' },
    BGR: { da: 'Bulgarien', cap: 'Sofia' }, DNK: { da: 'Danmark', cap: 'København' }, EST: { da: 'Estland', cap: 'Tallinn' },
    FIN: { da: 'Finland', cap: 'Helsinki' }, FRA: { da: 'Frankrig', cap: 'Paris' }, GRC: { da: 'Grækenland', cap: 'Athen' },
    NLD: { da: 'Holland', cap: 'Amsterdam' }, BLR: { da: 'Hviderusland', cap: 'Minsk' }, IRL: { da: 'Irland', cap: 'Dublin' },
    ISL: { da: 'Island', cap: 'Reykjavík' }, ITA: { da: 'Italien', cap: 'Rom' }, HRV: { da: 'Kroatien', cap: 'Zagreb' },
    LVA: { da: 'Letland', cap: 'Riga' }, LTU: { da: 'Litauen', cap: 'Vilnius' }, MDA: { da: 'Moldova', cap: null },
    MNE: { da: 'Montenegro', cap: 'Podgorica' }, MKD: { da: 'Nordmakedonien', cap: 'Skopje' }, NOR: { da: 'Norge', cap: 'Oslo' },
    POL: { da: 'Polen', cap: 'Warszawa' }, PRT: { da: 'Portugal', cap: 'Lissabon' }, ROU: { da: 'Rumænien', cap: 'Bukarest' },
    RUS: { da: 'Rusland', cap: 'Moskva' }, CHE: { da: 'Schweiz', cap: 'Bern' }, SRB: { da: 'Serbien', cap: 'Beograd' },
    SVK: { da: 'Slovakiet', cap: 'Bratislava' }, SVN: { da: 'Slovenien', cap: 'Ljubljana' }, ESP: { da: 'Spanien', cap: 'Madrid' },
    GBR: { da: 'Storbritannien', cap: 'London' }, SWE: { da: 'Sverige', cap: 'Stockholm' }, CZE: { da: 'Tjekkiet', cap: 'Prag' },
    TUR: { da: 'Tyrkiet', cap: 'Ankara' }, DEU: { da: 'Tyskland', cap: 'Berlin' }, UKR: { da: 'Ukraine', cap: 'Kyiv' },
    HUN: { da: 'Ungarn', cap: 'Budapest' }, AUT: { da: 'Østrig', cap: 'Wien' }, CYP: { da: 'Cypern', cap: 'Nicosia' },
    KOS: { da: 'Kosovo', cap: null, quiz: false }, LUX: { da: 'Luxembourg', cap: null, quiz: false }
  };

  // Verden (de mest kendte lande i hver verdensdel)
  var world = {
    USA: { da: 'USA', cap: 'Washington, D.C.' }, CAN: { da: 'Canada', cap: 'Ottawa' }, MEX: { da: 'Mexico', cap: 'Mexico City' },
    CUB: { da: 'Cuba', cap: 'Havana' }, BRA: { da: 'Brasilien', cap: 'Brasília' }, ARG: { da: 'Argentina', cap: 'Buenos Aires' },
    CHL: { da: 'Chile', cap: 'Santiago' }, PER: { da: 'Peru', cap: 'Lima' }, COL: { da: 'Colombia', cap: 'Bogotá' },
    VEN: { da: 'Venezuela', cap: 'Caracas' }, EGY: { da: 'Egypten', cap: 'Cairo' }, MAR: { da: 'Marokko', cap: 'Rabat' },
    DZA: { da: 'Algeriet', cap: 'Algier' }, LBY: { da: 'Libyen', cap: 'Tripoli' }, SDN: { da: 'Sudan', cap: 'Khartoum' },
    NGA: { da: 'Nigeria', cap: 'Abuja' }, ETH: { da: 'Etiopien', cap: 'Addis Abeba' }, KEN: { da: 'Kenya', cap: 'Nairobi' },
    COD: { da: 'Den Demokratiske Republik Congo', cap: 'Kinshasa' }, MDG: { da: 'Madagaskar', cap: 'Antananarivo' },
    SAU: { da: 'Saudi-Arabien', cap: 'Riyadh' }, IRN: { da: 'Iran', cap: 'Teheran' }, IRQ: { da: 'Irak', cap: 'Baghdad' },
    AFG: { da: 'Afghanistan', cap: 'Kabul' }, PAK: { da: 'Pakistan', cap: 'Islamabad' }, IND: { da: 'Indien', cap: 'New Delhi' },
    CHN: { da: 'Kina', cap: 'Beijing' }, MNG: { da: 'Mongoliet', cap: 'Ulan Bator' }, JPN: { da: 'Japan', cap: 'Tokyo' },
    KOR: { da: 'Sydkorea', cap: 'Seoul' }, IDN: { da: 'Indonesien', cap: 'Jakarta' }, THA: { da: 'Thailand', cap: 'Bangkok' },
    VNM: { da: 'Vietnam', cap: 'Hanoi' }, PHL: { da: 'Filippinerne', cap: 'Manila' }, KAZ: { da: 'Kasakhstan', cap: 'Astana' },
    AUS: { da: 'Australien', cap: 'Canberra' }, NZL: { da: 'New Zealand', cap: 'Wellington' },
    RUS: { da: 'Rusland', cap: 'Moskva' }, TUR: { da: 'Tyrkiet', cap: 'Ankara' }, FRA: { da: 'Frankrig', cap: 'Paris' },
    ESP: { da: 'Spanien', cap: 'Madrid' }, DEU: { da: 'Tyskland', cap: 'Berlin' }, GBR: { da: 'Storbritannien', cap: 'London' },
    ITA: { da: 'Italien', cap: 'Rom' }, NOR: { da: 'Norge', cap: 'Oslo' }, SWE: { da: 'Sverige', cap: 'Stockholm' },
    FIN: { da: 'Finland', cap: 'Helsinki' }, POL: { da: 'Polen', cap: 'Warszawa' }, UKR: { da: 'Ukraine', cap: 'Kyiv' },
    ISL: { da: 'Island', cap: 'Reykjavík' }, GRC: { da: 'Grækenland', cap: 'Athen' }, NLD: { da: 'Holland', cap: 'Amsterdam' },
    GRL: { da: 'Grønland', cap: null, quiz: false }, DNK: { da: 'Danmark', cap: 'København', quiz: false }
  };

  var continents = [
    { id: 'europa', da: 'Europa', ne: ['EUROPE', 'BRITISH ISLES', 'ICELAND'], cont: 'Europe' },
    { id: 'asien', da: 'Asien', ne: ['ASIA', 'JAPAN', 'PHILIPPINES', 'GREATER SUNDA ISLANDS'], cont: 'Asia' },
    { id: 'afrika', da: 'Afrika', ne: ['AFRICA', 'MADAGASCAR'], cont: 'Africa' },
    { id: 'nordamerika', da: 'Nordamerika', ne: ['NORTH AMERICA', 'GREENLAND', 'ARCTIC ARCHIPELAGO', 'ALASKA', 'WEST INDIES'], cont: 'North America' },
    { id: 'sydamerika', da: 'Sydamerika', ne: ['SOUTH AMERICA'], cont: 'South America' },
    { id: 'oceanien', da: 'Oceanien', ne: ['AUSTRALIA', 'NEW ZEALAND'], cont: 'Oceania' },
    { id: 'antarktis', da: 'Antarktis', ne: ['ANTARCTICA', 'East Antarctica', 'West Antarctica', 'Antarctic Peninsula'], cont: 'Antarctica' }
  ];
  var seas = [
    { id: 'atlanterhavet', da: 'Atlanterhavet', ne: ['North Atlantic Ocean', 'South Atlantic Ocean'] },
    { id: 'stillehavet', da: 'Stillehavet', ne: ['North Pacific Ocean', 'South Pacific Ocean'] },
    { id: 'indiske', da: 'Det Indiske Ocean', ne: ['INDIAN OCEAN'] },
    { id: 'middelhavet', da: 'Middelhavet', ne: ['Mediterranean Sea'] },
    { id: 'sortehav', da: 'Det Sorte Hav', ne: ['Black Sea'] },
    { id: 'roedehav', da: 'Det Røde Hav', ne: ['Red Sea'] },
    { id: 'caribiske', da: 'Det Caribiske Hav', ne: ['Caribbean Sea'] }
  ];
  var ranges = [
    { id: 'alperne', da: 'Alperne', kind: 'bjerge', ne: ['ALPS'] }, { id: 'himalaya', da: 'Himalaya', kind: 'bjerge', ne: ['HIMALAYAS'] },
    { id: 'andes', da: 'Andesbjergene', kind: 'bjerge', ne: ['ANDES'] }, { id: 'rocky', da: 'Rocky Mountains', kind: 'bjerge', ne: ['ROCKY MOUNTAINS'] },
    { id: 'ural', da: 'Uralbjergene', kind: 'bjerge', ne: ['URAL MOUNTAINS'] }, { id: 'kaukasus', da: 'Kaukasus', kind: 'bjerge', ne: ['CAUCASUS MTS.'] },
    { id: 'pyrenaeerne', da: 'Pyrenæerne', kind: 'bjerge', ne: ['PYRENEES'] }, { id: 'atlas', da: 'Atlasbjergene', kind: 'bjerge', ne: ['ATLAS MOUNTAINS', 'HAUT ATLAS', 'Anti Atlas', 'ATLAS SAHARIEN'] },
    { id: 'karpaterne', da: 'Karpaterne', kind: 'bjerge', ne: ['CARPATHIAN MOUNTAINS'] }, { id: 'appalacherne', da: 'Appalacherne', kind: 'bjerge', ne: ['APPALACHIAN MTS.'] },
    { id: 'sahara', da: 'Sahara', kind: 'ørken', ne: ['SAHARA'] }, { id: 'gobi', da: 'Gobiørkenen', kind: 'ørken', ne: ['GOBI DESERT'] },
    { id: 'kalahari', da: 'Kalahariørkenen', kind: 'ørken', ne: ['KALAHARI DESERT'] }, { id: 'atacama', da: 'Atacamaørkenen', kind: 'ørken', ne: ['DESIERTO DE ATACAMA'] },
    { id: 'namib', da: 'Namibørkenen', kind: 'ørken', ne: ['NAMIB DESERT'] }
  ];
  var rivers = [
    { id: 'nilen', da: 'Nilen', ne: ['Nile'] }, { id: 'amazon', da: 'Amazonfloden', ne: ['Amazonas'] }, { id: 'mississippi', da: 'Mississippi', ne: ['Mississippi'] },
    { id: 'donau', da: 'Donau', ne: ['Danube', 'Donau'] }, { id: 'volga', da: 'Volga', ne: ['Volga'] }, { id: 'ganges', da: 'Ganges', ne: ['Ganges'] },
    { id: 'yangtze', da: 'Yangtze', ne: ['Yangtze', 'Chang Jiang'] }, { id: 'rhinen', da: 'Rhinen', ne: ['Rhine', 'Rhein', 'Rhin'] },
    { id: 'congo', da: 'Congofloden', ne: ['Congo'] }, { id: 'mekong', da: 'Mekong', ne: ['Mekong'] }, { id: 'gule', da: 'Den Gule Flod', ne: ['Huang'] },
    { id: 'niger', da: 'Nigerfloden', ne: ['Niger'] }
  ];

  // Spor-jagt: ét kendetegn pr. land. De andre spor (verdensdel, indbyggere, hovedstad) laves ud fra data.
  var clues = {
    FRA: 'Her står Eiffeltårnet.', EGY: 'Her ligger pyramiderne ved Giza.', CHN: 'Her kan du gå på Den Kinesiske Mur.',
    AUS: 'Her lever kænguruer i naturen.', ITA: 'Landet har form som en støvle.', JPN: 'Landet består af mange øer, og bjerget Fuji ligger her.',
    BRA: 'Den største del af regnskoven ved Amazonfloden ligger her.', IND: 'Her står bygningen Taj Mahal.', USA: 'Her står Frihedsgudinden.',
    PER: 'Her ligger ruinbyen Machu Picchu.', GBR: 'Her står det berømte klokketårn Big Ben.', NOR: 'Landet er kendt for sine lange fjorde.',
    ISL: 'Her er der mange vulkaner og varme kilder midt i Nordatlanten.', KEN: 'Ækvator går gennem landet, og her kan man se løver på savannen.',
    MEX: 'Her ligger mayapyramiden Chichén Itzá.', RUS: 'Det er verdens største land målt i areal.', CAN: 'Landets flag har et ahornblad.',
    GRC: 'Her ligger Akropolis.', ESP: 'Her står kirken Sagrada Família.', DEU: 'Her står Brandenburger Tor.',
    TUR: 'Byen Istanbul ligger både i Europa og i Asien.', NZL: 'Filmene om Ringenes Herre blev optaget her.', NLD: 'Landet er kendt for vindmøller og tulipaner, og en stor del af det ligger under havets overflade.'
  };

  var routes = [
    { id: 'm-byer', b: 'M', name: 'Byer i Danmark', desc: 'Find byerne på Danmarkskortet', map: 'dk', kind: 'town' },
    { id: 'm-oer', b: 'M', name: 'Øer og landsdele', desc: 'Jylland, Fyn, Sjælland og øerne', map: 'dk', kind: 'island' },
    { id: 'm-norden', b: 'M', name: 'Norden', desc: 'Lande og hovedstæder i Norden', map: 'norden', kind: 'norden' },
    { id: 'm-verden', b: 'M', name: 'Verdensdele og have', desc: 'Find verdensdele og have', map: 'world', kind: 'world' },
    { id: 'm-kompas', b: 'M', name: 'Kompasset', desc: 'Nord, syd, øst og vest', map: 'dk', kind: 'compass' },
    { id: 'u-europa', b: 'U', name: 'Europas lande', desc: 'Find landene på kortet', map: 'europe', kind: 'country' },
    { id: 'u-europahoved', b: 'U', name: 'Europas hovedstæder', desc: 'Hvad hedder hovedstaden?', map: 'europe', kind: 'capital' },
    { id: 'u-verden', b: 'U', name: 'Verdens lande', desc: 'Find landene på verdenskortet', map: 'world', kind: 'country' },
    { id: 'u-verdenhoved', b: 'U', name: 'Verdens hovedstæder', desc: 'Hovedstæder i hele verden', map: 'world', kind: 'capital' },
    { id: 'u-natur', b: 'U', name: 'Floder, bjerge og ørkener', desc: 'Find naturen på verdenskortet', map: 'world', kind: 'nature' },
    { id: 'u-spor', b: 'U', name: 'Sporjagt', desc: 'Gæt landet ud fra sporene', map: 'world', kind: 'clues' }
  ];

  var api = { towns: towns, islands: islands, norden: norden, nordenIds: Object.keys(norden), nordenCapitals: Object.keys(norden), extraCapitals: extraCapitals,
    europe: europe, world: world, continents: continents, seas: seas, ranges: ranges, rivers: rivers, clues: clues, routes: routes };
  root.VR_PLACES = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
