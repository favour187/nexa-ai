import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Settings
      </h1>
      <p className="mt-1 text-slate-500">Account and preferences.</p>

      <Card className="mt-6 p-6">
        <p className="text-sm text-slate-600">
          Notification preferences and account settings arrive in a later phase.
        </p>
      </Card>
    </div>
  );
}
