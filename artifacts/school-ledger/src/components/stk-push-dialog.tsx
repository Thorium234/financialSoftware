import { useState } from "react";
import { useListStudents, useInitiateMpesaStkPush } from "@workspace/api-client-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export function StkPushDialog() {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const { data: students } = useListStudents();
  const { toast } = useToast();
  const mutation = useInitiateMpesaStkPush();

  const filtered = students?.filter(
    (s) =>
      !search ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );

  const selectedStudent = students?.find((s) => String(s.id) === studentId);

  function handleStudentChange(id: string) {
    setStudentId(id);
    const s = students?.find((st) => String(st.id) === id);
    if (s?.guardianPhone) setPhoneNumber(s.guardianPhone);
  }

  function handleClose(open: boolean) {
    if (!open) {
      setStudentId("");
      setPhoneNumber("");
      setAmount("");
      setSearch("");
      setSuccess(null);
    }
    setOpen(open);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!studentId || !phoneNumber || !amt) return;

    mutation.mutate(
      { data: { studentId: Number(studentId), phoneNumber, amount: amt } },
      {
        onSuccess: (data) => {
          setSuccess(data.message);
          toast({
            title: "STK Push Sent",
            description: data.message,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed",
            description: "Could not initiate STK Push. Check the number and try again.",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Smartphone className="h-4 w-4" />
          STK Push
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            M-Pesa STK Push
          </DialogTitle>
          <DialogDescription>
            Send a payment prompt directly to a parent or guardian's phone.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div className="font-medium text-base">Prompt Sent!</div>
            <div className="text-sm text-muted-foreground">{success}</div>
            {selectedStudent && (
              <div className="text-xs text-muted-foreground">
                Student: {selectedStudent.fullName} ({selectedStudent.admissionNumber})
              </div>
            )}
            <Button variant="outline" className="mt-2" onClick={() => handleClose(false)}>
              Close
            </Button>
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
              <Label>Student</Label>
              <Select value={studentId} onValueChange={handleStudentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student…" />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {filtered?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <div className="flex items-center gap-2">
                        <span>{s.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.admissionNumber} · {s.class}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Format: 254XXXXXXXXX (no leading +)
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {amount && Number(amount) > 0 && (
                <div className="text-xs text-muted-foreground">
                  Sending prompt for {formatCurrency(Number(amount))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !studentId || !phoneNumber || !amount}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4" />
                    Send Prompt
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
