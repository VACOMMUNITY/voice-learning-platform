import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', glow = false, style = {}, ...props }) => {
  const combinedStyle = glow 
    ? { boxShadow: 'var(--shadow-glass), var(--shadow-glow)', ...style } 
    : style;

  return (
    <div className={`glass-panel ${className}`} style={combinedStyle} {...props}>
      {children}
    </div>
  );
};
export default GlassCard;
