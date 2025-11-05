// app/dashboard/layout.tsx
import DashboardContextProvider  from '@/contexts/dashboard-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardContextProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </DashboardContextProvider>
  );
}