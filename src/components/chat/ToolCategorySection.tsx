/**
 * ToolCategorySection Component
 * Reusable collapsible section for organizing agents/tools
 */

import React, { useState } from 'react';

interface ToolCategorySectionProps {
  title: string;
  icon?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

export default function ToolCategorySection({
  title,
  icon,
  defaultCollapsed = false,
  children,
}: ToolCategorySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between"
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          transition: 'all var(--transition-base)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-background)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--color-surface)';
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </div>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition-base)',
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
