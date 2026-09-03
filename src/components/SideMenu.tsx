import { useState } from 'react';
import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/coaches', icon: '🧑‍🏫', label: 'Choose Coach' },
  { to: '/routines', icon: '📋', label: 'Morning Scripts' },
  { to: '/achievements', icon: '🏆', label: 'Achievements' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export function SideMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="hamburger-btn" onClick={() => setOpen(true)} aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div className="side-menu-overlay" onClick={() => setOpen(false)}>
          <nav className="side-menu" onClick={(e) => e.stopPropagation()}>
            <button className="side-menu-close" onClick={() => setOpen(false)} aria-label="Close menu">
              ✕
            </button>
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="side-menu-link" onClick={() => setOpen(false)}>
                <span className="side-menu-icon">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
