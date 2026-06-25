export type HomepageVisualMenuItemSeed = {
  section_key: string;
  section_label: string;
  section_sort_order: number;
  title: string;
  search_keyword: string;
  image_url: string;
  image_alt: string;
  sort_order: number;
};

export type HomepageVisualMenuSectionSeed = {
  section_key: string;
  section_label: string;
  section_sort_order: number;
  items: Array<Omit<HomepageVisualMenuItemSeed, 'section_key' | 'section_label' | 'section_sort_order'>>;
};

function placeholderImage(label: string): string {
  return `https://placehold.co/600x450/f8fafc/0f172a?text=${encodeURIComponent(label)}`;
}

const MOBILE_ACCESSORIES_IMAGE_1 = 'https://cbu01.alicdn.com/img/ibank/O1CN01qKi0sm2A8QFIA4KyN_!!2221515018158-0-cib.jpg';
const MOBILE_ACCESSORIES_IMAGE_2 = 'https://cbu01.alicdn.com/img/ibank/O1CN01rMc9TR1uqol85owES_!!1627406089-0-cib.jpg';
const MOBILE_ACCESSORIES_IMAGE_3 = 'https://cbu01.alicdn.com/img/ibank/O1CN01kc2INO1ocituoDdXA_!!1865165246-0-cib.jpg';
const MOBILE_ACCESSORIES_IMAGE_4 = 'https://cbu01.alicdn.com/img/ibank/O1CN01UN76QO2GOo6gcHTlZ_!!2210980869006-0-cib.jpg';
const MOBILE_ACCESSORIES_IMAGE_5 = 'https://cbu01.alicdn.com/img/ibank/O1CN01qKi0sm2A8QFIA4KyN_!!2221515018158-0-cib.jpg';

const JEWELLERY_IMAGE_1 = 'https://cbu01.alicdn.com/img/ibank/O1CN01sGqqN32J8Gej32yYU_!!2212479439376-0-cib.jpg';
const JEWELLERY_IMAGE_2 = 'https://cbu01.alicdn.com/img/ibank/O1CN01lLgdAc1S6jgGU39gr_!!2217782572198-0-cib.jpg';
const JEWELLERY_IMAGE_3 = 'https://cbu01.alicdn.com/img/ibank/O1CN01aYTEe21HE6F2IrMAe_!!2220643820725-0-cib.jpg';
const JEWELLERY_IMAGE_4 = 'https://cbu01.alicdn.com/img/ibank/O1CN0120w1kD1k00vTcLPOD_!!2216152464620-0-cib.jpg';
const JEWELLERY_IMAGE_5 = 'https://cbu01.alicdn.com/img/ibank/O1CN01sGqqN32J8Gej32yYU_!!2212479439376-0-cib.jpg';

const BAGS_IMAGE_1 = 'https://cbu01.alicdn.com/img/ibank/O1CN01oO69Yg1CdgJYsDBgz_!!2599330104-0-cib.jpg';
const BAGS_IMAGE_2 = 'https://cbu01.alicdn.com/img/ibank/O1CN01vQzHyB1XNI4fCWxTu_!!2218396842911-0-cib.jpg';
const BAGS_IMAGE_3 = 'https://cbu01.alicdn.com/img/ibank/O1CN01z2uk2S1ieerG7Snp9_!!2221298764438-0-cib.jpg';
const BAGS_IMAGE_4 = 'https://cbu01.alicdn.com/img/ibank/O1CN01hUMFah1lzfuKGpM1g_!!2219122354890-0-cib.jpg';
const BAGS_IMAGE_5 = 'https://cbu01.alicdn.com/img/ibank/O1CN01oO69Yg1CdgJYsDBgz_!!2599330104-0-cib.jpg';

const HIJAB_IMAGE_1 = placeholderImage('Hijab');
const HIJAB_IMAGE_2 = placeholderImage('Headscarf');
const HIJAB_IMAGE_3 = placeholderImage('Burkha');
const HIJAB_IMAGE_4 = placeholderImage('Modest Dress');
const HIJAB_IMAGE_5 = placeholderImage('Abaya');

export const HOMEPAGE_VISUAL_MENU_SECTIONS: HomepageVisualMenuSectionSeed[] = [
  {
    section_key: 'mobile-accessories',
    section_label: 'Mobile accessories',
    section_sort_order: 1,
    items: [
      {
        title: 'Phone Cover',
        search_keyword: 'xiaomi phone cover',
        image_url: MOBILE_ACCESSORIES_IMAGE_1,
        image_alt: 'Phone cover',
        sort_order: 1,
      },
      {
        title: 'Phone Charger',
        search_keyword: 'phone charger',
        image_url: MOBILE_ACCESSORIES_IMAGE_2,
        image_alt: 'Phone charger',
        sort_order: 2,
      },
      {
        title: 'Phone Glass',
        search_keyword: 'phone tempered glass',
        image_url: MOBILE_ACCESSORIES_IMAGE_3,
        image_alt: 'Phone glass',
        sort_order: 3,
      },
      {
        title: 'Power Bank',
        search_keyword: 'power bank',
        image_url: MOBILE_ACCESSORIES_IMAGE_4,
        image_alt: 'Power bank',
        sort_order: 4,
      },
      {
        title: 'Phone Holder',
        search_keyword: 'phone holder',
        image_url: MOBILE_ACCESSORIES_IMAGE_5,
        image_alt: 'Phone holder',
        sort_order: 5,
      },
    ],
  },
  {
    section_key: 'jewelry',
    section_label: 'Jewellery',
    section_sort_order: 2,
    items: [
      {
        title: 'Necklace',
        search_keyword: 'necklace jewelry',
        image_url: JEWELLERY_IMAGE_1,
        image_alt: 'Necklace',
        sort_order: 1,
      },
      {
        title: 'Earrings',
        search_keyword: 'earrings',
        image_url: JEWELLERY_IMAGE_2,
        image_alt: 'Earrings',
        sort_order: 2,
      },
      {
        title: 'Ring',
        search_keyword: 'ring jewelry',
        image_url: JEWELLERY_IMAGE_3,
        image_alt: 'Ring',
        sort_order: 3,
      },
      {
        title: 'Bracelet',
        search_keyword: 'bracelet jewelry',
        image_url: JEWELLERY_IMAGE_4,
        image_alt: 'Bracelet',
        sort_order: 4,
      },
      {
        title: 'Pendant',
        search_keyword: 'pendant necklace',
        image_url: JEWELLERY_IMAGE_5,
        image_alt: 'Pendant',
        sort_order: 5,
      },
    ],
  },
  {
    section_key: 'bags',
    section_label: 'Bags',
    section_sort_order: 3,
    items: [
      {
        title: 'School Bag',
        search_keyword: 'school backpack',
        image_url: BAGS_IMAGE_1,
        image_alt: 'School bag',
        sort_order: 1,
      },
      {
        title: 'Ladies Bag',
        search_keyword: 'ladies handbag',
        image_url: BAGS_IMAGE_2,
        image_alt: 'Ladies bag',
        sort_order: 2,
      },
      {
        title: 'Backpack',
        search_keyword: 'travel backpack',
        image_url: BAGS_IMAGE_3,
        image_alt: 'Backpack',
        sort_order: 3,
      },
      {
        title: 'Handbag',
        search_keyword: 'tote bag',
        image_url: BAGS_IMAGE_4,
        image_alt: 'Handbag',
        sort_order: 4,
      },
      {
        title: 'Wallet',
        search_keyword: 'wallet clutch',
        image_url: BAGS_IMAGE_5,
        image_alt: 'Wallet',
        sort_order: 5,
      },
    ],
  },
  {
    section_key: 'women-hijab',
    section_label: 'Women Hijab',
    section_sort_order: 4,
    items: [
      {
        title: 'Hijab',
        search_keyword: 'hijab',
        image_url: HIJAB_IMAGE_1,
        image_alt: 'Hijab',
        sort_order: 1,
      },
      {
        title: 'Headscarf',
        search_keyword: 'headscarf',
        image_url: HIJAB_IMAGE_2,
        image_alt: 'Headscarf',
        sort_order: 2,
      },
      {
        title: 'Burkha',
        search_keyword: 'burkha',
        image_url: HIJAB_IMAGE_3,
        image_alt: 'Burkha',
        sort_order: 3,
      },
      {
        title: 'Modest Dress',
        search_keyword: 'modest dress',
        image_url: HIJAB_IMAGE_4,
        image_alt: 'Modest Dress',
        sort_order: 4,
      },
      {
        title: 'Abaya',
        search_keyword: 'abaya',
        image_url: HIJAB_IMAGE_5,
        image_alt: 'Abaya',
        sort_order: 5,
      },
    ],
  },
];

export const HOMEPAGE_VISUAL_MENU_SEED: HomepageVisualMenuItemSeed[] = HOMEPAGE_VISUAL_MENU_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    section_key: section.section_key,
    section_label: section.section_label,
    section_sort_order: section.section_sort_order,
    ...item,
  }))
);
