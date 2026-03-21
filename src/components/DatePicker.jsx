import { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function DatePicker({ value, onChange, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      return new Date(y, m - 1, d);
    }
    return new Date();
  });

  useEffect(() => {
    if (value && !isOpen) {
      const [y, m, d] = value.split('-');
      setViewDate(new Date(y, m - 1, d));
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const prevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const nextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const grid = Array(firstDayIndex).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    grid.push(i);
  }

  const handleSelect = (day) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yy = currentYear;
    onChange(`${yy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
  };

  const isSelected = (day) => {
    if (!day || !value) return false;
    const [y, m, d] = value.split('-');
    return parseInt(y, 10) === currentYear && parseInt(m, 10) - 1 === currentMonth && parseInt(d, 10) === day;
  };

  let displayValue = '';
  if (value) {
    const [y, m, d] = value.split('-');
    const parsedY = parseInt(y, 10);
    const parsedM = parseInt(m, 10);
    const parsedD = parseInt(d, 10);
    
    displayValue = `${String(parsedD).padStart(2, '0')}/${String(parsedM).padStart(2, '0')}/${parsedY}`;
  }

  return (
    <div className="datepicker-wrapper" ref={containerRef}>
      <button 
        type="button" 
        className="input datepicker-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        id={id}
      >
        <svg className="datepicker-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span className="datepicker-display">{displayValue || 'Select Date'}</span>
      </button>

      {isOpen && (
        <div className="datepicker-popup">
          <div className="datepicker-header">
            <button className="datepicker-nav-btn" onClick={prevMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div className="datepicker-month-year">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <button className="datepicker-nav-btn" onClick={nextMonth}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
          
          <div className="datepicker-weekdays">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          
          <div className="datepicker-grid">
            {grid.map((day, i) => {
              if (!day) return <div key={i} className="datepicker-cell empty" />;
              
              const selected = isSelected(day);
              const today = isToday(day);
              
              return (
                <button
                  key={i}
                  type="button"
                  className={`datepicker-cell datepicker-day ${selected ? 'selected' : ''} ${today && !selected ? 'today' : ''}`}
                  onClick={() => handleSelect(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
          <div className="datepicker-footer">
            <button 
              type="button" 
              className="datepicker-quick-btn"
              onClick={() => {
                const now = new Date();
                onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
                setIsOpen(false);
              }}
            >
              Go to Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
