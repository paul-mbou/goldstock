import type { BusinessId } from '../../data/businesses';
import { CATEGORIES } from '../../data/catalogs';

export type CategoryInsert = {
  id: string;
  code: string;
  name: string;
  icon: string;
  tone: string;
  subs: string[];
  archived: boolean;
  sort_order: number;
  attrs: {
    id: string;
    code: string;
    name: string;
    type: string;
    options: string[];
    is_variant: boolean;
    required: boolean;
    hint: string;
    sort_order: number;
  }[];
};

/** Rows to insert for a shop that still has no categories. */
export function categoryInsertsForBusiness(business: BusinessId): CategoryInsert[] {
  return CATEGORIES[business].map((category, index) => ({
    id: crypto.randomUUID(),
    code: category.id,
    name: category.name,
    icon: category.icon,
    tone: category.tone,
    subs: [...category.subs],
    archived: false,
    sort_order: index,
    attrs: category.attrs.map((attribute, attrIndex) => ({
      id: crypto.randomUUID(),
      code: attribute.id,
      name: attribute.name,
      type: attribute.type,
      options: [...attribute.options],
      is_variant: attribute.variant,
      required: attribute.required,
      hint: attribute.hint ?? '',
      sort_order: attrIndex,
    })),
  }));
}
