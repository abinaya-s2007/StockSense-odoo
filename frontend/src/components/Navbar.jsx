import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
    isActive ? 'text-accent bg-accent/10' : 'text-slate-400 hover:text-slate-200'
  }`;

// Shared dropdown behavior: click the trigger to open it, click anywhere
// outside (or pick an item) to close it. Using only onClick (instead of
// mixing onMouseEnter + onClick toggle) avoids the menu opening on hover
// and then immediately closing again on the click that follows it.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return { open, setOpen, ref };
}

export default function Navbar() {
  const operations = useDropdown();
  const settings = useDropdown();
  const profile = useDropdown();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-line bg-panel">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-ink font-bold text-sm">S</div>
            <span className="font-semibold text-slate-100 tracking-tight">StockSense</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>

            <div className="relative" ref={operations.ref}>
              <button
                onClick={() => operations.setOpen((v) => !v)}
                className="px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:text-slate-200"
              >
                Operations
              </button>
              {operations.open && (
                <div className="absolute top-full left-0 mt-1 w-52 card shadow-xl py-1 z-20">
                  <NavLink onClick={() => operations.setOpen(false)} to="/operations/receipts" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Receipts</NavLink>
                  <NavLink onClick={() => operations.setOpen(false)} to="/operations/deliveries" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Delivery Orders</NavLink>
                  <NavLink onClick={() => operations.setOpen(false)} to="/operations/transfers" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Internal Transfers</NavLink>
                  <NavLink onClick={() => operations.setOpen(false)} to="/operations/adjustments" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Adjustments</NavLink>
                </div>
              )}
            </div>

            <NavLink to="/products" className={navLinkClass}>Products</NavLink>
            <NavLink to="/move-history" className={navLinkClass}>Move History</NavLink>
            <NavLink to="/analytics" className={navLinkClass}>Analytics</NavLink>

            <div className="relative" ref={settings.ref}>
              <button
                onClick={() => settings.setOpen((v) => !v)}
                className="px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:text-slate-200"
              >
                Settings
              </button>
              {settings.open && (
                <div className="absolute top-full left-0 mt-1 w-52 card shadow-xl py-1 z-20">
                  <NavLink onClick={() => settings.setOpen(false)} to="/settings/warehouses" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Warehouses</NavLink>
                  <NavLink onClick={() => settings.setOpen(false)} to="/settings/locations" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Locations</NavLink>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="relative" ref={profile.ref}>
          <button
            onClick={() => profile.setOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-accent2/20 border border-accent2/40 text-accent2 font-semibold flex items-center justify-center text-sm"
          >
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </button>
          {profile.open && (
            <div className="absolute top-full right-0 mt-1 w-44 card shadow-xl py-1 z-20">
              <div className="px-4 py-2 text-sm text-slate-300 border-b border-line">{user?.name || 'My Profile'}</div>
              <button
                onClick={() => { profile.setOpen(false); logout(); navigate('/login'); }}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-white/5"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
