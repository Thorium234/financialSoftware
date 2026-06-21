import { useState } from "react";
import {
  useGetTermSummaryReport,
  useGetFeesCollectedReport,
  useGetVoteBookReport,
  useListAccounts,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Download, TrendingUp, Landmark, Receipt } from "lucide-react";
import { CURRENT_YEAR, CURRENT_TERM } from "@/lib/term";

export default function Reports() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [term, setTerm] = useState(String(CURRENT_TERM));
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);

  const { data: termSummary, isLoading: isLoadingTermSummary } = useGetTermSummaryReport({
    academicYear: year,
    term: Number(term),
  });

  const { data: feesCollected, isLoading: isLoadingFees } = useGetFeesCollectedReport({
    academicYear: year,
    term: Number(term),
  });

  const { data: accounts } = useListAccounts();

  const outstanding = (termSummary?.totalExpected ?? 0) - (termSummary?.totalCollected ?? 0);
  const collectionRate = termSummary && termSummary.totalExpected > 0
    ? (termSummary.totalCollected / termSummary.totalExpected) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports Hub</h1>
          <div className="text-sm text-muted-foreground mt-1">MoE-compliant financial reports for {year} Term {term}</div>
        </div>
        <Button variant="outline" className="gap-2" disabled>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
          </SelectContent>
        </Select>
        <Select value={term} onValueChange={setTerm}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Term 1</SelectItem>
            <SelectItem value="2">Term 2</SelectItem>
            <SelectItem value="3">Term 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="term-summary">
        <TabsList>
          <TabsTrigger value="term-summary" className="gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Term Summary
          </TabsTrigger>
          <TabsTrigger value="vote-book" className="gap-2">
            <Landmark className="h-3.5 w-3.5" />
            Vote Book
          </TabsTrigger>
          <TabsTrigger value="fees-collected" className="gap-2">
            <Receipt className="h-3.5 w-3.5" />
            Fees Collected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="term-summary" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {isLoadingTermSummary
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
                    <CardContent><Skeleton className="h-8 w-full" /></CardContent>
                  </Card>
                ))
              : [
                  { label: "Total Expected", value: formatCurrency(termSummary?.totalExpected ?? 0), color: "" },
                  { label: "Total Collected", value: formatCurrency(termSummary?.totalCollected ?? 0), color: "text-green-600" },
                  { label: "Outstanding", value: formatCurrency(outstanding), color: "text-destructive" },
                  { label: "Collection Rate", value: `${collectionRate.toFixed(1)}%`, color: "" },
                ].map((item, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                    </CardContent>
                  </Card>
                ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Income vs Expenditure
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTermSummary ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Collected</span>
                      <span className="font-medium text-green-600">{formatCurrency(termSummary?.totalCollected ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Expenditure</span>
                      <span className="font-medium text-destructive">{formatCurrency(termSummary?.totalExpenditure ?? 0)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Surplus</span>
                      <span className={(termSummary?.surplus ?? 0) >= 0 ? "text-green-600" : "text-destructive"}>
                        {formatCurrency(termSummary?.surplus ?? 0)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fund Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenditure</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTermSummary
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                        ))
                      : termSummary?.fundBreakdown?.map(row => (
                          <TableRow key={row.accountType}>
                            <TableCell>
                              <div className="font-medium text-sm">{row.accountName}</div>
                              <div className="text-xs text-muted-foreground capitalize">{row.accountType}</div>
                            </TableCell>
                            <TableCell className="text-right text-sm text-green-600">{formatCurrency(row.income)}</TableCell>
                            <TableCell className="text-right text-sm text-destructive">{formatCurrency(row.expenditure)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(row.balance)}</TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vote-book" className="mt-4 space-y-4">
          <div className="flex gap-3 items-center">
            <span className="text-sm text-muted-foreground">Select account:</span>
            <Select
              value={selectedAccount !== null ? String(selectedAccount) : ""}
              onValueChange={v => setSelectedAccount(Number(v))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Choose a fund account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccount !== null ? (
            <VoteBookPanel accountId={selectedAccount} academicYear={year} />
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Select a fund account to view its vote book
            </div>
          )}
        </TabsContent>

        <TabsContent value="fees-collected" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Class</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingFees
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                        ))
                      : feesCollected?.classBreakdown?.map(row => (
                          <TableRow key={row.class}>
                            <TableCell><Badge variant="outline">{row.class}</Badge></TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(row.expected)}</TableCell>
                            <TableCell className="text-right text-sm text-green-600">{formatCurrency(row.collected)}</TableCell>
                            <TableCell className="text-right text-sm text-destructive">{formatCurrency(row.outstanding)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={row.collectionRate >= 90 ? "default" : row.collectionRate >= 60 ? "secondary" : "destructive"}>
                                {row.collectionRate.toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingFees
                      ? Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                        ))
                      : feesCollected?.methodBreakdown?.map(row => (
                          <TableRow key={row.method}>
                            <TableCell className="capitalize font-medium">
                              {row.method === "mpesa" ? "M-Pesa" : row.method}
                            </TableCell>
                            <TableCell className="text-right text-sm">{row.count}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {feesCollected.total > 0
                                ? `${((row.amount / feesCollected.total) * 100).toFixed(1)}%`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                    {feesCollected && feesCollected.methodBreakdown.length > 0 && (
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {feesCollected.methodBreakdown.reduce((s, r) => s + r.count, 0)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(feesCollected.total)}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VoteBookPanel({ accountId, academicYear }: { accountId: number; academicYear: string }) {
  const { data: voteBook, isLoading } = useGetVoteBookReport({ accountId, academicYear });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{voteBook?.accountName ?? "Vote Book"}</CardTitle>
        <CardDescription>
          {isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <>Opening: {formatCurrency(voteBook?.openingBalance ?? 0)} → Closing: {formatCurrency(voteBook?.closingBalance ?? 0)}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                ))
              : voteBook?.transactions?.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                      No transactions for this account in {academicYear}.
                    </TableCell>
                  </TableRow>
                )
              : voteBook?.transactions?.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{formatDate(tx.transactionDate.toString())}</TableCell>
                    <TableCell className="text-sm">{tx.description}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "credit" ? "default" : "secondary"} className="capitalize text-xs">
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === "credit" ? "text-green-600" : "text-destructive"}`}>
                      {tx.type === "credit" ? "+" : "−"}{formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(tx.balance)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
