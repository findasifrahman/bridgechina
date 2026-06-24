export type ShoppingCategorySeed = {
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  description?: string;
  children: ShoppingCategorySeed[];
};

const PHONE_BRANDS = [
  'Xiaomi',
  'Oppo',
  'Huawei',
  'iPhone',
  'Samsung',
  'Vivo',
  'Realme',
  'OnePlus',
  'Honor',
  'Infinix',
  'Tecno',
  'Nothing',
  'Google Pixel',
  'Motorola',
  'Nokia',
  'Asus',
  'Sony',
  'Lenovo',
  'Anker',
  'Baseus',
  'Ugreen',
  'Joyroom',
  'Remax',
];

function brandChildren(prefix: string, brands: string[], startOrder: number): ShoppingCategorySeed[] {
  return brands.map((brand, index) => ({
    name: brand,
    slug: `${prefix}-brand-${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    icon: 'tag',
    sort_order: startOrder + index,
    description: 'brand-selection',
    children: [],
  }));
}

export const SHOPPING_CATEGORY_TREE: ShoppingCategorySeed[] = [
  {
    name: 'Phone Accessories',
    slug: 'phone-accessories',
    icon: 'smartphone',
    sort_order: 1,
    children: [
      { name: 'Phone Charger', slug: 'phone-accessories-charger', icon: 'plug', sort_order: 1, children: [] },
      { name: 'Phone Cover', slug: 'phone-accessories-cover', icon: 'smartphone', sort_order: 2, children: [] },
      { name: 'Phone Glass', slug: 'phone-accessories-glass', icon: 'shield', sort_order: 3, children: [] },
      { name: 'Charging Cable', slug: 'phone-accessories-cable', icon: 'cable', sort_order: 4, children: [] },
      { name: 'Power Bank', slug: 'phone-accessories-power-bank', icon: 'battery', sort_order: 5, children: [] },
      { name: 'Earphones', slug: 'phone-accessories-earphones', icon: 'headphones', sort_order: 6, children: [] },
      { name: 'Phone Holder', slug: 'phone-accessories-holder', icon: 'smartphone', sort_order: 7, children: [] },
      { name: 'Other Phone Accessories', slug: 'phone-accessories-other', icon: 'package', sort_order: 8, children: [] },
      ...brandChildren('phone-accessories', PHONE_BRANDS, 100),
    ],
  },
  {
    name: 'Jewelry',
    slug: 'jewelry',
    icon: 'gem',
    sort_order: 2,
    children: [
      { name: 'Necklace', slug: 'jewelry-necklace', icon: 'gem', sort_order: 1, children: [] },
      { name: 'Rings', slug: 'jewelry-rings', icon: 'gem', sort_order: 2, children: [] },
      { name: 'Earrings', slug: 'jewelry-earrings', icon: 'gem', sort_order: 3, children: [] },
      { name: 'Bracelets', slug: 'jewelry-bracelets', icon: 'gem', sort_order: 4, children: [] },
      { name: 'Pendants', slug: 'jewelry-pendants', icon: 'gem', sort_order: 5, children: [] },
      { name: 'Anklets', slug: 'jewelry-anklets', icon: 'gem', sort_order: 6, children: [] },
      { name: 'Hair Accessories', slug: 'jewelry-hair-accessories', icon: 'sparkles', sort_order: 7, children: [] },
      ...brandChildren('jewelry', ['Cartier', 'Tiffany', 'Pandora', 'Swarovski', 'Bvlgari', 'Van Cleef', 'Chopard', 'Tous', 'Chanel', 'Dior'], 100),
    ],
  },
  {
    name: 'Shoes',
    slug: 'shoes',
    icon: 'footprints',
    sort_order: 3,
    children: [
      { name: 'Sneakers', slug: 'shoes-sneakers', icon: 'footprints', sort_order: 1, children: [] },
      { name: 'Ladies Shoes', slug: 'shoes-ladies', icon: 'footprints', sort_order: 2, children: [] },
      { name: 'Formal Shoes', slug: 'shoes-formal', icon: 'footprints', sort_order: 3, children: [] },
      { name: 'High Heels', slug: 'shoes-heels', icon: 'footprints', sort_order: 4, children: [] },
      { name: 'Sandals', slug: 'shoes-sandals', icon: 'footprints', sort_order: 5, children: [] },
      { name: 'Boots', slug: 'shoes-boots', icon: 'footprints', sort_order: 6, children: [] },
      ...brandChildren('shoes', ['Nike', 'Adidas', 'Puma', 'New Balance', 'Converse', 'Vans', 'Skechers', 'Crocs', 'Jordan', 'Reebok'], 100),
    ],
  },
  {
    name: 'Mens Wear',
    slug: 'mens-wear',
    icon: 'shirt',
    sort_order: 4,
    children: [
      { name: 'T-Shirts', slug: 'mens-tshirts', icon: 'shirt', sort_order: 1, children: [] },
      { name: 'Shirts', slug: 'mens-shirts', icon: 'shirt', sort_order: 2, children: [] },
      { name: 'Pants', slug: 'mens-pants', icon: 'shirt', sort_order: 3, children: [] },
      { name: 'Jackets', slug: 'mens-jackets', icon: 'shirt', sort_order: 4, children: [] },
      { name: 'Panjabi', slug: 'mens-panjabi', icon: 'shirt', sort_order: 5, children: [] },
      { name: 'Jeans', slug: 'mens-jeans', icon: 'shirt', sort_order: 6, children: [] },
      ...brandChildren('mens-wear', ['Zara', 'H&M', 'Uniqlo', 'Levis', 'Lacoste', 'Ralph Lauren', 'Tommy Hilfiger', 'Hugo Boss', 'Nike', 'Adidas'], 100),
    ],
  },
  {
    name: 'Women Wear',
    slug: 'women-wear',
    icon: 'shirt',
    sort_order: 5,
    children: [
      { name: 'Dresses', slug: 'women-dresses', icon: 'shirt', sort_order: 1, children: [] },
      { name: 'Tops', slug: 'women-tops', icon: 'shirt', sort_order: 2, children: [] },
      { name: 'Skirts', slug: 'women-skirts', icon: 'shirt', sort_order: 3, children: [] },
      { name: 'Hijab', slug: 'women-hijab', icon: 'shirt', sort_order: 4, children: [] },
      { name: 'Burkha', slug: 'women-burkha', icon: 'shirt', sort_order: 5, children: [] },
      { name: 'Abaya', slug: 'women-abaya', icon: 'shirt', sort_order: 6, children: [] },
      ...brandChildren('women-wear', ['Zara', 'H&M', 'Shein', 'Uniqlo', 'Mango', 'Dior', 'Chanel', 'Gucci', 'Prada', 'Nike'], 100),
    ],
  },
  {
    name: 'Watches',
    slug: 'watches',
    icon: 'watch',
    sort_order: 6,
    children: [
      { name: 'Mens Watch', slug: 'watches-men', icon: 'watch', sort_order: 1, children: [] },
      { name: 'Women Watch', slug: 'watches-women', icon: 'watch', sort_order: 2, children: [] },
      { name: 'Smart Watch', slug: 'watches-smart', icon: 'watch', sort_order: 3, children: [] },
      { name: 'Watch Strap', slug: 'watches-strap', icon: 'watch', sort_order: 4, children: [] },
      ...brandChildren('watches', ['Rolex', 'Casio', 'Seiko', 'Fossil', 'Tissot', 'Omega', 'Apple', 'Samsung', 'Huawei', 'Amazfit', 'Xiaomi'], 100),
    ],
  },
  {
    name: 'Gadgets',
    slug: 'gadgets',
    icon: 'cpu',
    sort_order: 7,
    children: [
      { name: 'Phones', slug: 'gadgets-phones', icon: 'smartphone', sort_order: 1, children: [] },
      { name: 'Earbuds', slug: 'gadgets-earbuds', icon: 'headphones', sort_order: 2, children: [] },
      { name: 'Speakers', slug: 'gadgets-speakers', icon: 'speaker', sort_order: 3, children: [] },
      { name: 'Cameras', slug: 'gadgets-cameras', icon: 'camera', sort_order: 4, children: [] },
      { name: 'Smart Home', slug: 'gadgets-smart-home', icon: 'home', sort_order: 5, children: [] },
      { name: 'Gaming Gadgets', slug: 'gadgets-gaming', icon: 'gamepad-2', sort_order: 6, children: [] },
      ...brandChildren('gadgets', ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Lenovo', 'Asus', 'Sony', 'Anker', 'Baseus', 'Ugreen', 'Logitech'], 100),
    ],
  },
  {
    name: 'Bags',
    slug: 'bags',
    icon: 'shopping-bag',
    sort_order: 8,
    children: [
      { name: 'Hand Bags', slug: 'bags-hand-bags', icon: 'shopping-bag', sort_order: 1, children: [] },
      { name: 'Backpacks', slug: 'bags-backpacks', icon: 'shopping-bag', sort_order: 2, children: [] },
      { name: 'Wallet', slug: 'bags-wallet', icon: 'shopping-bag', sort_order: 3, children: [] },
      { name: 'Suitcase', slug: 'bags-suitcase', icon: 'shopping-bag', sort_order: 4, children: [] },
    ],
  },
  {
    name: 'Beauty',
    slug: 'beauty',
    icon: 'sparkles',
    sort_order: 9,
    children: [
      { name: 'Skincare', slug: 'beauty-skincare', icon: 'sparkles', sort_order: 1, children: [] },
      { name: 'Makeup', slug: 'beauty-makeup', icon: 'sparkles', sort_order: 2, children: [] },
      { name: 'Hair Care', slug: 'beauty-hair-care', icon: 'sparkles', sort_order: 3, children: [] },
    ],
  },
  {
    name: 'Eyewear',
    slug: 'eyewear',
    icon: 'glasses',
    sort_order: 10,
    children: [
      { name: 'Sunglasses', slug: 'eyewear-sunglasses', icon: 'glasses', sort_order: 1, children: [] },
      { name: 'Frames', slug: 'eyewear-frames', icon: 'glasses', sort_order: 2, children: [] },
    ],
  },
  {
    name: 'Baby Items',
    slug: 'baby-items',
    icon: 'baby',
    sort_order: 11,
    children: [
      { name: 'Baby Clothing', slug: 'baby-clothing', icon: 'baby', sort_order: 1, children: [] },
      { name: 'Baby Toys', slug: 'baby-toys', icon: 'baby', sort_order: 2, children: [] },
    ],
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    icon: 'home',
    sort_order: 12,
    children: [
      { name: 'Kitchen', slug: 'home-kitchen', icon: 'home', sort_order: 1, children: [] },
      { name: 'Furniture', slug: 'home-furniture', icon: 'home', sort_order: 2, children: [] },
    ],
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    icon: 'volleyball',
    sort_order: 13,
    children: [
      { name: 'Fitness', slug: 'sports-fitness', icon: 'volleyball', sort_order: 1, children: [] },
      { name: 'Camping', slug: 'sports-camping', icon: 'volleyball', sort_order: 2, children: [] },
    ],
  },
];
