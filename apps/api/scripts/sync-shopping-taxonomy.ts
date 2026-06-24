import { PrismaClient } from '@prisma/client';
import { SHOPPING_CATEGORY_TREE, type ShoppingCategorySeed } from '../src/modules/shopping/category-taxonomy.js';

const prisma = new PrismaClient();

async function upsertCategory(category: ShoppingCategorySeed, parentId: string | null) {
  const record = await prisma.productCategory.upsert({
    where: { slug: category.slug },
    update: {
      name: category.name,
      description: category.description ?? null,
      icon: category.icon,
      sort_order: category.sort_order,
      is_active: true,
      parent_id: parentId,
    },
    create: {
      name: category.name,
      slug: category.slug,
      description: category.description ?? null,
      icon: category.icon,
      sort_order: category.sort_order,
      is_active: true,
      parent_id: parentId,
    },
  });

  for (const child of category.children || []) {
    await upsertCategory(child, record.id);
  }

  return record;
}

async function main() {
  console.log('Syncing shopping category taxonomy...');

  for (const category of SHOPPING_CATEGORY_TREE) {
    await upsertCategory(category, null);
  }

  const activeSlugs = new Set<string>();
  const collect = (items: ShoppingCategorySeed[]) => {
    for (const item of items) {
      activeSlugs.add(item.slug);
      collect(item.children || []);
    }
  };
  collect(SHOPPING_CATEGORY_TREE);

  await prisma.productCategory.updateMany({
    where: {
      slug: { notIn: Array.from(activeSlugs) },
      products: { none: {} },
    },
    data: { is_active: false },
  });

  console.log(`Synced ${activeSlugs.size} active category nodes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
