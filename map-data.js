/* Hand drawn labels and publicly accessible corridor anchors correspond to
   source/annotated-floors.png. Coordinates match vector wall SVG viewBoxes. */
const FLOORS={
  3:{height:800, corridorY:485, stair:[1241,485], hall:[700,485], rooms:[
    {id:'318/1',name:'Невролог',label:[321, 411],door:[278,450],via:[[304,485],[304,450]]},
    {id:'318/2',name:'Кабинет 318/2',label:[233, 487],door:[278,485]},
  {id:'317',name:'Психиатр-нарколог',label:[429, 409],door:[430,449]},
    {id:'316',name:'Офтальмолог',label:[546, 409],door:[530,449]},
    {id:'315',name:'Гинеколог',label:[663, 393],door:[650,449]},
    {id:'314',name:'Дерматовенеролог',label:[799, 393],door:[805,449]},
    {id:'313/2',name:'Терапевт',label:[909, 414],door:[905,449]},
    {id:'313/1',name:'Терапевт',label:[1001, 414],door:[996,449]},
    {id:'312',name:'Невролог',label:[1112, 480],door:[1126,449]},
    {id:'319',name:'УЗИ',label:[329, 622],door:[371,623],via:[[420,485],[420,623]]},
    {id:'322',name:'Рентгенография',label:[825, 557],door:[814,518]},
    {id:'324',name:'Маммография',label:[1224, 558],door:[1232,520]},
    {id:'wc-3a',name:'Туалет у коридора',label:[532,564],door:[502,561],via:[[422,485],[422,561]]},
    {id:'wc-3b',name:'Туалет у внешней стены',label:[532,650],door:[500,612],via:[[422,485],[422,612]]}
  ]},
  2:{height:1003,corridorY:345,stair:[1148,345],hall:[680,345],rooms:[
    {id:'206',name:'Процедурный кабинет',short:'Процедурный',label:[277, 291],door:[302,335]},
    {id:'205',name:'Стоматолог',label:[411, 279],door:[435,315]},
    {id:'205/1',name:'Оториноларинголог',label:[450, 203],door:[447,234],via:[[435,345],[435,270],[447,270]]},
    {id:'204',name:'Оториноларинголог',label:[533, 278],door:[523,315]},
    {id:'203/1',name:'Кабинет 203/1',short:'Кабинет',label:[623, 285],door:[625,315]},
    {id:'203/2',name:'Кабинет 203/2',short:'Кабинет',label:[682, 247],door:[680,275],via:[[625,345],[625,275]]},
    {id:'202',name:'Хирург',label:[752, 279],door:[752,315]},
    {id:'201',name:'Выдача результатов медосмотра',short:'Выдача результатов',label:[1010,181],door:[978,230],via:[[975,345],[975,270]],window:true},
    {id:'win-1',name:'Окно 1',short:'Окно 1',label:[845,105],door:[878,145],via:[[921,345],[921,145]],window:true},
    {id:'win-2',name:'Окно 2',short:'Окно 2',label:[843,237],door:[879,205],via:[[921,345],[921,205]],window:true},
    {id:'207',name:'Лаборатория',label:[344, 421],door:[354,390]},
    {id:'209',name:'Предрейсовый и послерейсовый осмотр · психиатрическое освидетельствование',short:'Предрейсовый осмотр',label:[751, 411],door:[741,374]},
    {id:'win-4',name:'Окно 4',short:'Окно 4',label:[844,415],door:[833,374],window:true},
    {id:'win-3',name:'Окно 3',short:'Окно 3',label:[872,449],door:[892,374],window:true},
    {id:'wardrobe',name:'Гардероб',short:'Гардероб',label:[965,446],door:[997,374],window:true},
    {id:'wc-2',name:'Туалет',short:'Туалет',label:[482,460],door:[485,389]},
    {id:'20',name:'Спирометрия и аудиометрия',short:'Кабинет 20',label:[650,897],door:[590,890],via:[[552,345],[552,890]]}
  ]}
};
const SERVICE_ZONES={
  2:[
    [1024,430,161,72],[389,388,65,114],
    [591,515,111,47],[718,515,80,102],[596,637,204,189]
  ],
  3:[]
};
const LANDMARKS={
  stairs2:{name:'Лестница · 2 этаж',floor:2,position:FLOORS[2].stair},
  hall2:{name:'Главный коридор · 2 этаж',floor:2,position:FLOORS[2].hall},
  stairs3:{name:'Лестница · 3 этаж',floor:3,position:FLOORS[3].stair},
  hall3:{name:'Главный коридор · 3 этаж',floor:3,position:FLOORS[3].hall}
};
