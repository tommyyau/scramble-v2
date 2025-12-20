import { useState } from 'react'
import Game from './components/game/Game'
import WordBank from './components/ui/WordBank'
import Leaderboard from './components/ui/Leaderboard'

type View = 'game' | 'wordbank' | 'leaderboard'

function App() {
  const [currentView, setCurrentView] = useState<View>('game')

  switch (currentView) {
    case 'wordbank':
      return <WordBank onBack={() => setCurrentView('game')} />
    case 'leaderboard':
      return <Leaderboard onBack={() => setCurrentView('game')} />
    default:
      return (
        <Game
          onShowWordBank={() => setCurrentView('wordbank')}
          onShowLeaderboard={() => setCurrentView('leaderboard')}
        />
      )
  }
}

export default App
