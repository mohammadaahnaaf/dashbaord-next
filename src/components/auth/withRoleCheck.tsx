'use client';

import { ComponentType } from 'react';
import { useAuth } from '@/contexts/auth';
import { UserRole } from '@/types';

interface WithRoleCheckProps {
  allowedRoles?: UserRole[];
}

export function withRoleCheck<P extends object>(
  WrappedComponent: ComponentType<P>,
  { allowedRoles = ['admin', 'moderator'] }: WithRoleCheckProps = {}
) {
  return function WithRoleCheckComponent(props: P) {
    const { userRole } = useAuth();

    if (!userRole || !allowedRoles.includes(userRole)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}