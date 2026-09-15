import { redirect } from "next/navigation";

export default function TerritoriesPage() {
  redirect("/opportunities?view=map");
}
