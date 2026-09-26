import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
    isActive ? 'text-accent bg-accent/10' : 'text-slate-400 hover:text-slate-200'
  }`;

export default function Navbar() {
  const [opOpen, setOpOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

            <div className="relative" onMouseLeave={() => setOpOpen(false)}>
              <button
                onMouseEnter={() => setOpOpen(true)}
                onClick={() => setOpOpen((v) => !v)}
                className="px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:text-slate-200"
              >
                Operations
              </button>
              {opOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 card shadow-xl py-1 z-20">
                  <NavLink to="/operations/receipts" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Receipts</NavLink>
                  <NavLink to="/operations/deliveries" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Delivery Orders</NavLink>
                  <NavLink to="/operations/transfers" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Internal Transfers</NavLink>
                  <NavLink to="/operations/adjustments" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Adjustments</NavLink>
                </div>
              )}
            </div>

            <NavLink to="/products" className={navLinkClass}>Products</NavLink>
            <NavLink to="/move-history" className={navLinkClass}>Move History</NavLink>

            <div className="relative" onMouseLeave={() => setSetOpen(false)}>
              <button
                onMouseEnter={() => setSetOpen(true)}
                onClick={() => setSetOpen((v) => !v)}
                className="px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:text-slate-200"
              >
                Settings
              </button>
              {setOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 card shadow-xl py-1 z-20">
                  <NavLink to="/settings/warehouses" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Warehouses</NavLink>
                  <NavLink to="/settings/locations" className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Locations</NavLink>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="relative" onMouseLeave={() => setProfileOpen(false)}>
          <button
            onMouseEnter={() => setProfileOpen(true)}
            onClick={() => setProfileOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-accent2/20 border border-accent2/40 text-accent2 font-semibold flex items-center justify-center text-sm"
          >
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </button>
          {profileOpen && (
            <div className="absolute top-full right-0 mt-1 w-44 card shadow-xl py-1 z-20">
              <div className="px-4 py-2 text-sm text-slate-300 border-b border-line">{user?.name || 'My Profile'}</div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
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
