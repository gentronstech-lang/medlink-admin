import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOrgAuth } from '@/context/OrgAuthContext';

export function OrgProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useOrgAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh bg-dots">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/org/login" state={{ from: location }} replace />;
  }

  return children;
}

