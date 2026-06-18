import { useState } from "react";
import { useCreateStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
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
import { Plus, Loader2, CheckCircle2, GraduationCap } from "lucide-react";

const CLASS_OPTIONS = ["Form 1", "Form 2", "Form 3", "Form 4"];
const STREAM_OPTIONS = ["East", "West", "North", "South", "A", "B"];

export function EnrollStudentDialog() {
  const [open, setOpen] = useState(false);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [stream, setStream] = useState("East");
  const [maishaNumber, setMaishaNumber] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [done, setDone] = useState<{ name: string; admNo: string } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useCreateStudent();

  function reset() {
    setAdmissionNumber(""); setFullName(""); setStudentClass(""); setStream("East");
    setMaishaNumber(""); setGuardianName(""); setGuardianPhone(""); setDone(null);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    setOpen(open);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!admissionNumber || !fullName || !studentClass) return;

    mutation.mutate(
      {
        data: {
          admissionNumber,
          fullName,
          class: studentClass,
          stream,
          maishaNumber: maishaNumber || undefined,
          guardianName: guardianName || undefined,
          guardianPhone: guardianPhone || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          setDone({ name: fullName, admNo: admissionNumber });
          toast({
            title: "Student Enrolled",
            description: `${fullName} (${admissionNumber}) added to ${studentClass}`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Enrollment Failed",
            description: "Could not enroll the student. Check that the admission number is unique.",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Enroll Student
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Enroll New Student
          </DialogTitle>
          <DialogDescription>
            Add a new student to the school register. Fields marked <span className="text-destructive">*</span> are required.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div className="font-medium text-base">Student Enrolled</div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{done.name}</span> ({done.admNo}) has been added to the register.
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => handleClose(false)}>Close</Button>
              <Button onClick={() => reset()}>Enroll Another</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="admNo">Admission No. <span className="text-destructive">*</span></Label>
                <Input
                  id="admNo"
                  placeholder="e.g. ADM/2025/001"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maisha">NEMIS Maisha Number</Label>
                <Input
                  id="maisha"
                  placeholder="e.g. 12345678901"
                  value={maishaNumber}
                  onChange={(e) => setMaishaNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Jane Wanjiku Kamau"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class <span className="text-destructive">*</span></Label>
                <Select value={studentClass} onValueChange={setStudentClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stream</Label>
                <Select value={stream} onValueChange={setStream}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STREAM_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Parent / Guardian
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gName">Guardian Name</Label>
                  <Input
                    id="gName"
                    placeholder="e.g. Peter Kamau"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gPhone">Guardian Phone</Label>
                  <Input
                    id="gPhone"
                    placeholder="254712345678"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !admissionNumber || !fullName || !studentClass}
                className="gap-2"
              >
                {mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling…</>
                ) : (
                  <><Plus className="h-4 w-4" /> Enroll Student</>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
