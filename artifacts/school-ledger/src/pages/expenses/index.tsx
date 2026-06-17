import { useState } from "react";
import { useListExpenses, useListAccounts } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search, Receipt } from "lucide-react";

const accountNameMap: Record<string, string> = {};

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");

  const { data: accounts } = useListAccounts();
  const { data: expenses, isLoading, error } = useListExpenses({
    accountId: accountFilter !== "all" ? Number(accountFilter) : undefined,
  });

  const accLookup: Record<number, string> = {};
  accounts?.forEach(a => { accLookup[a.id] = a.name; });

  const filtered = expenses?.filter(e =>
    !search ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.voucherNumber?.toLowerCase().includes(search.toLowerCase()) ||
    e.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalApproved = filtered
    ?.filter(e => e.status === "approved")
    .reduce((sum, e) => sum + e.amount, 0) ?? 0;

  const totalVoid = filtered
    ?.filter(e => e.status === "void")
    .reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expense Vouchers</h1>
        <div className="text-sm text-muted-foreground mt-1">School expenditure across all fund accounts</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Approved Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalApproved)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {filtered?.filter(e => e.status === "approved").length ?? 0} approved vouchers
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Void / Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{formatCurrency(totalVoid)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {filtered?.filter(e => e.status === "void").length ?? 0} void vouchers
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expense Vouchers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Total records shown</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description, voucher, supplier..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts?.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load expenses.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                : filtered?.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No expense vouchers found.
                      </TableCell>
                    </TableRow>
                  )
                : filtered?.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.voucherNumber ?? "—"}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={e.description}>{e.description}</TableCell>
                      <TableCell>
                        {e.category && (
                          <Badge variant="secondary" className="text-xs font-normal">{e.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {accLookup[e.accountId] ?? `Account #${e.accountId}`}
                      </TableCell>
                      <TableCell className="text-sm">{e.supplierName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{formatDate(e.expenseDate.toString())}</TableCell>
                      <TableCell>
                        <Badge
                          variant={e.status === "approved" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
