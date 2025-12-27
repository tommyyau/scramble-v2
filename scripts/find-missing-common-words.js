import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Common 5-letter words that should probably be in the dictionary
// (sourced from frequency lists and common vocabulary)
const COMMON_5_LETTER_WORDS = [
  'ABOUT', 'ABOVE', 'ABUSE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
  'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE',
  'ALLEY', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGEL', 'ANGER',
  'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE',
  'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWARD', 'AWARE', 'AWFUL', 'BADLY',
  'BASIC', 'BASIS', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH',
  'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLAZE', 'BLEND',
  'BLESS', 'BLIND', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOWN', 'BOARD', 'BONUS',
  'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK',
  'BREED', 'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN',
  'BRUSH', 'BUILD', 'BUILT', 'BUNCH', 'BURST', 'BUYER', 'CABIN', 'CABLE',
  'CAMEL', 'CANDY', 'CARGO', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR',
  'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHEAT', 'CHECK', 'CHEEK', 'CHEER',
  'CHEST', 'CHIEF', 'CHILD', 'CHILL', 'CHINA', 'CHORD', 'CHOSE', 'CHUNK',
  'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF',
  'CLIMB', 'CLING', 'CLOCK', 'CLOSE', 'CLOTH', 'CLOUD', 'COACH', 'COAST',
  'COLON', 'COLOR', 'COMET', 'COMIC', 'CORAL', 'COUCH', 'COULD', 'COUNT',
  'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRANE', 'CRASH', 'CRAZY', 'CREAM',
  'CREEK', 'CREEP', 'CRIME', 'CRISP', 'CROSS', 'CROWD', 'CROWN', 'CRUDE',
  'CRUEL', 'CRUSH', 'CURVE', 'CYCLE', 'DAILY', 'DAIRY', 'DANCE', 'DEALT',
  'DEATH', 'DEBUT', 'DECOR', 'DELAY', 'DENSE', 'DEPTH', 'DEVIL', 'DIARY',
  'DIGIT', 'DIRTY', 'DISCO', 'DITCH', 'DOING', 'DOUBT', 'DOUGH', 'DOZEN',
  'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DRAWN', 'DREAD', 'DREAM', 'DRESS',
  'DRIED', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DROWN', 'DRUNK', 'DYING',
  'EAGER', 'EARLY', 'EARTH', 'EATEN', 'EIGHT', 'ELDER', 'ELECT', 'ELITE',
  'EMAIL', 'EMPTY', 'ENDED', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL',
  'ERROR', 'ESSAY', 'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAINT',
  'FAIRY', 'FAITH', 'FALSE', 'FANCY', 'FATAL', 'FAULT', 'FAVOR', 'FEAST',
  'FENCE', 'FERRY', 'FETCH', 'FEVER', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY',
  'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLAME', 'FLASH', 'FLEET', 'FLESH',
  'FLOAT', 'FLOCK', 'FLOOD', 'FLOOR', 'FLOUR', 'FLOWN', 'FLUID', 'FLUSH',
  'FOCUS', 'FOGGY', 'FOLLY', 'FORCE', 'FORGE', 'FORTH', 'FORTY', 'FORUM',
  'FOSSIL', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FREAK', 'FRESH', 'FRIED',
  'FRONT', 'FROST', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS',
  'GLOBE', 'GLORY', 'GLOVE', 'GOOSE', 'GRACE', 'GRADE', 'GRAIN', 'GRAND',
  'GRANT', 'GRAPE', 'GRAPH', 'GRASP', 'GRASS', 'GRAVE', 'GREAT', 'GREED',
  'GREEN', 'GREET', 'GRIEF', 'GRILL', 'GRIND', 'GROSS', 'GROUP', 'GROVE',
  'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUILT', 'HAPPY', 'HARDY',
  'HARSH', 'HASTE', 'HAVEN', 'HEARD', 'HEART', 'HEAVY', 'HEDGE', 'HELLO',
  'HENCE', 'HOBBY', 'HONEY', 'HONOR', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN',
  'HUMOR', 'HURRY', 'IDEAL', 'IMAGE', 'IMPLY', 'INDEX', 'INDIE', 'INNER',
  'INPUT', 'IRONY', 'ISSUE', 'IVORY', 'JELLY', 'JEWEL', 'JOINT', 'JOKER',
  'JUDGE', 'JUICE', 'JUICY', 'JUMBO', 'JUICE', 'KEEPS', 'KNIFE', 'KNOCK',
  'KNOWN', 'LABEL', 'LABOR', 'LARGE', 'LASER', 'LATER', 'LATIN', 'LAUGH',
  'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEMON', 'LEVEL',
  'LEVER', 'LIGHT', 'LIMIT', 'LINEN', 'LIVER', 'LLAMA', 'LOBBY', 'LOCAL',
  'LODGE', 'LOGIC', 'LOOSE', 'LOTUS', 'LOVER', 'LOWER', 'LOYAL', 'LUCKY',
  'LUNAR', 'LUNCH', 'LYING', 'LYRIC', 'MAGIC', 'MAJOR', 'MAKER', 'MANOR',
  'MAPLE', 'MARCH', 'MATCH', 'MAYOR', 'MEANS', 'MEANT', 'MEDAL', 'MEDIA',
  'MELON', 'MERCY', 'MERGE', 'MERIT', 'MERRY', 'METAL', 'METER', 'MIDST',
  'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL',
  'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUDDY', 'MUSIC', 'NAKED',
  'NAVAL', 'NERVE', 'NEVER', 'NEWLY', 'NIGHT', 'NINTH', 'NOBLE', 'NOISE',
  'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN',
  'OLIVE', 'ONION', 'OPERA', 'ORBIT', 'ORDER', 'ORGAN', 'OTHER', 'OUGHT',
  'OUNCE', 'OUTER', 'OWNED', 'OWNER', 'OXIDE', 'OZONE', 'PAINT', 'PANEL',
  'PANIC', 'PAPER', 'PARTY', 'PASTA', 'PASTE', 'PATCH', 'PAUSE', 'PEACE',
  'PEACH', 'PEARL', 'PEDAL', 'PENNY', 'PERCH', 'PHASE', 'PHONE', 'PHOTO',
  'PIANO', 'PIECE', 'PILOT', 'PINCH', 'PITCH', 'PIZZA', 'PLACE', 'PLAIN',
  'PLANE', 'PLANT', 'PLATE', 'PLAZA', 'PLEAD', 'PLUCK', 'PLUMB', 'POINT',
  'POLAR', 'PORCH', 'POUCH', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE',
  'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROBE', 'PROOF', 'PROUD', 'PROVE',
  'PROXY', 'PULSE', 'PUNCH', 'PUPIL', 'PUPPY', 'PURSE', 'QUEEN', 'QUERY',
  'QUEST', 'QUEUE', 'QUICK', 'QUIET', 'QUILT', 'QUITE', 'QUOTA', 'QUOTE',
  'RADAR', 'RADIO', 'RAINY', 'RAISE', 'RALLY', 'RANCH', 'RANGE', 'RAPID',
  'RATIO', 'REACH', 'REACT', 'READY', 'REALM', 'REBEL', 'REFER', 'REIGN',
  'RELAX', 'RELAY', 'REPLY', 'RESET', 'RIDER', 'RIDGE', 'RIFLE', 'RIGHT',
  'RIGID', 'RISKY', 'RIVAL', 'RIVER', 'ROAST', 'ROBOT', 'ROCKY', 'ROGUE',
  'ROMAN', 'ROOFTOP', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RUGBY', 'RUINS',
  'RULER', 'RURAL', 'SADLY', 'SAINT', 'SALAD', 'SALON', 'SANDY', 'SAUCE',
  'SAVED', 'SCALE', 'SCARE', 'SCARF', 'SCARY', 'SCENE', 'SCENT', 'SCOPE',
  'SCORE', 'SCOUT', 'SCRAP', 'SCREW', 'SEIZE', 'SENSE', 'SERVE', 'SETUP',
  'SEVEN', 'SHADE', 'SHAFT', 'SHAKE', 'SHALL', 'SHAME', 'SHAPE', 'SHARE',
  'SHARK', 'SHARP', 'SHAVE', 'SHEEP', 'SHEER', 'SHEET', 'SHELF', 'SHELL',
  'SHIFT', 'SHINE', 'SHINY', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORE', 'SHORT',
  'SHOUT', 'SHOWN', 'SHRUB', 'SIGHT', 'SIGMA', 'SILLY', 'SINCE', 'SIXTH',
  'SIXTY', 'SIZED', 'SKATE', 'SKILL', 'SKIRT', 'SKULL', 'SLAVE', 'SLEEP',
  'SLICE', 'SLIDE', 'SLOPE', 'SMALL', 'SMART', 'SMELL', 'SMILE', 'SMOKE',
  'SNAKE', 'SNEAK', 'SOLAR', 'SOLID', 'SOLVE', 'SONAR', 'SORRY', 'SOUND',
  'SOUTH', 'SPACE', 'SPARE', 'SPARK', 'SPAWN', 'SPEAK', 'SPEAR', 'SPEED',
  'SPELL', 'SPEND', 'SPENT', 'SPICE', 'SPICY', 'SPILL', 'SPINE', 'SPLIT',
  'SPOKE', 'SPOON', 'SPORT', 'SPRAY', 'SQUAD', 'STACK', 'STAFF', 'STAGE',
  'STAIN', 'STAIR', 'STAKE', 'STALL', 'STAMP', 'STAND', 'STARK', 'START',
  'STATE', 'STEAK', 'STEAL', 'STEAM', 'STEEL', 'STEEP', 'STEER', 'STERN',
  'STICK', 'STIFF', 'STILL', 'STOCK', 'STOMP', 'STONE', 'STOOD', 'STOOL',
  'STORE', 'STORM', 'STORY', 'STOVE', 'STRAP', 'STRAW', 'STRAY', 'STRIP',
  'STUCK', 'STUDY', 'STUFF', 'STUMP', 'STYLE', 'SUGAR', 'SUITE', 'SUNNY',
  'SUPER', 'SURGE', 'SWAMP', 'SWEAR', 'SWEAT', 'SWEEP', 'SWEET', 'SWEPT',
  'SWIFT', 'SWING', 'SWISS', 'SWORD', 'SWORE', 'SWORN', 'TABLE', 'TAKEN',
  'TASTE', 'TASTY', 'TAXES', 'TEACH', 'TEETH', 'TEMPO', 'TERMS', 'THANK',
  'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THIEF', 'THIGH',
  'THING', 'THINK', 'THIRD', 'THORN', 'THOSE', 'THREE', 'THREW', 'THROW',
  'THUMB', 'TIGER', 'TIGHT', 'TIMER', 'TIRED', 'TITLE', 'TODAY', 'TOKEN',
  'TOOTH', 'TOPIC', 'TORCH', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWEL', 'TOWER',
  'TOXIC', 'TRACE', 'TRACK', 'TRADE', 'TRAIL', 'TRAIN', 'TRAIT', 'TRASH',
  'TREAD', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TROOP',
  'TRUCK', 'TRULY', 'TRUMP', 'TRUNK', 'TRUST', 'TRUTH', 'TULIP', 'TUMOR',
  'TUNED', 'TWICE', 'TWIST', 'TYPED', 'ULTRA', 'UNCLE', 'UNDER', 'UNION',
  'UNITE', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'URGED', 'USAGE',
  'USUAL', 'VAGUE', 'VALID', 'VALUE', 'VALVE', 'VAPOR', 'VAULT', 'VENUE',
  'VERSE', 'VIDEO', 'VILLA', 'VIRAL', 'VIRUS', 'VISIT', 'VISOR', 'VITAL',
  'VIVID', 'VOCAL', 'VOGUE', 'VOICE', 'VOTER', 'WAIST', 'WATCH', 'WATER',
  'WEARY', 'WEIGH', 'WEIRD', 'WHALE', 'WHEAT', 'WHEEL', 'WHERE', 'WHICH',
  'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WIDEN', 'WIDER', 'WIDTH', 'WITCH',
  'WOMAN', 'WORLD', 'WORMS', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD',
  'WOUND', 'WRIST', 'WRITE', 'WRONG', 'WROTE', 'YACHT', 'YIELD', 'YOUNG',
  'YOUTH', 'ZEBRA', 'ZONES'
]

// Common 6-letter words
const COMMON_6_LETTER_WORDS = [
  'ABSORB', 'ACCEPT', 'ACCESS', 'ACCORD', 'ACROSS', 'ACTION', 'ACTIVE',
  'ACTUAL', 'ADVICE', 'ADVISE', 'AFFAIR', 'AFFECT', 'AFFORD', 'AFRAID',
  'AGENCY', 'AGENDA', 'ALMOST', 'ALWAYS', 'AMOUNT', 'ANIMAL', 'ANNUAL',
  'ANSWER', 'ANYONE', 'APPEAL', 'APPEAR', 'AROUND', 'ARRIVE', 'ARTIST',
  'ASPECT', 'ASSERT', 'ASSESS', 'ASSIGN', 'ASSIST', 'ASSUME', 'ATTACK',
  'ATTEND', 'AUGUST', 'AUTHOR', 'AUTUMN', 'AVENUE', 'BACKED', 'BACKUP',
  'BANANA', 'BARELY', 'BASKET', 'BATTLE', 'BEAUTY', 'BECAME', 'BECOME',
  'BEFORE', 'BEHALF', 'BEHIND', 'BELIEF', 'BELONG', 'BESIDE', 'BETTER',
  'BEYOND', 'BIGGER', 'BITTER', 'BLANKET', 'BORDER', 'BORROW', 'BOTTLE',
  'BOTTOM', 'BOUGHT', 'BOUNCE', 'BRANCH', 'BREACH', 'BREATH', 'BREEZE',
  'BRIDGE', 'BRIGHT', 'BROKEN', 'BRONZE', 'BROWSE', 'BRUTAL', 'BUCKET',
  'BUDGET', 'BUFFER', 'BULLET', 'BUNDLE', 'BURDEN', 'BURIED', 'BUTTER',
  'BUTTON', 'BUYING', 'CALLED', 'CAMERA', 'CAMPUS', 'CANCEL', 'CANDLE',
  'CANNOT', 'CANVAS', 'CARBON', 'CAREER', 'CARPET', 'CASUAL', 'CAUGHT',
  'CENTER', 'CENTRE', 'CHANCE', 'CHANGE', 'CHARGE', 'CHEESE', 'CHOICE',
  'CHOOSE', 'CHOSEN', 'CHURCH', 'CIRCLE', 'CIRCUS', 'CLAIMS', 'CLIENT',
  'CLIMATE', 'CLINIC', 'CLOSED', 'CLOSER', 'CLOSET', 'CLOUDS', 'COFFEE',
  'COLLAR', 'COLUMN', 'COMBAT', 'COMEDY', 'COMING', 'COMMIT', 'COMMON',
  'COMPLY', 'COPPER', 'CORNER', 'COSMIC', 'COSTLY', 'COTTON', 'COUNTY',
  'COUPLE', 'COURSE', 'COUSIN', 'CREATE', 'CREDIT', 'CRISIS', 'CRUISE',
  'CUSTOM', 'DAMAGE', 'DANCER', 'DANGER', 'DEADLY', 'DEALER', 'DEBATE',
  'DECADE', 'DECENT', 'DECIDE', 'DEFEAT', 'DEFEND', 'DEFINE', 'DEGREE',
  'DELETE', 'DEMAND', 'DENTAL', 'DEPEND', 'DERIVE', 'DESERT', 'DESIGN',
  'DESIRE', 'DETAIL', 'DETECT', 'DEVICE', 'DIFFER', 'DIGEST', 'DINNER',
  'DIRECT', 'DIVINE', 'DOCTOR', 'DOLLAR', 'DOMAIN', 'DOUBLE', 'DOZENS',
  'DRAGON', 'DRIVEN', 'DRIVER', 'DURING', 'EASILY', 'EATING', 'EDITOR',
  'EFFECT', 'EFFORT', 'EIGHTH', 'EITHER', 'ELEVEN', 'EMERGE', 'EMPIRE',
  'EMPLOY', 'ENABLE', 'ENDING', 'ENDURE', 'ENGINE', 'ENOUGH', 'ENSURE',
  'ENTIRE', 'ENTITY', 'EQUITY', 'ESCAPE', 'ESTATE', 'ETHNIC', 'EVOLVE',
  'EXCEED', 'EXCEPT', 'EXCITE', 'EXCUSE', 'EXPAND', 'EXPECT', 'EXPERT',
  'EXPORT', 'EXPOSE', 'EXTEND', 'EXTENT', 'FABRIC', 'FACING', 'FACTOR',
  'FAILED', 'FAIRLY', 'FALLEN', 'FAMILY', 'FAMOUS', 'FARMER', 'FASTER',
  'FATHER', 'FAUCET', 'FAVOUR', 'FELLOW', 'FEMALE', 'FIERCE', 'FIGURE',
  'FILLED', 'FILTER', 'FINALE', 'FINALS', 'FINGER', 'FINISH', 'FISCAL',
  'FISHER', 'FLAVOR', 'FLIGHT', 'FLOWER', 'FLYING', 'FOLDER', 'FOLLOW',
  'FORCED', 'FORCES', 'FOREST', 'FORGET', 'FORGOT', 'FORMAT', 'FORMER',
  'FOSSIL', 'FOSTER', 'FOUGHT', 'FOURTH', 'FREEZE', 'FRENCH', 'FRIDAY',
  'FRIEND', 'FROZEN', 'FUNDED', 'FUTURE', 'GALAXY', 'GAMBLE', 'GAMING',
  'GARAGE', 'GARDEN', 'GATHER', 'GENDER', 'GENIUS', 'GENTLE', 'GENTLY',
  'GERMAN', 'GIFTED', 'GLOBAL', 'GOLDEN', 'GOTTEN', 'GOVERN', 'GRAPES',
  'GRAVEL', 'GREASE', 'GREEDY', 'GROUND', 'GROWTH', 'GUITAR', 'HAMMER',
  'HANDED', 'HANDLE', 'HAPPEN', 'HARDLY', 'HATRED', 'HAVING', 'HAZARD',
  'HEADED', 'HEADER', 'HEALTH', 'HEATED', 'HEATER', 'HEAVEN', 'HEBREW',
  'HEIGHT', 'HELPED', 'HELPER', 'HIDDEN', 'HIDING', 'HIGHER', 'HIGHLY',
  'HIKING', 'HOCKEY', 'HOLDER', 'HOLLOW', 'HONEST', 'HONORS', 'HOPING',
  'HORROR', 'HOSTED', 'HOTELS', 'HOURLY', 'HOUSES', 'HUMANS', 'HUMBLE',
  'HUNGRY', 'HUNTER', 'IGNORE', 'IMAGES', 'IMPACT', 'IMPORT', 'IMPOSE',
  'INCOME', 'INDEED', 'INDOOR', 'INFANT', 'INFORM', 'INJURY', 'INLAND',
  'INSECT', 'INSERT', 'INSIDE', 'INSIST', 'INTACT', 'INTAKE', 'INTEND',
  'INTENT', 'INVEST', 'INVITE', 'ISLAND', 'JACKET', 'JERSEY', 'JOINTS',
  'JUDGES', 'JUNGLE', 'JUNIOR', 'KERNEL', 'KICKED', 'KIDNEY', 'KILLED',
  'KILLER', 'KINDLY', 'KNIGHT', 'LADDER', 'LADIES', 'LANDED', 'LAPTOP',
  'LARGER', 'LATEST', 'LATTER', 'LAUNCH', 'LAWYER', 'LAYERS', 'LAYOUT',
  'LEADER', 'LEAGUE', 'LEAVES', 'LEGACY', 'LEGEND', 'LENGTH', 'LESSON',
  'LETTER', 'LEVELS', 'LIKELY', 'LIMITS', 'LINEAR', 'LINKED', 'LIQUID',
  'LISTEN', 'LITTLE', 'LIVELY', 'LIVING', 'LOADED', 'LOCATE', 'LOCKED',
  'LONELY', 'LONGER', 'LOSING', 'LOVELY', 'LOWEST', 'LUXURY', 'MAINLY',
  'MAKEUP', 'MAKING', 'MANAGE', 'MANNER', 'MANUAL', 'MARBLE', 'MARGIN',
  'MARINE', 'MARKED', 'MARKER', 'MARKET', 'MASTER', 'MATTER', 'MATURE',
  'MEDIAN', 'MEDIUM', 'MEMBER', 'MEMORY', 'MENTAL', 'MENTOR', 'MERELY',
  'MERGER', 'METHOD', 'MIDDLE', 'MIGHTY', 'MINING', 'MINUTE', 'MIRROR',
  'MISSED', 'MOBILE', 'MODERN', 'MODIFY', 'MODULE', 'MOMENT', 'MONDAY',
  'MONTHS', 'MOSTLY', 'MOTHER', 'MOTION', 'MOVING', 'MURDER', 'MUSCLE',
  'MUSEUM', 'MUTUAL', 'MYSELF', 'NAMELY', 'NARROW', 'NATION', 'NATIVE',
  'NATURE', 'NEARBY', 'NEARLY', 'NEEDED', 'NEPHEW', 'NEURAL', 'NEWEST',
  'NICELY', 'NIGHTS', 'NOBODY', 'NORMAL', 'NOTICE', 'NOTIFY', 'NOTION',
  'NOVELS', 'NUMBER', 'OBTAIN', 'OCCUPY', 'OCCURS', 'OFFICE', 'OLDEST',
  'ONLINE', 'OPENED', 'OPENER', 'OPENLY', 'OPPOSE', 'OPTION', 'ORANGE',
  'ORDERS', 'ORIGIN', 'OTHERS', 'OUTFIT', 'OUTLET', 'OUTPUT', 'OWNERS',
  'OXYGEN', 'PACKED', 'PALACE', 'PANELS', 'PAPERS', 'PARADE', 'PARENT',
  'PARTLY', 'PASSED', 'PASSES', 'PATENT', 'PATROL', 'PATRON', 'PAYING',
  'PEOPLE', 'PEPPER', 'PERIOD', 'PERMIT', 'PERSON', 'PHRASE', 'PICKED',
  'PICKUP', 'PIECES', 'PIGEON', 'PILLAR', 'PILOTS', 'PIRATE', 'PISTOL',
  'PLACED', 'PLACES', 'PLAINS', 'PLANES', 'PLANET', 'PLANTS', 'PLASMA',
  'PLATES', 'PLAYED', 'PLAYER', 'PLEASE', 'PLEDGE', 'PLENTY', 'POCKET',
  'POETRY', 'POINTS', 'POISON', 'POLICE', 'POLICY', 'POLISH', 'POLITE',
  'POORLY', 'PORTAL', 'POSTED', 'POSTER', 'POTATO', 'POUNDS', 'POWDER',
  'POWERS', 'PRAISE', 'PRAYER', 'PREFER', 'PRETTY', 'PRICED', 'PRICES',
  'PRIEST', 'PRINCE', 'PRINTS', 'PRISON', 'PROFIT', 'PROPER', 'PROVEN',
  'PUBLIC', 'PULLED', 'PUPPET', 'PURPLE', 'PURSUE', 'PUSHED', 'PUZZLE',
  'PYTHON', 'RABBIT', 'RACIAL', 'RACING', 'RADIUS', 'RAISED', 'RANDOM',
  'RANGES', 'RANKED', 'RARELY', 'RATHER', 'RATING', 'READER', 'REALLY',
  'REASON', 'REBEL', 'RECALL', 'RECENT', 'RECIPE', 'RECORD', 'REDUCE',
  'REFORM', 'REFUSE', 'REGARD', 'REGIME', 'REGION', 'REGRET', 'REJECT',
  'RELATE', 'RELIEF', 'REMAIN', 'REMARK', 'REMEDY', 'REMIND', 'REMOTE',
  'REMOVE', 'RENDER', 'RENTAL', 'REPAIR', 'REPEAT', 'REPLAY', 'REPORT',
  'RESCUE', 'RESIGN', 'RESIST', 'RESORT', 'RESULT', 'RETAIL', 'RETAIN',
  'RETIRE', 'RETURN', 'REVEAL', 'REVIEW', 'REVOLT', 'REWARD', 'RHYTHM',
  'RIBBON', 'RIDING', 'RISING', 'RITUAL', 'RIVERS', 'ROBUST', 'ROCKET',
  'ROLLED', 'ROLLER', 'ROMANO', 'ROTATE', 'ROTTEN', 'RUBBER', 'RULING',
  'RUNNER', 'RUNWAY', 'SACRED', 'SADDLE', 'SAFARI', 'SAFELY', 'SAFETY',
  'SAILOR', 'SAINTS', 'SALARY', 'SALMON', 'SALOON', 'SAMPLE', 'SAVING',
  'SAYING', 'SCALES', 'SCARED', 'SCENIC', 'SCHEME', 'SCHOOL', 'SCREEN',
  'SCRIPT', 'SCROLL', 'SEARCH', 'SEASON', 'SEATED', 'SECOND', 'SECRET',
  'SECTOR', 'SECURE', 'SEEING', 'SEEKER', 'SELECT', 'SELLER', 'SENATE',
  'SENDER', 'SENIOR', 'SENSOR', 'SERIES', 'SERVED', 'SERVER', 'SETTLE',
  'SEVERE', 'SEWING', 'SHADOW', 'SHAPED', 'SHAPES', 'SHARED', 'SHARES',
  'SHEETS', 'SHELLS', 'SHIELD', 'SHIRTS', 'SHORTS', 'SHOULD', 'SHOWED',
  'SHOWER', 'SHRINK', 'SIGNAL', 'SIGNED', 'SILENT', 'SILVER', 'SIMPLE',
  'SIMPLY', 'SINGER', 'SINGLE', 'SISTER', 'SKETCH', 'SKILLS', 'SLEEVE',
  'SLIGHT', 'SLOWER', 'SLOWLY', 'SMOOTH', 'SOCCER', 'SOCIAL', 'SOCKET',
  'SODIUM', 'SOFTER', 'SOLELY', 'SOLVED', 'SOUGHT', 'SOURCE', 'SPEECH',
  'SPHERE', 'SPIRIT', 'SPLASH', 'SPOKEN', 'SPORTS', 'SPOUSE', 'SPREAD',
  'SPRING', 'SPRINT', 'SQUARE', 'STABLE', 'STAGED', 'STAIRS', 'STANDS',
  'STARED', 'STARTS', 'STATES', 'STATUS', 'STAYED', 'STEADY', 'STEREO',
  'STICKY', 'STOCKS', 'STOLEN', 'STONES', 'STORED', 'STORES', 'STORMS',
  'STRAIN', 'STRAND', 'STREAM', 'STREET', 'STRESS', 'STRICT', 'STRIKE',
  'STRING', 'STRIPS', 'STROKE', 'STRONG', 'STRUCK', 'STUDIO', 'STUPID',
  'STYLED', 'SUBMIT', 'SUBTLE', 'SUBURB', 'SUDDEN', 'SUFFER', 'SUMMER',
  'SUMMIT', 'SUNDAY', 'SUNSET', 'SUPERB', 'SUPPLY', 'SURELY', 'SURVEY',
  'SWITCH', 'SYMBOL', 'SYSTEM', 'TABLES', 'TABLET', 'TACKLE', 'TAKING',
  'TALENT', 'TALKED', 'TALLER', 'TARGET', 'TAUGHT', 'TENDER', 'TENNIS',
  'TENURE', 'THANKS', 'THEIRS', 'THEORY', 'THINGS', 'THINKS', 'THIRTY',
  'THOUGH', 'THREAT', 'THRILL', 'THRONE', 'THROWN', 'THROWS', 'THRUST',
  'TICKET', 'TIMBER', 'TIMING', 'TISSUE', 'TITLES', 'TONGUE', 'TOPICS',
  'TOWARD', 'TOWERS', 'TRACED', 'TRACKS', 'TRADER', 'TRADES', 'TRAGIC',
  'TRAILS', 'TRAINS', 'TRAVEL', 'TREATS', 'TREATY', 'TRENDS', 'TRIALS',
  'TRIBAL', 'TRIBES', 'TRICKS', 'TRIPLE', 'TROOPS', 'TROPHY', 'TRYING',
  'TUNNEL', 'TURKEY', 'TURNED', 'TURTLE', 'TWELVE', 'TWENTY', 'TYPING',
  'UNABLE', 'UNFAIR', 'UNIONS', 'UNIQUE', 'UNITED', 'UNLESS', 'UNLIKE',
  'UNLOCK', 'UNSAFE', 'UNUSED', 'UPDATE', 'UPWARD', 'URGENT', 'USEFUL',
  'VACUUM', 'VALUES', 'VARIED', 'VARIES', 'VECTOR', 'VELVET', 'VENDOR',
  'VERBAL', 'VERIFY', 'VERSUS', 'VESSEL', 'VICTIM', 'VIDEOS', 'VIEWED',
  'VIEWER', 'VIOLET', 'VIRGIN', 'VIRTUE', 'VISION', 'VISITS', 'VISUAL',
  'VOICES', 'VOLUME', 'VOTERS', 'VOTING', 'VOYAGE', 'WAITED', 'WAITER',
  'WAKING', 'WALKED', 'WALKER', 'WALLET', 'WANTED', 'WARMTH', 'WARNED',
  'WASHED', 'WATERS', 'WEALTH', 'WEAPON', 'WEEKLY', 'WEIGHT', 'WHEELS',
  'WHILST', 'WHITES', 'WHOLLY', 'WICKED', 'WIDELY', 'WIDOW', 'WILDLY',
  'WINDOW', 'WINNER', 'WINTER', 'WISDOM', 'WISHED', 'WISHES', 'WITHIN',
  'WIZARD', 'WOLVES', 'WONDER', 'WOODEN', 'WORKER', 'WORLDS', 'WORMS',
  'WORRIES', 'WORTHY', 'WOUNDS', 'WRITER', 'WRITES', 'YELLOW', 'YIELDS',
  'YOUTHS', 'ZENITH', 'ZOMBIE', 'ZONING'
]

function loadWordList(filename) {
  const filepath = path.join(__dirname, '../src/lib/dictionary', filename)
  return new Set(JSON.parse(fs.readFileSync(filepath, 'utf8')))
}

// Load current word lists
const fiveLetterWords = loadWordList('five-letter.json')
const sixLetterWords = loadWordList('six-letter.json')

console.log('MISSING COMMON WORDS ANALYSIS')
console.log('='.repeat(60))

// Find missing 5-letter words
const missing5 = COMMON_5_LETTER_WORDS.filter(w =>
  w.length === 5 && !fiveLetterWords.has(w)
)
console.log(`\n## MISSING 5-LETTER WORDS (${missing5.length})`)
console.log('-'.repeat(40))

// Group by first letter
const grouped5 = {}
for (const word of missing5) {
  const letter = word[0]
  if (!grouped5[letter]) grouped5[letter] = []
  grouped5[letter].push(word)
}

for (const letter of Object.keys(grouped5).sort()) {
  console.log(`${letter}: ${grouped5[letter].join(', ')}`)
}

// Find missing 6-letter words
const missing6 = COMMON_6_LETTER_WORDS.filter(w =>
  w.length === 6 && !sixLetterWords.has(w)
)
console.log(`\n## MISSING 6-LETTER WORDS (${missing6.length})`)
console.log('-'.repeat(40))

// Group by first letter
const grouped6 = {}
for (const word of missing6) {
  const letter = word[0]
  if (!grouped6[letter]) grouped6[letter] = []
  grouped6[letter].push(word)
}

for (const letter of Object.keys(grouped6).sort()) {
  console.log(`${letter}: ${grouped6[letter].join(', ')}`)
}

console.log('\n' + '='.repeat(60))
console.log('SUMMARY')
console.log('='.repeat(60))
console.log(`\nCurrent counts:`)
console.log(`  5-letter: ${fiveLetterWords.size}`)
console.log(`  6-letter: ${sixLetterWords.size}`)
console.log(`\nMissing common words:`)
console.log(`  5-letter: ${missing5.length}`)
console.log(`  6-letter: ${missing6.length}`)
console.log(`\nAfter adding missing words:`)
console.log(`  5-letter: ${fiveLetterWords.size + missing5.length}`)
console.log(`  6-letter: ${sixLetterWords.size + missing6.length}`)

// Option to add missing words
const args = process.argv.slice(2)
if (args.includes('--add')) {
  console.log('\nAdding missing words...')

  const fivePath = path.join(__dirname, '../src/lib/dictionary/five-letter.json')
  const sixPath = path.join(__dirname, '../src/lib/dictionary/six-letter.json')

  const newFive = [...fiveLetterWords, ...missing5].sort()
  const newSix = [...sixLetterWords, ...missing6].sort()

  fs.writeFileSync(fivePath, JSON.stringify(newFive, null, 2))
  fs.writeFileSync(sixPath, JSON.stringify(newSix, null, 2))

  console.log(`  Updated five-letter.json: ${fiveLetterWords.size} -> ${newFive.length}`)
  console.log(`  Updated six-letter.json: ${sixLetterWords.size} -> ${newSix.length}`)
  console.log('\nDone!')
} else {
  console.log('\nRun with --add to add these words to the dictionary')
}
