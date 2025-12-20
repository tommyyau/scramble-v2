import { useState } from 'react'
import { ChevronRight, ChevronLeft, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

interface TutorialProps {
  onComplete: () => void
}

const steps = [
  {
    title: 'Welcome to Scramble!',
    description: 'Form words by stacking letter blocks.',
    visual: (
      <div className="flex justify-center gap-1 my-4">
        <div className="w-12 h-12 bg-block-common rounded-lg flex items-center justify-center text-white font-bold text-xl">C</div>
        <div className="w-12 h-12 bg-block-a rounded-lg flex items-center justify-center text-white font-bold text-xl">A</div>
        <div className="w-12 h-12 bg-block-common rounded-lg flex items-center justify-center text-white font-bold text-xl">T</div>
      </div>
    ),
  },
  {
    title: 'Move Blocks',
    description: 'Use arrow keys or swipe to move blocks left and right.',
    visual: (
      <div className="flex justify-center gap-4 my-4">
        <div className="flex items-center gap-2 text-white">
          <ArrowLeft size={24} className="text-primary" />
          <span>Left</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <ArrowRight size={24} className="text-primary" />
          <span>Right</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Drop Fast',
    description: 'Press Space or swipe down to drop blocks instantly.',
    visual: (
      <div className="flex justify-center my-4">
        <div className="flex items-center gap-2 text-white">
          <ArrowDown size={24} className="text-primary" />
          <span>Drop</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Form Words',
    description: 'Words must be 3+ letters, horizontal or vertical. They clear automatically!',
    visual: (
      <div className="flex flex-col items-center gap-2 my-4">
        <div className="flex gap-1">
          <div className="w-10 h-10 bg-block-medium rounded flex items-center justify-center text-white font-bold">D</div>
          <div className="w-10 h-10 bg-block-a rounded flex items-center justify-center text-white font-bold">O</div>
          <div className="w-10 h-10 bg-block-medium rounded flex items-center justify-center text-white font-bold">G</div>
        </div>
        <div className="text-accent text-sm">✓ DOG found!</div>
      </div>
    ),
  },
  {
    title: 'Chain Combos',
    description: 'When blocks fall after a word clears, new words can form for bonus points!',
    visual: (
      <div className="text-center my-4">
        <div className="text-2xl font-bold text-secondary animate-pulse">2x CHAIN!</div>
      </div>
    ),
  },
]

export default function Tutorial({ onComplete }: TutorialProps) {
  const [step, setStep] = useState(0)

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const currentStep = steps[step]

  return (
    <div className="text-center">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === step ? 'bg-primary' : 'bg-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-white mb-2">{currentStep.title}</h3>
      <p className="text-slate-300 mb-4">{currentStep.description}</p>
      {currentStep.visual}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-1 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <span>{step === steps.length - 1 ? "Let's Play!" : 'Next'}</span>
          {step < steps.length - 1 && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  )
}
