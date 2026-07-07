import { redirect } from "next/navigation";

// The admin app has a single login page, in Spanish, at /acceso. This old
// English "Admin Portal" route is kept only as a redirect so any bookmark or
// stale link still lands on the real login.
export default function LoginPage() {
  redirect("/acceso");
}
