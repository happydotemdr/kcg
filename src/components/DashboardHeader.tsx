/**
 * DashboardHeader Component
 * Header for dashboard with UserButton properly hydrated
 */
import React from 'react';
import { UserButton } from '@clerk/astro/react';

interface DashboardHeaderProps {
  firstName: string;
}

export default function DashboardHeader({ firstName }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="dashboard-title">Welcome back, {firstName}!</h1>
          <p className="dashboard-subtitle">Here's what's happening with your account today.</p>
        </div>
        <div className="header-right">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
