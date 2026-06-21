import { useState } from "react";
import {
  useListPayments,
  useListUnmatchedMpesa,
  useMatchMpesaPayment,
  useReversePayment,
  useListStudents,
  getListUnmatchedMpesaQueryKey,
  getListPaymentsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, AlertCircle, Smartphone, Banknote, Building2, HelpCircle, GitMerge, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { CURRENT_YEAR, CURRENT_TERM } from "@/lib/term";

const methodIcon = (method: string) => {
  if (method === "mpesa") return <Smartphone className="h-3.5 w-3.5" />;
  if (method === "bank") return <Building2 className="h-3.5 w-3.5" />;
  return <Banknote className="h-3.5 w-3.5" />;
};

const methodLabel: Record<string, string> = { mpesa: "M-Pesa", bank: "Bank", cash: "Cash" };

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "default",
  pending: "secondary",
  failed: "destructive",
  reversed: "outline",
};

interface UnmatchedRow {
  id: number;
  mpesaRef: string;
  amount: number | string;
  phone: string;
  transactionDate: Date | string;
  accountNumber?: string | null;
}

function MatchDialog({ row, onClose }: { row: UnmatchedRow; onClose: () => void }) {
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [year] = useState(CURRENT_YEAR);
  const [term, setTerm] = useState(String(CURRENT_TERM));
  const [done, setDone] = useState(false);

  const { data: students } = useListStudents();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useMatchMpesaPayment();

  const filtered = students?.filter(
    (s) =>
      !search ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );

  const selectedStudent = students?.find((s) => String(s.id) === studentId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;

    mutation.mutate(
      {
        data: {
          unmatchedId: row.id,
          studentId: Number(studentId),
          academicYear: year,
          term: Number(term),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnmatchedMpesaQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setDone(true);
          toast({
            title: "Payment Matched",
            description: `${formatCurrency(Number(row.amount))} matched to ${selectedStudent?.fullName}`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Match Failed",
            description: "Could not match this transaction. Please try again.",
          });
        },
      }
    );
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <GitMerge className="h-5 w-5 text-primary" />
          Match M-Pesa Transaction
        </DialogTitle>
        <DialogDescription>
          Assign <span className="font-mono font-medium">{row.mpesaRef}</span> ({formatCurrency(Number(row.amount))}) to a student account.
        </DialogDescription>
      </DialogHeader>

      {done ? (
        <div className="py-6 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <div className="font-medium text-base">Matched Successfully</div>
          <div className="text-sm text-muted-foreground">
            {formatCurrency(Number(row.amount))} posted to {selectedStudent?.fullName}&apos;s account
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ref</span>
              <span className="font-mono">{row.mpesaRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold">{formatCurrency(Number(row.amount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{row.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(row.transactionDate.toString())}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Search Student</Label>
            <Input
              placeholder="Type name or admission no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assign to Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student…" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {filtered?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <span>{s.fullName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {s.admissionNumber} · {s.class}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Academic Year</Label>
              <Input value={year} disabled className="bg-muted" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !studentId} className="gap-2">
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Matching…</>
              ) : (
                <><GitMerge className="h-4 w-4" /> Match Payment</>
              )}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
}

export default function Payments() {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [matchRow, setMatchRow] = useState<UnmatchedRow | null>(null);
  const [reversingId, setReversingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: payments, isLoading, error } = useListPayments({
    method: method !== "all" ? (method as "mpesa" | "bank" | "cash") : undefined,
    status: status !== "all" ? (status as "confirmed" | "pending" | "reversed") : undefined,
  });

  const { data: unmatched, isLoading: isLoadingUnmatched } = useListUnmatchedMpesa();

  const reversePayment = useReversePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        toast({ title: "Payment reversed", description: "The payment has been reversed." });
        setReversingId(null);
      },
      onError: () => {
        toast({ title: "Failed to reverse payment", variant: "destructive" });
        setReversingId(null);
      },
    },
  });

  const handleReverse = (id: number) => {
    if (!window.confirm("Reverse this payment? This cannot be undone.")) return;
    setReversingId(id);
    reversePayment.mutate({ id });
  };

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

      <div className="flex justify-end">
        <RecordPaymentDialog />
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
              <SelectTrigger className="w-40"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell>
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
                          <TableCell>
                            {pw.payment.status === "confirmed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive text-xs h-7 px-2"
                                disabled={reversingId === pw.payment.id}
                                onClick={() => handleReverse(pw.payment.id)}
                              >
                                {reversingId === pw.payment.id ? "Reversing…" : "Reverse"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unmatched" className="mt-4 space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>Unmatched M-Pesa Transactions</AlertTitle>
            <AlertDescription>
              These payments arrived via Safaricom but could not be automatically linked to a student. 
              Click <strong>Match to Student</strong> to reconcile each one.
            </AlertDescription>
          </Alert>

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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUnmatched
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                      ))
                    : unmatched?.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
                            All M-Pesa transactions have been matched.
                          </TableCell>
                        </TableRow>
                      )
                    : unmatched?.map(u => (
                        <TableRow key={u.id} className="group">
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
                          <TableCell className="text-sm">{formatDate(u.transactionDate.toString())}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(u.amount))}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 opacity-80 group-hover:opacity-100"
                              onClick={() => setMatchRow(u)}
                            >
                              <GitMerge className="h-3.5 w-3.5" />
                              Match
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={matchRow !== null} onOpenChange={(open) => { if (!open) setMatchRow(null); }}>
        {matchRow && (
          <MatchDialog row={matchRow} onClose={() => setMatchRow(null)} />
        )}
      </Dialog>
    </div>
  );
}
