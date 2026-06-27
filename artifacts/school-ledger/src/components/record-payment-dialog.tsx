import { useState } from "react";
import {
  useListStudents,
  useRecordPayment,
  getListPaymentsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetStudentQueryKey,
  getGetStudentStatementQueryKey,
  getGetDefaultersCountQueryKey,
  getListDefaultersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, CheckCircle2, Banknote } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { CURRENT_YEAR, CURRENT_TERM } from "@/lib/term";

export function RecordPaymentDialog() {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mpesa" | "bank" | "cash">("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [term, setTerm] = useState(String(CURRENT_TERM));
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const { data: students } = useListStudents();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useRecordPayment();

  const filtered = students?.filter(
    (s) =>
      !search ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );
  const selectedStudent = students?.find((s) => String(s.id) === studentId);

  function reset() {
    setStudentId(""); setSearch(""); setAmount(""); setMethod("cash");
    setTransactionRef(""); setMpesaPhone(""); setPaymentDate(new Date().toISOString().split("T")[0]);
    setTerm(String(CURRENT_TERM)); setNotes(""); setDone(false);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    setOpen(open);
  }

  function handleMethodChange(m: "mpesa" | "bank" | "cash") {
    setMethod(m);
    if (m !== "mpesa") setMpesaPhone("");
    if (m === "cash") setTransactionRef(`CASH-${Date.now().toString().slice(-4)}`);
    else setTransactionRef("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !amount || !transactionRef) return;

    mutation.mutate(
      {
        data: {
          studentId: Number(studentId),
          amount: Number(amount),
          method,
          transactionRef,
          mpesaPhone: method === "mpesa" ? mpesaPhone : undefined,
          paymentDate: `${paymentDate}T00:00:00.000Z`,
          academicYear: CURRENT_YEAR,
          term: Number(term),
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDefaultersCountQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListDefaultersQueryKey() });
          if (selectedStudent) {
            queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(selectedStudent.id) });
            queryClient.invalidateQueries({ queryKey: getGetStudentStatementQueryKey(selectedStudent.id) });
          }
          setDone(true);
          toast({
            title: "Payment Recorded",
            description: `${formatCurrency(Number(amount))} posted for ${selectedStudent?.fullName}`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed",
            description: "Could not record the payment. Please try again.",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" />
            Record Fee Payment
          </DialogTitle>
          <DialogDescription>
            Manually log a cash, bank, or M-Pesa payment to a student&apos;s account.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div className="font-medium text-base">Payment Recorded</div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(Number(amount))} posted for {selectedStudent?.fullName}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => handleClose(false)}>Close</Button>
              <Button onClick={() => { reset(); }}>Record Another</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Student <span className="text-destructive">*</span></Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student…" />
                </SelectTrigger>
                <SelectContent className="max-h-52">
                  {filtered?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <span>{s.fullName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{s.admissionNumber} · {s.class}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (KES) <span className="text-destructive">*</span></Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={(v) => handleMethodChange(v as "mpesa" | "bank" | "cash")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ref">
                  {method === "mpesa" ? "M-Pesa Receipt" : method === "bank" ? "Bank Ref" : "Voucher No."}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ref"
                  placeholder={method === "mpesa" ? "e.g. QA1234XYZ" : method === "bank" ? "e.g. TRN-001" : "Auto-generated"}
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Payment Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            {method === "mpesa" && (
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="254712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1 — {CURRENT_YEAR}</SelectItem>
                  <SelectItem value="2">Term 2 — {CURRENT_YEAR}</SelectItem>
                  <SelectItem value="3">Term 3 — {CURRENT_YEAR}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g. Partial payment, balance to be cleared next week"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !studentId || !amount || !transactionRef}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><PlusCircle className="h-4 w-4" /> Record Payment</>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
