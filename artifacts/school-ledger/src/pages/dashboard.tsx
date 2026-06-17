import { useGetDashboardSummary, useGetCollectionTrend, useGetFundBalances, useGetRecentPayments, useGetDefaultersCount } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { ArrowUpRight, TrendingUp, Users, AlertCircle, Clock, CheckCircle2, Wallet, GraduationCap, Landmark, Receipt } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary, error: summaryError } = useGetDashboardSummary();
  const { data: trend, isLoading: isLoadingTrend } = useGetCollectionTrend();
  const { data: balances, isLoading: isLoadingBalances } = useGetFundBalances();
  const { data: recentPayments, isLoading: isLoadingPayments } = useGetRecentPayments();
  const { data: defaulters, isLoading: isLoadingDefaulters } = useGetDefaultersCount();

  if (summaryError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load dashboard summary. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <div className="text-muted-foreground mt-1 text-sm">
            {isLoadingSummary ? <Skeleton className="h-4 w-48" /> : `Financial overview for ${summary?.activeTermLabel}`}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expected</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalExpected || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold text-primary">{formatCurrency(summary?.totalCollected || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.collectionRate.toFixed(1)}% collection rate
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{formatCurrency(summary?.totalOutstanding || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="text-2xl font-bold">{summary?.studentCount || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Trend</CardTitle>
              <CardDescription>Daily fee collection across all methods</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrend ? (
                <Skeleton className="h-[300px] w-full" />
              ) : trend && trend.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(tick) => `KES ${tick/1000}k`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        formatter={(value: number) => [formatCurrency(value), "Collected"]}
                        labelFormatter={(label) => formatDate(label as string)}
                      />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card>
              <CardHeader>
                <CardTitle>Defaulters by Class</CardTitle>
                <CardDescription>Students with outstanding balances</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDefaulters ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : defaulters && defaulters.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={defaulters} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                        <XAxis type="number" tickFormatter={(tick) => `${tick}`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="class" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => [value, "Students"]}
                        />
                        <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No defaulters data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fund Balances</CardTitle>
                <CardDescription>Current balance by statutory vote</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBalances ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : balances && balances.length > 0 ? (
                  <div className="space-y-4">
                    {balances.map((fund) => (
                      <div key={fund.accountId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${
                            fund.accountType === 'tuition' ? 'bg-chart-1/10 text-chart-1' :
                            fund.accountType === 'operations' ? 'bg-chart-2/10 text-chart-2' :
                            fund.accountType === 'bom' ? 'bg-chart-3/10 text-chart-3' :
                            'bg-chart-4/10 text-chart-4'
                          }`}>
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{fund.accountName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{fund.accountType}</p>
                          </div>
                        </div>
                        <div className="font-bold text-sm text-right">
                          {formatCurrency(fund.balance)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No fund balances available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar / Feed */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Today's Intake</CardTitle>
                <CardDescription>Collections for today</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <div className="space-y-3 mt-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><div className="h-2 w-2 rounded-full bg-[#10b981]" /> M-Pesa</span>
                    <span className="font-medium">{formatCurrency(summary?.mpesaToday || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><div className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Bank</span>
                    <span className="font-medium">{formatCurrency(summary?.bankToday || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><div className="h-2 w-2 rounded-full bg-[#f59e0b]" /> Cash</span>
                    <span className="font-medium">{formatCurrency(summary?.cashToday || 0)}</span>
                  </div>
                  <div className="pt-4 mt-4 border-t flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency((summary?.mpesaToday || 0) + (summary?.bankToday || 0) + (summary?.cashToday || 0))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest transactions</CardDescription>
              </div>
              <Link href="/payments" className="text-xs text-primary font-medium hover:underline flex items-center">
                View all <ArrowUpRight className="h-3 w-3 ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingPayments ? (
                <div className="space-y-4 mt-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : recentPayments && recentPayments.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {recentPayments.map((item) => (
                    <div key={item.payment.id} className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <Link href={`/students/${item.payment.studentId}`} className="font-medium text-sm hover:underline hover:text-primary">
                          {item.studentName}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{item.payment.method}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{item.payment.transactionRef}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-foreground">{formatCurrency(item.payment.amount)}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.payment.paymentDate)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No recent payments found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
