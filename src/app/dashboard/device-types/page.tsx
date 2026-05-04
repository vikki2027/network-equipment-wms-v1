import { redirect } from "next/navigation";
import { Role } from "@/lib/db-enums";
import { getCurrentUser } from "@/lib/auth-context";
import { DeviceTypesClient } from "./device-types-client";

export default async function DeviceTypesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }
  return <DeviceTypesClient />;
}
