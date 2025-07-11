import React from 'react';
import { createLogger } from '../../utils/logger';
import './Alert.css';

const logger = createLogger('Alert');

// Alert Constants
const ALERT_TYPES = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  SUCCESS: 'success',
} as const;

const ALERT_ICONS = {
  [ALERT_TYPES.ERROR]: '⚠️',
  [ALERT_TYPES.WARNING]: '⚠️',
  [ALERT_TYPES.INFO]: 'ℹ️',
  [ALERT_TYPES.SUCCESS]: '✅',
} as const;

interface AlertProps {
  type?: keyof typeof ALERT_TYPES;
  message: string;
  onDismiss?: () => void;
  dismissible?: boolean;
  className?: string;
  role?: string;
}

const Alert: React.FC<AlertProps> = ({
  type = 'ERROR',
  message,
  onDismiss,
  dismissible = false,
  className = '',
  role = 'alert',
}) => {
  const handleDismiss = () => {
    if (onDismiss) {
      logger.userAction('Alert dismissed', { type: ALERT_TYPES[type], message });
      onDismiss();
    }
  };

  const alertClasses = [
    'alert',
    `alert--${ALERT_TYPES[type]}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={alertClasses} role={role}>
      <div className="alert__content">
        <span className="alert__icon" aria-hidden="true">
          {ALERT_ICONS[ALERT_TYPES[type]]}
        </span>
        <span className="alert__message">{message}</span>
      </div>
      {dismissible && (
        <button
          type="button"
          className="alert__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
        >
          ×
        </button>
      )}
    </div>
  );
};

export { ALERT_TYPES };
export default Alert; 