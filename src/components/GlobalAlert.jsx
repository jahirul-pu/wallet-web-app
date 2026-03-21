import { useEffect } from 'react';
import { useAlertStore } from '../stores/useAlertStore';
import './GlobalAlert.css';

export default function GlobalAlert() {
  const { isOpen, title, message, isDanger, onConfirm, onCancel } = useAlertStore();

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (onCancel) onCancel();
        else onConfirm();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="global-alert-overlay">
      <div className="global-alert-modal">
        <div className={`global-alert-icon ${isDanger ? 'danger' : 'notice'}`}>
          {isDanger ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          )}
        </div>
        
        <h3 className="global-alert-title">{title}</h3>
        <p className="global-alert-message">{message}</p>
        
        <div className="global-alert-actions">
          {onCancel && (
            <button className="btn btn-secondary alert-btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button 
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'} alert-btn`} 
            onClick={onConfirm}
            autoFocus
          >
            {onCancel ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
