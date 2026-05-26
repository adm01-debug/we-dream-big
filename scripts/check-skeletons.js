import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ALLOWED_IMPORT_SKELETON_UI = [
  "src/components/loading/ModernSkeletons.tsx",
  "src/components/layout/SkeletonLoaders.tsx",
  "src/components/ui/skeleton.tsx",
  "src/components/cart/CartItemSkeleton.tsx",
  "src/components/products/ProductDetailSkeleton.tsx",
  "src/components/bi/BISkeletons.tsx"
];

const IGNORED_DIRS = ["node_modules", ".git", "dist", ".next", ".agents"];

function getFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const name = join(dir, file);
    if (statSync(name).isDirectory()) {
      if (IGNORED_DIRS.some(d => name.includes(d))) continue;
      getFiles(name, fileList);
    } else {
      if ([".tsx", ".ts", ".js", ".jsx"].includes(extname(name))) {
        fileList.push(name);
      }
    }
  }
  return fileList;
}

console.log("🔍 Checking for legacy skeleton usage and standard compliance...");

const allFiles = getFiles("src");
let errors = 0;
let warnings = 0;

for (const file of allFiles) {
  const content = readFileSync(file, "utf8");
  
  // Rule 1: Avoid direct imports of @/components/ui/skeleton in pages/features
  if (content.includes("@/components/ui/skeleton") && !ALLOWED_IMPORT_SKELETON_UI.includes(file)) {
    console.warn(`⚠️ [WARNING] ${file} imports Skeleton directly. Consider using ModernSkeletons components.`);
    warnings++;
  }

  // Rule 2: Check for multiple Suspense in the same file (potential double skeleton)
  const suspenseCount = (content.match(/<Suspense/g) || []).length;
  if (suspenseCount > 1) {
    console.info(`ℹ️ [INFO] ${file} has multiple Suspense blocks (${suspenseCount}). Ensure they aren't nesting skeletons.`);
  }

  // Rule 3: Ensure skeletons have IDs for traceability
  if (file === "src/components/loading/ModernSkeletons.tsx") {
    const skeletonUsageWithoutId = (content.match(/<Skeleton(?!.*id=)/g) || []).length;
    if (skeletonUsageWithoutId > 0) {
      console.error(`❌ [ERROR] ${file} has ${skeletonUsageWithoutId} Skeleton usages without an 'id' prop.`);
      errors++;
    }
  }
}

console.log(`\n✅ Audit complete: ${errors} errors, ${warnings} warnings.`);
if (errors > 0) process.exit(1);
