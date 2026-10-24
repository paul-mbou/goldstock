import type { BusinessId } from './businesses';
import { attr, category, type Category } from './dashboard';

/*
 * Starting categories of each line of business, with the characteristics their products need.
 * A shop only ever sees its own: a phone shop has no shoe sizes, a hair salon no IMEI field.
 * The owner adds the products; there are no sample ones.
 */

const warranty = ['Sans garantie', '3 mois', '6 mois', '12 mois'];

const phones: Category[] = [
  category(
    'tel',
    'Smartphones',
    'phone',
    'gold',
    ['Neufs', 'Reconditionnés'],
    [
      attr('tel_brand', 'Marque', 'list', ['Samsung', 'Tecno', 'Infinix', 'Apple', 'Itel', 'Xiaomi'], {
        required: true,
      }),
      attr('tel_model', 'Modèle', 'text', [], { required: true }),
      attr('tel_mem', 'Mémoire', 'list', ['64 Go', '128 Go', '256 Go'], { variant: true }),
      attr('tel_color', 'Couleur', 'color', ['Noir', 'Bleu', 'Blanc', 'Vert'], { variant: true }),
      attr('tel_imei', 'IMEI', 'text', [], { hint: '15 chiffres' }),
      attr('tel_dual', 'Double SIM', 'yesno'),
    ],
  ),
  category(
    'tab',
    'Tablettes',
    'tablet',
    'teal',
    ['Wi-Fi', '4G'],
    [
      attr('tab_brand', 'Marque', 'list', ['Samsung', 'Tecno', 'Apple', 'Lenovo'], { required: true }),
      attr('tab_mem', 'Mémoire', 'list', ['64 Go', '128 Go', '256 Go'], { variant: true }),
      attr('tab_color', 'Couleur', 'color', ['Gris', 'Noir', 'Blanc'], { variant: true }),
      attr('tab_screen', 'Écran (pouces)', 'number'),
    ],
  ),
  category(
    'acc',
    'Accessoires',
    'headphones',
    'navy',
    ['Audio', 'Charge', 'Protection'],
    [
      attr('acc_brand', 'Marque', 'list', ['Oraimo', 'Samsung', 'Apple', 'Anker', 'Générique']),
      attr('acc_fit', 'Compatible avec', 'text', [], { hint: 'Ex. Galaxy A15, USB-C' }),
      attr('acc_warranty', 'Garantie', 'list', warranty),
    ],
  ),
];

const hairShades = ['1B Noir naturel', '2 Brun foncé', '27 Blond miel', '99J Bordeaux'];

const hair: Category[] = [
  category(
    'mec',
    'Mèches et perruques',
    'sparkles',
    'rose',
    ['Mèches', 'Perruques', 'Tissages'],
    [
      attr('mec_brand', 'Marque', 'list', ['X-Pression', 'Darling', 'Sensationnel', 'Noble', 'Générique'], {
        required: true,
      }),
      attr('mec_hair', 'Type de cheveux', 'list', ['Synthétique', 'Naturel', 'Mixte'], { required: true }),
      attr('mec_length', 'Longueur', 'list', ['12"', '16"', '20"', '24"'], { variant: true }),
      attr('mec_shade', 'Couleur', 'list', hairShades, { variant: true }),
    ],
  ),
  category(
    'soi',
    'Soins capillaires',
    'drop',
    'teal',
    ['Défrisants', 'Shampoings', 'Huiles et crèmes'],
    [
      attr('soi_brand', 'Marque', 'text', [], { required: true }),
      attr('soi_vol', 'Volume (ml)', 'number', [], { required: true }),
      attr('soi_for', 'Type de cheveux', 'multi', ['Crépus', 'Défrisés', 'Bouclés', 'Tous types']),
      attr('soi_exp', 'Date d’expiration', 'date'),
    ],
  ),
  category(
    'out',
    'Matériel de coiffure',
    'scissors',
    'navy',
    ['Électrique', 'Outils', 'Bonnets et filets'],
    [attr('out_brand', 'Marque', 'text'), attr('out_warranty', 'Garantie', 'list', warranty)],
  ),
];

const clothing: Category[] = [
  category(
    'pap',
    'Prêt-à-porter',
    'shirt',
    'teal',
    ['Robes', 'Chemises', 'Pantalons', 'Ensembles'],
    [
      attr('pap_size', 'Taille', 'list', ['S', 'M', 'L', 'XL', 'XXL'], { variant: true }),
      attr('pap_color', 'Couleur', 'color', ['Noir', 'Blanc', 'Bleu', 'Rouge', 'Multicolore'], { variant: true }),
      attr('pap_mat', 'Matière', 'list', ['Coton', 'Wax', 'Lin', 'Jean', 'Dentelle', 'Polyester']),
      attr('pap_occ', 'Occasions', 'multi', ['Quotidien', 'Bureau', 'Cérémonie', 'Week-end']),
    ],
  ),
  category(
    'pag',
    'Pagnes et tissus',
    'tag',
    'gold',
    ['Wax', 'Bazin', 'Dentelle'],
    [
      attr('pag_length', 'Longueur', 'list', ['3 yards', '5 yards', '6 yards'], { variant: true }),
      attr('pag_origin', 'Origine', 'list', ['Hollandais', 'Ivoirien', 'Ghanéen', 'Nigérian']),
      attr('pag_pattern', 'Motif', 'text'),
    ],
  ),
  category(
    'acc',
    'Sacs et accessoires',
    'bag',
    'violet',
    ['Sacs', 'Ceintures', 'Foulards'],
    [
      attr('acc_mat', 'Matière', 'list', ['Cuir', 'Simili', 'Satin', 'Toile']),
      attr('acc_color', 'Couleur', 'color', ['Noir', 'Marron', 'Beige', 'Rouge'], { variant: true }),
    ],
  ),
];

const shoeColors = ['Noir', 'Marron', 'Blanc', 'Beige', 'Rose', 'Bleu'];
const shoeMaterials = ['Cuir', 'Daim', 'Toile', 'Synthétique'];
const sizes = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => String(from + index));

const shoes: Category[] = [
  category(
    'hom',
    'Homme',
    'shoe',
    'navy',
    ['Baskets', 'Ville', 'Sandales'],
    [
      attr('hom_brand', 'Marque', 'text'),
      attr('hom_size', 'Pointure', 'list', sizes(39, 46), { variant: true }),
      attr('hom_color', 'Couleur', 'color', shoeColors, { variant: true }),
      attr('hom_mat', 'Matière', 'list', shoeMaterials),
    ],
  ),
  category(
    'fem',
    'Femme',
    'shoe',
    'rose',
    ['Escarpins', 'Sandales', 'Baskets'],
    [
      attr('fem_brand', 'Marque', 'text'),
      attr('fem_size', 'Pointure', 'list', sizes(36, 42), { variant: true }),
      attr('fem_color', 'Couleur', 'color', shoeColors, { variant: true }),
      attr('fem_mat', 'Matière', 'list', shoeMaterials),
    ],
  ),
  category(
    'enf',
    'Enfant',
    'shoe',
    'teal',
    ['Scolaires', 'Baskets', 'Sandales'],
    [
      attr('enf_size', 'Pointure', 'list', sizes(24, 35), { variant: true }),
      attr('enf_color', 'Couleur', 'color', shoeColors, { variant: true }),
    ],
  ),
  category(
    'ent',
    'Entretien',
    'tag',
    'gold',
    ['Cirage', 'Lacets', 'Semelles'],
    [
      attr('ent_brand', 'Marque', 'text'),
      attr('ent_color', 'Couleur', 'color', ['Noir', 'Marron', 'Blanc'], { variant: true }),
    ],
  ),
];

const cosmetics: Category[] = [
  category(
    'soi',
    'Soins du corps et du visage',
    'drop',
    'rose',
    ['Soins corps', 'Soins visage', 'Savons'],
    [
      attr('soi_brand', 'Marque', 'text', [], { required: true }),
      attr('soi_vol', 'Volume (ml)', 'number', [], { required: true }),
      attr('soi_type', 'Type de produit', 'list', ['Crème', 'Lait', 'Sérum', 'Huile', 'Beurre', 'Savon']),
      attr('soi_exp', 'Date d’expiration', 'date'),
      attr('soi_bio', 'Naturel ou bio', 'yesno'),
    ],
  ),
  category(
    'maq',
    'Maquillage',
    'sparkles',
    'violet',
    ['Teint', 'Lèvres', 'Yeux'],
    [
      attr('maq_brand', 'Marque', 'text', [], { required: true }),
      attr('maq_shade', 'Teinte', 'list', ['Clair', 'Caramel', 'Moka', 'Ébène'], { variant: true }),
      attr('maq_exp', 'Date d’expiration', 'date'),
    ],
  ),
  category(
    'par',
    'Parfums',
    'flask',
    'gold',
    ['Femme', 'Homme', 'Mixte'],
    [
      attr('par_brand', 'Marque', 'text', [], { required: true }),
      attr('par_size', 'Contenance', 'list', ['30 ml', '50 ml', '100 ml'], { variant: true }),
      attr('par_family', 'Famille olfactive', 'list', ['Boisé', 'Floral', 'Oriental', 'Frais']),
    ],
  ),
];

const grocery: Category[] = [
  category(
    'epi',
    'Épicerie',
    'basket',
    'gold',
    ['Riz et céréales', 'Huiles', 'Conserves', 'Sucre et lait'],
    [
      attr('epi_brand', 'Marque', 'text', [], { required: true }),
      attr('epi_size', 'Contenance', 'text', [], { required: true, hint: 'Ex. 5 kg, 1 L, 400 g' }),
      attr('epi_dlc', 'Date limite de consommation', 'date'),
      attr('epi_origin', 'Origine', 'list', ['Local', 'Importé']),
    ],
  ),
  category(
    'boi',
    'Boissons',
    'cup',
    'teal',
    ['Eaux', 'Sodas', 'Jus'],
    [
      attr('boi_brand', 'Marque', 'text', [], { required: true }),
      attr('boi_format', 'Format', 'list', ['Bouteille 1,5 L', 'Pack de 6', 'Casier de 12'], { variant: true }),
      attr('boi_dlc', 'Date limite de consommation', 'date'),
    ],
  ),
  category(
    'hyg',
    'Hygiène et entretien',
    'drop',
    'navy',
    ['Lessive', 'Toilette', 'Ménage'],
    [attr('hyg_brand', 'Marque', 'text'), attr('hyg_size', 'Contenance', 'text')],
  ),
];

export const CATEGORIES: Record<BusinessId, Category[]> = { phones, hair, clothing, shoes, cosmetics, grocery };
