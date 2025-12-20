import { SignInButton, SignOutButton, useUser, useClerk } from '@clerk/clerk-react'
import { User, LogOut } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function AuthButton() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { openUserProfile } = useClerk()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Still loading Clerk
  if (!isLoaded) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
    )
  }

  // Signed in - show avatar with dropdown
  if (isSignedIn && user) {
    const displayName = user.firstName || user.username || 'Player'

    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50 hover:bg-slate-700/50 transition-all"
        >
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
          )}
          <span className="text-sm text-white font-medium max-w-[100px] truncate">
            {displayName}
          </span>
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50 overflow-hidden">
            <button
              onClick={() => {
                openUserProfile()
                setShowMenu(false)
              }}
              className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
            >
              <User size={16} />
              Profile
            </button>
            <SignOutButton>
              <button className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2 border-t border-slate-700">
                <LogOut size={16} />
                Sign out
              </button>
            </SignOutButton>
          </div>
        )}
      </div>
    )
  }

  // Signed out - show sign in button
  return (
    <SignInButton mode="modal">
      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
        <User size={16} />
        Sign in
      </button>
    </SignInButton>
  )
}
