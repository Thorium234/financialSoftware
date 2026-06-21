import { useState } from "react";
import {
  useListExpenses,
  useListAccounts,
  useVoidExpense,
  getListExpensesQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CreateExpenseDialog } from "@/components/create-expense-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search, Receipt } from "lucide-react";

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [voidingId, setVoidingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: accounts } = useListAccounts();
  const { data: expenses, isLoading, error } = useListExpenses({
    accountId: accountFilter !== "all" ? Number(accountFilter) : undefined,
  });
  const voidExpense = useVoidExpense({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Expense voided", description: "Voucher has been marked void." });
        setVoidingId(null);
      },
      onError: () => {
        toast({ title: "Failed to void expense", variant: "destructive" });
        setVoidingId(null);
      },
    },
  });

  const handleVoid = (id: number) => {
    if (!window.confirm("Mark this expense as void? This cannot be undone.")) return;
    setVoidingId(id);
    voidExpense.mutate({ id });
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Vouchers</h1>
          <div className="text-sm text-muted-foreground mt-1">School expenditure across all fund accounts</div>
        </div>
        <CreateExpenseDialog />
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                : filtered?.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
                      <TableCell>
                        {e.status === "approved" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive text-xs h-7 px-2"
                            disabled={voidingId === e.id}
                            onClick={() => handleVoid(e.id)}
                          >
                            {voidingId === e.id ? "Voiding…" : "Void"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
