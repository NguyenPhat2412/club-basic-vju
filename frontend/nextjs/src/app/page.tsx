import { redirect } from "next/navigation";

function initials(value: string) { return value.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase(); }

export default function Home() {
export default function Home() {
  redirect("/clubs");
}
}
