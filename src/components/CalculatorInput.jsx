import { useState, useEffect, useRef } from 'react';
import './CalculatorInput.css';

export default function CalculatorInput({ value, onChange, placeholder = "0.00", id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expr, setExpr] = useState(value !== undefined && value !== null ? value.toString() : '');
  const [hasCalculated, setHasCalculated] = useState(false);

  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen && document.activeElement !== inputRef.current) {
      if (value !== undefined && value !== null && value !== '') {
        setExpr(value.toString());
      } else if (value === undefined || value === null || value === '') {
        setExpr('');
      }
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

  const calculate = (expression) => {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
      if (!sanitized) return '';
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + sanitized)();
      if (!isFinite(result)) return '';
      return Number(Math.round(result + 'e2') + 'e-2').toString();
    } catch {
      return '';
    }
  };

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/[^0-9+\-*/().]/g, '');
    setExpr(sanitized);
    setHasCalculated(false);

    if (/^[0-9.]*$/.test(sanitized)) {
      onChange(sanitized);
    }
  };

  const handleInputBlur = () => {
    if (expr && /[+\-*/]/.test(expr)) {
      const res = calculate(expr) || expr;
      setExpr(res);
      onChange(res);
    } else if (expr === '') {
      onChange('');
    } else {
      onChange(expr);
    }
  };

  const handleKeyPress = (e, key) => {
    e.preventDefault(); // Prevent input losing focus unnecessarily
    
    if (key === 'C') {
      setExpr('');
      setHasCalculated(false);
      return;
    }
    if (key === '⌫') {
      setExpr((prev) => prev.slice(0, -1));
      setHasCalculated(false);
      return;
    }
    if (key === '=') {
      const res = calculate(expr);
      if (res !== '') {
        setExpr(res);
        setHasCalculated(true);
      }
      return;
    }
    if (key === 'OK') {
      let finalRes = expr;
      if (typeof expr === 'string' && /[+\-*/]/.test(expr)) {
        finalRes = calculate(expr) || expr;
      }
      setExpr(finalRes);
      onChange(finalRes);
      setIsOpen(false);
      return;
    }

    if (hasCalculated && /[0-9.]/.test(key)) {
      setExpr(key);
      setHasCalculated(false);
    } else {
      setExpr((prev) => prev + key);
      setHasCalculated(false);
    }
  };

  const BUTTONS = [
    ['C', '(', ')', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['.', '0', '⌫', '=']
  ];

  return (
    <div className="calculator-input-wrapper input" ref={containerRef} style={{ padding: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
      <input 
        ref={inputRef}
        type="text" 
        inputMode="decimal"
        placeholder={placeholder}
        value={expr}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        id={id}
        style={{ 
          flex: 1, 
          padding: '14px var(--space-4)', 
          background: 'transparent', 
          border: 'none', 
          color: 'inherit', 
          outline: 'none', 
          fontSize: 'inherit',
          fontFamily: 'inherit',
          width: '100%'
        }}
      />
      <button 
        type="button" 
        onClick={() => {
           if (inputRef.current) inputRef.current.blur();
           setIsOpen(!isOpen);
        }}
        style={{ 
          padding: '14px', 
          background: 'none', 
          border: 'none', 
          color: 'var(--color-text-secondary)', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          opacity: 0.8 
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="16" y1="14" x2="16.01" y2="14"></line>
          <line x1="16" y1="18" x2="16.01" y2="18"></line>
          <line x1="8" y1="14" x2="8.01" y2="14"></line>
          <line x1="12" y1="14" x2="12.01" y2="14"></line>
          <line x1="8" y1="18" x2="8.01" y2="18"></line>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
      </button>

      {isOpen && (
        <div className="mini-calculator-popup">
          <div className="calculator-grid">
            {BUTTONS.map((row, i) => (
              <div key={i} className="calculator-row">
                {row.map(btn => (
                  <button 
                    key={btn}
                    className={`calc-btn ${/[0-9.]/.test(btn) ? 'num' : 'op'} ${btn === '=' ? 'primary' : ''}`}
                    onClick={(e) => handleKeyPress(e, btn)}
                    type="button"
                  >
                    {btn}
                  </button>
                ))}
              </div>
            ))}
            <div className="calculator-row">
              <button 
                className="calc-btn submit-btn" 
                style={{ width: '100%', background: 'var(--color-accent)' }} 
                onClick={(e) => handleKeyPress(e, 'OK')}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
