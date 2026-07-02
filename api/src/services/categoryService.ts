import type { Types } from "mongoose";
import { Category, type ICategory } from "../models/Category.js";
import { LineItem, type ILineItem, type LineItemType } from "../models/LineItem.js";

export interface LineItemResponse {
  id: string;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
  displayAmount: number;
  isRealized: boolean;
}

export interface CategoryNode {
  id: string;
  name: string;
  order: number;
  lineItems: LineItemResponse[];
  children: CategoryNode[];
}

function toLineItemResponse(item: ILineItem): LineItemResponse {
  const isRealized = item.realizedAmount !== null;
  return {
    id: item._id.toString(),
    type: item.type,
    label: item.label,
    plannedAmount: item.plannedAmount,
    realizedAmount: item.realizedAmount,
    displayAmount: isRealized ? item.realizedAmount! : item.plannedAmount,
    isRealized,
  };
}

function buildCategoryTree(
  categories: ICategory[],
  lineItemsByCategory: Map<string, ILineItem[]>,
): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();

  for (const cat of categories) {
    nodeMap.set(cat._id.toString(), {
      id: cat._id.toString(),
      name: cat.name,
      order: cat.order,
      lineItems: (lineItemsByCategory.get(cat._id.toString()) ?? []).map(toLineItemResponse),
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    const node = nodeMap.get(cat._id.toString())!;
    if (cat.parentId) {
      const parent = nodeMap.get(cat.parentId.toString());
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: CategoryNode[]): CategoryNode[] => {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    for (const node of nodes) {
      node.children = sortNodes(node.children);
    }
    return nodes;
  };

  return sortNodes(roots);
}

export async function getCategoriesWithLineItems(
  monthId: Types.ObjectId,
): Promise<CategoryNode[]> {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  const lineItems = await LineItem.find({ monthId }).sort({ createdAt: 1 });

  const lineItemsByCategory = new Map<string, ILineItem[]>();
  for (const item of lineItems) {
    const key = item.categoryId.toString();
    const list = lineItemsByCategory.get(key) ?? [];
    list.push(item);
    lineItemsByCategory.set(key, list);
  }

  return buildCategoryTree(categories, lineItemsByCategory);
}

export async function getAllCategoriesFlat(): Promise<
  { id: string; name: string; parentId: string | null; order: number }[]
> {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  return categories.map((cat) => ({
    id: cat._id.toString(),
    name: cat.name,
    parentId: cat.parentId?.toString() ?? null,
    order: cat.order,
  }));
}

export async function getCategoriesTree(): Promise<CategoryNode[]> {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  return buildCategoryTree(categories, new Map());
}
