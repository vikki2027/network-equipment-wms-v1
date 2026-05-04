'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DashboardRefreshWrapperProps {
  children: React.ReactNode;
}

export default function DashboardRefreshWrapper({ children }: DashboardRefreshWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh) {
      // 清除查询参数，避免重复刷新
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // 刷新数据
      router.refresh();
    }
  }, [searchParams, router]);
  
  return <>{children}</>;
}