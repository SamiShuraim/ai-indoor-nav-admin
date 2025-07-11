import React from 'react';
import { createLogger } from '../../utils/logger';
import './Button.css';

const logger = createLogger('Button');

// Button Constants
const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  DANGER: 'danger',
  SECONDARY: 'secondary',
} as const;

const BUTTON_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

interface ButtonProps {
  children: React.ReactNode;
  onClick?: ((e: React.MouseEvent<HTMLButtonElement>) => void) | (() => void);
  type?: 'button' | 'submit' | 'reset';
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  'aria-label'?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'PRIMARY',
  size = 'MEDIUM',
  disabled = false,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && onClick) {
      logger.userAction('Button clicked', { 
        variant: BUTTON_VARIANTS[variant], 
        size: BUTTON_SIZES[size],
        disabled,
        loading 
      });
      
      // Check if onClick function expects parameters
      if (onClick.length > 0) {
        (onClick as (e: React.MouseEvent<HTMLButtonElement>) => void)(e);
      } else {
        (onClick as () => void)();
      }
    }
  };

  const buttonClasses = [
    'button',
    `button--${BUTTON_VARIANTS[variant]}`,
    `button--${BUTTON_SIZES[size]}`,
    loading ? 'button--loading' : '',
    className
  ].filter(Boolean).join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      {...props}
    >
      {loading && <span className="button__spinner" aria-hidden="true" />}
      <span className={loading ? 'button__text--loading' : 'button__text'}>
        {children}
      </span>
    </button>
  );
};

export { BUTTON_SIZES, BUTTON_VARIANTS };
export default Button; 