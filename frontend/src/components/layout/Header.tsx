import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm">
            <Sparkles className="text-white" size={18} />
          </div>
          <div>
            <p className="font-semibold text-stone-800 leading-tight">Aura Skincare</p>
            <p className="text-xs text-stone-500 leading-tight">AI Customer Support</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Powered by Aria
          </span>
        </div>
      </div>
    </header>
  );
}
