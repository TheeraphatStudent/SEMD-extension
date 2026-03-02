'use client';

import React from 'react';

interface ShieldIconProps {
  variant: 'safe' | 'danger';
  size?: number;
}

export function ShieldIcon({ variant, size = 80 }: ShieldIconProps) {
  if (variant === 'safe') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M40 8L12 20V36C12 53.6 23.84 70.04 40 74C56.16 70.04 68 53.6 68 36V20L40 8Z"
          fill="#4CAF50"
        />
        <path
          d="M32 40L38 46L50 34"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M26.34 8H53.66L72 26.34V53.66L53.66 72H26.34L8 53.66V26.34L26.34 8Z"
        fill="#F44336"
      />
      <path d="M40 28V44" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <circle cx="40" cy="52" r="3" fill="white" />
    </svg>
  );
}

export default ShieldIcon;
