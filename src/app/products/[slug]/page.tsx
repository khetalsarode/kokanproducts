import { notFound } from "next/navigation";
import { getCatalogProduct, listCatalogProducts } from "@/lib/catalog";
import { ProductDetail } from "./ProductDetail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return { title: "Product" };
  return { title: product.name, description: product.description };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) notFound();
  const related = (await listCatalogProducts())
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  return <ProductDetail product={product} related={related} />;
}
