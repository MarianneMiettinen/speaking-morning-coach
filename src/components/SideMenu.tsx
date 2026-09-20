import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const LINKS: { to: string; icon: IconName; label: string }[] = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/coaches', icon: 'coach', label: 'Choose coach' },
  { to: '/routines', icon: 'script', label: 'Morning scripts' },
  { to: '/achievements', icon: 'trophy', label: 'Achievements' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
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
              <Icon name="close" />
            </button>
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="side-menu-link" onClick={() => setOpen(false)}>
                <span className="side-menu-icon">
                  <Icon name={link.icon} />
                </span>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
