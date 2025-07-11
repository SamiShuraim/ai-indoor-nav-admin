import React from 'react';
import './Container.css';

// Container Constants
const CONTAINER_VARIANTS = {
  PAGE: 'page',
  SECTION: 'section',
  CENTERED: 'centered',
} as const;

const CONTAINER_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  FULL: 'full',
} as const;

interface ContainerProps {
  children: React.ReactNode;
  variant?: keyof typeof CONTAINER_VARIANTS;
  size?: keyof typeof CONTAINER_SIZES;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const Container: React.FC<ContainerProps> = ({
  children,
  variant = 'PAGE',
  size = 'LARGE',
  className = '',
  as: Component = 'div',
}) => {
  const containerClasses = [
    'container',
    `container--${CONTAINER_VARIANTS[variant]}`,
    `container--${CONTAINER_SIZES[size]}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={containerClasses}>
      {children}
    </Component>
  );
};

export { CONTAINER_SIZES, CONTAINER_VARIANTS };
export default Container; 