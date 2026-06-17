import { useState } from "react";
import { useListAccounts, useListAccountTransactions } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Landmark, TrendingUp, TrendingDown } from "lucide-react";

const accountTypeColor: Record<string, string> = {
  tuition: "bg-blue-100 text-blue-800 border-blue-200",
  operations: "bg-orange-100 text-orange-800 border-orange-200",
  bom: "bg-purple-100 text-purple-800 border-purple-200",
  capitation: "bg-green-100 text-green-800 border-green-200",
};

const accountTypeLabel: Record<string, string> = {
  tuition: "Tuition",
  operations: "Operations",
  bom: "BOM",
  capitation: "Capitation",
};

export default function Accounts() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const { data: accounts, isLoading, error } = useListAccounts();

  const { data: transactions, isLoading: isLoadingTx } = useListAccountTransactions(
    { accountId: selectedAccountId ?? 0 },
  );

  const selected = accounts?.find(a => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fund Accounts</h1>
        <div className="text-sm text-muted-foreground mt-1">Statutory vote accounts — Tuition, Operations, BOM, Capitation</div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load fund accounts.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="cursor-pointer">
                <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-full" /></CardContent>
              </Card>
            ))
          : accounts?.map(acc => (
              <Card
                key={acc.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAccountId === acc.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedAccountId(acc.id === selectedAccountId ? null : acc.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className={accountTypeColor[acc.accountType] ?? ""}
                    >
                      {accountTypeLabel[acc.accountType] ?? acc.accountType}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-medium mt-2">{acc.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(acc.currentBalance)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Current balance</div>
                  <div className="text-xs text-muted-foreground mt-1 truncate capitalize">{acc.description}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {selectedAccountId !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Transactions — {selected?.name}
            </CardTitle>
            <CardDescription>All credits and debits for this account</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Ref Type</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTx
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  : transactions?.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No transactions for this account yet.
                        </TableCell>
                      </TableRow>
                    )
                  : transactions?.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{formatDate(tx.transactionDate.toString())}</TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{tx.referenceType}</TableCell>
                        <TableCell>
                          {tx.type === "credit" ? (
                            <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
                              <TrendingUp className="h-3 w-3" /> Credit
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-red-700 border-red-300">
                              <TrendingDown className="h-3 w-3" /> Debit
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                          {tx.type === "credit" ? "+" : "−"}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(tx.balance)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedAccountId === null && !isLoading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Click on a fund account card above to view its transaction history.
        </div>
      )}
    </div>
  );
}
