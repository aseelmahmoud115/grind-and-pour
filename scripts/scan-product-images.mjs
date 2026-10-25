// Build-time helper: records which product images exist under public/images/products/<slug>/
// (1.webp, 2.webp, … and the "in the cup" photo cup.webp) so the catalog can hide products that
// have no photo yet and fall back to the shared cup image until a product's own cup.webp arrives.
// Runs automatically before `npm run dev` and `npm run build` (predev / prebuild).
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAX_IMAGES = 8;
const root = join(process.cwd(), "public", "images", "products");
const out = join(process.cwd(), "src", "data", "product-images.generated.json");

const manifest = {};
if (existsSync(root)) {
  for (const slug of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    const images = [];
    for (let n = 1; n <= MAX_IMAGES; n++) {
      if (existsSync(join(root, slug, `${n}.webp`))) images.push(`/images/products/${slug}/${n}.webp`);
    }
    if (existsSync(join(root, slug, "cup.webp"))) images.push(`/images/products/${slug}/cup.webp`);
    if (images.length) manifest[slug] = images;
  }
}

writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
console.log(`product images: ${Object.keys(manifest).length} products with photos -> src/data/product-images.generated.json`);
