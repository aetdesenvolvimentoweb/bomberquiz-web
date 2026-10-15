import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/api";
import { useSession } from "@/features/session/use-session";
import { Link } from "react-router-dom";
import { AvatarEditor } from "./avatar-editor";
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AvatarEditor user={user} />
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
