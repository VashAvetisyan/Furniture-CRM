'use strict';
const fs = require('fs');
const wh_file = 'c:/Users/HP/OneDrive/Рабочий стол/CRM-FrondEND/src/features/warehouse/page.tsx';
const ws_file = 'c:/Users/HP/OneDrive/Рабочий стол/CRM-FrondEND/src/features/workshop/page.tsx';

let c = fs.readFileSync(wh_file, 'utf8');
const ws = fs.readFileSync(ws_file, 'utf8');
const wsLines = ws.split('\n');

// ── Verified strings from workshop/page.tsx ──────────────────────────────────
const CANCEL   = wsLines[86].trim();                                     // Չegharkell
const WORKSHOP = wsLines[134].match(/>([^<]+)</)[1];                     // Artadraamas
const ep       = wsLines[170].match(/>([^<]+)</)[1].split(' ');
const PAHEST   = ep[0].slice(0, 6);                                      // Pahest (drop -itz)
const NYUT     = ep[1];                                                  // nyut'
const TEGHAPOKHEL = ep[2];                                               // teghapokhel (lowercase)
const TEG_CAP  = String.fromCodePoint(TEGHAPOKHEL.codePointAt(0) - 0x30)
               + [...TEGHAPOKHEL].slice(1).join('');                     // Teghapokhel
const TEGHAPOKHUM = [...TEGHAPOKHEL].slice(0, -2).join('') + 'ում'; // ...oum
const ARTADRAAMAS = ep[3];                                               // artadraamas
const NYUT_CAP = String.fromCodePoint(NYUT.codePointAt(0) - 0x30)
               + [...NYUT].slice(1).join('');                            // Nyut'
const SAVE_BTN = wsLines[90].trim();                                     // {isPending ? 'save...' : 'save'}

// ── Warehouse-internal references ────────────────────────────────────────────
const ADD_MAT = c.split('\n')[114].match(/>([^<]+)</)[1]; // from h2 line 115

// ── Derived Armenian strings ──────────────────────────────────────────────────
const QANAKK   = 'Քա\u576ակ'; // Qanakk - fix below
const AMSATIV  = 'Ամսաթիվ'; // Amsativ
const DIRECTION= 'Ուղղություն'; // Oughghut'youn
const NISHUM   = 'Նիշում'; // Nishum
const NERS     = 'Նեռս'; // Ners
const DJNJEL   = 'Ջնջել'; // Djnjel
const KHMB_LOW = 'խմբագրել'; // khmbagrel
const KHMB_CAP = 'Խմբագրել'; // Khmbagrel
const ANUN     = 'Անուն'; // Anoun
const MIN_STOCK= 'Նվ. ' + PAHEST; // Nv. Pahest
const PRICE_HDR= 'Գին/Չ.Մ.'; // Gin/Ch.M.
const LOADING  = 'Բևռ\u576վու\u574 և...'; // Bernoum e...
const NO_MATS  = 'Նյո\u582\u569ե\u580 չկան'; // Nyut'er chkan
const NO_MOVS  = 'Շարժում\u576ե\u580 չկան'; // Sharz chkan
const ENTREL   = 'Ենտրել'; // Entrel

// Fix the ones where I made escape errors - use raw strings instead:
const fixes = [
  ['Խmbagrnel',                    'Խмбагрел'],  // will fix below with correct chars
  ['Չեղarկel',                     CANCEL],
  ["'Pahpanoum...' : 'Pahpanel'",  SAVE_BTN.slice(SAVE_BTN.indexOf("'"))],
  ['Տեղափоkhel Արtadraamas',       TEG_CAP + ' ' + WORKSHOP],
  ['Нyuthы дurs are列ել → Արтadraamas',
                                    PAHEST + 'ի\u581 \u576\u575\u578\u582\u569 տեղափոխել ' + ARTADRAAMAS],
  ['Нyuth<span',                    NYUT_CAP + '<span'],
  ['— Yntrel Нyuth —', '— Ենտրել ' + NYUT_CAP + ' —'],
  ['Pahуст:',                       PAHEST + ':'],
  ['Пahуст-ы qanakk-ы 0-ე!',
                                    PAHEST + 'ի \u584ա\u576ակը 0 է!'],
  ['`Qanakk${',                     '`Քա\u576ակ${'],
  ['Nшум (Пatзаr)',
                                    'Նիշում (ժամա\u576ակ)'],
  ['Патверы кам нкатагруtyun...',
                                    'Պատվերի կամ \u576կա\u580ագրո\u582\u569յո\u582\u576...'],
  ['Չеghաrkel',      CANCEL],
  ["'Тeghaphokhoum...' : 'Тeghaphоkhel'",
                                    "'" + TEGHAPOKHUM + "...' : '" + TEGHAPOKHEL + "'"],
  ['Bеrnoum е...',        'Բեռ\u576վո\u582\u574 է...'],
  ["'Нyuther chkan'",          "'Նյո\u582\u569ե\u580 չկա\u576'"],
  ['Անuun</span>',        ANUN + '</span>'],
  ['Pahуст</span>',  PAHEST + '</span>'],
  ['Нв. Pahуст</span>', MIN_STOCK + '</span>'],
  ['Гин/Ч.М.</span>', PRICE_HDR + '</span>'],
  ['"Khmbagrel"',                   '"' + 'խմբագրել' + '"'],
  ['"Djnjel"',                      '"' + 'Ջ\u576ջել' + '"'],
  ['Sharazhumner chkan',            'Շարժում\u576ե\u580 չկա\u576'],
  ['Нyuth</span>',             NYUT_CAP + '</span>'],
  ['Urerutyun</span>',              'Ուղղություն</span>'],
  ['Qanakk</span>',                 'Քանակ</span>'],
  ['Nшum</span>',              'Նիշում</span>'],
  ['Amsativ</span>',                'Ամսաթիվ</span>'],
  ["'Ners' : 'Աртadraamas'",
                                    "'Նեռս' : '" + WORKSHOP + "'"],
  ['Պahест',                   PAHEST],
  [' нyuth',                   ' ' + NYUT],
  ['Teghapokhel Artadraamas',       TEG_CAP + ' ' + WORKSHOP],
  ['Avelainel Нyuth',          ADD_MAT],
  ['"Voronel..."',                  '"Փ\u576տռել..."'],
];

let hit = 0, miss = 0;
for (const [from, to] of fixes) {
  if (typeof to === 'string' && c.includes(from)) {
    c = c.split(from).join(to);
    hit++;
    process.stdout.write('OK  : ' + from.replace(/\s+/g,' ').slice(0,35) + '\n');
  } else {
    miss++;
    const cps = [...from].map(ch => ch.codePointAt(0).toString(16)).join(' ');
    process.stdout.write('MISS: ' + JSON.stringify(from.slice(0,25)) + ' | ' + cps.slice(0,60) + '\n');
  }
}
process.stdout.write('\nHit: ' + hit + '  Miss: ' + miss + '  Total: ' + fixes.length + '\n');
fs.writeFileSync(wh_file, c, 'utf8');
process.stdout.write('File written.\n');
