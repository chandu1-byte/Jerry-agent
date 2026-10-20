import React, { useRef, useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ChevronLeft, ChevronRight, ChevronDown, Check, Building2, UserCircle2, Layers } from 'lucide-react';

export const AccountSwipeBar: React.FC = () => {
  const {
    activeAccount,
    allAccountsList,
    selectPersonalAccount,
    selectProjectAccount,
    swipeNextAccount,
    swipePrevAccount,
  } = useAccounting();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const swipeBarRef = useRef<HTMLDivElement>(null);

  // Touch swipe handling on the header container only
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (diff > minSwipeDistance) {
      // Swiped Left -> Next Account
      swipeNextAccount();
    } else if (diff < -minSwipeDistance) {
      // Swiped Right -> Prev Account
      swipePrevAccount();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentIndex = allAccountsList.findIndex((item) => {
    if (activeAccount.type === 'personal') return item.type === 'personal';
    return item.id === activeAccount.projectId;
  });

  return (
    <div className="relative z-30 select-none">
      {/* Swipe Header Container */}
      <div
        ref={swipeBarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="bg-slate-900/90 backdrop-blur-md border-y border-slate-800/80 px-3 py-2.5 transition-colors"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Previous Account Button */}
          <button
            onClick={swipePrevAccount}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white transition active:scale-95"
            aria-label="Previous Account"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Active Account Display & Dropdown trigger */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="group flex items-center gap-2 max-w-full px-3 py-1.5 rounded-xl hover:bg-slate-800/70 transition-all border border-transparent hover:border-slate-700/60"
            >
              <div className="flex items-center gap-2 truncate">
                {activeAccount.type === 'personal' ? (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <UserCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                    <Building2 className="w-4 h-4" />
                  </div>
                )}

                <div className="text-left truncate">
                  <div className="text-xs uppercase tracking-wider font-semibold text-cyan-400/80">
                    {activeAccount.type === 'personal' ? 'Default Account' : 'Project Ledger'}
                  </div>
                  <div className="text-sm md:text-base font-bold text-white tracking-wide truncate group-hover:text-cyan-300 transition-colors">
                    {activeAccount.name}
                  </div>
                </div>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 group-hover:text-cyan-300 transition-transform duration-200 shrink-0 ${
                  isDropdownOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>

            {/* Micro swipe hint */}
            <div className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5 hidden sm:block">
              Swipe left/right or click to switch accounts ({currentIndex + 1} of {allAccountsList.length})
            </div>

            {/* Account Switcher Dropdown Modal */}
            {isDropdownOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 p-2 z-50">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                  <span>Switch Account / Ledger</span>
                  <span className="text-[11px] text-cyan-400 font-normal">{allAccountsList.length} Accounts</span>
                </div>

                <div className="py-1 space-y-1">
                  {allAccountsList.map((item) => {
                    const isSelected =
                      item.type === 'personal'
                        ? activeAccount.type === 'personal'
                        : activeAccount.projectId === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.type === 'personal') {
                            selectPersonalAccount();
                          } else {
                            selectProjectAccount(item.id);
                          }
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/60 border border-cyan-500/40 text-cyan-200'
                            : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {item.type === 'personal' ? (
                            <UserCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <span className="font-semibold text-sm truncate">{item.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Next Account Button */}
          <button
            onClick={swipeNextAccount}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white transition active:scale-95"
            aria-label="Next Account"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Quick-Select Tabs for desktop and tablet */}
      <div className="bg-slate-950/70 border-b border-slate-800/60 px-3 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 scroll-smooth">
        {allAccountsList.map((item) => {
          const isSelected =
            item.type === 'personal'
              ? activeAccount.type === 'personal'
              : activeAccount.projectId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.type === 'personal') {
                  selectPersonalAccount();
                } else {
                  selectProjectAccount(item.id);
                }
              }}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
