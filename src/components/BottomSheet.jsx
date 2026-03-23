import { useEffect, useRef } from 'react';
import './BottomSheet.css';

export default function BottomSheet({ isOpen, onClose, title, children, centered = false }) {
  const sheetRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`bottom-sheet-overlay ${centered ? 'centered-overlay' : ''}`}
      ref={overlayRef}
      onClick={handleOverlayClick}
      id="bottom-sheet-overlay"
    >
      <div className={`bottom-sheet ${centered ? 'centered-modal' : ''}`} ref={sheetRef}>
        {!centered && <div className="bottom-sheet-handle" />}
        <div className="bottom-sheet-header">
          <h3 className="bottom-sheet-title">{title}</h3>
          <button className="bottom-sheet-close" onClick={onClose} id="bottom-sheet-close">
            ✕
          </button>
        </div>
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </div>
  );
}
