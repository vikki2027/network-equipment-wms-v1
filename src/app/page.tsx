import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-context";

export default async function Home() {
  const u = await getCurrentUser();
  if (u) {
    redirect("/dashboard");
  }
  redirect("/login");
}
