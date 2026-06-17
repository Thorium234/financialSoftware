import { useState } from "react";
import { useListPayments, useListUnmatchedMpesa } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, AlertCircle, Smartphone, Banknote, Building2, HelpCircle } from "lucide-react";
import { Link } from "wouter";

const methodIcon = (method: string) => {
  if (method === "mpesa") return <Smartphone className="h-3.5 w-3.5" />;
  if (method === "bank") return <Building2 className="h-3.5 w-3.5" />;
  return <Banknote className="h-3.5 w-3.5" />;
};

const methodLabel: Record<string, string> = {
  mpesa: "M-Pesa",
  bank: "Bank",
  cash: "Cash",
};

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  pending: "secondary",
  failed: "destructive",
  reversed: "outline",
};

export default function Payments() {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: payments, isLoading, error } = useListPayments({
    method: method !== "all" ? (method as "mpesa" | "bank" | "cash") : undefined,
    status: status !== "all" ? (status as "confirmed" | "pending" | "reversed") : undefined,
  });

  const { data: unmatched, isLoading: isLoadingUnmatched } = useListUnmatchedMpesa();

  const filtered = payments?.filter(pw =>
    !search ||
    pw.payment.transactionRef?.toLowerCase().includes(search.toLowerCase()) ||
    pw.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    pw.admissionNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments Log</h1>
        <div className="text-sm text-muted-foreground mt-1">All fee payments across M-Pesa, bank, and cash</div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="unmatched">
            Unmatched M-Pesa
            {unmatched && unmatched.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{unmatched.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ref, name, or admission no..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>

          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to load payments.</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                      ))
                    : filtered?.map(pw => (
                        <TableRow key={pw.payment.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {pw.payment.transactionRef || "—"}
                          </TableCell>
                          <TableCell>
                            <Link href={`/students/${pw.payment.studentId}`} className="font-medium hover:underline text-primary">
                              {pw.studentName}
                            </Link>
                            <div className="text-xs text-muted-foreground">{pw.admissionNumber}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1 font-normal">
                              {methodIcon(pw.payment.method)}
                              {methodLabel[pw.payment.method] ?? pw.payment.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {pw.payment.academicYear} T{pw.payment.term}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(pw.payment.paymentDate)}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor[pw.payment.status] ?? "secondary"} className="capitalize">
                              {pw.payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(pw.payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unmatched" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>M-Pesa Ref</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Account Hint</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUnmatched
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                      ))
                    : unmatched?.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            No unmatched M-Pesa transactions.
                          </TableCell>
                        </TableRow>
                      )
                    : unmatched?.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-xs">{u.mpesaRef}</TableCell>
                          <TableCell className="text-sm">{u.phone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.accountNumber ? (
                              <span className="font-mono">{u.accountNumber}</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <HelpCircle className="h-3 w-3" /> No account ref
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(u.transactionDate)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(u.amount))}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
