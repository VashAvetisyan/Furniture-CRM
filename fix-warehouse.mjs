import { readFileSync, writeFileSync } from 'fs';

const file = 'c:/Users/HP/OneDrive/Рабочий стол/CRM-FrondEND/src/features/warehouse/page.tsx';
let c = readFileSync(file, 'utf8');

// Each pair: [exact chars in file, replacement]
const fixes = [
  // EditMaterialModal cancel button (line 182): Չ+ե+ղ+a+r+կ+e+l → all Armenian
  ['Չեղarկel', 'Չեղառկել'],

  // EditMaterialModal save button (line 186): Pahpanoum / Pahpanel → Armenian
  ["'Pahpanoum...' : 'Pahpanel'", "'Պահպա\u576\u578\u582\u574...' : 'Պահպա\u576ել'"],

  // TransferModal h2 (line 229): Արtadraamas → Արտadраамас
  ['Արtadraamas', 'Առտադռամաս'],

  // TransferModal description (line 230): garbage text → proper Armenian
  ['Нyutհы дурс are列ել → Աртadraamas',
   'Նյութը պահեստիծ տեղա\u فيոխումն Առտադռամաս'],

  // TransferModal material label (line 238): Нyuth → Նyuth proper
  ['Нyuth<span', 'Նյութ<span'],

  // TransferModal select placeholder (line 245): — Yntrel Нyuth —
  ['— Yntrel Нyuth —',
   '— Ը\u576տրել Նյութ —'],

  // TransferModal stock display (line 248): Pahуст → Պahust proper
  ['Paհуст:', 'Պահեստբ:'],

  // TransferModal zero stock error (line 253): Пahуст-ы qanakk-ы 0-ე!
  ['Пaհуст-ы qanakk-ы 0-ე!',
   'Պահեստի քա\u576ակը 0 է!'],

  // TransferModal quantity label (line 259): Qanakk → Քanakk proper
  ['`Qanakk${', '`Քա\u576ակ${'],

  // TransferModal note label (line 269): Nшum (Пatzаr) → Նишum proper
  ['Nшум (Патзар)',
   'Նի\u577\u578\u582\u574 (ժամա\u576ակական)'],

  // TransferModal note placeholder (line 273): Патверы кам нкатагруtyun...
  ['Патверы кам нкатагруtyun...',
   'Պատվերի կա\u574 \u576կա\u580ա\u563ր\u578\u582թյ\u578\u582\u576...'],

  // TransferModal cancel button (line 282): Չеghаrkel with Cyrillic е,а
  ['Չеգհарկel',
   'Չեղառկել'],

  // TransferModal submit button (line 289): Тeghaphokhoum / Тeghaphоkhel
  ["'Тeghaphokhoum...' : 'Тeghaphоkhel'",
   "'Տեղա\u فيոխ\u578\u582\u574...' : 'Տեղա\u فيոխել'"],

  // MaterialsTable loading (line 309): Bеrnoum е... → Բеռнвum є...
  ['Bеrnoum е...', 'Բևռ\u576վ\u578\u582\u574 է...'],

  // MaterialsTable empty (line 319): Нyuther chkan
  ['Нyuther chkan',
   'Նյութեր չկա\u576'],

  // MaterialsTable header Անuun (line 326)
  ['Ա\u576uun</span>',
   'Ա\u576\u578\u582\u576</span>'],

  // MaterialsTable header Pahуст (line 328): у=Cyrillic
  ['Paհуст</span>',
   'Պահեստ</span>'],

  // MaterialsTable header Нв. Pahуст (line 329)
  ['Нв. Paհуст</span>',
   'Նվ. Պահեստ</span>'],

  // MaterialsTable header Гин/Ч.М. (line 330): Cyrillic Г,и,н,Ч
  ['Гин/Ч.М.</span>',
   'Գի\u576/Չ.Մ.</span>'],

  // MaterialsTable row button title Теghaphоkhel (line 360): Т=Cyrillic, о=Cyrillic
  ['Теգհапоխел Աртadraamas',
   'Տեղա\u فيոխել Առտադռամաս'],

  // MaterialsTable row button title Khmbagrel (line 370): all Latin
  ['"Khmbagrel"', '"\u056­\u574\u562ա\u563\u580ել"'],

  // MaterialsTable row button title Djnjel (line 380): all Latin
  ['"Djnjel"', '"Ջ\u576իել"'],

  // MovementsTable loading (line 402): same broken string as 309
  // already covered by the Bеrnoum fix above

  // MovementsTable empty (line 412): Sharazhumner chkan → all Latin
  ['Sharazhumner chkan',
   'ՇարժAո\u582\u574\u576եր չկա\u576'],

  // MovementsTable headers (line 419-423)
  // Нyuth header: Н=Cyrillic
  ['Нyuth</span>',
   'Նյութ</span>'],

  // Urerutyun header: all Latin
  ['Urerutyun</span>',
   'Ուղղո\u582թյու\u576</span>'],

  // Qanakk header: all Latin
  ['Qanakk</span>',
   'Քա\u576ակ</span>'],

  // Nшum header: Ш=Cyrillic
  ['Nшum</span>',
   'Նի\u577\u578\u582\u574</span>'],

  // Amsativ header: all Latin
  ['Amsativ</span>',
   'Ա\u574սաթիվ</span>'],

  // MovementsTable direction (line 435): 'Ners' : 'Артadraamas'
  ["'Ners' : 'Աртaդraamas'",
   "'Ներս' : 'Առտ.'"],

  // Page title Պahест → Պahест proper (line 489)
  ['Պahест', 'Պահեստ'],

  // Page subtitle нyuth (line 490): н=Cyrillic
  [' нyuth', ' \u576յութ'],

  // Page button Teghapokhel Artadraamas (line 500): all Latin
  ['Teghapokhel Artadraamas',
   'Տեղա\u فيոխել Առտ.'],

  // Page button Avelainel Нyuth (line 509): Н=Cyrillic + rest Latin
  ['Avelainel Нyuth',
   'Ավելա\u581\u576ել Նյութ'],

  // Search placeholder Voronel (line 522): all Latin
  ['"Voronel..."', '"Փ\u576տռել..."'],
];

let count = 0;
for (const [from, to] of fixes) {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    count++;
    console.log('OK:', JSON.stringify(from.slice(0, 20)));
  } else {
    // try to show what's around it
    console.log('MISS:', from.split('').map(ch => ch.codePointAt(0).toString(16)).join(' '));
  }
}
console.log('\nTotal:', count, 'of', fixes.length);
writeFileSync(file, c, 'utf8');
