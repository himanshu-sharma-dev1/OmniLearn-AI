// src/components/LoginIllustration.jsx
import React from 'react';

const LoginIllustration = () => (
  <svg width="100%" height="100%" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    {/* Background using the specified muted blue */}
    <rect width="800" height="600" fill="#4F46E5" />

    {/* Abstract Robot */}
    <g transform="translate(220 300)">
      {/* Body */}
      <rect x="-60" y="-80" width="120" height="160" rx="25" fill="#94A3B8" />
      {/* Head */}
      <circle cx="0" cy="-125" r="45" fill="#94A3B8" />
      {/* Glowing Brain Icon inside Head with pulse animation */}
      <path d="M-12 -135 L-7 -130 L-12 -125 M0 -140 L5 -130 L0 -120 M12 -135 L17 -130 L12 -125" stroke="#10B981" strokeWidth="4" fill="none" strokeLinecap="round">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
      </path>
    </g>

    {/* Stylized Floating Documents */}
    <g transform="translate(580 300)">
      <rect x="-80" y="-50" width="160" height="25" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" transform="rotate(-10)">
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="4s" repeatCount="indefinite" />
      </rect>
      <rect x="-80" y="-15" width="160" height="25" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1">
         <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="-80" y="20" width="160" height="25" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" transform="rotate(10)">
         <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="5s" repeatCount="indefinite" />
      </rect>
    </g>

    {/* Glowing Lines of Light flowing from documents to robot */}
    <path d="M520,280 Q420,250 320,230" stroke="#10B981" strokeWidth="4" fill="none" strokeDasharray="10 5" strokeLinecap="round">
      <animate attributeName="stroke-dashoffset" from="0" to="-15" dur="1.5s" repeatCount="indefinite" />
    </path>
    <path d="M520,310 Q420,310 320,290" stroke="#10B981" strokeWidth="4" fill="none" strokeDasharray="10 5" strokeLinecap="round">
       <animate attributeName="stroke-dashoffset" from="-15" to="0" dur="1.5s" repeatCount="indefinite" />
    </path>

    {/* Glowing Chat Bubble held by robot */}
    <g transform="translate(290 180)">
      <path d="M-45,0 a45,30 0 1,1 90,0 a45,30 0 1,1 -90,0" fill="#10B981">
        <animateTransform attributeName="transform" type="scale" values="1;1.03;1" dur="4s" repeatCount="indefinite" />
      </path>
      {/* Stylized text lines inside bubble */}
      <path d="M-25 -5 H 25 M-25 5 H 15" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

export default LoginIllustration;