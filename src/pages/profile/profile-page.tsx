import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/api";
import { useSession } from "@/features/session/use-session";
import { getInitials } from "@/lib/initials";
import { Link } from "react-router-dom";
import { ChangeEmailSection } from "./change-email-section";
import { ChangePasswordSection } from "./change-password-section";
import { DangerZoneSection } from "./danger-zone-section";
import { PersonalInfoSection } from "./personal-info-section";

export function ProfilePage() {
  const { user } = useSession();
  const logoutMutation = useLogout();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember text-ember-foreground">
              {getInitials(user.name)}
            </div>
          )}
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/inicio">Voltar</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            loading={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "Saindo…" : "Sair"}
          </Button>
        </div>
      </div>

      <PersonalInfoSection user={user} />
      <ChangeEmailSection currentEmail={user.email} />
      <ChangePasswordSection />
      <DangerZoneSection />
    </div>
  );
}
