/**
 * One-time migration script to seed Vercel KV with legacy high scores
 * from the old Scramble site.
 *
 * Run with: npx tsx scripts/migrate-legacy-scores.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { kv } from '@vercel/kv'

// Scrabble letter points
const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
}

interface WordWithScore {
  word: string
  score: number
}

interface StoredScore {
  id: string
  name: string
  score: number
  level: number
  wordsFound: number
  longestWord: string
  bestChain: number
  date: string
  mode: 'classic'
  wordHistory: WordWithScore[]
}

// Calculate word score as sum of letter values
function calculateWordScore(word: string): number {
  return word
    .toUpperCase()
    .split('')
    .reduce((sum, letter) => sum + (LETTER_POINTS[letter] || 0), 0)
}

// Find longest word in array
function findLongestWord(words: string[]): string {
  return words.reduce((longest, word) =>
    word.length > longest.length ? word : longest
  , '')
}

// Legacy data from old Scramble site
const legacyEntries = [
  {
    name: 'Anto',
    score: 927,
    level: 14,
    date: '2024-12-25T23:45:03.169Z',
    words: ['WOO', 'ECO', 'HER', 'AXE', 'JAR', 'LEA', 'LEAF', 'YOU', 'BEG', 'MIL', 'ONE', 'AVI', 'LIT', 'TIL', 'IMP', 'ART', 'FIG', 'NTH', 'JET', 'REG', 'ORE', 'NINE', 'PAN', 'NAP', 'LOU', 'CAN', 'ION', 'HON', 'FAR', 'SEE', 'FAZE', 'GEO', 'BOO', 'GIB', 'BIG', 'EMU', 'TEX', 'LAX', 'PIC', 'SEC', 'HAVE', 'AVE', 'FEE', 'MON', 'NOM', 'PAR', 'RAP', 'OYES', 'YES', 'KEN', 'SAX', 'HOE', 'HAG', 'JUG', 'HUB', 'BUM', 'AGHA', 'RIG', 'YET', 'WAD', 'TIE', 'REC', 'FOX', 'SOG', 'FLU', 'ALL', 'SEA', 'FON', 'UFO', 'THE', 'PSI', 'VIN', 'ETH', 'EDS', 'LIP', 'PILE', 'RAG', 'HAM', 'SOL', 'LOS', 'ZOO', 'NIT', 'TIN', 'RUB', 'GEE', 'AGEE', 'AGE', 'MET', 'GIO', 'FAG', 'BET', 'SAT', 'QUO', 'MOT', 'TOM', 'TIT', 'IRE', 'ERIC', 'ZINE', 'TEE', 'FEET', 'VIA', 'ARC', 'DIM', 'MID', 'WRY', 'GET', 'NAIL', 'LIB', 'END', 'SHH', 'LIE', 'LADS', 'DAL', 'LAD', 'DALE', 'ALE', 'CUZ', 'RES', 'ARES', 'ERA', 'ARE', 'VIS', 'NEAR', 'EAR', 'PHO', 'NIB', 'BIN', 'GUN', 'AID', 'KAI', 'ASH', 'GEN', 'GENE', 'TEA', 'FIN', 'ZZZ', 'RAD', 'ZIG', 'EST', 'EGO', 'ROB', 'MAT', 'TAM', 'VINE', 'TOO', 'WON', 'NOW'],
  },
  {
    name: 'Tommy',
    score: 884,
    level: 15,
    date: '2024-12-24T23:39:00.500Z',
    words: ['TAY', 'SIC', 'DIE', 'TON', 'NOT', 'JOG', 'SUR', 'LET', 'TEL', 'ROO', 'TSAR', 'DIS', 'SEA', 'SEAS', 'SET', 'ECO', 'RAN', 'LOO', 'FOOL', 'OOF', 'FOO', 'RUDE', 'CHA', 'HAN', 'NAH', 'DUO', 'GOD', 'DOG', 'SAT', 'LIP', 'WAN', 'BET', 'RAD', 'ZIT', 'ZOO', 'KAS', 'SOY', 'MOD', 'DOM', 'EGO', 'LUV', 'ION', 'TEA', 'TEN', 'NET', 'LIE', 'GUS', 'DIN', 'YEN', 'TIE', 'SIS', 'USE', 'CAR', 'SCAR', 'WOT', 'TOW', 'AID', 'OUR', 'CAN', 'RUE', 'FOR', 'REV', 'HOP', 'OIL', 'LEY', 'EEL', 'LEE', 'NAV', 'VAN', 'AVI', 'QIN', 'HER', 'ZAP', 'EST', 'NEST', 'GEN', 'NIL', 'EEK', 'SOB', 'MAE', 'FAIL', 'ARE', 'ERA', 'LAT', 'RET', 'ASH', 'OUT', 'MET', 'FISH', 'QUO', 'OAR', 'ODE', 'PAH', 'ORD', 'SOD', 'FAN', 'FANS', 'RID', 'ROM', 'LOU', 'SEE', 'TAO', 'OAT', 'BAM', 'NIP', 'PIN', 'AFT', 'POS', 'PIA', 'EARN', 'EAR', 'SUN', 'BOT', 'OOH', 'HOO', 'ACE', 'RUM', 'EVE', 'URN', 'PILE', 'FAP', 'JOB', 'OWN', 'BOZO', 'BRR', 'GEO', 'AGE', 'CAGE', 'GOO', 'SEPT', 'FIN', 'HUN', 'HERE', 'DIG', 'TAD', 'LOG', 'GOLF', 'FLOG', 'TOE', 'RIP', 'ICY', 'MOO', 'IRK', 'HID', 'WIN', 'HUE', 'VIA', 'AIR', 'YIN', 'ONE', 'CUT', 'NOEL', 'EON', 'BAN', 'NAB', 'MIC', 'AVE'],
  },
  {
    name: 'Anto',
    score: 869,
    level: 15,
    date: '2025-01-08T15:54:07.617Z',
    words: ['TUM', 'MUT', 'WOT', 'TOW', 'OBE', 'ETUDE', 'KEY', 'SIC', 'PAT', 'TAP', 'VET', 'SEE', 'GUS', 'HOT', 'BOW', 'TED', 'ICY', 'NEW', 'WAR', 'RAW', 'GIB', 'BIG', 'PIX', 'HID', 'DEE', 'ALEF', 'ALE', 'ART', 'NAV', 'VAN', 'MAT', 'TAM', 'DAN', 'AIR', 'TOG', 'GOT', 'USE', 'RIP', 'RIPE', 'PEN', 'VIS', 'GOV', 'ANES', 'MEL', 'AID', 'RARE', 'ARE', 'ERA', 'ION', 'VEX', 'AREA', 'FOR', 'SIN', 'GEE', 'DIE', 'LEE', 'EEL', 'LEER', 'REEL', 'UGH', 'FIN', 'FOG', 'WEE', 'EEW', 'DELL', 'LED', 'DEL', 'AWE', 'IRE', 'LEA', 'ANN', 'TIE', 'JIG', 'FIT', 'OLD', 'WENT', 'INT', 'OWL', 'WON', 'NOW', 'LIE', 'MOO', 'JAB', 'HON', 'ZIT', 'TAO', 'OAT', 'FIB', 'REN', 'SYN', 'SLUG', 'LUG', 'HIT', 'SOY', 'SAD', 'BEN', 'ICK', 'MIC', 'ROD', 'RAT', 'TAR', 'CAT', 'AFT', 'WIN', 'TAY', 'LIEU', 'LINO', 'NIL', 'HUM', 'EYE', 'TAD', 'MOG', 'ORE', 'TOE', 'RAID', 'DUE', 'DUES', 'QUO', 'KIT', 'TIK', 'AVI', 'DOM', 'MOD', 'PET', 'SOD', 'GIN', 'HOW', 'TEAS', 'TEA', 'ACT', 'EXIT', 'TUN', 'NUT', 'MOON', 'JEAN', 'PUB', 'LYE', 'EON', 'HAT', 'ZED', 'MIKE'],
  },
  {
    name: 'Jinx',
    score: 863,
    level: 14,
    date: '2024-12-25T21:54:59.665Z',
    words: ['GIN', 'ROB', 'PIN', 'NIP', 'SIR', 'LOAD', 'TAR', 'RAT', 'GIO', 'ILL', 'EVO', 'ROVE', 'IRE', 'GOA', 'DAY', 'YAW', 'WAY', 'HER', 'WAN', 'TEE', 'PAX', 'GEN', 'YEN', 'TUN', 'NUT', 'ROO', 'VIN', 'UNI', 'RUN', 'REM', 'EDS', 'IRK', 'BIO', 'ZIT', 'DIN', 'COX', 'ONE', 'ION', 'FIT', 'LOT', 'NAG', 'ZEE', 'DAM', 'MAD', 'EMIR', 'RIME', 'RIM', 'VIA', 'ZIG', 'MAR', 'RAM', 'FLU', 'EXO', 'IOS', 'FILE', 'SIN', 'PUMP', 'ICE', 'GEY', 'GANG', 'ART', 'JAW', 'UFO', 'PEN', 'TIE', 'LEX', 'VEX', 'HERB', 'BAA', 'DIE', 'PET', 'REN', 'JIG', 'EGO', 'JOG', 'LIB', 'SAT', 'TEX', 'OLE', 'RAY', 'YAR', 'AYE', 'RID', 'LAT', 'ROT', 'LOO', 'URN', 'DOE', 'RET', 'VIS', 'REEF', 'FEE', 'TOE', 'ACME', 'VEG', 'ENG', 'CUT', 'BEE', 'BAO', 'ANN', 'FAD', 'AID', 'PAID', 'OURS', 'OUR', 'GAG', 'GAGA', 'PIA', 'ERA', 'ARE', 'FOX', 'GEO', 'LOS', 'SOL', 'LOST', 'WET', 'FAT', 'HUE', 'HORN', 'SAD', 'SOB', 'SOBS', 'RED', 'WOT', 'TOW', 'ZOO', 'LEE', 'EEL', 'LEEP', 'PEEL', 'PEE', 'CON', 'NIL', 'RAIL', 'LIAR', 'GEE', 'ULE', 'DEE', 'TAG', 'ALT', 'LAD', 'DAL', 'ETA', 'ATE', 'TIT', 'YET', 'YETI'],
  },
  {
    name: 'Anto',
    score: 859,
    level: 15,
    date: '2024-12-29T23:06:58.086Z',
    words: ['TEX', 'VAR', 'RAV', 'VARY', 'DAD', 'FED', 'VOTE', 'VAT', 'RIB', 'TAX', 'LID', 'EGO', 'CAFE', 'VILE', 'LEA', 'LEAD', 'ELF', 'ORE', 'KAS', 'SIC', 'CIG', 'NEW', 'ROAD', 'RAN', 'HER', 'JOG', 'SKI', 'ASK', 'ZEE', 'RID', 'ERR', 'ATE', 'ETA', 'TEL', 'LET', 'RET', 'IRE', 'JOT', 'BRUV', 'HANK', 'NAH', 'HAN', 'UPS', 'READ', 'PAM', 'MAP', 'PIX', 'YEP', 'VIS', 'ETH', 'PAT', 'TAP', 'ISO', 'TOO', 'URN', 'SIN', 'WIVE', 'SEA', 'PEE', 'HIT', 'NOT', 'TON', 'EMO', 'SOY', 'LAY', 'LAYS', 'COST', 'MAR', 'RAM', 'ULE', 'ADO', 'DOE', 'WUS', 'FIT', 'ALE', 'ZOO', 'EAR', 'LOU', 'PLED', 'LED', 'DEL', 'TYE', 'FIR', 'SUE', 'GAY', 'OOF', 'FOO', 'SEE', 'KIN', 'ARLE', 'NITE', 'TIN', 'NIT', 'TINE', 'LAS', 'LASS', 'ASS', 'AYE', 'JOY', 'SEND', 'END', 'BOD', 'SAW', 'WAS', 'NALA', 'ALAN', 'ALA', 'JAG', 'PEG', 'GIN', 'BON', 'NOB', 'TIL', 'LIT', 'ALIT', 'FEM', 'BUN', 'CUB', 'TEA', 'NIX', 'NAY', 'MAE', 'BOT', 'ODE', 'AIR', 'RUE', 'GAP', 'GEN', 'YEA', 'LUM', 'SLUM', 'SIP', 'PUN', 'WET', 'ADD', 'RUN', 'ALT', 'ARE', 'ERA', 'EWE', 'REC', 'FIN', 'CAN', 'CANT', 'ANT'],
  },
  {
    name: 'Anto',
    score: 850,
    level: 15,
    date: '2024-12-31T11:18:29.782Z',
    words: ['SOB', 'TAD', 'YES', 'DIS', 'WIG', 'DIG', 'ION', 'NIL', 'LINO', 'RAN', 'EYE', 'EYES', 'GOT', 'TOG', 'HEN', 'NET', 'TEN', 'HID', 'BON', 'NOB', 'GEO', 'DIN', 'DINO', 'POS', 'EPOS', 'BAR', 'GIT', 'DOE', 'FOE', 'ZED', 'WOE', 'THE', 'EMO', 'LAB', 'EAR', 'NAY', 'FAD', 'HOE', 'THO', 'JAR', 'GUS', 'FIN', 'AVE', 'HAVE', 'REN', 'IRE', 'AIR', 'NON', 'VIS', 'WEE', 'EEW', 'RAID', 'AID', 'GEM', 'MEG', 'YIN', 'BOBA', 'BOB', 'OBE', 'OBEY', 'CHI', 'ALE', 'KEY', 'PEE', 'TEE', 'TAX', 'AXE', 'GEL', 'LEG', 'RED', 'COY', 'BAN', 'NAB', 'BANE', 'DEAR', 'GIO', 'AGIO', 'GAS', 'SAG', 'GOA', 'NIX', 'ADD', 'EST', 'LID', 'NOM', 'MON', 'FOO', 'OOF', 'YAK', 'KAY', 'UFO', 'LAY', 'NOD', 'DON', 'AVI', 'VAC', 'NAV', 'VAN', 'ARM', 'NINE', 'AGO', 'LOU', 'ORE', 'YEA', 'YEAH', 'OLE', 'WOK', 'EAT', 'HUT', 'NEW', 'SAX', 'RES', 'SIR', 'LUG', 'YOB', 'BOY', 'HOP', 'TEA', 'ORD', 'ANT', 'LOB', 'LARK', 'ARK', 'HOO', 'OOH', 'BOO', 'RAD', 'DUO', 'RUE', 'JAB', 'ULE', 'LET', 'TEL', 'JAY', 'JOB', 'BAD', 'DAB', 'SEE', 'ZINE', 'TOE', 'AND', 'BEE'],
  },
  {
    name: 'Tommy',
    score: 821,
    level: 13,
    date: '2024-12-26T03:35:28.743Z',
    words: ['SOL', 'LOS', 'NIL', 'RAN', 'WIG', 'TAN', 'HEH', 'HAN', 'NAH', 'EVE', 'ALP', 'SIP', 'TEE', 'TEA', 'MAC', 'CAM', 'ZIG', 'QUO', 'RHEA', 'MALI', 'END', 'SEND', 'NESS', 'SIX', 'XIS', 'EELS', 'LEE', 'EEL', 'SOD', 'JOG', 'DUG', 'CAD', 'ILK', 'EYE', 'KOA', 'SOS', 'UFO', 'TOE', 'TIE', 'DEB', 'BED', 'DOE', 'WOE', 'RET', 'FOE', 'PIA', 'AXE', 'RID', 'LIE', 'KAW', 'PEG', 'WAG', 'GAW', 'COY', 'MAN', 'NAM', 'VOW', 'REG', 'WIT', 'NIT', 'TIN', 'HIS', 'WOW', 'FAT', 'BOY', 'YOB', 'BAT', 'TAB', 'REX', 'AGE', 'HUE', 'AWE', 'BAP', 'EAT', 'TEAT', 'AAH', 'OWIE', 'SKY', 'AID', 'USE', 'OAR', 'ADD', 'LAG', 'GAL', 'FUR', 'BOW', 'GOV', 'ALT', 'JELL', 'CUD', 'SET', 'ATE', 'ETA', 'ANT', 'LINE', 'HID', 'GOA', 'DUAL', 'LAUD', 'SIC', 'FIR', 'RIFT', 'JET', 'NED', 'DEN', 'GIO', 'OAK', 'TUN', 'NUT', 'RUT', 'LOC', 'COL', 'LOCO', 'DAN', 'TIL', 'LIT', 'ALIT', 'BIN', 'NIB', 'LOB', 'PIE', 'RYE', 'RAY', 'YAR', 'VIS', 'AHA', 'PAR', 'RAP', 'FAM', 'RUE', 'JOT', 'EMU', 'TAR', 'RAT', 'FEE'],
  },
  {
    name: 'Anto',
    score: 815,
    level: 14,
    date: '2024-12-25T11:28:09.789Z',
    words: ['LOG', 'ARE', 'ERA', 'REN', 'TEN', 'NET', 'ICY', 'VERA', 'REV', 'EVER', 'EVE', 'LENS', 'BED', 'DEB', 'RID', 'ACE', 'RAN', 'NOG', 'NIP', 'PIN', 'EAT', 'BEAT', 'DOE', 'WHY', 'SET', 'INTO', 'INT', 'ISO', 'ION', 'ONE', 'WILE', 'WILES', 'ROLE', 'OLE', 'VID', 'DIV', 'TAD', 'RAV', 'VAR', 'LOFT', 'ORE', 'ORC', 'RET', 'ETH', 'LET', 'TEL', 'BOKO', 'BEE', 'KOA', 'GEY', 'GEO', 'EEK', 'TOD', 'DOT', 'SIR', 'SAP', 'WUS', 'IRE', 'RES', 'RAW', 'WAR', 'AWE', 'OUR', 'FLIP', 'LIP', 'ERR', 'PEN', 'EEL', 'LEE', 'GLEE', 'MID', 'DIM', 'BAIT', 'SIS', 'WAG', 'GAW', 'VOID', 'MOW', 'TWO', 'END', 'SIT', 'TIS', 'GUN', 'WIRY', 'FUR', 'AVE', 'RUT', 'GEN', 'FED', 'HUE', 'OBE', 'COB', 'SIN', 'TAO', 'OAT', 'NOUN', 'AAH', 'SEA', 'LID', 'ETUI', 'LOT', 'NOD', 'DON', 'DIS', 'GIB', 'BIG', 'WAP', 'PAW', 'CUP', 'DUO', 'MIB', 'NOT', 'TON', 'HIT', 'LAS', 'PIE', 'QUAD', 'ATE', 'ETA', 'TEA', 'TOE', 'TUM', 'MUT', 'LAT', 'COW', 'NEW', 'NOR', 'TAJ', 'DOW', 'RUE', 'MOI', 'OXO', 'RIP', 'RAG', 'CAW', 'ONES', 'FAR', 'SUR', 'EAR', 'FIG', 'LOUD', 'LOU', 'ANY', 'DEP', 'RIOT', 'ART'],
  },
  {
    name: 'Anto',
    score: 790,
    level: 14,
    date: '2024-12-25T19:06:09.996Z',
    words: ['OVA', 'BON', 'NOB', 'SIT', 'TIS', 'WIT', 'AAH', 'RAY', 'YAR', 'TEX', 'VIVE', 'RIB', 'ARM', 'ROBS', 'ROB', 'BORA', 'CIG', 'JUN', 'SEX', 'HEY', 'YEH', 'ART', 'ARE', 'ERA', 'BIT', 'RAN', 'GUY', 'BEAK', 'SIR', 'RISE', 'SAY', 'HAM', 'DIE', 'GET', 'SAD', 'RES', 'AVE', 'VEIL', 'LIE', 'NUN', 'ODE', 'MAD', 'DAM', 'THUS', 'BRA', 'BRAY', 'CAN', 'VOTE', 'TEA', 'LIB', 'LIES', 'SCALE', 'ALE', 'LED', 'DEL', 'BUG', 'WIPE', 'PET', 'ALES', 'SEE', 'JET', 'RET', 'CLAN', 'CON', 'CIVIL', 'WIN', 'TON', 'NOT', 'PAN', 'NAP', 'TAY', 'MEH', 'CHEM', 'PAY', 'YAP', 'PEA', 'HIC', 'ELF', 'LOU', 'ACE', 'BAM', 'LOB', 'ISLE', 'FIX', 'ION', 'DEV', 'AYE', 'NIL', 'ORC', 'QUO', 'NOW', 'WON', 'LIT', 'TIL', 'GRR', 'GIG', 'MOD', 'DOM', 'HALE', 'ARES', 'NOD', 'DON', 'SET', 'SETS', 'OIL', 'JOE', 'BIO', 'VAT', 'GIT', 'TOC', 'COT', 'MIL', 'AIM', 'DOE', 'HALT', 'ALT', 'LEV', 'AIR', 'BOD', 'IOS', 'LYE', 'EAR', 'ORE', 'DUE', 'ERM', 'PRO', 'BET', 'NOG'],
  },
  {
    name: 'Anto',
    score: 737,
    level: 13,
    date: '2024-12-25T02:43:32.824Z',
    words: ['ARE', 'ERA', 'COO', 'EGG', 'GEE', 'APT', 'PAN', 'NAP', 'FAY', 'REX', 'ALL', 'UNI', 'NAIL', 'ATE', 'ETA', 'BAO', 'BEE', 'YER', 'TAY', 'OPS', 'DAY', 'ZEE', 'FEE', 'TOO', 'SOON', 'NIB', 'BIN', 'ULE', 'LIE', 'TAD', 'GIT', 'REV', 'ION', 'EST', 'NIL', 'REC', 'AGO', 'NAG', 'NIX', 'HOOT', 'OOH', 'HOO', 'SUE', 'FAN', 'EMO', 'HUE', 'SHH', 'ANT', 'CIG', 'DIE', 'CAM', 'MAC', 'AXE', 'RIB', 'TIN', 'NIT', 'TINS', 'THO', 'RET', 'TEE', 'TIS', 'SIT', 'DOC', 'COD', 'LAT', 'OAT', 'TAO', 'QIN', 'FOR', 'AIR', 'END', 'VIN', 'OUT', 'URN', 'TIP', 'PIT', 'RED', 'GEL', 'LEG', 'DEN', 'NED', 'OUR', 'TOD', 'DOT', 'VAT', 'OOP', 'POO', 'OVA', 'GOV', 'HIS', 'RIM', 'ZAG', 'RUE', 'RUES', 'FAB', 'ROT', 'SAN', 'WOE', 'RAD', 'ZIG', 'MAD', 'DAM', 'MEH', 'EEK', 'OIL', 'GIO', 'NEW', 'TOW', 'WOT', 'PEE', 'LET', 'TEL', 'ALA', 'RAT', 'TAR', 'EAR', 'EEW', 'WEE', 'GUN', 'DUD', 'BAP', 'IMP', 'THE', 'REF', 'IOS', 'ERM', 'SEE', 'FIR', 'FIRS', 'TIC', 'LAB', 'HEX', 'SKA', 'LOB', 'TYRE'],
  },
]

async function migrate() {
  console.log('Starting legacy score migration...\n')

  for (let i = 0; i < legacyEntries.length; i++) {
    const entry = legacyEntries[i]
    const rank = i + 1

    // Build word history with calculated scores
    const wordHistory: WordWithScore[] = entry.words.map(word => ({
      word,
      score: calculateWordScore(word),
    }))

    // Find longest word
    const longestWord = findLongestWord(entry.words)

    // Create the stored score object
    const storedScore: StoredScore = {
      id: `legacy_${rank}`,
      name: entry.name,
      score: entry.score,
      level: entry.level,
      wordsFound: entry.words.length,
      longestWord,
      bestChain: 1,
      date: entry.date,
      mode: 'classic',
      wordHistory,
    }

    console.log(`[${rank}] ${entry.name} - ${entry.score} pts (${entry.words.length} words, longest: ${longestWord})`)

    // Add to classic leaderboard sorted set
    await kv.zadd('scores:classic', {
      score: entry.score,
      member: JSON.stringify(storedScore),
    })

    // Add to global leaderboard sorted set
    await kv.zadd('scores:all', {
      score: entry.score,
      member: JSON.stringify(storedScore),
    })
  }

  console.log('\nMigration complete! 10 legacy scores added to Vercel KV.')
}

migrate().catch(console.error)
