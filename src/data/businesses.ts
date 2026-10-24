/*
 * A shop runs exactly one line of business, picked at signup and never changed afterwards:
 * it decides the categories, fields and demo catalogue the merchant space starts from.
 */

export type BusinessId = 'phones' | 'hair' | 'clothing' | 'shoes' | 'cosmetics' | 'grocery';

export type Business = {
  id: BusinessId;
  label: string;
  /** What the shop sells, shown under the label in the signup picker. */
  examples: string;
  /** Placeholders that speak the merchant's trade instead of a generic shop's. */
  samples: { product: string; category: string; sub: string; fields: string };
};

export const BUSINESSES: Business[] = [
  {
    id: 'phones',
    label: 'Téléphonie',
    examples: 'Smartphones, tablettes, accessoires',
    samples: {
      product: 'Ex. Samsung Galaxy A25',
      category: 'Ex. Montres connectées',
      sub: 'Ex. Pliables, Gaming…',
      fields: 'mémoire, couleur, IMEI…',
    },
  },
  {
    id: 'hair',
    label: 'Coiffure',
    examples: 'Mèches, perruques, soins capillaires',
    samples: {
      product: 'Ex. Perruque lace frontal 18"',
      category: 'Ex. Produits pour barbe',
      sub: 'Ex. Closures, Frontals…',
      fields: 'longueur, couleur, type de cheveux…',
    },
  },
  {
    id: 'clothing',
    label: 'Vêtements',
    examples: 'Prêt-à-porter, pagnes, sacs',
    samples: {
      product: 'Ex. Robe kaba brodée',
      category: 'Ex. Tenues de sport',
      sub: 'Ex. Jupes, Vestes…',
      fields: 'taille, couleur, matière…',
    },
  },
  {
    id: 'shoes',
    label: 'Chaussures',
    examples: 'Homme, femme, enfant',
    samples: {
      product: 'Ex. Baskets montantes cuir',
      category: 'Ex. Chaussures de sport',
      sub: 'Ex. Bottines, Tongs…',
      fields: 'pointure, couleur, matière…',
    },
  },
  {
    id: 'cosmetics',
    label: 'Cosmétiques',
    examples: 'Soins, maquillage, parfums',
    samples: {
      product: 'Ex. Crème hydratante aloe vera 200 ml',
      category: 'Ex. Soins homme',
      sub: 'Ex. Gommages, Déodorants…',
      fields: 'volume, teinte, date d’expiration…',
    },
  },
  {
    id: 'grocery',
    label: 'Alimentation',
    examples: 'Épicerie, boissons, hygiène',
    samples: {
      product: 'Ex. Riz parfumé 10 kg',
      category: 'Ex. Produits frais',
      sub: 'Ex. Farines, Épices…',
      fields: 'contenance, format, date limite…',
    },
  },
];

export const DEFAULT_BUSINESS: BusinessId = 'phones';

export const isBusinessId = (value: unknown): value is BusinessId => BUSINESSES.some((item) => item.id === value);

export const businessOf = (id: BusinessId) => BUSINESSES.find((item) => item.id === id)!;
