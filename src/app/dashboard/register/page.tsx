import { redirect } from "next/navigation";
import { Role } from "@/lib/db-enums";
import { getCurrentUser } from "@/lib/auth-context";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (!user || user.role === Role.VIEWER) {
    redirect("/dashboard");
  }
  return <RegisterForm />;
}
