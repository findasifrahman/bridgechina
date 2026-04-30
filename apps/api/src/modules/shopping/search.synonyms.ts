export type ShoppingSynonymSubgroup = {
  slug: string;
  label: string;
  primary: string;
  aliases: string[];
};

export type ShoppingSynonymGroup = {
  slug: string;
  label: string;
  primary: string;
  aliases: string[];
  subgroups: ShoppingSynonymSubgroup[];
};

export type ShoppingSearchContext = {
  rawKeyword: string;
  normalizedKeyword: string;
  primaryKeyword: string;
  searchTerms: string[];
  relevanceHints: string[];
  buyerIntentTerms: string[];
  tokens: string[];
  matchedGroupSlugs: string[];
  matchedSubgroupSlugs: string[];
};

const GROUP_ZH_HINTS: Record<string, string[]> = {
  electronics: ['电子产品', '数码', '电器'],
  clothing: ['服装', '童装', '婴儿服装', '男装', '女装'],
  home: ['家居', '厨房', '家用', '家居厨房', '家居配件', '家居用品'],
  baby: ['母婴', '婴儿用品', '宝宝用品', '婴儿品'],
  toys: ['玩具', '儿童玩具'],
  beauty: ['美妆', '个护', '美容'],
  sports: ['运动', '户外', '健身'],
  automotive: ['汽车', '汽配', '车载'],
  industrial: ['工业', '机械', '工厂', '五金', '数控', '电子工具'],
  medical: ['医疗器械', '医疗用品', '康复器械', '医疗设备', '轮椅'],
  jewelry: ['珠宝', '首饰', '饰品'],
  eyewear: ['眼镜', '镜框', '太阳镜', '手表', '腕表'],
  chocolate: ['巧克力', '糖果'],
};

const SUBGROUP_ZH_HINTS: Record<string, string[]> = {
  smartphones: ['手机', '智能手机', '移动电话'],
  laptops: ['笔记本电脑', '电脑'],
  tablets: ['平板电脑'],
  audio: ['耳机', '耳麦', '音频'],
  cameras: ['相机', '摄像机'],
  wearables: ['手表', '智能手表', '腕表', '手表表带', '电子手表'],
  chargers: ['充电器', '适配器'],
  baby: ['婴儿', '宝宝', '母婴', '童装', '婴儿用品', '宝宝用品'],
  tshirts: ['T恤', 'T恤衫'],
  jeans: ['牛仔裤'],
  dresses: ['连衣裙'],
  jackets: ['夹克', '外套'],
  shoes: ['鞋子', '运动鞋', '鞋', '鞋类', '休闲鞋'],
  accessories: ['配饰'],
  'baby-clothing': ['婴儿服装', '婴儿衣服', '童装', '宝宝衣服', '婴儿服饰'],
  furniture: ['家具'],
  kitchen: ['厨房用品', '厨具', '餐具', '家居用品', '家居配件', '家居饰品', '厨房工具', '厨房配件'],
  bedding: ['床品', '床上用品'],
  decor: ['家居装饰', '家居配件', '家居饰品', '家居装潢', '家居摆件', '家居配件'],
  garden: ['园艺'],
  lighting: ['照明', '灯具'],
  storage: ['收纳'],
  tools: ['电钻', '手电钻', '冲击钻', '电动工具', '五金工具', 'cnc', 'cnc machine', 'cnc router', '数控机床', '雕刻机', '水果切刀', '果蔬切刀', '削皮器', '切片器', '切菜器', 'drill machine', 'drill press', 'laser machine', 'engraving machine', 'milling machine'],
  beauty_tools: ['美容工具'],
  skincare: ['护肤'],
  makeup: ['化妆品', '彩妆'],
  'hair-care': ['护发'],
  fragrance: ['香水'],
  'mens-care': ['男士护理'],
  'bath-body': ['沐浴', '身体护理'],
  'nail-care': ['美甲'],
  fitness: ['健身器材'],
  running: ['跑步'],
  cycling: ['骑行', '自行车'],
  camping: ['露营'],
  swimming: ['游泳'],
  yoga: ['瑜伽'],
  'outdoor-gear': ['户外装备'],
  'sports-apparel': ['运动服'],
  bats: ['球棒', '球棍', '棒球棒', '板球棒', '球拍', '棒球棍', '板球拍'],
  'car-parts': ['汽车零件', '汽车配件'],
  maintenance: ['维修', '保养'],
  interior: ['汽车内饰'],
  exterior: ['汽车外饰'],
  motorcycle: ['摩托车'],
  machinery: ['机械', '机器'],
  equipment: ['设备', '医疗设备', '医疗器械', '轮椅', '助行器', '拐杖'],
  supplies: ['耗材'],
  safety: ['安全防护'],
  packaging: ['包装'],
  office: ['办公用品'],
  materials: ['原材料'],
  necklace: ['项链'],
  ring: ['戒指'],
  earring: ['耳环'],
  bracelet: ['手链'],
  pendant: ['吊坠'],
  brooch: ['胸针'],
  'hair-accessories': ['发饰'],
  anklet: ['脚链'],
  sunglasses: ['太阳镜'],
  'reading-glasses': ['老花镜'],
  frames: ['镜框'],
  lenses: ['镜片'],
  cases: ['眼镜盒'],
  prescription: ['近视眼镜', '处方镜', '验光镜'],
  fashion: ['时尚眼镜'],
  dark: ['黑巧克力'],
  milk: ['牛奶巧克力'],
  white: ['白巧克力'],
  truffles: ['松露巧克力'],
  bars: ['巧克力棒'],
  'gift-box': ['礼盒'],
  bulk: ['批量', '批发'],
  'sugar-free': ['无糖'],
  wheelchair: ['轮椅', '电动轮椅', '手动轮椅'],
  medical: ['医疗器械', '医疗设备', '医用'],
};

const STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'by', 'e']);
const GENERIC_QUERY_WORDS = new Set([
  'machine',
  'machines',
  'product',
  'products',
  'item',
  'items',
  'goods',
  'tool',
  'tools',
  'equipment',
  'accessory',
  'accessories',
  'set',
  'sets',
  'new',
  'best',
  'top',
  'premium',
  'sale',
  'supplier',
  'suppliers',
  'vendor',
  'vendors',
  'seller',
  'sellers',
  'wholesale',
  'wholesaler',
  'bulk',
  'trade',
  'factory',
  'manufacture',
  'manufacturer',
  'manufacturing',
  'custom',
  'customized',
  'customised',
  'private',
  'label',
  'oem',
  'odm',
]);

const BUYER_INTENT_SYNONYMS: Array<{ term: string; aliases: string[] }> = [
  { term: 'supplier', aliases: ['supplier', 'suppliers', 'vendor', 'vendors', 'seller', 'sellers', 'source'] },
  { term: 'wholesale', aliases: ['wholesale', 'wholesaler', 'bulk', 'bulk order', 'bulk buy', 'trade'] },
  { term: 'factory', aliases: ['factory', 'manufacture', 'manufacturer', 'manufacturing', 'direct factory', 'factory direct'] },
  { term: 'custom', aliases: ['custom', 'customized', 'customised', 'made to order', 'made-to-order', 'private label', 'oem', 'odm'] },
  { term: 'oem', aliases: ['oem', 'odm', 'private label', 'brandable'] },
];

const BUYER_INTENT_ZH_HINTS: Record<string, string[]> = {
  supplier: ['供应商', '供货商'],
  wholesale: ['批发', '大宗', '批量'],
  factory: ['工厂', '厂家', '源头工厂'],
  custom: ['定制', '定做', '按需定制'],
  oem: ['OEM', '代工', '贴牌', 'ODM'],
};

const SEARCH_QUERY_REWRITES: Array<{ match: RegExp; candidates: string[] }> = [
  { match: /\bnecpillow\b|\bneck[-\s]?pillow\b/i, candidates: ['neck pillow', 'travel pillow', 'cervical pillow'] },
  { match: /\bpencil[-\s]?box\b|\bpencil case\b|\bpen box\b/i, candidates: ['pencil case', 'stationery box', 'pen case'] },
  { match: /\bkids?\s+toys?\b|\bchildren'?s?\s+toys?\b/i, candidates: ['children toys', 'toy', 'toys'] },
  { match: /\blabubu\b/i, candidates: ['labubu doll', 'blind box', 'art toy'] },
  { match: /\bdoll(s)?\b/i, candidates: ['toy doll', 'baby doll', 'fashion doll'] },
  { match: /\bshow\b/i, candidates: ['shoes', 'footwear'] },
];

const SEARCH_MODIFIER_WORDS = new Set([
  'men',
  'mens',
  'man',
  'women',
  'womens',
  'woman',
  'lady',
  'ladies',
  'girl',
  'girls',
  'boy',
  'boys',
  'adult',
  'adults',
  'casual',
  'fashion',
  'classic',
  'luxury',
  'premium',
  'original',
  'authentic',
  'new',
  'latest',
  'hot',
  'best',
  'top',
]);

const COMMON_QUERY_PRODUCT_EXPANSIONS: Array<{
  aliases: string[];
  canonical: string;
  variants: string[];
  zhVariants: string[];
}> = [
  {
    aliases: ['bag', 'bags', 'handbag', 'handbags', 'purse', 'purses', 'tote', 'tote bag', 'shoulder bag', 'backpack', 'satchel'],
    canonical: 'handbag',
    variants: ['bag', 'handbag', 'purse', 'tote bag', 'shoulder bag', 'backpack', 'satchel'],
    zhVariants: ['包', '手提包', '女包', '背包'],
  },
  {
    aliases: ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'trainer', 'trainers', 'running shoe', 'running shoes'],
    canonical: 'shoes',
    variants: ['shoes', 'sneakers', 'footwear', 'running shoes', 'sports shoes'],
    zhVariants: ['鞋', '运动鞋', '休闲鞋'],
  },
  {
    aliases: ['sunglass', 'sunglasses', 'sun glass', 'sun glasses', 'eyewear', 'glasses'],
    canonical: 'sunglasses',
    variants: ['sunglasses', 'eyewear', 'glasses', 'sun glasses'],
    zhVariants: ['太阳镜', '眼镜'],
  },
  {
    aliases: ['phone', 'phones', 'mobile', 'mobile phone', 'smartphone', 'smart phones', 'cell phone'],
    canonical: 'smartphone',
    variants: ['smartphone', 'mobile phone', 'cell phone', 'phone'],
    zhVariants: ['手机', '智能手机'],
  },
  {
    aliases: ['laptop', 'laptops', 'notebook', 'notebooks', 'computer', 'computers'],
    canonical: 'laptop',
    variants: ['laptop', 'notebook', 'computer', 'pc'],
    zhVariants: ['笔记本电脑', '电脑'],
  },
  {
    aliases: ['watch', 'watches', 'wrist watch', 'wristwatch', 'smartwatch'],
    canonical: 'watch',
    variants: ['watch', 'wrist watch', 'smartwatch', 'watches'],
    zhVariants: ['手表', '腕表'],
  },
  {
    aliases: ['wallet', 'wallets'],
    canonical: 'wallet',
    variants: ['wallet', 'wallets', 'card holder', 'coin purse'],
    zhVariants: ['钱包'],
  },
  {
    aliases: ['perfume', 'fragrance', 'cologne'],
    canonical: 'perfume',
    variants: ['perfume', 'fragrance', 'cologne'],
    zhVariants: ['香水', '香氛'],
  },
  {
    aliases: ['jacket', 'jackets', 'coat', 'coats', 'outerwear'],
    canonical: 'jacket',
    variants: ['jacket', 'coat', 'outerwear', 'hoodie'],
    zhVariants: ['外套', '夹克'],
  },
];

function findCommonQueryExpansion(text: string) {
  const normalized = normalizeShoppingText(text);
  if (!normalized) return null;
  return COMMON_QUERY_PRODUCT_EXPANSIONS.find((expansion) => expansion.aliases.some((alias) => aliasMatches(normalized, alias))) || null;
}

function extractBrandLikeToken(tokens: string[], expansion?: { aliases: string[] } | null): string | undefined {
  const expansionAliasTokens = new Set(
    (expansion?.aliases || []).flatMap((alias) => extractSearchTokens(alias))
  );
  return tokens.find((token) => !SEARCH_MODIFIER_WORDS.has(token) && !expansionAliasTokens.has(token) && !GENERIC_QUERY_WORDS.has(token));
}

export const SHOPPING_SYNONYM_CATALOG: ShoppingSynonymGroup[] = [
  {
    slug: 'baby',
    label: 'Baby Items',
    primary: 'baby items',
    aliases: ['baby', 'baby items', 'baby goods', 'baby care', 'baby supplies', 'baby products', 'infant', 'newborn', 'mother and baby', 'maternity', 'mother baby'],
    subgroups: [
      { slug: 'baby-clothing', label: 'Baby Clothing', primary: 'baby clothing', aliases: ['baby clothing', 'baby clothes', 'baby wear', 'infant clothing', 'newborn clothes', 'children clothes', 'baby apparel'] },
      { slug: 'baby-care', label: 'Baby Care', primary: 'baby care', aliases: ['baby care', 'baby items', 'baby supplies', 'baby products', 'diapers', 'bottle', 'feeding bottle', 'pacifier', 'stroller'] },
      { slug: 'baby-toys', label: 'Baby Toys', primary: 'baby toys', aliases: ['baby toys', 'infant toys', 'baby play'] },
    ],
  },
  {
    slug: 'electronics',
    label: 'Electronics',
    primary: 'electronics',
    aliases: ['electronics', 'electronic', 'tech', 'technology', 'gadget', 'gadgets', 'device', 'devices', 'watches', 'watch', 'wrist watch', 'wristwatch', 'smart watch', 'smartwatch', 'timepiece'],
    subgroups: [
      { slug: 'smartphones', label: 'Smartphones', primary: 'smartphone', aliases: ['smartphone', 'smart phones', 'mobile phone', 'cell phone', 'mobile', 'iphone', 'android phone', 'phone'] },
      { slug: 'laptops', label: 'Laptops', primary: 'laptop', aliases: ['laptop', 'notebook', 'ultrabook', 'computer', 'pc'] },
      { slug: 'tablets', label: 'Tablets', primary: 'tablet', aliases: ['tablet', 'ipad', 'pad'] },
      { slug: 'audio', label: 'Audio', primary: 'headphones', aliases: ['headphones', 'headphone', 'earphones', 'earphone', 'earbuds', 'audio'] },
      { slug: 'cameras', label: 'Cameras', primary: 'camera', aliases: ['camera', 'dslr', 'mirrorless', 'action camera'] },
      { slug: 'wearables', label: 'Wearables', primary: 'smartwatch', aliases: ['smartwatch', 'smart watch', 'watch', 'watches', 'wrist watch', 'wristwatch', 'wearable', 'clock watch', 'digital watch', 'analog watch'] },
      { slug: 'chargers', label: 'Chargers', primary: 'charger', aliases: ['charger', 'chargers', 'adapter', 'power adapter', 'cable'] },
    ],
  },
  {
    slug: 'clothing',
    label: 'Clothing & Apparel',
    primary: 'fashion',
    aliases: ['clothing', 'apparel', 'fashion', 'wear', 'garment', 'garments', 'textile', 'clothes'],
    subgroups: [
      { slug: 'tshirts', label: 'T-Shirts', primary: 't shirt', aliases: ['t shirt', 't-shirt', 'tee', 'tee shirt', 'shirt'] },
      { slug: 'jeans', label: 'Jeans', primary: 'jeans', aliases: ['jeans', 'denim', 'trousers', 'pants'] },
      { slug: 'dresses', label: 'Dresses', primary: 'dress', aliases: ['dress', 'dresses', 'gown', 'long dress'] },
      { slug: 'jackets', label: 'Jackets', primary: 'jacket', aliases: ['jacket', 'coat', 'hoodie', 'outerwear'] },
      { slug: 'shoes', label: 'Shoes', primary: 'shoes', aliases: ['shoes', 'show', 'sneakers', 'sneaker', 'footwear', 'boots', 'slippers'] },
      { slug: 'accessories', label: 'Fashion Accessories', primary: 'fashion accessories', aliases: ['fashion accessories', 'fashion accessory', 'belt', 'hat', 'cap', 'scarf', 'socks', 'underwear'] },
    ],
  },
  {
    slug: 'home',
    label: 'Home & Garden',
    primary: 'home goods',
    aliases: ['home', 'household', 'houseware', 'home goods', 'homeware', 'home accessories', 'home decor', 'home decoration', 'household items', 'garden', 'living', 'decoration'],
    subgroups: [
      { slug: 'furniture', label: 'Furniture', primary: 'furniture', aliases: ['furniture', 'sofa', 'chair', 'table', 'cabinet'] },
      { slug: 'kitchen', label: 'Kitchen', primary: 'kitchenware', aliases: ['kitchen', 'kitchenware', 'cookware', 'tableware', 'utensils', 'pot', 'pan', 'kitchen items', 'kitchen goods', 'kitchen supplies', 'kitchen accessories', 'kitchen tools'] },
      { slug: 'bedding', label: 'Bedding', primary: 'bedding', aliases: ['bedding', 'bed sheet', 'bed sheets', 'pillow', 'neck pillow', 'travel pillow', 'cervical pillow', 'blanket', 'comforter'] },
      { slug: 'decor', label: 'Decoration', primary: 'home decor', aliases: ['decor', 'decoration', 'home decor', 'home accessories', 'home accessory', 'ornament', 'wall art', 'home decor items', 'home furnishing', 'home ornaments'] },
      { slug: 'garden', label: 'Garden', primary: 'garden', aliases: ['garden', 'gardening', 'planter', 'outdoor garden'] },
      { slug: 'lighting', label: 'Lighting', primary: 'lighting', aliases: ['lighting', 'lamp', 'light', 'led light'] },
      { slug: 'storage', label: 'Storage', primary: 'storage', aliases: ['storage', 'storage box', 'organizer', 'organiser', 'rack'] },
      { slug: 'tools', label: 'Tools', primary: 'power tools', aliases: ['tools', 'tool', 'power tools', 'drill', 'drill machine', 'electric drill', 'cordless drill', 'impact drill', 'hand drill', 'cutter', 'fruit cutter', 'vegetable cutter', 'peeler', 'slicer', 'knife', 'cnc machine', 'cnc router', 'cnc', 'laser machine', 'milling machine', 'drill press', 'engraving machine', 'cutting machine'] },
    ],
  },
  {
    slug: 'toys',
    label: 'Toys & Games',
    primary: 'toys',
    aliases: ['toys', 'games', 'playthings', 'kids', 'childrens toys', 'children toys'],
    subgroups: [
      { slug: 'action-figures', label: 'Action Figures', primary: 'action figures', aliases: ['action figures', 'figure', 'figures', 'collectible figures'] },
      { slug: 'board-games', label: 'Board Games', primary: 'board games', aliases: ['board games', 'card games', 'party games'] },
      { slug: 'puzzles', label: 'Puzzles', primary: 'puzzles', aliases: ['puzzle', 'puzzles', 'jigsaw'] },
      { slug: 'educational', label: 'Educational', primary: 'educational toys', aliases: ['educational', 'learning toys', 'stem toys'] },
      { slug: 'outdoor', label: 'Outdoor', primary: 'outdoor toys', aliases: ['outdoor', 'outdoor toys', 'sports toy', 'racket'] },
      { slug: 'rc-toys', label: 'RC Toys', primary: 'rc toys', aliases: ['rc toys', 'remote control toy', 'remote control car', 'radio control'] },
      { slug: 'dolls', label: 'Dolls', primary: 'dolls', aliases: ['doll', 'dolls', 'barbie', 'toy doll', 'labubu', 'blind box', 'art toy', 'collectible doll', 'designer toy'] },
      { slug: 'blocks', label: 'Building Blocks', primary: 'building blocks', aliases: ['building blocks', 'blocks', 'lego', 'construction blocks'] },
    ],
  },
  {
    slug: 'beauty',
    label: 'Beauty & Personal Care',
    primary: 'beauty',
    aliases: ['beauty', 'cosmetics', 'personal care', 'grooming', 'self care', 'makeup', 'make-up'],
    subgroups: [
      { slug: 'skincare', label: 'Skincare', primary: 'skincare', aliases: ['skincare', 'skin care', 'face cream', 'serum', 'moisturizer'] },
      { slug: 'makeup', label: 'Makeup', primary: 'makeup', aliases: ['makeup', 'cosmetics', 'lipstick', 'foundation', 'eyeshadow'] },
      { slug: 'hair-care', label: 'Hair Care', primary: 'hair care', aliases: ['hair care', 'hair', 'hair dryer', 'straightener', 'comb'] },
      { slug: 'fragrance', label: 'Fragrance', primary: 'fragrance', aliases: ['fragrance', 'perfume', 'cologne', 'scent'] },
      { slug: 'beauty-tools', label: 'Tools', primary: 'beauty tools', aliases: ['tools', 'beauty tools', 'beauty tool', 'nail drill', 'facial brush'] },
      { slug: 'mens-care', label: "Men's Care", primary: "men's care", aliases: ["men's care", 'mens care', 'men grooming', 'shaving'] },
      { slug: 'bath-body', label: 'Bath & Body', primary: 'bath and body', aliases: ['bath', 'body', 'bath and body', 'soap', 'body wash'] },
      { slug: 'nail-care', label: 'Nail Care', primary: 'nail care', aliases: ['nail care', 'nail polish', 'manicure', 'pedicure'] },
    ],
  },
  {
    slug: 'sports',
    label: 'Sports & Outdoors',
    primary: 'sports',
    aliases: ['sports', 'outdoors', 'fitness', 'workout', 'training', 'athletic', 'sporting goods', 'sport things', 'sport goods', 'sports items', 'sports things'],
    subgroups: [
      { slug: 'fitness', label: 'Fitness', primary: 'fitness equipment', aliases: ['fitness', 'gym', 'fitness equipment', 'workout equipment'] },
      { slug: 'running', label: 'Running', primary: 'running', aliases: ['running', 'jogging', 'running shoes'] },
      { slug: 'cycling', label: 'Cycling', primary: 'cycling', aliases: ['cycling', 'bike', 'bicycle', 'biking'] },
      { slug: 'camping', label: 'Camping', primary: 'camping', aliases: ['camping', 'tent', 'outdoor camp', 'hiking'] },
      { slug: 'swimming', label: 'Swimming', primary: 'swimming', aliases: ['swimming', 'swim', 'pool', 'goggles'] },
      { slug: 'yoga', label: 'Yoga', primary: 'yoga', aliases: ['yoga', 'mat', 'pilates'] },
      { slug: 'outdoor-gear', label: 'Outdoor Gear', primary: 'outdoor gear', aliases: ['outdoor gear', 'gear', 'hiking gear'] },
      { slug: 'sports-apparel', label: 'Sports Apparel', primary: 'sports apparel', aliases: ['sports apparel', 'sportswear', 'athletic wear'] },
      { slug: 'bats', label: 'Bats', primary: 'sports bat', aliases: ['bat', 'bats', 'baseball bat', 'cricket bat', 'table tennis bat', 'ping pong bat', 'ball bat', 'batting bat'] },
    ],
  },
  {
    slug: 'automotive',
    label: 'Automotive',
    primary: 'automotive',
    aliases: ['automotive', 'auto', 'car', 'vehicle', 'vehicles', 'motor', 'motoring', 'garage'],
    subgroups: [
      { slug: 'car-parts', label: 'Car Parts', primary: 'car parts', aliases: ['car parts', 'spare parts', 'auto parts', 'automotive parts'] },
      { slug: 'accessories', label: 'Car Accessories', primary: 'car accessories', aliases: ['car accessories', 'auto accessories', 'vehicle accessories'] },
      { slug: 'tools', label: 'Tools', primary: 'garage tools', aliases: ['tools', 'tool', 'garage tools', 'car tools', 'wrench', 'jack', 'socket set'] },
      { slug: 'maintenance', label: 'Maintenance', primary: 'maintenance', aliases: ['maintenance', 'repair', 'service', 'detailing'] },
      { slug: 'electronics', label: 'Electronics', primary: 'car electronics', aliases: ['electronics', 'car electronics', 'dash cam', 'gps', 'stereo'] },
      { slug: 'interior', label: 'Interior', primary: 'car interior', aliases: ['interior', 'car interior', 'seat cover', 'floor mat'] },
      { slug: 'exterior', label: 'Exterior', primary: 'car exterior', aliases: ['exterior', 'car exterior', 'bumper', 'spoiler'] },
      { slug: 'motorcycle', label: 'Motorcycle', primary: 'motorcycle', aliases: ['motorcycle', 'bike', 'motorbike', 'scooter'] },
    ],
  },
  {
    slug: 'industrial',
    label: 'Industrial & Business',
    primary: 'industrial',
    aliases: ['industrial', 'industry', 'factory', 'manufacturing', 'business', 'machinery', 'hardware', 'warehouse', 'cnc', 'cnc machine', 'cnc router', 'cnc milling', 'drill machine', 'laser machine', 'engraving machine'],
    subgroups: [
      { slug: 'machinery', label: 'Machinery', primary: 'machinery', aliases: ['machinery', 'machine', 'machines', 'industrial machine', 'equipment machine', 'cnc machine', 'cnc router', 'laser machine', 'milling machine', 'cnc milling machine'] },
      { slug: 'tools', label: 'Tools', primary: 'power tools', aliases: ['tools', 'tool', 'power tools', 'drill', 'drill machine', 'electric drill', 'impact drill', 'cordless drill', 'hand drill', 'drill press'] },
      { slug: 'equipment', label: 'Equipment', primary: 'equipment', aliases: ['equipment', 'gear', 'device', 'devices', 'medical equipment', 'medical device', 'hospital equipment', 'wheelchair', 'mobility aid'] },
      { slug: 'supplies', label: 'Supplies', primary: 'supplies', aliases: ['supplies', 'consumables', 'stock', 'bulk supply'] },
      { slug: 'safety', label: 'Safety', primary: 'safety', aliases: ['safety', 'ppe', 'protective gear', 'gloves', 'helmet'] },
      { slug: 'packaging', label: 'Packaging', primary: 'packaging', aliases: ['packaging', 'package', 'carton'] },
      { slug: 'office', label: 'Office', primary: 'office supplies', aliases: ['office', 'office supplies', 'stationery', 'paper', 'pencil box', 'pencil case', 'pen box', 'school supplies'] },
      { slug: 'materials', label: 'Materials', primary: 'materials', aliases: ['materials', 'raw material', 'raw materials', 'parts'] },
    ],
  },
  {
    slug: 'medical',
    label: 'Medical Equipment',
    primary: 'medical equipment',
    aliases: ['medical', 'medical equipment', 'medical supplies', 'hospital equipment', 'healthcare', 'rehab', 'wheelchair', 'wheel chairs'],
    subgroups: [
      { slug: 'wheelchair', label: 'Wheelchairs', primary: 'wheelchair', aliases: ['wheelchair', 'wheel chairs', 'electric wheelchair', 'manual wheelchair', 'mobility chair'] },
      { slug: 'mobility-aids', label: 'Mobility Aids', primary: 'mobility aids', aliases: ['walker', 'walkers', 'crutch', 'crutches', 'cane', 'patient lift'] },
      { slug: 'hospital-supplies', label: 'Hospital Supplies', primary: 'hospital supplies', aliases: ['hospital supplies', 'medical supplies', 'medical device', 'rehabilitation equipment'] },
    ],
  },
  {
    slug: 'jewelry',
    label: 'Jewelry',
    primary: 'jewelry',
    aliases: ['jewelry', 'jewellery', 'fashion jewelry', 'ornament'],
    subgroups: [
      { slug: 'necklace', label: 'Necklace', primary: 'necklace', aliases: ['necklace', 'necklaces', 'chain', 'pendant necklace'] },
      { slug: 'ring', label: 'Ring', primary: 'ring', aliases: ['ring', 'rings', 'band'] },
      { slug: 'earring', label: 'Earring', primary: 'earrings', aliases: ['earring', 'earrings', 'stud', 'hoop earrings'] },
      { slug: 'bracelet', label: 'Bracelet', primary: 'bracelet', aliases: ['bracelet', 'bracelets', 'bangle'] },
      { slug: 'pendant', label: 'Pendant', primary: 'pendant', aliases: ['pendant', 'pendants', 'charm'] },
      { slug: 'brooch', label: 'Brooch', primary: 'brooch', aliases: ['brooch', 'pin', 'lapel pin'] },
      { slug: 'hair-accessories', label: 'Hair Accessories', primary: 'hair accessories', aliases: ['hair accessories', 'hair pin', 'hair clip', 'hair band'] },
      { slug: 'anklet', label: 'Anklet', primary: 'anklet', aliases: ['anklet', 'anklets'] },
    ],
  },
  {
    slug: 'eyewear',
    label: 'Eyewear',
    primary: 'eyewear',
    aliases: ['eyewear', 'glasses', 'spectacles', 'optical', 'eye wear'],
    subgroups: [
      { slug: 'sunglasses', label: 'Sunglasses', primary: 'sunglasses', aliases: ['sunglasses', 'sun glasses', 'shades'] },
      { slug: 'reading-glasses', label: 'Reading Glasses', primary: 'reading glasses', aliases: ['reading glasses', 'readers'] },
      { slug: 'frames', label: 'Frames', primary: 'frames', aliases: ['frames', 'eyeglass frames', 'spectacle frame'] },
      { slug: 'lenses', label: 'Lenses', primary: 'lenses', aliases: ['lenses', 'lens', 'optical lens'] },
      { slug: 'cases', label: 'Cases', primary: 'cases', aliases: ['cases', 'glasses case', 'spectacle case'] },
      { slug: 'accessories', label: 'Eyewear Accessories', primary: 'eyewear accessories', aliases: ['eyewear accessories', 'chain', 'strap'] },
      { slug: 'prescription', label: 'Prescription', primary: 'prescription glasses', aliases: ['prescription', 'prescription glasses', 'rx glasses'] },
      { slug: 'fashion', label: 'Fashion', primary: 'fashion eyewear', aliases: ['fashion', 'fashion eyewear', 'style glasses'] },
    ],
  },
  {
    slug: 'chocolate',
    label: 'Chocolate',
    primary: 'chocolate',
    aliases: ['chocolate', 'candy', 'confectionery', 'sweet', 'snack', 'dessert'],
    subgroups: [
      { slug: 'dark', label: 'Dark Chocolate', primary: 'dark chocolate', aliases: ['dark chocolate', 'dark choco'] },
      { slug: 'milk', label: 'Milk Chocolate', primary: 'milk chocolate', aliases: ['milk chocolate', 'milk choco'] },
      { slug: 'white', label: 'White Chocolate', primary: 'white chocolate', aliases: ['white chocolate', 'white choco'] },
      { slug: 'truffles', label: 'Truffles', primary: 'truffles', aliases: ['truffles', 'truffle'] },
      { slug: 'bars', label: 'Bars', primary: 'chocolate bars', aliases: ['bars', 'bar', 'chocolate bars'] },
      { slug: 'gift-box', label: 'Gift Box', primary: 'gift box', aliases: ['gift box', 'gift boxes', 'chocolate gift box'] },
      { slug: 'bulk', label: 'Bulk', primary: 'bulk chocolate', aliases: ['bulk', 'bulk chocolate', 'wholesale'] },
      { slug: 'sugar-free', label: 'Sugar Free', primary: 'sugar free chocolate', aliases: ['sugar free', 'sugar-free', 'no sugar'] },
    ],
  },
];

function normalizeShoppingText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSearchTokens(value: string): string[] {
  const normalized = normalizeShoppingText(value);
  if (!normalized) return [];

  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => token.length > 1 || /\d/.test(token))
    .filter((token, index, array) => array.indexOf(token) === index)
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !GENERIC_QUERY_WORDS.has(token));
}

function aliasMatches(text: string, alias: string): boolean {
  const normalizedText = normalizeShoppingText(text);
  const normalizedAlias = normalizeShoppingText(alias);
  if (!normalizedText || !normalizedAlias) return false;
  const textTokens = normalizedText.split(' ').filter(Boolean);
  const aliasTokens = normalizedAlias.split(' ').filter(Boolean);
  if (aliasTokens.length === 0 || textTokens.length === 0) return false;

  if (aliasTokens.length === 1) {
    return textTokens.includes(aliasTokens[0]);
  }

  for (let i = 0; i <= textTokens.length - aliasTokens.length; i += 1) {
    let matched = true;
    for (let j = 0; j < aliasTokens.length; j += 1) {
      if (textTokens[i + j] !== aliasTokens[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
}

function pushUnique(target: string[], value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return;
  if (!target.includes(normalized)) target.push(normalized);
}

function dedupeKeywords(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

export function buildShoppingSearchContext(keyword?: string, category?: string): ShoppingSearchContext {
  const rawKeyword = String([keyword, category].filter(Boolean).join(' ')).trim();
  const normalizedKeyword = normalizeShoppingText(rawKeyword);
  const tokens = extractSearchTokens(rawKeyword);
  const tokenString = tokens.join(' ');
  const relevanceHints: string[] = [];
  const searchTerms: string[] = [];
  const matchedGroupSlugs: string[] = [];
  const matchedSubgroupSlugs: string[] = [];
  const matchedPhrases: string[] = [];
  const buyerIntentTerms: string[] = [];
  let primaryKeywordOverride: string | undefined;

  pushUnique(searchTerms, normalizedKeyword);
  pushUnique(searchTerms, tokenString);
  pushUnique(relevanceHints, normalizedKeyword);
  pushUnique(relevanceHints, tokenString);
  for (const token of tokens) {
    pushUnique(relevanceHints, token);
  }

  for (const group of SHOPPING_SYNONYM_CATALOG) {
    const groupMatched = [group.label, group.primary, ...group.aliases].some((alias) => aliasMatches(normalizedKeyword, alias));
    const subgroupMatches = group.subgroups.filter((subgroup) =>
      [subgroup.label, subgroup.primary, ...subgroup.aliases].some((alias) => aliasMatches(normalizedKeyword, alias))
    );

    if (!groupMatched && subgroupMatches.length === 0) continue;

    pushUnique(matchedGroupSlugs, group.slug);
    pushUnique(relevanceHints, group.primary);
    pushUnique(relevanceHints, group.label);
    for (const alias of group.aliases) {
      pushUnique(relevanceHints, alias);
    }

    if (subgroupMatches.length > 0) {
      for (const subgroup of subgroupMatches) {
        pushUnique(matchedSubgroupSlugs, subgroup.slug);
        pushUnique(matchedPhrases, subgroup.primary);
        pushUnique(matchedPhrases, subgroup.label);
        pushUnique(relevanceHints, subgroup.primary);
        pushUnique(relevanceHints, subgroup.label);
        for (const alias of subgroup.aliases) {
          pushUnique(relevanceHints, alias);
        }
        pushUnique(searchTerms, subgroup.primary);
        pushUnique(searchTerms, subgroup.label);
        for (const alias of subgroup.aliases) {
          pushUnique(searchTerms, alias);
        }
      }
      pushUnique(matchedPhrases, group.primary);
      pushUnique(matchedPhrases, group.label);
    } else {
      pushUnique(matchedPhrases, group.primary);
      pushUnique(matchedPhrases, group.label);
      pushUnique(searchTerms, group.primary);
      pushUnique(searchTerms, group.label);
      for (const alias of group.aliases) {
        pushUnique(searchTerms, alias);
      }
    }
  }

  for (const intent of BUYER_INTENT_SYNONYMS) {
    if (intent.aliases.some((alias) => aliasMatches(normalizedKeyword, alias))) {
      pushUnique(buyerIntentTerms, intent.term);
      pushUnique(relevanceHints, intent.term);
      for (const alias of intent.aliases) {
        pushUnique(relevanceHints, alias);
      }
    }
  }

  if (/\bhome[-\s]?accessor(y|ies)\b|\bhome[-\s]?decor\b/i.test(normalizedKeyword)) {
    pushUnique(matchedGroupSlugs, 'home');
    pushUnique(matchedSubgroupSlugs, 'decor');
  }
  if (/\bshoe(s)?\b|\bshow\b/i.test(normalizedKeyword)) {
    pushUnique(matchedGroupSlugs, 'clothing');
    pushUnique(matchedSubgroupSlugs, 'shoes');
  }
  if (/\bbaby\b|\binfant\b|\bnewborn\b/i.test(normalizedKeyword)) {
    pushUnique(matchedGroupSlugs, 'baby');
    if (/\bclothing\b|\bclothes\b|\bwear\b/i.test(normalizedKeyword)) {
      pushUnique(matchedSubgroupSlugs, 'baby-clothing');
    }
  }
  if (/\bwatch(es)?\b|\bwrist watch\b|\btimepiece\b/i.test(normalizedKeyword)) {
    pushUnique(matchedGroupSlugs, 'electronics');
    pushUnique(matchedSubgroupSlugs, 'wearables');
  }
  if (/\bcnc\b|\bcnc machine\b|\bcnc router\b|\bcnc milling\b/i.test(normalizedKeyword)) {
    pushUnique(matchedGroupSlugs, 'industrial');
    pushUnique(matchedSubgroupSlugs, 'machinery');
  }
  if (/\bwheelchair\b|\bmedical equipment\b|\bhospital equipment\b|\bmedical supplies\b/i.test(normalizedKeyword)) {
    pushUnique(matchedGroupSlugs, 'medical');
    pushUnique(matchedSubgroupSlugs, 'wheelchair');
  }
  if (/\bbat\b|\bbaseball bat\b|\bcricket bat\b/i.test(normalizedKeyword)) {
    pushUnique(matchedGroupSlugs, 'sports');
    pushUnique(matchedSubgroupSlugs, 'bats');
  }
  if (/\bfruit\b.*\bcutter\b|\bcutter\b.*\bfruit\b|\bvegetable\b.*\bcutter\b|\bpeeler\b|\bslicer\b|\bknife\b/i.test(normalizedKeyword)) {
    primaryKeywordOverride = 'kitchen tools';
    pushUnique(matchedPhrases, 'kitchen tools');
    pushUnique(searchTerms, 'kitchen tools');
    pushUnique(relevanceHints, 'kitchen tools');
  }

  const primaryKeyword =
    primaryKeywordOverride ||
    matchedPhrases[0] ||
    searchTerms[0] ||
    buyerIntentTerms[0] ||
    tokens.join(' ') ||
    normalizedKeyword ||
    String(keyword || category || '').trim();

  return {
    rawKeyword,
    normalizedKeyword,
    primaryKeyword,
    searchTerms,
    relevanceHints,
    buyerIntentTerms,
    tokens,
    matchedGroupSlugs: dedupeKeywords(matchedGroupSlugs),
    matchedSubgroupSlugs: dedupeKeywords(matchedSubgroupSlugs),
  };
}

export function buildShoppingSearchCandidates(keyword?: string, category?: string): string[] {
  const context = buildShoppingSearchContext(keyword, category);
  const raw = normalizeShoppingText([keyword, category].filter(Boolean).join(' '));
  const candidates: string[] = [];
  const expansion = findCommonQueryExpansion(raw);
  const brandToken = extractBrandLikeToken(context.tokens, expansion);

  const pushCandidate = (value: string | undefined) => {
    const normalized = normalizeShoppingText(value || '');
    if (!normalized) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  pushCandidate(raw);
  for (const rewrite of SEARCH_QUERY_REWRITES) {
    if (!rewrite.match.test(raw)) continue;
    for (const candidate of rewrite.candidates) {
      pushCandidate(candidate);
    }
  }

  pushCandidate(context.primaryKeyword);
  for (const term of context.searchTerms.slice(0, 4)) {
    pushCandidate(term);
  }

  if (expansion) {
    pushCandidate(expansion.canonical);
    for (const variant of expansion.variants) {
      pushCandidate(variant);
    }
    if (brandToken) {
      pushCandidate(`${brandToken} ${expansion.canonical}`);
      for (const variant of expansion.variants.slice(0, 4)) {
        pushCandidate(`${brandToken} ${variant}`);
      }
    }
  }

  if (brandToken && context.tokens.length > 1) {
    const strippedTokens = context.tokens.filter((token) => token !== brandToken && !SEARCH_MODIFIER_WORDS.has(token));
    if (strippedTokens.length > 0) {
      pushCandidate(`${brandToken} ${strippedTokens.join(' ')}`);
    }
  }

  if (/\bkids?\b|\bchildren\b|\bchildrens\b/i.test(raw)) {
    pushCandidate('children toys');
    pushCandidate('kids toys');
    pushCandidate('toys');
  }

  if (/\bpencil\b|\bstationery\b|\bschool supply\b/i.test(raw)) {
    pushCandidate('pencil case');
    pushCandidate('stationery box');
    pushCandidate('office supplies');
  }

  if (/\bneck\b.*\bpillow\b|\bpillow\b/i.test(raw)) {
    pushCandidate('neck pillow');
    pushCandidate('travel pillow');
  }

  if (/\blabubu\b/i.test(raw)) {
    pushCandidate('labubu doll');
    pushCandidate('blind box');
  }

  if (context.matchedSubgroupSlugs.includes('dolls')) {
    pushCandidate('dolls');
    pushCandidate('toy doll');
  }

  if (context.matchedGroupSlugs.includes('toys')) {
    pushCandidate('toys');
    pushCandidate('children toys');
  }

  if (context.matchedGroupSlugs.includes('home') && context.matchedSubgroupSlugs.includes('kitchen')) {
    pushCandidate('kitchenware');
    pushCandidate('kitchen items');
  }

  return candidates.slice(0, 10);
}

export function hasChineseCharacters(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}

export function buildChineseShoppingQuery(keyword?: string, category?: string): string {
  const context = buildShoppingSearchContext(keyword, category);
  const raw = normalizeShoppingText([keyword, category].filter(Boolean).join(' '));
  const expansion = findCommonQueryExpansion(raw);
  const brandToken = extractBrandLikeToken(context.tokens, expansion);
  const hasStrongShoppingSignal =
    context.matchedGroupSlugs.length > 0 ||
    context.matchedSubgroupSlugs.length > 0 ||
    context.buyerIntentTerms.length > 0 ||
    !!expansion ||
    /(\bbaby\b|\binfant\b|\btoddler\b|\bkids?\b|\bchildren\b|\bmen'?s\b|\bmens\b|\bwomen'?s\b|\bwomens\b|\bhome[-\s]?kitchen\b|\bkitchen\b|\bdrill\b|\belectric drill\b|\bcordless drill\b|\bpower tools?\b|\blabubu\b|\bdoll(s)?\b|\btoy(s)?\b|\bpillow\b|\bneck[-\s]?pillow\b|\bnecpillow\b|\bpencil[-\s]?box\b|\bstationery\b)/i.test(normalizeShoppingText([keyword, category].filter(Boolean).join(' ')));
  if (!hasStrongShoppingSignal) return '';
  const parts: string[] = [];
  const addParts = (values?: string[]) => {
    for (const value of values || []) {
      pushUnique(parts, value);
    }
  };

  addParts(context.buyerIntentTerms.flatMap((term) => BUYER_INTENT_ZH_HINTS[term] || []));

  for (const groupSlug of context.matchedGroupSlugs) {
    addParts(GROUP_ZH_HINTS[groupSlug] || []);
  }

  for (const subgroupSlug of context.matchedSubgroupSlugs) {
    addParts(SUBGROUP_ZH_HINTS[subgroupSlug] || []);
  }

  if (expansion) {
    addParts(expansion.zhVariants);
    if (brandToken) {
      addParts(expansion.zhVariants.map((zhTerm) => `${brandToken} ${zhTerm}`));
    }
  }

  if (/\bbaby\b|\binfant\b|\btoddler\b|\bkids?\b|\bchildren\b/i.test(raw)) {
    addParts(['婴儿', '童装', '儿童']);
  }
  if (/\bmen'?s\b|\bmens\b|\bman\b/i.test(raw)) {
    addParts(['男士', '男装']);
  }
  if (/\bwomen'?s\b|\bwomens\b|\bwoman\b/i.test(raw)) {
    addParts(['女士', '女装']);
  }
  if (/\bhome[-\s]?kitchen\b|\bkitchen\b|\bhome\b/i.test(raw)) {
    addParts(['家居', '厨房', '厨具']);
  }
  if (/\bneck\b.*\bpillow\b|\bnecpillow\b|\bneck[-\s]?pillow\b/i.test(raw)) {
    addParts(['颈枕', '旅行枕', '颈椎枕']);
  }
  if (/\bdrill\b|\bpower tool\b|\bpower tools\b|\belectric drill\b|\bcordless drill\b/i.test(raw)) {
    addParts(['电钻', '手电钻', '冲击钻', '电动工具']);
  }
  if (/\bfruit\b.*\bcutter\b|\bcutter\b.*\bfruit\b|\bvegetable\b.*\bcutter\b|\bpeeler\b|\bslicer\b/i.test(raw)) {
    addParts(['水果切割器', '水果削皮器', '蔬菜切割器', '厨房工具', '厨房用品']);
  }
  if (/\blabubu\b|\bdoll(s)?\b|\btoy(s)?\b/i.test(raw)) {
    addParts(['玩具', '玩偶', '盲盒']);
  }
  if (/\bpencil[-\s]?box\b|\bpencil case\b|\bpen box\b|\bstationery\b/i.test(raw)) {
    addParts(['文具', '铅笔盒', '笔盒']);
  }

  if (parts.length === 0) {
    addParts(context.relevanceHints.slice(0, 4));
  }

  return parts.join(' ').trim();
}
