import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Users, Calendar, BadgeCheck } from "lucide-react";

export interface StudentAcademicData {
  grade?: string;
  section?: string;
  student_id?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  enrollment_status?: string;
  enrollment_date?: string;
  [key: string]: unknown;
}

interface StudentAcademicFormProps {
  data: StudentAcademicData;
  onChange: (data: StudentAcademicData) => void;
}

const GRADES = [
  'Pre-School', 'Reception',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7',
  'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];

const RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Sibling', 'Uncle', 'Aunt', 'Other'];

const ENROLLMENT_STATUSES = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'transferred', label: 'Transferred' },
];

export function StudentAcademicForm({ data, onChange }: StudentAcademicFormProps) {
  const update = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Academic Information */}
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <GraduationCap className="h-4 w-4 text-primary" />
          Academic Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input
              value={data.student_id || ''}
              onChange={(e) => update('student_id', e.target.value)}
              placeholder="e.g., STU-2026-001"
            />
          </div>
          <div className="space-y-2">
            <Label>Grade / Level</Label>
            <Select value={data.grade || ''} onValueChange={(v) => update('grade', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class / Section</Label>
            <Input
              value={data.section || ''}
              onChange={(e) => update('section', e.target.value)}
              placeholder="e.g., 1A, 2B"
            />
          </div>
          <div className="space-y-2">
            <Label>Enrollment Status</Label>
            <Select value={data.enrollment_status || 'enrolled'} onValueChange={(v) => update('enrollment_status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENROLLMENT_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-2">
                      <BadgeCheck className="h-3 w-3" />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Enrollment Date</Label>
            <Input
              type="date"
              value={data.enrollment_date || ''}
              onChange={(e) => update('enrollment_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Guardian Information */}
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          Guardian Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Guardian Name</Label>
            <Input
              value={data.guardian_name || ''}
              onChange={(e) => update('guardian_name', e.target.value)}
              placeholder="Full name of parent/guardian"
            />
          </div>
          <div className="space-y-2">
            <Label>Guardian Phone</Label>
            <Input
              value={data.guardian_phone || ''}
              onChange={(e) => update('guardian_phone', e.target.value)}
              placeholder="+260 97X XXX XXX"
            />
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select value={data.guardian_relationship || ''} onValueChange={(v) => update('guardian_relationship', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
