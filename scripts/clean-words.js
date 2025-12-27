import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Names that are ONLY names (no other common meaning)
// Excluded: JADE (gem), RUBY (gem), AMBER (gem/color), LILY (flower), BILL (noun/verb),
//           JACK (noun/verb), MARK (noun/verb), WILL (noun/verb), NICK (noun/verb),
//           CAROL (song), DALE (valley), GLEN (valley), DEAN (academic), GENE (genetic),
//           HARRY (verb), NOEL (christmas), RUTH (compassion), TROY (troy ounce),
//           MATT (matte), MAX (verb/noun), JOE (coffee), RICK (haystack - archaic)
const PURE_NAMES_TO_REMOVE = new Set([
  // 3-letter - names with no other meaning
  'AVA', 'ANN', 'BEN', 'BOB', 'DAN', 'DON', 'GUS', 'GUY', 'KAY', 'KEN',
  'LEE', 'LEN', 'MEG', 'MEL', 'MIA', 'NED', 'PAM', 'PAT', 'ROB', 'ROD',
  'RON', 'ROY', 'SAL', 'SAM', 'SUE', 'TED', 'TIM', 'TOM', 'VIC', 'ZOE',

  // 4-letter - names with no other meaning
  'ALAN', 'BETH', 'CARL', 'CHAD', 'DANA', 'DAVE', 'EVAN', 'FRED', 'GARY',
  'GREG', 'HANK', 'JANE', 'JEAN', 'JEFF', 'JILL', 'JOAN', 'JOEL', 'JOHN',
  'JOSH', 'JUDY', 'KATE', 'KENT', 'KIRK', 'KURT', 'KYLE', 'LEON', 'LISA',
  'LORI', 'LUKE', 'LYNN', 'MARC', 'MARY', 'MIKE', 'MILO', 'NEIL', 'NINA',
  'NOAH', 'PAUL', 'PETE', 'PHIL', 'RITA', 'ROSS', 'RYAN', 'SARA', 'SEAN',
  'SETH', 'STAN', 'TARA', 'TONY', 'VERA', 'WADE', 'WALT', 'ZACH', 'ZARA',

  // 5-letter - names with no other meaning
  'ALICE', 'BRIAN', 'BRUCE', 'CINDY', 'CLARA', 'CRAIG', 'DAVID', 'DIANE',
  'DONNA', 'ELENA', 'ELLEN', 'EMILY', 'FRANK', 'GRANT', 'HAZEL', 'HELEN',
  'HENRY', 'IRENE', 'JAMES', 'JANET', 'JASON', 'JENNA', 'JENNY', 'JERRY',
  'JESSE', 'JIMMY', 'JULIA', 'JULIE', 'KAREN', 'KATIE', 'KEITH', 'KELLY',
  'KEVIN', 'LANCE', 'LARRY', 'LAURA', 'LEWIS', 'LINDA', 'LLOYD', 'LOUIS',
  'MARIA', 'MARIE', 'MEGAN', 'MOLLY', 'NANCY', 'OSCAR', 'PAULA', 'PENNY',
  'PETER', 'RALPH', 'RANDY', 'ROGER', 'SARAH', 'SCOTT', 'SHANE', 'SHAWN',
  'STACY', 'STEVE', 'SUSAN', 'TANYA', 'TERRY', 'TYLER', 'VICKY', 'WAYNE',
  'WENDY',

  // 6-letter - names with no other meaning
  'AMANDA', 'ANDREW', 'ANGELA', 'ARTHUR', 'ASHLEY', 'BRENDA', 'CARLOS',
  'CHERYL', 'CLAIRE', 'DANIEL', 'DENISE', 'DENNIS', 'DONALD', 'EDWARD',
  'GEORGE', 'GLORIA', 'HAROLD', 'HOWARD', 'JANICE', 'JEREMY', 'JOHNNY',
  'JOSEPH', 'JOSHUA', 'JUSTIN', 'LAUREN', 'LESLIE', 'MARTHA', 'MARTIN',
  'MELVIN', 'MONICA', 'NATHAN', 'NICOLE', 'PAMELA', 'RACHEL', 'ROBERT',
  'RONALD', 'SANDRA', 'SHARON', 'SHEILA', 'STEVEN', 'STUART', 'TERESA',
  'THOMAS', 'TRAVIS', 'VICTOR', 'WALTER', 'WARREN', 'WILLIAM',
])

// Non-words or highly offensive words to remove
const NON_WORDS_TO_REMOVE = new Set([
  'AVI', 'GIO', 'JAK', 'FAP', 'FOO', 'GIT', // Not real words
  'JAP', // Offensive slur
  'WOP', // Offensive slur
])

// Words to KEEP despite being flagged (they're real words)
const KEEP_WORDS = new Set([
  // Onomatopoeia - fun and recognizable
  'ZZZ', 'BRR', 'GRR', 'HMM', 'SHH', 'TSK', 'MMM', 'PST', 'AAH',
  // Real words mistakenly flagged
  'THY', 'WRY', 'NTH', 'GYM', 'QUO', // "status quo"
  'VEX', 'VOX', 'SOX', 'TAX', 'WAX', 'HEX', 'REX', 'SEX', 'SIX', 'MIX', 'FIX', 'MAX',
  'PHO', 'TAO', 'TAJ', 'ZEN', // Well-known borrowed words
])

function cleanWordList(filename) {
  const filepath = path.join(__dirname, '../src/lib/dictionary', filename)
  const words = JSON.parse(fs.readFileSync(filepath, 'utf8'))

  const removed = []
  const kept = []

  for (const word of words) {
    if (KEEP_WORDS.has(word)) {
      kept.push(word)
    } else if (PURE_NAMES_TO_REMOVE.has(word) || NON_WORDS_TO_REMOVE.has(word)) {
      removed.push(word)
    } else {
      kept.push(word)
    }
  }

  return { filepath, original: words.length, kept, removed }
}

// Process each file
const results = [
  cleanWordList('three-letter.json'),
  cleanWordList('four-letter.json'),
  cleanWordList('five-letter.json'),
  cleanWordList('six-letter.json'),
]

console.log('WORD LIST CLEANUP')
console.log('='.repeat(50))

let totalRemoved = 0
let totalKept = 0

for (const result of results) {
  console.log(`\n${path.basename(result.filepath)}:`)
  console.log(`  Original: ${result.original}`)
  console.log(`  Removed: ${result.removed.length}`)
  console.log(`  Kept: ${result.kept.length}`)

  if (result.removed.length > 0) {
    console.log(`  Removed words: ${result.removed.join(', ')}`)
  }

  totalRemoved += result.removed.length
  totalKept += result.kept.length
}

console.log('\n' + '='.repeat(50))
console.log(`TOTAL: Removed ${totalRemoved}, Kept ${totalKept}`)

// Ask for confirmation
const args = process.argv.slice(2)
if (args.includes('--apply')) {
  console.log('\nApplying changes...')
  for (const result of results) {
    fs.writeFileSync(result.filepath, JSON.stringify(result.kept, null, 2))
    console.log(`  Updated ${path.basename(result.filepath)}`)
  }
  console.log('\nDone!')
} else {
  console.log('\nRun with --apply to save changes')
}
