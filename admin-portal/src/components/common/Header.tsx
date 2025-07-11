import React from 'react';
import { createLogger } from '../../utils/logger';
import './Header.css';

const logger = createLogger('Header');

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  actions,
  className = '',
}) => {
  React.useEffect(() => {
    logger.info('Header component rendered', { title, hasSubtitle: !!subtitle, hasActions: !!actions });
  }, [title, subtitle, actions]);

  const headerClasses = [
    'header',
    className
  ].filter(Boolean).join(' ');

  return (
    <header className={headerClasses}>
      <div className="header__content">
        <div className="header__text">
          <h1 className="header__title">{title}</h1>
          {subtitle && <p className="header__subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div className="header__actions">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 