import { SHOPPING_CATEGORY_TREE, type ShoppingCategorySeed } from '../src/modules/shopping/category-taxonomy.js';
import { HOMEPAGE_VISUAL_MENU_SECTIONS } from '../src/modules/shopping/homepage-visual-menu.js';
import {
  buildChineseShoppingQuery,
  buildShoppingSearchCandidates,
  buildShoppingSearchContext,
  extractSearchFocusTokens,
} from '../src/modules/shopping/search.synonyms.js';

type CheckCase = {
  label: string;
  keyword?: string;
  category?: string;
  expectedCandidates?: string[];
  expectedChinese?: string[];
  expectedFocus?: string[];
};

const COMMON_SEARCH_CASES: CheckCase[] = [
  {
    label: 'Xiaomi phone cover',
    keyword: 'xiaomi phone cover',
    expectedCandidates: ['phone case', 'phone cover', 'xiaomi phone case'],
    expectedChinese: ['手机壳'],
    expectedFocus: ['phone case'],
  },
  {
    label: 'Oppo phone back cover',
    keyword: 'oppo phone back cover',
    expectedCandidates: ['phone case', 'phone back cover', 'oppo phone case'],
    expectedChinese: ['手机壳'],
    expectedFocus: ['phone case'],
  },
  {
    label: 'Phone glass',
    keyword: 'phone glass',
    expectedCandidates: ['phone tempered glass', 'screen protector'],
    expectedChinese: ['手机钢化膜'],
    expectedFocus: ['phone tempered glass'],
  },
  {
    label: 'Phone charger',
    keyword: 'phone charger',
    expectedCandidates: ['phone charger', 'fast charger'],
    expectedChinese: ['手机充电器'],
    expectedFocus: ['phone charger'],
  },
  { label: 'Hijab', keyword: 'hijab', expectedCandidates: ['hijab'], expectedChinese: ['头巾'], expectedFocus: ['hijab'] },
  { label: 'Burkha', keyword: 'burkha', expectedCandidates: ['burkha'], expectedChinese: ['罩袍'], expectedFocus: ['burkha'] },
  { label: 'Mens wear', keyword: 'mens wear', expectedCandidates: ['mens wear'] },
  { label: 'Watches', keyword: 'smart watch', expectedCandidates: ['smart watch', 'smartwatch'] },
  { label: 'Jewelry', keyword: 'necklace jewelry', expectedCandidates: ['necklace'] },
  { label: 'Shoes typo', keyword: 'show', expectedCandidates: ['shoes', 'footwear'] },
];

function flattenCategories(categories: ShoppingCategorySeed[]): ShoppingCategorySeed[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children || [])]);
}

function flattenHomepageVisualMenuSections() {
  return HOMEPAGE_VISUAL_MENU_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionKey: section.section_key,
      sectionLabel: section.section_label,
      sectionSortOrder: section.section_sort_order,
      ...item,
    }))
  );
}

function includesAny(values: string[], expected: string[]) {
  const normalizedValues = values.map((value) => value.toLowerCase());
  return expected.some((needle) => normalizedValues.some((value) => value.includes(needle.toLowerCase())));
}

function verifyDeterministicCase(testCase: CheckCase): string[] {
  const failures: string[] = [];
  const context = buildShoppingSearchContext(testCase.keyword, testCase.category);
  const candidates = buildShoppingSearchCandidates(testCase.keyword, testCase.category);
  const chineseQuery = buildChineseShoppingQuery(testCase.keyword, testCase.category);
  const focusTokens = extractSearchFocusTokens(testCase.keyword, testCase.category);

  if (!context.primaryKeyword) failures.push(`${testCase.label}: missing primary keyword`);
  if (candidates.length === 0) failures.push(`${testCase.label}: no candidates generated`);
  if (testCase.expectedCandidates && !includesAny(candidates, testCase.expectedCandidates)) {
    failures.push(`${testCase.label}: candidates ${JSON.stringify(candidates)} did not include any of ${JSON.stringify(testCase.expectedCandidates)}`);
  }
  if (testCase.expectedChinese && !includesAny([chineseQuery], testCase.expectedChinese)) {
    failures.push(`${testCase.label}: Chinese query "${chineseQuery}" did not include any of ${JSON.stringify(testCase.expectedChinese)}`);
  }
  if (testCase.expectedFocus && !includesAny(focusTokens, testCase.expectedFocus)) {
    failures.push(`${testCase.label}: focus ${JSON.stringify(focusTokens)} did not include any of ${JSON.stringify(testCase.expectedFocus)}`);
  }

  console.log(JSON.stringify({
    label: testCase.label,
    primaryKeyword: context.primaryKeyword,
    candidates: candidates.slice(0, 8),
    chineseQuery,
    focusTokens,
    groups: context.matchedGroupSlugs,
    subgroups: context.matchedSubgroupSlugs,
  }, null, 2));

  return failures;
}

async function verifyLiveCase(testCase: CheckCase, baseUrl: string): Promise<string[]> {
  const params = new URLSearchParams({
    page: '1',
    pageSize: '4',
    language: 'en',
  });
  if (testCase.keyword) params.set('keyword', testCase.keyword);
  if (testCase.category) params.set('category', testCase.category);

  const url = `${baseUrl.replace(/\/+$/, '')}/api/public/shopping/search?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    return [`${testCase.label}: ${response.status} ${response.statusText}`];
  }

  const data: any = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  console.log(JSON.stringify({
    label: testCase.label,
    url,
    count: items.length,
    titles: items.slice(0, 4).map((item: any) => item.title),
  }, null, 2));

  return items.length > 0 ? [] : [`${testCase.label}: live search returned no items`];
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const live = args.has('--live');
  const allLiveMenuItems = args.has('--all-live-menu');
  const baseUrl = process.env.VERIFY_SHOPPING_API_BASE_URL || 'http://localhost:3000';
  const failures: string[] = [];

  console.log('Checking common shopping search patterns...');
  for (const testCase of COMMON_SEARCH_CASES) {
    failures.push(...verifyDeterministicCase(testCase));
  }

  console.log('Checking taxonomy-driven menu patterns...');
  const categoryCases = flattenCategories(SHOPPING_CATEGORY_TREE).map((category) => ({
    label: `Menu: ${category.name}`,
    category: category.slug,
    expectedCandidates: [category.name.toLowerCase()],
  }));
  for (const testCase of categoryCases) {
    const context = buildShoppingSearchContext(testCase.category, testCase.category);
    const candidates = buildShoppingSearchCandidates(testCase.category, testCase.category);
    if (!context.primaryKeyword) failures.push(`${testCase.label}: missing primary keyword`);
    if (candidates.length === 0) failures.push(`${testCase.label}: no candidates generated`);
  }
  console.log(`Checked ${categoryCases.length} menu entries from SHOPPING_CATEGORY_TREE.`);

  console.log('Checking homepage visual menu patterns...');
  const homepageVisualMenuCases = flattenHomepageVisualMenuSections().map((item) => ({
    label: `Homepage tile: ${item.sectionLabel} / ${item.title}`,
    keyword: item.search_keyword,
    expectedCandidates: [item.search_keyword, item.title],
  }));
  for (const testCase of homepageVisualMenuCases) {
    failures.push(...verifyDeterministicCase(testCase));
  }
  console.log(`Checked ${homepageVisualMenuCases.length} homepage visual menu tiles.`);

  if (live) {
    console.log(`Running live checks against ${baseUrl}...`);
    const liveCases = allLiveMenuItems ? [...COMMON_SEARCH_CASES, ...categoryCases, ...homepageVisualMenuCases] : COMMON_SEARCH_CASES;
    for (const testCase of liveCases) {
      failures.push(...await verifyLiveCase(testCase, baseUrl));
    }
  }

  if (failures.length > 0) {
    console.error('Shopping search verification failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Shopping search verification passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
