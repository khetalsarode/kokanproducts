import { redirect } from "next/navigation";

/** Legacy path — customer registration lives at /customer/register. */
export default function RegisterRedirect() {
  redirect("/customer/register");
}
