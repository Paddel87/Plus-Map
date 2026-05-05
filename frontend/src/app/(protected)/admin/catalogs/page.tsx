import { redirect } from "next/navigation";

export default function CatalogsIndexPage() {
  redirect("/admin/catalogs/equipment-items");
}
