import React, { useRef, useCallback } from 'react';
import { ACCESS_CODE_LENGTH } from '@/utils/constants';

interface OTPInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export default function AccessCodeInput({ value, onChange, disabled = false }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (index: number, inputValue: string) => {
      if (inputValue.length > 1) return;

      const newValue = [...value];
      newValue[index] = inputValue.toUpperCase();
      onChange(newValue);

      if (inputValue && index < ACCESS_CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [value]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').slice(0, ACCESS_CODE_LENGTH);
      const newValue = pastedData.split('').map((char) => char.toUpperCase());

      while (newValue.length < ACCESS_CODE_LENGTH) {
        newValue.push('');
      }

      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {Array.from({ length: ACCESS_CODE_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={index === 0}
          style={{
            width: '40px',
            height: '48px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: 600,
            border: '2px solid #C4A84B',
            borderRadius: '8px',
            outline: 'none',
            background: 'white',
            color: '#333',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#F5D76E';
            e.target.style.boxShadow = '0 0 0 3px rgba(245, 215, 110, 0.3)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#C4A84B';
            e.target.style.boxShadow = 'none';
          }}
        />
      ))}
    </div>
  );
}
