(function(){
  let currentLiveSource = {};

  function setLiveSource(source){
    currentLiveSource = source || {};
    return currentLiveSource;
  }

  function getLiveSource(){
    return currentLiveSource;
  }

const CATEGORIES = [
      { key:'titleWinner', label:'Title winner', type:'title' },
      { key:'orangeCap', label:'Orange cap', type:'top5' },
      { key:'mostSixes', label:'Most sixes', type:'top5' },
      { key:'purpleCap', label:'Purple cap', type:'top5' },
      { key:'mostDots', label:'Most dot balls', type:'top5' },
      { key:'mvp', label:'MVP', type:'top5' },
      { key:'uncappedMvp', label:'Uncapped MVP', type:'winner_better' },
      { key:'fairPlay', label:'Fair Play award', type:'winner_better' },
      { key:'highestScoreTeam', label:'Highest team score', type:'winner_better' },
      { key:'striker', label:'Striker of the season', type:'better_rank' },
      { key:'bestBowlingFigures', label:'Best bowling figures', type:'better_rank' },
      { key:'bestBowlingStrikeRate', label:'Best bowling strike rate', type:'better_rank' },
      { key:'mostCatches', label:'Most catches', type:'better_rank' },
      { key:'tableBottom', label:'Bottom of table', type:'winner_better' },
      { key:'leastMvp', label:'Least MVP', type:'better_rank_low' }
    ];

const BONUS_TOP_RANK_BETTER_PREDICTION_KEYS = new Set([
      'uncappedMvp',
      'striker',
      'bestBowlingFigures',
      'bestBowlingStrikeRate',
      'mostCatches'
    ]);

const TEAM_NAME_ALIASES = {
      mi: 'mumbai indians',
      'mumbai indians': 'mumbai indians',
      rcb: 'royal challengers bengaluru',
      'royal challengers bengaluru': 'royal challengers bengaluru',
      'royal challengers bangalore': 'royal challengers bengaluru',
      csk: 'chennai super kings',
      'chennai super kings': 'chennai super kings',
      srh: 'sunrisers hyderabad',
      'sunrisers hyderabad': 'sunrisers hyderabad',
      gt: 'gujarat titans',
      'gujarat titans': 'gujarat titans',
      lsg: 'lucknow super giants',
      'lucknow super giants': 'lucknow super giants',
      dc: 'delhi capitals',
      'delhi capitals': 'delhi capitals',
      pbks: 'punjab kings',
      'punjab kings': 'punjab kings',
      rr: 'rajasthan royals',
      'rajasthan royals': 'rajasthan royals',
      kkr: 'kolkata knight riders',
      'kolkata knight riders': 'kolkata knight riders'
    };

const PLAYER_NAME_ALIASES = {
      "a ankolekar": "atharva ankolekar",
      "a badoni": "ayush badoni",
      "a ghazanfar": "allah ghazanfar",
      "a hosein": "akeal hosein",
      "a kamboj": "anshul kamboj",
      "a khan": "aman khan",
      "a kulkarni": "arshin kulkarni",
      "a kumar": "ashwani kumar",
      "a mandal": "ajay mandal",
      "a markram": "aiden markram",
      "a mhatre": "ayush mhatre",
      "a milne": "adam milne",
      "a nabi": "auqib nabi",
      "a nortje": "anrich nortje",
      "a omarzai": "azmatullah omarzai",
      "a patel": "axar patel",
      "a porel": "abishek porel",
      "a r perala": "aman rao perala",
      "a raghuvanshi": "angkrish raghuvanshi",
      "a raghuwanshi": "akshat raghuwanshi",
      "a rahane": "ajinkya rahane",
      "a rawat": "anuj rawat",
      "a roy": "anukul roy",
      "a samad": "abdul samad",
      "a sharma": "ashutosh sharma",
      "a singh": "akash singh",
      "a tendulkar": "arjun tendulkar",
      "a verma": "aniket verma",
      "abdul samad": "abdul samad",
      "abhinandan singh": "abhinandan singh",
      "abhishek sharma": "abhishek sharma",
      "abishek porel": "abishek porel",
      "abishek sharma": "abhishek sharma",
      "adam milne": "adam milne",
      "ahamad": "shahbaz ahamad",
      "ahmad": "noor ahmad",
      "ahmed": "khaleel ahmed",
      "aiden markram": "aiden markram",
      "ajay mandal": "ajay mandal",
      "ajinkya rahane": "ajinkya rahane",
      "akash singh": "akash singh",
      "akeal hosein": "akeal hosein",
      "akshat raghuwanshi": "akshat raghuwanshi",
      "allah ghazanfar": "allah ghazanfar",
      "allen": "finn allen",
      "am ghazanfar": "allah ghazanfar",
      "aman khan": "aman khan",
      "aman perala": "aman rao perala",
      "aman rao perala": "aman rao perala",
      "amit kumar": "amit kumar",
      "angkrish raghuvanshi": "angkrish raghuvanshi",
      "aniket verma": "aniket verma",
      "ankolekar": "atharva ankolekar",
      "anrich nortje": "anrich nortje",
      "ansari": "zeeshan ansari",
      "anshul kamboj": "anshul kamboj",
      "anuj rawat": "anuj rawat",
      "anukul roy": "anukul roy",
      "ar perala": "aman rao perala",
      "archer": "jofra archer",
      "arjun tendulkar": "arjun tendulkar",
      "arshdeep singh": "arshdeep singh",
      "arshin kulkarni": "arshin kulkarni",
      "arya": "priyansh arya",
      "ashok sharma": "ashok sharma",
      "ashutosh sharma": "ashutosh sharma",
      "ashwani kumar": "ashwani kumar",
      "atharva ankolekar": "atharva ankolekar",
      "auqib nabi": "auqib nabi",
      "avesh khan": "avesh khan",
      "avinash": "pyla avinash",
      "axar patel": "axar patel",
      "ayush badoni": "ayush badoni",
      "ayush mhatre": "ayush mhatre",
      "azmatullah omarzai": "azmatullah omarzai",
      "b carse": "brydon carse",
      "b duckett": "ben duckett",
      "b dwarshuis": "ben dwarshuis",
      "b kumar": "bhuvneshwar kumar",
      "b muzarabani": "blessing muzarabani",
      "b sharma": "brijesh sharma",
      "badoni": "ayush badoni",
      "banton": "tom banton",
      "bartlett": "xavier bartlett",
      "bawa": "raj angad bawa",
      "ben duckett": "ben duckett",
      "ben dwarshuis": "ben dwarshuis",
      "bethell": "jacob bethell",
      "bhuvneshwar kumar": "bhuvneshwar kumar",
      "bishnoi": "ravi bishnoi",
      "blessing muzarabani": "blessing muzarabani",
      "bosch": "corbin bosch",
      "boult": "trent boult",
      "breetzke": "matthew breetzke",
      "brevis": "dewald brevis",
      "brijesh sharma": "brijesh sharma",
      "brydon carse": "brydon carse",
      "bumrah": "jasprit bumrah",
      "burger": "nandre burger",
      "buttler": "jos buttler",
      "c bosch": "corbin bosch",
      "c connolly": "cooper connolly",
      "c green": "cameron green",
      "cameron green": "cameron green",
      "carse": "brydon carse",
      "chahal": "yuzvendra chahal",
      "chakaravarthy": "varun chakaravarthy",
      "chameera": "dushmantha chameera",
      "charak": "yudhvir singh charak",
      "chouhan": "kanishk chouhan",
      "connolly": "cooper connolly",
      "cooper connolly": "cooper connolly",
      "corbin bosch": "corbin bosch",
      "cox": "jordan cox",
      "cummins": "pat cummins",
      "d brevis": "dewald brevis",
      "d chahar": "deepak chahar",
      "d chameera": "dushmantha chameera",
      "d ferreira": "donovan ferreira",
      "d jurel": "dhruv jurel",
      "d kamra": "daksh kamra",
      "d malewar": "danish malewar",
      "d miller": "david miller",
      "d padikkal": "devdutt padikkal",
      "d payne": "david payne",
      "d shanaka": "dasun shanaka",
      "d singh": "digvesh singh",
      "daksh kamra": "daksh kamra",
      "danish malewar": "danish malewar",
      "dar": "rasikh dar",
      "dasun shanaka": "dasun shanaka",
      "david": "tim david",
      "david miller": "david miller",
      "david payne": "david payne",
      "dayal": "yash dayal",
      "deepak chahar": "deepak chahar",
      "deshpande": "tushar deshpande",
      "deswal": "satvik deswal",
      "devdutt padikkal": "devdutt padikkal",
      "dewald brevis": "dewald brevis",
      "dhir": "naman dhir",
      "dhoni": "ms dhoni",
      "dhruv jurel": "dhruv jurel",
      "digvesh singh": "digvesh singh",
      "donovan ferreira": "donovan ferreira",
      "dube": "shivam dube",
      "duckett": "ben duckett",
      "duffy": "jacob duffy",
      "dushmantha chameera": "dushmantha chameera",
      "dwarshuis": "ben dwarshuis",
      "e malinga": "eshan malinga",
      "eshan malinga": "eshan malinga",
      "f allen": "finn allen",
      "ferguson": "lockie ferguson",
      "ferreira": "donovan ferreira",
      "finn allen": "finn allen",
      "foulkes": "zak foulkes",
      "fuletra": "krains fuletra",
      "g phillips": "glenn phillips",
      "g s brar": "gurnoor singh brar",
      "g singh": "gurjapneet singh",
      "gaikwad": "ruturaj gaikwad",
      "ghazanfar": "allah ghazanfar",
      "ghosh": "ramakrishna ghosh",
      "gill": "shubman gill",
      "glenn phillips": "glenn phillips",
      "gopal": "shreyas gopal",
      "green": "cameron green",
      "gs brar": "gurnoor singh brar",
      "gurjapneet singh": "gurjapneet singh",
      "gurnoor brar": "gurnoor singh brar",
      "gurnoor singh brar": "gurnoor singh brar",
      "h brar": "harpreet brar",
      "h dubey": "harsh dubey",
      "h klaasen": "heinrich klaasen",
      "h pandya": "hardik pandya",
      "h pannu": "harnoor pannu",
      "h patel": "harshal patel",
      "h singh": "himmat singh",
      "hardik pandya": "hardik pandya",
      "harnoor pannu": "harnoor pannu",
      "harpreet brar": "harpreet brar",
      "harsh dubey": "harsh dubey",
      "harshal patel": "harshal patel",
      "hasaranga": "wanindu hasaranga",
      "hazlewood": "josh hazlewood",
      "head": "travis head",
      "heinrich klaasen": "heinrich klaasen",
      "henry": "matt henry",
      "hetmyer": "shimron hetmyer",
      "himmat singh": "himmat singh",
      "hinge": "praful hinge",
      "holder": "jason holder",
      "hosein": "akeal hosein",
      "hussain": "sakib hussain",
      "i kishan": "ishan kishan",
      "i sharma": "ishant sharma",
      "inglis": "josh inglis",
      "ishan kishan": "ishan kishan",
      "ishant sharma": "ishant sharma",
      "izhar": "mohammad izhar",
      "j archer": "jofra archer",
      "j bethell": "jacob bethell",
      "j bumrah": "jasprit bumrah",
      "j buttler": "jos buttler",
      "j cox": "jordan cox",
      "j duffy": "jacob duffy",
      "j hazlewood": "josh hazlewood",
      "j holder": "jason holder",
      "j inglis": "josh inglis",
      "j overton": "jamie overton",
      "j sharma": "jitesh sharma",
      "j unadkat": "jaydev unadkat",
      "j yadav": "jayant yadav",
      "jacks": "will jacks",
      "jacob bethell": "jacob bethell",
      "jacob duffy": "jacob duffy",
      "jadeja": "ravindra jadeja",
      "jaiswal": "yashasvi jaiswal",
      "jamie overton": "jamie overton",
      "jamieson": "kyle jamieson",
      "jansen": "marco jansen",
      "jason holder": "jason holder",
      "jasprit bumrah": "jasprit bumrah",
      "jayant yadav": "jayant yadav",
      "jaydev unadkat": "jaydev unadkat",
      "jitesh sharma": "jitesh sharma",
      "jofra archer": "jofra archer",
      "johnson": "spencer johnson",
      "jordan cox": "jordan cox",
      "jos buttler": "jos buttler",
      "josh hazlewood": "josh hazlewood",
      "josh inglis": "josh inglis",
      "jurel": "dhruv jurel",
      "k ahmed": "khaleel ahmed",
      "k chouhan": "kanishk chouhan",
      "k fuletra": "krains fuletra",
      "k jamieson": "kyle jamieson",
      "k khejroliya": "kulwant khejroliya",
      "k kushagra": "kumar kushagra",
      "k maphaka": "kwena maphaka",
      "k mendis": "kamindu mendis",
      "k nair": "karun nair",
      "k pandya": "krunal pandya",
      "k rabada": "kagiso rabada",
      "k rahul": "kl rahul",
      "k sen": "kuldeep sen",
      "k sharma": "kartik sharma",
      "k tyagi": "kartik tyagi",
      "k yadav": "kuldeep yadav",
      "kagiso rabada": "kagiso rabada",
      "kamboj": "anshul kamboj",
      "kamindu mendis": "kamindu mendis",
      "kamra": "daksh kamra",
      "kanishk chouhan": "kanishk chouhan",
      "kartik sharma": "kartik sharma",
      "kartik tyagi": "kartik tyagi",
      "karun nair": "karun nair",
      "khaleel ahmed": "khaleel ahmed",
      "khejroliya": "kulwant khejroliya",
      "kishan": "ishan kishan",
      "kishore": "sai kishore",
      "kl rahul": "kl rahul",
      "klaasen": "heinrich klaasen",
      "kock": "quinton de kock",
      "kohli": "virat kohli",
      "krains fuletra": "krains fuletra",
      "krishna": "prasidh krishna",
      "krunal pandya": "krunal pandya",
      "kuldeep sen": "kuldeep sen",
      "kuldeep yadav": "kuldeep yadav",
      "kulkarni": "arshin kulkarni",
      "kulwant khejroliya": "kulwant khejroliya",
      "kumar kushagra": "kumar kushagra",
      "kushagra": "kumar kushagra",
      "kwena maphaka": "kwena maphaka",
      "kyle jamieson": "kyle jamieson",
      "l d pretorious": "lhuan dre pretorious",
      "l ferguson": "lockie ferguson",
      "l livingstone": "liam livingstone",
      "l ngidi": "lungisani ngidi",
      "l wood": "luke wood",
      "ld pretorious": "lhuan dre pretorious",
      "lhuan dre pretorious": "lhuan dre pretorious",
      "lhuan pretorious": "lhuan dre pretorious",
      "liam livingstone": "liam livingstone",
      "livingstone": "liam livingstone",
      "lockie ferguson": "lockie ferguson",
      "luke wood": "luke wood",
      "lungisani ngidi": "lungisani ngidi",
      "m a khan": "mohd arshad khan",
      "m breetzke": "matthew breetzke",
      "m choudhary": "mukesh choudhary",
      "m dhoni": "ms dhoni",
      "m henry": "matt henry",
      "m izhar": "mohammad izhar",
      "m jansen": "marco jansen",
      "m khan": "mohsin khan",
      "m kumar": "mukesh kumar",
      "m markande": "mayank markande",
      "m marsh": "mitchell marsh",
      "m owen": "mitch owen",
      "m pandey": "manish pandey",
      "m pathirana": "matheesha pathirana",
      "m rawat": "mayank rawat",
      "m santner": "mitchell santner",
      "m shami": "mohammad shami",
      "m siddharth": "m siddharth",
      "m siraj": "mohammed siraj",
      "m starc": "mitchell starc",
      "m stoinis": "marcus stoinis",
      "m suthar": "manav suthar",
      "m tiwari": "madhav tiwari",
      "m w short": "matthew william short",
      "m yadav": "mayank yadav",
      "ma khan": "mohd arshad khan",
      "madhav tiwari": "madhav tiwari",
      "mahendra singh dhoni": "ms dhoni",
      "malewar": "danish malewar",
      "malhotra": "vihaan malhotra",
      "malik": "umran malik",
      "malinga": "eshan malinga",
      "manav suthar": "manav suthar",
      "mandal": "ajay mandal",
      "mangesh yadav": "mangesh yadav",
      "manish pandey": "manish pandey",
      "maphaka": "kwena maphaka",
      "marco jansen": "marco jansen",
      "marcus stoinis": "marcus stoinis",
      "markande": "mayank markande",
      "markram": "aiden markram",
      "marsh": "mitchell marsh",
      "matheesha pathirana": "matheesha pathirana",
      "matt henry": "matt henry",
      "matthew breetzke": "matthew breetzke",
      "matthew short": "matthew william short",
      "matthew william short": "matthew william short",
      "mavi": "shivam mavi",
      "mayank markande": "mayank markande",
      "mayank rawat": "mayank rawat",
      "mayank yadav": "mayank yadav",
      "mendis": "kamindu mendis",
      "mhatre": "ayush mhatre",
      "miller": "david miller",
      "milne": "adam milne",
      "minz": "robin minz",
      "mishra": "sushant mishra",
      "mitch owen": "mitch owen",
      "mitchell marsh": "mitchell marsh",
      "mitchell santner": "mitchell santner",
      "mitchell starc": "mitchell starc",
      "mohammad izhar": "mohammad izhar",
      "mohammad shami": "mohammad shami",
      "mohammed siraj": "mohammed siraj",
      "mohd arshad khan": "mohd arshad khan",
      "mohd khan": "mohd arshad khan",
      "mohsin khan": "mohsin khan",
      "ms dhoni": "ms dhoni",
      "mukesh choudhary": "mukesh choudhary",
      "mukesh kumar": "mukesh kumar",
      "mukul choudhary": "mukul choudhary",
      "musheer khan": "musheer khan",
      "muzarabani": "blessing muzarabani",
      "mw short": "matthew william short",
      "n ahmad": "noor ahmad",
      "n burger": "nandre burger",
      "n dhir": "naman dhir",
      "n k reddy": "nitish kumar reddy",
      "n pooran": "nicholas pooran",
      "n rana": "nitish rana",
      "n saini": "navdeep saini",
      "n sindhu": "nishant sindhu",
      "n t varma": "n tilak varma",
      "n thushara": "nuwan thushara",
      "n tilak varma": "n tilak varma",
      "n tiwari": "naman tiwari",
      "n varma": "n tilak varma",
      "n wadhera": "nehal wadhera",
      "nabi": "auqib nabi",
      "nair": "karun nair",
      "naman dhir": "naman dhir",
      "naman tiwari": "naman tiwari",
      "nandre burger": "nandre burger",
      "narine": "sunil narine",
      "natarajan": "t natarajan",
      "navdeep saini": "navdeep saini",
      "nehal wadhera": "nehal wadhera",
      "ngidi": "lungisani ngidi",
      "nicholas pooran": "nicholas pooran",
      "nigam": "vipraj nigam",
      "nishad": "vishal nishad",
      "nishant sindhu": "nishant sindhu",
      "nissanka": "pathum nissanka",
      "nitish kumar reddy": "nitish kumar reddy",
      "nitish rana": "nitish rana",
      "nitish reddy": "nitish kumar reddy",
      "nk reddy": "nitish kumar reddy",
      "noor ahmad": "noor ahmad",
      "nortje": "anrich nortje",
      "nt varma": "n tilak varma",
      "nuwan thushara": "nuwan thushara",
      "o tarmale": "onkar tarmale",
      "omarzai": "azmatullah omarzai",
      "onkar tarmale": "onkar tarmale",
      "ostwal": "vicky ostwal",
      "overton": "jamie overton",
      "owen": "mitch owen",
      "p arya": "priyansh arya",
      "p avinash": "pyla avinash",
      "p cummins": "pat cummins",
      "p dubey": "pravin dubey",
      "p hinge": "praful hinge",
      "p krishna": "prasidh krishna",
      "p nissanka": "pathum nissanka",
      "p salt": "phil salt",
      "p shaw": "prithvi shaw",
      "p singh": "prabhsimran singh",
      "p solanki": "prashant solanki",
      "p veer": "prashant veer",
      "p yadav": "prince yadav",
      "padikkal": "devdutt padikkal",
      "pandey": "manish pandey",
      "pannu": "harnoor pannu",
      "pant": "rishabh pant",
      "parag": "riyan parag",
      "parakh": "sahil parakh",
      "pat cummins": "pat cummins",
      "pathirana": "matheesha pathirana",
      "pathum nissanka": "pathum nissanka",
      "patidar": "rajat patidar",
      "payne": "david payne",
      "perala": "aman rao perala",
      "phil salt": "phil salt",
      "philip salt": "phil salt",
      "phillips": "glenn phillips",
      "pooran": "nicholas pooran",
      "porel": "abishek porel",
      "powell": "rovman powell",
      "prabhsimran singh": "prabhsimran singh",
      "praful hinge": "praful hinge",
      "prashant solanki": "prashant solanki",
      "prashant veer": "prashant veer",
      "prasidh krishna": "prasidh krishna",
      "pravin dubey": "pravin dubey",
      "pretorious": "lhuan dre pretorious",
      "prince yadav": "prince yadav",
      "prithvi shaw": "prithvi shaw",
      "priyansh arya": "priyansh arya",
      "punja": "yash raj punja",
      "puthur": "vignesh puthur",
      "pyla avinash": "pyla avinash",
      "q d kock": "quinton de kock",
      "qd kock": "quinton de kock",
      "quinton de kock": "quinton de kock",
      "quinton kock": "quinton de kock",
      "r a bawa": "raj angad bawa",
      "r bishnoi": "ravi bishnoi",
      "r chahar": "rahul chahar",
      "r dar": "rasikh dar",
      "r gaikwad": "ruturaj gaikwad",
      "r ghosh": "ramakrishna ghosh",
      "r jadeja": "ravindra jadeja",
      "r khan": "rashid khan",
      "r minz": "robin minz",
      "r pant": "rishabh pant",
      "r parag": "riyan parag",
      "r patidar": "rajat patidar",
      "r powell": "rovman powell",
      "r ravindra": "rachin ravindra",
      "r rickelton": "ryan rickelton",
      "r sharma": "rohit sharma",
      "r shepherd": "romario shepherd",
      "r singh": "rinku singh",
      "r tewatia": "rahul tewatia",
      "r tripathi": "rahul tripathi",
      "ra bawa": "raj angad bawa",
      "rabada": "kagiso rabada",
      "rachin ravindra": "rachin ravindra",
      "raghu sharma": "raghu sharma",
      "raghuvanshi": "angkrish raghuvanshi",
      "raghuwanshi": "akshat raghuwanshi",
      "rahane": "ajinkya rahane",
      "rahul": "kl rahul",
      "rahul chahar": "rahul chahar",
      "rahul tewatia": "rahul tewatia",
      "rahul tripathi": "rahul tripathi",
      "raj angad bawa": "raj angad bawa",
      "raj bawa": "raj angad bawa",
      "rajat patidar": "rajat patidar",
      "ramakrishna ghosh": "ramakrishna ghosh",
      "ramandeep singh": "ramandeep singh",
      "rana": "nitish rana",
      "ranjan": "sarthak ranjan",
      "rashid khan": "rashid khan",
      "rasikh dar": "rasikh dar",
      "ravi bishnoi": "ravi bishnoi",
      "ravi singh": "ravi singh",
      "ravichandran": "smaran ravichandran",
      "ravindra": "rachin ravindra",
      "ravindra jadeja": "ravindra jadeja",
      "reddy": "nitish kumar reddy",
      "rickelton": "ryan rickelton",
      "rinku singh": "rinku singh",
      "rishabh pant": "rishabh pant",
      "riyan parag": "riyan parag",
      "rizvi": "sameer rizvi",
      "robin minz": "robin minz",
      "rohit sharma": "rohit sharma",
      "romario shepherd": "romario shepherd",
      "rovman powell": "rovman powell",
      "roy": "anukul roy",
      "rutherford": "sherfane rutherford",
      "ruturaj gaikwad": "ruturaj gaikwad",
      "ryan rickelton": "ryan rickelton",
      "s ahamad": "shahbaz ahamad",
      "s arora": "salil arora",
      "s deswal": "satvik deswal",
      "s dube": "shivam dube",
      "s dubey": "saurabh dubey",
      "s gill": "shubman gill",
      "s gopal": "shreyas gopal",
      "s hetmyer": "shimron hetmyer",
      "s hussain": "sakib hussain",
      "s iyer": "shreyas iyer",
      "s johnson": "spencer johnson",
      "s k yadav": "surya kumar yadav",
      "s khan": "sarfaraz khan",
      "s kishore": "sai kishore",
      "s kumar": "shivang kumar",
      "s mavi": "shivam mavi",
      "s mishra": "sushant mishra",
      "s narine": "sunil narine",
      "s parakh": "sahil parakh",
      "s ranjan": "sarthak ranjan",
      "s ravichandran": "smaran ravichandran",
      "s rizvi": "sameer rizvi",
      "s rutherford": "sherfane rutherford",
      "s samson": "sanju samson",
      "s sharma": "sandeep sharma",
      "s shedge": "suryansh shedge",
      "s singh": "shashank singh",
      "s sudharsan": "sai sudharsan",
      "s thakur": "shardul thakur",
      "sahil parakh": "sahil parakh",
      "sai kishore": "sai kishore",
      "sai sudharsan": "sai sudharsan",
      "saini": "navdeep saini",
      "sakib hussain": "sakib hussain",
      "salil arora": "salil arora",
      "salt": "phil salt",
      "samad": "abdul samad",
      "sameer rizvi": "sameer rizvi",
      "samson": "sanju samson",
      "sandeep sharma": "sandeep sharma",
      "sanju samson": "sanju samson",
      "santner": "mitchell santner",
      "sarfaraz khan": "sarfaraz khan",
      "sarthak ranjan": "sarthak ranjan",
      "satvik deswal": "satvik deswal",
      "saurabh dubey": "saurabh dubey",
      "seifert": "tim seifert",
      "sen": "kuldeep sen",
      "shahbaz ahamad": "shahbaz ahamad",
      "shahrukh khan": "shahrukh khan",
      "shami": "mohammad shami",
      "shanaka": "dasun shanaka",
      "shardul thakur": "shardul thakur",
      "shashank singh": "shashank singh",
      "shaw": "prithvi shaw",
      "shedge": "suryansh shedge",
      "shepherd": "romario shepherd",
      "sherfane rutherford": "sherfane rutherford",
      "shimron hetmyer": "shimron hetmyer",
      "shivam dube": "shivam dube",
      "shivam mavi": "shivam mavi",
      "shivang kumar": "shivang kumar",
      "short": "matthew william short",
      "shreyas gopal": "shreyas gopal",
      "shreyas iyer": "shreyas iyer",
      "shubham dubey": "shubham dubey",
      "shubman gill": "shubman gill",
      "siddharth": "m siddharth",
      "sindhu": "nishant sindhu",
      "siraj": "mohammed siraj",
      "sk yadav": "surya kumar yadav",
      "smaran ravichandran": "smaran ravichandran",
      "solanki": "prashant solanki",
      "spencer johnson": "spencer johnson",
      "starc": "mitchell starc",
      "stoinis": "marcus stoinis",
      "stubbs": "tristan stubbs",
      "sudharsan": "sai sudharsan",
      "sundar": "washington sundar",
      "sunil narine": "sunil narine",
      "surya kumar yadav": "surya kumar yadav",
      "surya yadav": "surya kumar yadav",
      "suryansh shedge": "suryansh shedge",
      "suryavanshi": "vaibhav suryavanshi",
      "sushant mishra": "sushant mishra",
      "suthar": "manav suthar",
      "suyash sharma": "suyash sharma",
      "swapnil singh": "swapnil singh",
      "t banton": "tom banton",
      "t boult": "trent boult",
      "t david": "tim david",
      "t deshpande": "tushar deshpande",
      "t head": "travis head",
      "t natarajan": "t natarajan",
      "t seifert": "tim seifert",
      "t singh": "tejasvi singh",
      "t stubbs": "tristan stubbs",
      "t vijay": "tripurana vijay",
      "tarmale": "onkar tarmale",
      "tejasvi singh": "tejasvi singh",
      "tendulkar": "arjun tendulkar",
      "tewatia": "rahul tewatia",
      "thushara": "nuwan thushara",
      "tilak varma": "n tilak varma",
      "tim david": "tim david",
      "tim seifert": "tim seifert",
      "tom banton": "tom banton",
      "travis head": "travis head",
      "trent boult": "trent boult",
      "tripathi": "rahul tripathi",
      "tripurana vijay": "tripurana vijay",
      "tristan stubbs": "tristan stubbs",
      "tushar deshpande": "tushar deshpande",
      "tyagi": "kartik tyagi",
      "u malik": "umran malik",
      "u patel": "urvil patel",
      "umran malik": "umran malik",
      "unadkat": "jaydev unadkat",
      "urvil patel": "urvil patel",
      "v arora": "vaibhav arora",
      "v chakaravarthy": "varun chakaravarthy",
      "v iyer": "venkatesh iyer",
      "v kohli": "virat kohli",
      "v malhotra": "vihaan malhotra",
      "v nigam": "vipraj nigam",
      "v nishad": "vishal nishad",
      "v ostwal": "vicky ostwal",
      "v puthur": "vignesh puthur",
      "v suryavanshi": "vaibhav suryavanshi",
      "v vijaykumar": "vyshak vijaykumar",
      "v vinod": "vishnu vinod",
      "vaibhav arora": "vaibhav arora",
      "vaibhav sooryavanshi": "vaibhav suryavanshi",
      "vaibhav suryavanshi": "vaibhav suryavanshi",
      "varma": "n tilak varma",
      "varun chakaravarthy": "varun chakaravarthy",
      "varun chakravarthy": "varun chakaravarthy",
      "veer": "prashant veer",
      "venkatesh iyer": "venkatesh iyer",
      "verma": "aniket verma",
      "vicky ostwal": "vicky ostwal",
      "vignesh puthur": "vignesh puthur",
      "vihaan malhotra": "vihaan malhotra",
      "vijay": "tripurana vijay",
      "vijaykumar": "vyshak vijaykumar",
      "vinod": "vishnu vinod",
      "vipraj nigam": "vipraj nigam",
      "virat kohli": "virat kohli",
      "vishal nishad": "vishal nishad",
      "vishnu vinod": "vishnu vinod",
      "vyshak vijaykumar": "vyshak vijaykumar",
      "w hasaranga": "wanindu hasaranga",
      "w jacks": "will jacks",
      "w sundar": "washington sundar",
      "wadhera": "nehal wadhera",
      "wanindu hasaranga": "wanindu hasaranga",
      "washington sundar": "washington sundar",
      "will jacks": "will jacks",
      "wood": "luke wood",
      "x bartlett": "xavier bartlett",
      "xavier bartlett": "xavier bartlett",
      "y chahal": "yuzvendra chahal",
      "y dayal": "yash dayal",
      "y jaiswal": "yashasvi jaiswal",
      "y r punja": "yash raj punja",
      "y s charak": "yudhvir singh charak",
      "y thakur": "yash thakur",
      "yash dayal": "yash dayal",
      "yash punja": "yash raj punja",
      "yash raj punja": "yash raj punja",
      "yash thakur": "yash thakur",
      "yashasvi jaiswal": "yashasvi jaiswal",
      "yr punja": "yash raj punja",
      "ys charak": "yudhvir singh charak",
      "yudhvir charak": "yudhvir singh charak",
      "yudhvir singh charak": "yudhvir singh charak",
      "yuzvendra chahal": "yuzvendra chahal",
      "z ansari": "zeeshan ansari",
      "z foulkes": "zak foulkes",
      "zak foulkes": "zak foulkes",
      "zeeshan ansari": "zeeshan ansari"
};

function normalizeName(v){
      return String(v || '')
        .toLowerCase()
        .replace(/&/g,'and')
        .replace(/[^\w\s]/g,' ')
        .replace(/\s+/g,' ')
        .trim();
    }

function canonicalCompareName(v){
      const normalized = normalizeName(v);
      return PLAYER_NAME_ALIASES[normalized] || TEAM_NAME_ALIASES[normalized] || normalized;
    }

function matchesPick(a,b){
      return canonicalCompareName(a) === canonicalCompareName(b);
    }

function rankOf(pick, ranking){
      const idx = ranking.findIndex(name => matchesPick(name, pick));
      return idx >= 0 ? idx + 1 : null;
    }

function trackingRankingForLive(live){
      const extended = Array.isArray(live?.extendedRanking) ? live.extendedRanking : [];
      if (extended.length) return extended;
      return Array.isArray(live?.ranking) ? live.ranking : [];
    }

function describePickLiveState(category, pick, live, explicitRank){
      const trackingRanking = trackingRankingForLive(live);
      const rank = explicitRank || (trackingRanking.length ? rankOf(pick, trackingRanking) : null);

      if (category.type === 'title') {
        if (live?.winner && matchesPick(pick, live.winner)) return 'Live: winner';
        if (Array.isArray(live?.finalists) && live.finalists.some(name => matchesPick(name, pick))) return 'Live: finalist';
        if (Array.isArray(live?.playoffs) && live.playoffs.some(name => matchesPick(name, pick))) return 'Live: playoffs';
        if (rank) return `Live: #${rank}`;
        const hasTitleBoard = Boolean(live?.winner) || (Array.isArray(live?.finalists) && live.finalists.length) || (Array.isArray(live?.playoffs) && live.playoffs.length) || trackingRanking.length;
        return hasTitleBoard ? 'Live: outside frame' : 'Live: waiting';
      }

      if (rank) return `Live: #${rank}`;

      if ((category.type === 'winner' || category.type === 'winner_better') && live?.winner) {
        return matchesPick(pick, live.winner) ? 'Live: current leader' : 'Live: trailing';
      }

      return trackingRanking.length ? 'Live: unranked' : 'Live: waiting';
    }

function getAggregates(liveSource = currentLiveSource){
      return liveSource?.meta?.aggregates || {};
    }

function findMatchingKeyInObject(obj, pick){
      const source = obj && typeof obj === 'object' ? obj : {};
      return Object.keys(source).find(name => matchesPick(name, pick)) || null;
    }

function valueForPickFromObject(obj, pick, nestedKey = null){
      const key = findMatchingKeyInObject(obj, pick);
      if (!key) return null;
      const value = obj[key];
      if (nestedKey && value && typeof value === 'object') {
        return value[nestedKey] ?? null;
      }
      return value;
    }

function unitLabel(unit, amount){
      return `${amount} ${unit}${Math.abs(amount) === 1 ? '' : 's'}`;
    }

function oversLabelFromBalls(balls){
      const whole = Math.floor(balls / 6);
      const remainder = balls % 6;
      return remainder ? `${whole}.${remainder} overs` : `${whole} overs`;
    }

function categoryValueConfig(categoryKey, liveSource = currentLiveSource){
      const agg = getAggregates(liveSource);
      switch (categoryKey) {
        case 'orangeCap': return { map: agg.battingRuns || {}, unit: 'run', minInteresting: 1 };
        case 'mostSixes': return { map: agg.battingSixes || {}, unit: 'six', minInteresting: 1 };
        case 'purpleCap': return { map: agg.bowlingWickets || {}, unit: 'wicket', minInteresting: 1 };
        case 'mostDots': return { map: currentLiveSource?.mostDots?.values || agg.bowlingDots || {}, unit: 'dot ball', minInteresting: 1 };
        case 'mostCatches': return { map: agg.catches || {}, unit: 'catch', minInteresting: 1 };
        case 'mvp': return { map: currentLiveSource?.mvp?.values || {}, unit: 'MVP point', nestedKey: 'score', minInteresting: 1 };
        case 'uncappedMvp': return { map: currentLiveSource?.mvp?.values || {}, unit: 'MVP point', nestedKey: 'score', minInteresting: 1 };
        case 'leastMvp': return { map: currentLiveSource?.mvp?.values || {}, unit: 'MVP point', nestedKey: 'score', minInteresting: 1 };
        default: return { map: {}, unit: 'point', minInteresting: 1 };
      }
    }

function numericCategoryValue(categoryKey, pick, liveSource = currentLiveSource){
      const config = categoryValueConfig(categoryKey, liveSource);
      const raw = valueForPickFromObject(config.map, pick, config.nestedKey || null);
      if (raw === null || raw === undefined || raw === '') return null;
      const num = Number(raw);
      return Number.isFinite(num) ? num : null;
    }

function formatLiveValueBadge(categoryKey, pick, liveSource = currentLiveSource){
      const agg = getAggregates(liveSource);
      if (!pick) return null;

      if (categoryKey === 'orangeCap') {
        const runs = Number(valueForPickFromObject(agg.battingRuns || {}, pick) || 0);
        return { text: `${runs} run${runs===1?'':'s'}`, soft: runs === 0 };
      }
      if (categoryKey === 'mostSixes') {
        const sixes = Number(valueForPickFromObject(agg.battingSixes || {}, pick) || 0);
        return { text: `${sixes} six${sixes===1?'':'es'}`, soft: sixes === 0 };
      }
      if (categoryKey === 'purpleCap') {
        const wickets = Number(valueForPickFromObject(agg.bowlingWickets || {}, pick) || 0);
        return { text: `${wickets} wicket${wickets===1?'':'s'}`, soft: wickets === 0 };
      }
      if (categoryKey === 'mostDots') {
        const dots = Number(valueForPickFromObject(currentLiveSource?.mostDots?.values || agg.bowlingDots || {}, pick) || 0);
        return { text: `${dots} dot${dots===1?'':'s'}`, soft: dots === 0 };
      }
      if (categoryKey === 'mostCatches') {
        const catches = Number(valueForPickFromObject(agg.catches || {}, pick) || 0);
        return { text: `${catches} catch${catches===1?'':'es'}`, soft: catches === 0 };
      }
      if (categoryKey === 'striker') {
        const runs = Number(valueForPickFromObject(agg.battingRuns || {}, pick) || 0);
        const balls = Number(valueForPickFromObject(agg.battingBalls || {}, pick) || 0);
        if (runs <= 0 && balls <= 0) return { text: '0 runs', soft: true };
        const sr = balls > 0 ? ((100 * runs) / balls).toFixed(1) : '—';
        return { text: `${runs} runs • SR ${sr}`, soft: runs < 100 };
      }
      if (categoryKey === 'bestBowlingFigures') {
        const figures = currentLiveSource?.bestBowlingFigures?.figures || {};
        const key = findMatchingKeyInObject(figures, pick);
        if (!key) return null;
        return { text: `${figures[key]} figures`, soft: false };
      }
      if (categoryKey === 'bestBowlingStrikeRate') {
        const wickets = Number(valueForPickFromObject(agg.bowlingWickets || {}, pick) || 0);
        const balls = Number(valueForPickFromObject(agg.bowlingBalls || {}, pick) || 0);
        if (wickets <= 0 && balls <= 0) return null;
        const sr = wickets > 0 ? (balls / wickets).toFixed(1) : '—';
        return { text: `${wickets} wkts • SR ${sr}`, soft: balls < 72 };
      }
      if (categoryKey === 'mvp' || categoryKey === 'uncappedMvp' || categoryKey === 'leastMvp') {
        const score = numericCategoryValue(categoryKey, pick);
        return { text: `${Number(score || 0).toFixed(score ? 1 : 0)} MVP pts`, soft: !score };
      }
      return null;
    }

function liveStateBlock(category, pick, state){
      const metric = formatLiveValueBadge(category.key, pick);
      return `<div class="pick-live-stack">${liveStateHtml(state)}${metric ? `<span class="live-value-pill${metric.soft ? ' value-soft' : ''}">${escapeHtml(metric.text)}</span>` : ''}</div>`;
    }

function buildClosestContestInsight(rows, liveSource = currentLiveSource){
      const candidates = [];
      for (const row of rows) {
        const live = liveSource[row.category.key] || {};
        const ranking = trackingRankingForLive(live);
        const rankA = rankOf(row.pickA, ranking);
        const rankB = rankOf(row.pickB, ranking);
        if (rankA && rankB) {
          candidates.push({
            weight: Math.abs(rankA - rankB),
            message: `Closest duel: ${row.category.label} is still alive — ${row.pickA} sits #${rankA} and ${row.pickB} #${rankB}. One sharp match swings the bragging rights.`
          });
          continue;
        }

        const valueA = numericCategoryValue(row.category.key, row.pickA, liveSource);
        const valueB = numericCategoryValue(row.category.key, row.pickB, liveSource);
        const config = categoryValueConfig(row.category.key, liveSource);
        if (valueA !== null && valueB !== null && (valueA > 0 || valueB > 0)) {
          const gap = Math.abs(valueA - valueB);
          if (gap <= 20) {
            candidates.push({
              weight: gap + 0.5,
              message: `Closest raw chase: ${row.category.label} — ${row.pickA} has ${valueA}, ${row.pickB} has ${valueB}. That is only ${unitLabel(config.unit, gap)} between them.`
            });
          }
        }
      }
      candidates.sort((a,b) => a.weight - b.weight);
      return candidates[0]?.message || null;
    }

function buildThresholdPushes(matchup, liveSource = currentLiveSource){
      const pushes = [];
      const seen = new Set();
      const top5Categories = ['orangeCap','mostSixes','purpleCap','mostDots','mostCatches','mvp','uncappedMvp'];
      for (const categoryKey of top5Categories) {
        const category = CATEGORIES.find(c => c.key === categoryKey);
        const live = liveSource[categoryKey] || {};
        const ranking = trackingRankingForLive(live);
        if (!ranking.length) continue;
        const config = categoryValueConfig(categoryKey, liveSource);
        const scoringIndex = Math.min(4, ranking.length - 1);
        const boardIndex = Math.min(9, ranking.length - 1);
        const scoringValue = numericCategoryValue(categoryKey, ranking[scoringIndex], liveSource);
        const boardValue = numericCategoryValue(categoryKey, ranking[boardIndex], liveSource);
        const rowResult = category ? getCategoryResult(category, matchup) : { a: 0, b: 0 };
        for (const [side, pick] of [['a', matchup.a.picks[categoryKey]], ['b', matchup.b.picks[categoryKey]]]) {
          const key = `${categoryKey}:${pick}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const rank = rankOf(pick, ranking);
          const currentValue = numericCategoryValue(categoryKey, pick, liveSource);
          const alreadyLeadingThisFront = side === 'a' ? rowResult.a > rowResult.b : rowResult.b > rowResult.a;
          if (currentValue === null || currentValue < (config.minInteresting || 1)) continue;
          if (!rank && boardValue !== null && boardValue > currentValue) {
            const need = Math.max(1, boardValue - currentValue + 1);
            pushes.push({ priority: need, message: `${pick} is off the ${category?.label || categoryKey} board for now, but ${unitLabel(config.unit, need)} gets to the current board line and brings that front into range.` });
          } else if (rank && rank > 5 && scoringValue !== null && scoringValue >= currentValue) {
            const need = Math.max(1, scoringValue - currentValue + 1);
            const message = alreadyLeadingThisFront
              ? `${pick} is already edging ${category?.label || categoryKey} from #${rank}; ${unitLabel(config.unit, need)} more pushes them onto the live top-5 board.`
              : `${pick} is parked at #${rank} for ${category?.label || categoryKey}; ${unitLabel(config.unit, need)} more reaches the current top-5 cut-line.`;
            pushes.push({ priority: need + 5, message });
          } else if (rank && rank > 1) {
            const leaderValue = numericCategoryValue(categoryKey, ranking[0], liveSource);
            if (leaderValue !== null && leaderValue > currentValue) {
              const need = Math.max(1, leaderValue - currentValue);
              if (need <= 20) pushes.push({ priority: need + 10, message: `${pick} is already on the ${category?.label || categoryKey} board at #${rank}; ${unitLabel(config.unit, need)} closes on the leader.` });
            }
          }
        }
      }

      const agg = getAggregates(liveSource);
      for (const pick of [matchup.a.picks.striker, matchup.b.picks.striker]) {
        const runs = Number(valueForPickFromObject(agg.battingRuns || {}, pick) || 0);
        const rank = rankOf(pick, trackingRankingForLive(LIVE_2026.striker || {}));
        if (!rank && runs < 100) {
          const need = 100 - runs;
          pushes.push({ priority: need + 20, message: `${pick} still needs ${unitLabel('run', need)} just to qualify for Striker, so that category is still loading its drama.` });
        }
      }

      for (const pick of [matchup.a.picks.bestBowlingStrikeRate, matchup.b.picks.bestBowlingStrikeRate]) {
        const balls = Number(valueForPickFromObject(agg.bowlingBalls || {}, pick) || 0);
        const wickets = Number(valueForPickFromObject(agg.bowlingWickets || {}, pick) || 0);
        const rank = rankOf(pick, trackingRankingForLive(LIVE_2026.bestBowlingStrikeRate || {}));
        if (!rank && balls < 72) {
          const need = 72 - balls;
          pushes.push({ priority: need + 25, message: wickets > 0 ? `${pick} needs ${need} more balls (${oversLabelFromBalls(need)}) to qualify for bowling strike rate.` : `${pick} needs ${need} more balls (${oversLabelFromBalls(need)}) and a wicket before bowling strike rate even wakes up.` });
        }
      }

      for (const pick of [matchup.a.picks.leastMvp, matchup.b.picks.leastMvp]) {
        const matches = Number(valueForPickFromObject(agg.playerMatches || {}, pick) || 0);
        const rank = rankOf(pick, trackingRankingForLive(LIVE_2026.leastMvp || {}));
        if (!rank && matches < 5) {
          const need = 5 - matches;
          pushes.push({ priority: need + 15, message: `${pick} still needs ${unitLabel('game', need)} before Least MVP becomes a real battlefield.` });
        }
      }

      pushes.sort((a,b) => a.priority - b.priority);
      return pushes.map(x => x.message);
    }

function buildSwingPressureInsight(matchup, rows, liveSource = currentLiveSource){
      const deadRows = rows.filter(r => r.a === 0 && r.b === 0);
      const vulnerable = deadRows.find(r => /unranked|outside frame/i.test(r.pickALiveState + r.pickBLiveState));
      if (vulnerable) {
        return `Hidden swing: ${vulnerable.category.label} is still 0-0, which means one decent outing from ${vulnerable.pickA} or ${vulnerable.pickB} can suddenly make this board look much less polite.`;
      }
      const swingRows = rows.filter(r => r.a !== r.b).sort((x,y) => Math.abs(y.a-y.b) - Math.abs(x.a-x.b));
      if (swingRows.length) {
        const top = swingRows[0];
        const winner = top.a > top.b ? matchup.a.name : matchup.b.name;
        return `Current pressure point: ${top.category.label} is where ${winner} is doing the most damage right now.`;
      }
      return null;
    }

function scoreWinnerCategory(pickA, pickB, actualWinner){
      const aWin = actualWinner && matchesPick(pickA, actualWinner);
      const bWin = actualWinner && matchesPick(pickB, actualWinner);
      return {
        a: aWin ? 5 : 0,
        b: bWin ? 5 : 0,
        note: actualWinner ? `Winner: ${actualWinner}` : 'Waiting for result'
      };
    }

function scoreWinnerBetterCategory(pickA, pickB, live, categoryKey){
      const actualWinner = live?.winner || null;
      const ranking = Array.isArray(live?.extendedRanking) && live.extendedRanking.length
        ? live.extendedRanking
        : (Array.isArray(live?.ranking) ? live.ranking : []);
      const aWin = actualWinner && matchesPick(pickA, actualWinner);
      const bWin = actualWinner && matchesPick(pickB, actualWinner);

      let rankA = rankOf(pickA, ranking);
      let rankB = rankOf(pickB, ranking);
      let a = aWin ? betterPredictionPoints(rankA || 1, categoryKey) : 0;
      let b = bWin ? betterPredictionPoints(rankB || 1, categoryKey) : 0;

      if (categoryKey === 'tableBottom' && a === 0 && b === 0) {
        if (rankA && rankB) {
          if (rankA > rankB) a = 1;
          else if (rankB > rankA) b = 1;
        } else if (rankA && !rankB) {
          a = 1;
        } else if (rankB && !rankA) {
          b = 1;
        }
      }

      return {
        a,
        b,
        rankA,
        rankB,
        note: winnerBetterNote(categoryKey, live)
      };
    }

function titleBandScore(pick, live){
      if (live.winner && matchesPick(pick, live.winner)) return 5;
      if (Array.isArray(live.finalists) && live.finalists.some(name => matchesPick(name, pick))) return 3;
      if (Array.isArray(live.playoffs) && live.playoffs.some(name => matchesPick(name, pick))) return 2;
      return 0;
    }

function titleComparisonRank(pick, live){
      if (live.winner && matchesPick(pick, live.winner)) return 1;
      if (Array.isArray(live.finalists) && live.finalists.some(name => matchesPick(name, pick))) return 2;
      if (Array.isArray(live.playoffs) && live.playoffs.some(name => matchesPick(name, pick))) return 3;

      const extendedRanking = Array.isArray(live.extendedRanking) ? live.extendedRanking : [];
      const extRank = rankOf(pick, extendedRanking);
      if (extRank) return 100 + extRank;

      const ranking = Array.isArray(live.ranking) ? live.ranking : [];
      const rank = rankOf(pick, ranking);
      if (rank) return 200 + rank;

      return null;
    }

function scoreTitleCategory(pickA, pickB, live){
      const aBand = titleBandScore(pickA, live);
      const bBand = titleBandScore(pickB, live);
      let a = aBand;
      let b = bBand;

      if (aBand === 0 && bBand === 0) {
        const posA = titleComparisonRank(pickA, live);
        const posB = titleComparisonRank(pickB, live);
        if (posA && posB) {
          if (posA < posB) a = 1;
          else if (posB < posA) b = 1;
        } else if (posA && !posB) {
          a = 1;
        } else if (posB && !posA) {
          b = 1;
        }
      }

      const noteParts = [];
      if (live.winner) noteParts.push(`Winner: ${live.winner}`);
      if (Array.isArray(live.finalists) && live.finalists.length) noteParts.push(`Finalists: ${live.finalists.join(', ')}`);
      if (Array.isArray(live.playoffs) && live.playoffs.length) noteParts.push(`Playoffs: ${live.playoffs.join(', ')}`);
      if (!noteParts.length) noteParts.push('Waiting for title race');
      return { a, b, note: noteParts.join(' • ') };
    }

function top5Points(rank){
      if (rank === 1) return 4;
      if (rank === 2 || rank === 3) return 3;
      if (rank === 4 || rank === 5) return 2;
      return 0;
    }

function betterPredictionPoints(rank, categoryKey){
      if (!rank) return 1;
      if (BONUS_TOP_RANK_BETTER_PREDICTION_KEYS.has(categoryKey) && rank === 1) return 2;
      return 1;
    }

function scoreTop5Category(pickA, pickB, ranking){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);

      let a = top5Points(rA);
      let b = top5Points(rB);
      let note = 'Waiting for leaderboard';
      if (ranking.length) {
        note = `Top 5: ${ranking.slice(0,5).join(', ')}`;
      }

      // Fallback 1 point applies only if BOTH missed the top 5.
      if (!rA && !rB && ranking.length) {
        // Without a broader season order, both stay at 0 here.
      }

      return { a, b, note, rankA:rA, rankB:rB };
    }

function scoreTop5WithExtended(pickA, pickB, ranking, extendedRanking){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);
      let a = top5Points(rA);
      let b = top5Points(rB);

      const extA = rankOf(pickA, extendedRanking);
      const extB = rankOf(pickB, extendedRanking);
      const fullA = extA || rA || null;
      const fullB = extB || rB || null;

      // If both missed the top 5, award the 1-point better-prediction fallback.
      // This must work symmetrically: any ranked pick beats an unranked pick,
      // and if both are ranked outside the scoring zone, the closer rank wins.
      if (a === 0 && b === 0) {
        if (fullA && fullB) {
          if (fullA < fullB) a = 1;
          else if (fullB < fullA) b = 1;
        } else if (fullA && !fullB) {
          a = 1;
        } else if (fullB && !fullA) {
          b = 1;
        }
      }

      return {
        a,b,rankA:fullA,rankB:fullB,
        note: ranking.length ? `Top 5: ${ranking.slice(0,5).join(', ')}` : 'Waiting for leaderboard'
      };
    }

function scoreBetterRankCategory(pickA, pickB, ranking, emptyNote = 'Waiting for ranking', categoryKey = null){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);
      let a = 0, b = 0;
      if (rA && rB) {
        if (rA < rB) a = betterPredictionPoints(rA, categoryKey);
        else if (rB < rA) b = betterPredictionPoints(rB, categoryKey);
      } else if (rA && !rB) {
        a = betterPredictionPoints(rA, categoryKey);
      } else if (rB && !rA) {
        b = betterPredictionPoints(rB, categoryKey);
      }
      return {
        a, b, rankA:rA, rankB:rB,
        note: ranking.length ? `Top 5: ${ranking.slice(0,5).join(', ')}` : emptyNote
      };
    }

function scoreBetterRankLowCategory(pickA, pickB, ranking){
      const rA = rankOf(pickA, ranking);
      const rB = rankOf(pickB, ranking);
      let a = 0, b = 0;
      if (rA && rB) {
        if (rA > rB) a = 1;
        else if (rB > rA) b = 1;
      } else if (rA && !rB) {
        a = 1;
      } else if (rB && !rA) {
        b = 1;
      }
      return {
        a, b, rankA:rA, rankB:rB,
        note: ranking.length ? `Lowest 5 eligible: ${ranking.slice(-5).reverse().join(', ')}` : 'Waiting for least-MVP ranking (min 5 games)'
      };
    }

function getCategoryResult(category, matchup, liveSource = currentLiveSource){
      const pickA = matchup.a.picks[category.key];
      const pickB = matchup.b.picks[category.key];
      const live = (liveSource && liveSource[category.key]) || {};

      if (category.type === 'title') {
        return scoreTitleCategory(pickA, pickB, live);
      }

      if (category.type === 'winner') {
        return scoreWinnerCategory(pickA, pickB, live.winner || null);
      }

      if (category.type === 'winner_better') {
        return scoreWinnerBetterCategory(pickA, pickB, live, category.key);
      }

      const ranking = Array.isArray(live.ranking) ? live.ranking : [];
      const extendedRanking = Array.isArray(live.extendedRanking) ? live.extendedRanking : null;

      if (category.type === 'better_rank') {
        let emptyNote = 'Waiting for ranking';
        if (category.key === 'striker') emptyNote = 'Waiting for ranking (min 100 runs)';
        if (category.key === 'bestBowlingStrikeRate') emptyNote = 'Waiting for ranking (min 12 overs)';
        return extendedRanking
          ? scoreBetterRankCategory(pickA, pickB, extendedRanking, emptyNote, category.key)
          : scoreBetterRankCategory(pickA, pickB, ranking, emptyNote, category.key);
      }

      if (category.type === 'better_rank_low') {
        return extendedRanking
          ? scoreBetterRankLowCategory(pickA, pickB, extendedRanking)
          : scoreBetterRankLowCategory(pickA, pickB, ranking);
      }

      return extendedRanking
        ? scoreTop5WithExtended(pickA, pickB, ranking, extendedRanking)
        : scoreTop5Category(pickA, pickB, ranking);
    }

function computeMatchup(matchup, liveSource = currentLiveSource){
      const rows = CATEGORIES.map(category => {
        const result = getCategoryResult(category, matchup, liveSource);
        const pickA = matchup.a.picks[category.key] || '—';
        const pickB = matchup.b.picks[category.key] || '—';
        const live = (liveSource && liveSource[category.key]) || {};
        return {
          category,
          pickA,
          pickB,
          pickALiveState: describePickLiveState(category, pickA, live, result.rankA),
          pickBLiveState: describePickLiveState(category, pickB, live, result.rankB),
          a: result.a,
          b: result.b,
          note: result.note
        };
      });

      const totalA = rows.reduce((s,r)=>s+r.a,0);
      const totalB = rows.reduce((s,r)=>s+r.b,0);

      return { rows, totalA, totalB };
    }

function topListNote(label, ranking, limit = 5){
      const names = Array.isArray(ranking) ? ranking.slice(0, limit) : [];
      return names.length ? `${label}: ${names.join(', ')}` : `Waiting for ${label.toLowerCase()}`;
    }

function bottomListNote(label, ranking, limit = 5){
      const names = Array.isArray(ranking) ? ranking.slice(-limit).reverse() : [];
      return names.length ? `${label}: ${names.join(', ')}` : `Waiting for ${label.toLowerCase()}`;
    }

function winnerBetterNote(categoryKey, live){
      const ranking = Array.isArray(live?.extendedRanking) && live.extendedRanking.length ? live.extendedRanking : (Array.isArray(live?.ranking) ? live.ranking : []);
      if (categoryKey === 'uncappedMvp') return topListNote('Top 5 uncapped MVP', ranking);
      if (categoryKey === 'fairPlay') return topListNote('Top 3 fair play', ranking, 3);
      if (categoryKey === 'highestScoreTeam') return topListNote('Top 5 team scores', ranking);
      if (categoryKey === 'tableBottom') return bottomListNote('Bottom 3', ranking, 3);
      return live?.winner ? `Winner: ${live.winner}` : 'Waiting for result';
    }

  window.WarRoomEngine = {
    CATEGORIES,
    BONUS_TOP_RANK_BETTER_PREDICTION_KEYS,
    setLiveSource,
    getLiveSource,
    normalizeName,
    canonicalCompareName,
    matchesPick,
    rankOf,
    trackingRankingForLive,
    describePickLiveState,
    getAggregates,
    findMatchingKeyInObject,
    valueForPickFromObject,
    unitLabel,
    oversLabelFromBalls,
    categoryValueConfig,
    numericCategoryValue,
    formatLiveValueBadge,
    liveStateBlock,
    buildClosestContestInsight,
    buildThresholdPushes,
    buildSwingPressureInsight,
    scoreWinnerCategory,
    scoreWinnerBetterCategory,
    titleBandScore,
    titleComparisonRank,
    scoreTitleCategory,
    top5Points,
    betterPredictionPoints,
    scoreTop5Category,
    scoreTop5WithExtended,
    scoreBetterRankCategory,
    scoreBetterRankLowCategory,
    getCategoryResult,
    topListNote,
    bottomListNote,
    winnerBetterNote,
    computeMatchup
  };
})();
