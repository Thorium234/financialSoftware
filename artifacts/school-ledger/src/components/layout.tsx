import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Wallet, 
  Landmark, 
  GraduationCap, 
  Receipt, 
  FileText 
} from "lucide-react";
import { StkPushDialog } from "@/components/stk-push-dialog";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/students", label: "Students", icon: Users },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/fees", label: "Fee Structures", icon: Wallet },
    { href: "/accounts", label: "Fund Accounts", icon: Landmark },
    { href: "/capitation", label: "Capitation", icon: GraduationCap },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border font-bold text-lg tracking-tight">
          SchoolLedger KE
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center px-8 border-b border-border bg-card">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <StkPushDialog />
            <div className="h-4 w-px bg-border" />
            <div className="text-sm font-medium text-muted-foreground">Admin User</div>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              AD
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
