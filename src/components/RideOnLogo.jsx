import React from 'react';
import { Bike } from 'lucide-react';

const RideOnLogo = ({ 
  size = 48, 
  className = '', 
  style = {},
  alt = "RideOn Logo"
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', ...style }}>
      <img 
        src="/rideon-logo.png"
        alt={alt}
        className={className}
        style={{ 
          height: size,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain'
        }}
        onError={(e) => {
          // Fallback to Bike icon if logo file isn't found
          e.target.style.display = 'none';
          if (e.target.nextElementSibling) {
            e.target.nextElementSibling.style.display = 'block';
          }
        }}
      />
      {/* Fallback Bike icon */}
      <Bike 
        style={{ 
          display: 'none',
          height: '48px', 
          width: '48px', 
          color: '#ffc020' 
        }} 
      />
    </div>
  );
};

export default RideOnLogo;