import { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { usePrivacy } from '../hooks/usePrivacy';
import { getAccountIcon } from '../utils/accountIcons';
import './AccountDropdown.css';


export default function AccountDropdown({ accounts, value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const currency = useSettingsStore((s) => s.currency);
  const { mask } = usePrivacy();

  const selectedAccount = accounts.find((a) => a.id === value) || accounts[0];

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  if (!selectedAccount) return null;

  return (
    <div className={`account-dropdown-wrapper ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="account-dropdown-btn"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="account-dropdown-icon" style={{ color: selectedAccount.color || 'var(--color-primary)' }}>
          {getAccountIcon(selectedAccount)}
        </span>
        <span className="account-dropdown-label">
          {selectedAccount.name}
          <span className="account-dropdown-balance">{mask(selectedAccount.balance, currency)}</span>
        </span>
        <svg className={`account-dropdown-chevron ${isOpen ? 'open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {isOpen && (
        <div className="account-dropdown-menu">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`account-dropdown-item ${a.id === value ? 'active' : ''}`}
              onClick={() => {
                onChange(a.id);
                setIsOpen(false);
              }}
            >
              <span className="account-dropdown-icon" style={{ color: a.color || 'var(--color-text-secondary)' }}>
                {getAccountIcon(a)}
              </span>
              <span className="account-dropdown-label">
                {a.name}
                <span className="account-dropdown-balance">{mask(a.balance, currency)}</span>
              </span>
              {a.id === value && (
                <svg className="account-dropdown-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
