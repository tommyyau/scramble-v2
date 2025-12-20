interface WordListProps {
  words: string[]
}

export default function WordList({ words }: WordListProps) {
  return (
    <div className="text-center min-w-[60px]">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Words</div>
      <div className="text-2xl font-bold text-white tabular-nums">{words.length}</div>
    </div>
  )
}
