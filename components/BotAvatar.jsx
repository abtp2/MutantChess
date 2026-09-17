// Authentic Chess.com style Bot Avatar component using real portrait images
'use client';

import React, { useState } from 'react';

const BOT_IMAGE_MAP = {
  martin: '/bots/martin.jpg',
  ashutosh_dev: '/bots/ashutosh_dev.jpg',
  oliver: '/bots/oliver.jpg',
  luna: '/bots/luna.jpg',
  leo: '/bots/leo.jpg',
};

export default function BotAvatar({ bot, size = 'md', className = '' }) {
  const [hasError, setHasError] = useState(false);
  
  const botId = typeof bot === 'string' ? bot : bot?.id || '';
  const botName = typeof bot === 'object' && bot?.name ? bot.name : botId;
  const imageSrc = (typeof bot === 'object' && bot?.image) || BOT_IMAGE_MAP[botId] || '/bots/ashutosh_dev.jpg';

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xs',
    md: 'w-10 h-10 rounded-xs',
    lg: 'w-12 h-12 rounded-sm',
    xl: 'w-16 h-16 rounded-sm',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden border border-theme-border bg-theme-panel select-none shadow-xs ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {!hasError ? (
        <img
          src={imageSrc}
          alt={botName}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center font-bold text-theme-sec bg-theme-sub uppercase ${textSizes[size] || textSizes.md}`}>
          {botName.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

