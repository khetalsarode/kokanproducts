import { redirect } from "next/navigation";

/** Public admin registration is closed — send visitors to admin login. */
export default function AdminRegisterPage() {
  redirect("/admin/login");
}
