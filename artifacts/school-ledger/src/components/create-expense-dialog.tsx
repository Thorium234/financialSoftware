import { useState } from "react";
import { useCreateExpense, useListAccounts, getListExpensesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, CheckCircle2, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const CATEGORIES = [
  "Utilities", "Salaries", "Maintenance", "Stationery", "Transport",
  "Cleaning", "Security", "Catering", "Equipment", "Other",
];

export function CreateExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [approvedBy, setApprovedBy] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [done, setDone] = useState(false);

  const { data: accounts } = useListAccounts();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useCreateExpense();

  function reset() {
    setAccountId(""); setAmount(""); setDescription(""); setCategory("");
    setVoucherNumber(""); setExpenseDate(new Date().toISOString().split("T")[0]);
    setApprovedBy(""); setSupplierName(""); setDone(false);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    setOpen(open);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !amount || !description || !category || !voucherNumber || !approvedBy) return;

    mutation.mutate(
      {
        data: {
          accountId: Number(accountId),
          amount: Number(amount),
          description,
          category,
          voucherNumber,
          expenseDate,
          approvedBy,
          supplierName: supplierName || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setDone(true);
          toast({
            title: "Expense Recorded",
            description: `${formatCurrency(Number(amount))} expense voucher ${voucherNumber} created`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed",
            description: "Could not record the expense. Please try again.",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Expense
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-destructive" />
            Record Expense Voucher
          </DialogTitle>
          <DialogDescription>
            Log an approved expenditure against a statutory fund account.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div className="font-medium text-base">Expense Recorded</div>
            <div className="text-sm text-muted-foreground">
              Voucher <span className="font-mono font-medium">{voucherNumber}</span> — {formatCurrency(Number(amount))}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => handleClose(false)}>Close</Button>
              <Button onClick={() => reset()}>Add Another</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="voucher">Voucher No. <span className="text-destructive">*</span></Label>
                <Input
                  id="voucher"
                  placeholder="e.g. EXP-2025-010"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expDate">Date</Label>
                <Input
                  id="expDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fund Account <span className="text-destructive">*</span></Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account…" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                      <span className="ml-2 text-xs text-muted-foreground capitalize">{a.accountType}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expAmount">Amount (KES) <span className="text-destructive">*</span></Label>
                <Input
                  id="expAmount"
                  type="number"
                  min="1"
                  placeholder="e.g. 12400"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Description <span className="text-destructive">*</span></Label>
              <Textarea
                id="desc"
                placeholder="e.g. Kenya Power electricity bill — June 2025"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="approvedBy">Approved By <span className="text-destructive">*</span></Label>
                <Input
                  id="approvedBy"
                  placeholder="e.g. Principal J. Otieno"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplier">Supplier / Payee</Label>
                <Input
                  id="supplier"
                  placeholder="e.g. Kenya Power"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !accountId || !amount || !description || !category || !voucherNumber || !approvedBy}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><Receipt className="h-4 w-4" /> Record Expense</>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
