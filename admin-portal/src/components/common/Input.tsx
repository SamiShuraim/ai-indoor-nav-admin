import React from 'react';
import { createLogger } from '../../utils/logger';
import './Input.css';

const logger = createLogger('Input');

interface InputProps {
  id: string;
  name: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel';
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  error?: string;
  className?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  name,
  type = 'text',
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  autoComplete,
  error,
  className = '',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    logger.userAction('Input field changed', {
      field: name,
      valueLength: e.target.value.length,
      isPasswordField: type === 'password'
    });
    onChange(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    logger.userAction('Input field focused', { field: name });
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    logger.userAction('Input field blurred', { field: name });
    onBlur?.(e);
  };

  const inputClasses = [
    'input__field',
    error ? 'input__field--error' : '',
    disabled ? 'input__field--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input">
      <label htmlFor={id} className="input__label">
        {label}
        {required && <span className="input__required" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={inputClasses}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <div id={`${id}-error`} className="input__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default Input; 