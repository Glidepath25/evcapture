import type { EditableLineItem, NormalizedQuantityOption, SurveyTemplateRow } from "@/types";

export function buildEmptyOptionQuantities(row: SurveyTemplateRow) {
  return Object.fromEntries((row.quantityOptions ?? []).map((option) => [option.id, ""])) as Record<string, string>;
}

export function itemHasAnyQuantity(item: EditableLineItem) {
  if (item.quantity.trim()) {
    return true;
  }

  return Object.values(item.optionQuantities ?? {}).some((value) => value.trim());
}

export function buildQuantityDisplay(quantity: number | null, quantityOptions?: NormalizedQuantityOption[]) {
  if (quantityOptions && quantityOptions.length > 0) {
    const filledOptions = quantityOptions.filter((option) => option.quantity !== null);
    return filledOptions.map((option) => `${option.label}: ${option.quantity}`).join("; ");
  }

  return quantity === null ? "" : quantity.toString();
}
