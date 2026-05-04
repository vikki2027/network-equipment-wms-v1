import { redirect } from "next/navigation";
import { Role } from "@/lib/db-enums";
import { getCurrentUser } from "@/lib/auth-context";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }
  return <UsersClient />;
}
