import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Common first names that shouldn't be in the dictionary
const COMMON_NAMES = new Set([
  // 3-letter names
  'AVA', 'ANN', 'BEN', 'BOB', 'DAN', 'DON', 'EVE', 'GUS', 'GUY', 'HAL', 'IAN',
  'JAN', 'JIM', 'JOE', 'JON', 'KAY', 'KEN', 'KIM', 'LEE', 'LEN', 'LOU', 'MAX',
  'MEG', 'MEL', 'MIA', 'NAT', 'NED', 'PAM', 'PAT', 'RAY', 'REX', 'ROB', 'ROD',
  'RON', 'ROY', 'SAL', 'SAM', 'SUE', 'TED', 'TIM', 'TOM', 'VIC', 'ZOE',
  // 4-letter names
  'ALAN', 'ALEX', 'ANNA', 'ANNE', 'BETH', 'BILL', 'CARL', 'CHAD', 'DALE', 'DANA',
  'DAVE', 'DEAN', 'DICK', 'EARL', 'EMMA', 'ERIC', 'EVAN', 'FRED', 'GARY', 'GENE',
  'GLEN', 'GREG', 'HANK', 'JACK', 'JADE', 'JAKE', 'JANE', 'JEAN', 'JEFF', 'JILL',
  'JOAN', 'JOEL', 'JOHN', 'JOSH', 'JUDY', 'KATE', 'KENT', 'KIRK', 'KURT', 'KYLE',
  'LEON', 'LILY', 'LISA', 'LORI', 'LUKE', 'LYNN', 'MARC', 'MARK', 'MARY', 'MATT',
  'MIKE', 'MILO', 'NEIL', 'NICK', 'NINA', 'NOAH', 'NOEL', 'PAUL', 'PETE', 'PHIL',
  'RICK', 'RITA', 'ROSS', 'RUBY', 'RUTH', 'RYAN', 'SARA', 'SEAN', 'SETH', 'STAN',
  'TARA', 'TONY', 'TROY', 'VERA', 'WADE', 'WALT', 'WILL', 'ZACH', 'ZARA',
  // 5-letter names
  'ALICE', 'AMBER', 'BRIAN', 'BRUCE', 'CAROL', 'CHRIS', 'CINDY', 'CLAIRE', 'CLARA',
  'CRAIG', 'DAVID', 'DIANE', 'DONNA', 'ELENA', 'ELLEN', 'EMILY', 'FRANK', 'GRACE',
  'GRANT', 'HARRY', 'HAZEL', 'HELEN', 'HENRY', 'IRENE', 'JAMES', 'JANET', 'JASON',
  'JENNA', 'JENNY', 'JERRY', 'JESSE', 'JIMMY', 'JULIA', 'JULIE', 'KAREN', 'KATIE',
  'KEITH', 'KELLY', 'KEVIN', 'LANCE', 'LARRY', 'LAURA', 'LEWIS', 'LINDA', 'LLOYD',
  'LOUIS', 'MARIA', 'MARIE', 'MEGAN', 'MOLLY', 'NANCY', 'OSCAR', 'PAULA', 'PENNY',
  'PETER', 'RALPH', 'RANDY', 'ROGER', 'SARAH', 'SCOTT', 'SHANE', 'SHAWN', 'STACY',
  'STEVE', 'SUSAN', 'TANYA', 'TERRY', 'TIFFANY', 'TYLER', 'VICKY', 'WAYNE', 'WENDY',
  // 6-letter names
  'AMANDA', 'ANDREW', 'ANGELA', 'ARTHUR', 'ASHLEY', 'BRENDA', 'CARLOS', 'CHERYL',
  'CLAIRE', 'DANIEL', 'DENISE', 'DENNIS', 'DONALD', 'EDWARD', 'GEORGE', 'GLORIA',
  'HAROLD', 'HOWARD', 'JANICE', 'JEREMY', 'JOHNNY', 'JOSEPH', 'JOSHUA', 'JUSTIN',
  'LAUREN', 'LESLIE', 'MARTHA', 'MARTIN', 'MELVIN', 'MONICA', 'NATHAN', 'NICOLE',
  'PAMELA', 'RACHEL', 'ROBERT', 'RONALD', 'SANDRA', 'SHARON', 'SHEILA', 'STEVEN',
  'STUART', 'TERESA', 'THOMAS', 'TRAVIS', 'VICTOR', 'WALTER', 'WARREN', 'WILLIAM',
])

// Words that are likely not real English words (abbreviations, slang, etc.)
const SUSPICIOUS_PATTERNS = [
  // All consonants (likely abbreviation)
  /^[BCDFGHJKLMNPQRSTVWXYZ]+$/,
]

// Known obscure/technical words that most players won't recognize
const OBSCURE_MARKERS = new Set([
  // Very obscure 3-letter words
  'AAH', 'AIT', 'ALA', 'ALT', 'AMP', 'ANI', 'ARF', 'ASP', 'AWK', 'BAO', 'BAP',
  'BRR', 'CAY', 'CHI', 'COL', 'DAL', 'DAP', 'DIB', 'DIS', 'DOH', 'EEW', 'EMO',
  'ENG', 'EON', 'ERM', 'ETH', 'EVO', 'EXO', 'FAM', 'FAP', 'FAV', 'FEM', 'FOB',
  'FON', 'FOO', 'GAW', 'GEY', 'GIB', 'GIO', 'GIT', 'GOV', 'GRR', 'GUV', 'HIC',
  'HOB', 'HOO', 'HYP', 'ICK', 'ILK', 'INT', 'IOS', 'IRK', 'ISO', 'JAK', 'JAP',
  'KAI', 'KAK', 'KAM', 'KAS', 'KAT', 'KAW', 'KIP', 'KOA', 'KYE', 'KYU', 'LAT',
  'LEA', 'LEV', 'LEY', 'LOC', 'LOS', 'LOU', 'LUM', 'LUV', 'LYE', 'MAE', 'MAM',
  'MAW', 'MEM', 'MEW', 'MIB', 'MIG', 'MIL', 'MMM', 'MOE', 'MOG', 'MOI', 'MOT',
  'MUX', 'NAV', 'NIB', 'NOB', 'NOG', 'NOM', 'NTH', 'OAF', 'OBE', 'ORC', 'ORD',
  'OXO', 'OXY', 'PAC', 'PAH', 'PAX', 'PEW', 'PHO', 'PIA', 'PIX', 'POM', 'PRE',
  'PSI', 'PST', 'PYE', 'QIN', 'QUO', 'RAV', 'REC', 'REM', 'RES', 'RET', 'RHY',
  'ROO', 'RUE', 'RYE', 'SAG', 'SAN', 'SEC', 'SIB', 'SIC', 'SIM', 'SKA', 'SOD',
  'SOG', 'SOL', 'SOX', 'SUD', 'SUR', 'SYN', 'TAJ', 'TAM', 'TAO', 'TAT', 'TAY',
  'TEL', 'THO', 'THY', 'TIC', 'TIK', 'TIL', 'TIS', 'TIT', 'TOC', 'TOD', 'TOG',
  'TSK', 'TUM', 'TUN', 'TUP', 'TUT', 'TYE', 'UFO', 'UGH', 'ULE', 'UNI', 'VAC',
  'VAR', 'VEX', 'VIN', 'VIS', 'VOL', 'VOX', 'WAD', 'WAN', 'WAP', 'WOK', 'WOP',
  'WOT', 'WRY', 'WUS', 'WYN', 'XED', 'XIS', 'YAK', 'YAP', 'YAR', 'YAW', 'YEH',
  'YER', 'YIN', 'YIP', 'YOB', 'YUK', 'ZAG', 'ZED', 'ZZZ',
])

function analyzeWord(word) {
  const issues = []
  let obscurityScore = 0

  // Check if it's a name
  if (COMMON_NAMES.has(word)) {
    issues.push('PROPER_NOUN')
    obscurityScore += 5
  }

  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(word) && word.length <= 3) {
      issues.push('LIKELY_ABBREVIATION')
      obscurityScore += 3
    }
  }

  // Check known obscure words
  if (OBSCURE_MARKERS.has(word)) {
    issues.push('OBSCURE')
    obscurityScore += 4
  }

  // Heuristics for obscurity
  // Words with X, Z, Q, J tend to be less common
  const rareLetters = (word.match(/[XZQJ]/g) || []).length
  if (rareLetters > 0) {
    obscurityScore += rareLetters
  }

  // Words with double letters at the start
  if (/^(.)\1/.test(word)) {
    obscurityScore += 1
  }

  // Very short words with unusual consonant clusters
  if (word.length === 3 && /^[^AEIOU]{2}[^AEIOU]$/.test(word)) {
    obscurityScore += 2
  }

  return { word, issues, obscurityScore }
}

function loadWordList(filename) {
  const filepath = path.join(__dirname, '../src/lib/dictionary', filename)
  return JSON.parse(fs.readFileSync(filepath, 'utf8'))
}

// Main audit
console.log('='.repeat(60))
console.log('WORD LIST QUALITY AUDIT')
console.log('='.repeat(60))
console.log()

const lists = [
  { name: '3-letter', file: 'three-letter.json' },
  { name: '4-letter', file: 'four-letter.json' },
  { name: '5-letter', file: 'five-letter.json' },
  { name: '6-letter', file: 'six-letter.json' },
]

const allFlagged = []

for (const list of lists) {
  const words = loadWordList(list.file)
  console.log(`\n## ${list.name.toUpperCase()} WORDS (${words.length} total)`)
  console.log('-'.repeat(40))

  const flagged = []

  for (const word of words) {
    const analysis = analyzeWord(word)
    if (analysis.issues.length > 0 || analysis.obscurityScore >= 4) {
      flagged.push(analysis)
    }
  }

  // Sort by obscurity score (highest first)
  flagged.sort((a, b) => b.obscurityScore - a.obscurityScore)

  if (flagged.length === 0) {
    console.log('No issues found!')
  } else {
    console.log(`Found ${flagged.length} words to review:\n`)

    // Group by issue type
    const properNouns = flagged.filter(f => f.issues.includes('PROPER_NOUN'))
    const obscure = flagged.filter(f => f.issues.includes('OBSCURE') && !f.issues.includes('PROPER_NOUN'))
    const other = flagged.filter(f => !f.issues.includes('PROPER_NOUN') && !f.issues.includes('OBSCURE'))

    if (properNouns.length > 0) {
      console.log(`### PROPER NOUNS (${properNouns.length}) - RECOMMEND REMOVAL`)
      console.log(properNouns.map(f => f.word).join(', '))
      console.log()
    }

    if (obscure.length > 0) {
      console.log(`### OBSCURE WORDS (${obscure.length}) - REVIEW`)
      for (const f of obscure.slice(0, 30)) {
        console.log(`  ${f.word.padEnd(10)} (score: ${f.obscurityScore})`)
      }
      if (obscure.length > 30) {
        console.log(`  ... and ${obscure.length - 30} more`)
      }
      console.log()
    }

    if (other.length > 0) {
      console.log(`### OTHER (${other.length}) - LOW PRIORITY`)
      for (const f of other.slice(0, 20)) {
        console.log(`  ${f.word.padEnd(10)} (score: ${f.obscurityScore})`)
      }
      if (other.length > 20) {
        console.log(`  ... and ${other.length - 20} more`)
      }
    }
  }

  allFlagged.push(...flagged.map(f => ({ ...f, length: list.name })))
}

console.log('\n')
console.log('='.repeat(60))
console.log('SUMMARY')
console.log('='.repeat(60))

const properNounTotal = allFlagged.filter(f => f.issues.includes('PROPER_NOUN'))
console.log(`\nProper nouns to remove: ${properNounTotal.length}`)
console.log(properNounTotal.map(f => f.word).join(', '))

console.log('\nTop 20 most obscure words overall:')
allFlagged
  .sort((a, b) => b.obscurityScore - a.obscurityScore)
  .slice(0, 20)
  .forEach((f, i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. ${f.word.padEnd(10)} (${f.length}, score: ${f.obscurityScore}, issues: ${f.issues.join(', ') || 'high score'})`)
  })
