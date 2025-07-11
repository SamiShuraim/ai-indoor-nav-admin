import React from 'react';
import { createLogger } from '../../utils/logger';
import './Card.css';

const logger = createLogger('Card');

interface CardProps {
  title: string;
  description?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'welcome';
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ 
  title, 
  description, 
  onClick, 
  className = '', 
  children,
  variant = 'default',
  actions
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger card click if actions area was clicked
    if (actions && (e.target as Element).closest('.card__actions')) {
      return;
    }
    
    if (onClick) {
      logger.userAction('Card clicked', { title, variant });
      onClick();
    }
  };

  const cardClasses = [
    'card',
    variant === 'welcome' ? 'card--welcome' : 'card--default',
    onClick ? 'card--clickable' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={handleClick}>
      <h3 className="card__title">{title}</h3>
      {description && <p className="card__description">{description}</p>}
      {children && <div className="card__content">{children}</div>}
      {actions && (
        <div className="card__actions" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default Card; 