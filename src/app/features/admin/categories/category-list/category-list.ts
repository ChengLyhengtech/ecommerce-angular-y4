import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { CategoryService } from '../../../../core/services/category.service';
import { Category, CategoryTreeNode } from '../../../../core/models/category.model';
import { environment } from '../../../../../environments/environment';

export interface FlatTreeItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
  level: number;
  levelLabel: string;
  directProductCount: number;
  totalProductCount: number;
  subCategoryCount: number;
  status: string;
  treePrefix: string;
  hasChildren: boolean;
  ancestorIds: string[];
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryListComponent {
  private categoryService = inject(CategoryService);
  public apiUrl = environment.apiUrl;
  private queryClient = injectQueryClient();

  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Set of collapsed category IDs (categories whose children are hidden)
  collapsedCategoryIds = signal<Set<string>>(new Set());

  // TanStack Query for Flat Categories
  categoriesQuery = injectQuery(() => ({
    queryKey: ['categories'],
    queryFn: () => lastValueFrom(this.categoryService.getCategories()),
    staleTime: 0,
    refetchOnMount: 'always'
  }));

  // TanStack Query for Category Tree
  categoryTreeQuery = injectQuery(() => ({
    queryKey: ['category-tree'],
    queryFn: () => lastValueFrom(this.categoryService.getCategoryTree()),
    staleTime: 0,
    refetchOnMount: 'always'
  }));

  // Delete Mutation
  deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.categoryService.deleteCategory(id)),
    onSuccess: () => {
      this.successMessage.set('Category deleted successfully.');
      setTimeout(() => this.successMessage.set(null), 4000);
      this.queryClient.invalidateQueries({ queryKey: ['categories'] });
      this.queryClient.invalidateQueries({ queryKey: ['category-tree'] });
    },
    onError: (err: any) => {
      console.error('CategoryListComponent - Failed to delete category:', err);
      const msg = typeof err?.error === 'string' ? err.error : (err?.error?.message || 'Failed to delete category. Ensure no subcategories or active products exist under it.');
      this.error.set(msg);
      setTimeout(() => this.error.set(null), 6000);
    }
  }));

  // Computed Tree Items for hierarchical tree rendering
  treeItems = computed<FlatTreeItem[]>(() => {
    const treeData = this.categoryTreeQuery.data();
    const flatData = this.categoriesQuery.data();

    // Prefer hierarchical tree data from GET /api/categories/tree
    if (treeData && treeData.length > 0) {
      return this.flattenTreeNodes(treeData);
    }

    // Fallback to building tree structure from flat list GET /api/categories
    if (flatData && flatData.length > 0) {
      return this.buildTreeFromFlatList(flatData);
    }

    return [];
  });

  // Filtered visible tree items according to collapsed state
  visibleTreeItems = computed<FlatTreeItem[]>(() => {
    const items = this.treeItems();
    const collapsed = this.collapsedCategoryIds();
    if (collapsed.size === 0) return items;

    return items.filter((item) => {
      return !item.ancestorIds.some((ancestorId) => collapsed.has(ancestorId));
    });
  });

  private flattenTreeNodes(nodes: CategoryTreeNode[], level = 0, parentName = '', ancestors: string[] = []): FlatTreeItem[] {
    const result: FlatTreeItem[] = [];

    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const levelNum = level + 1;
      const levelLabel = level === 0
        ? 'Root Category / Level 1'
        : `Subcategory / Level ${levelNum}, Parent: ${parentName}`;

      let treePrefix = '';
      if (level === 0) {
        treePrefix = '📁 ';
      } else {
        const branchSymbol = isLast ? '└── ↳ ' : '├── ↳ ';
        const indentSpaces = '   '.repeat(level - 1);
        treePrefix = `${indentSpaces}${branchSymbol}`;
      }

      const hasChildren = !!(node.subCategories && node.subCategories.length > 0);

      result.push({
        id: node.id,
        name: node.name,
        imageUrl: node.imageUrl,
        parentCategoryId: node.parentCategoryId,
        parentCategoryName: parentName || null,
        level,
        levelLabel,
        directProductCount: node.directProductCount ?? 0,
        totalProductCount: node.totalProductCount ?? node.directProductCount ?? 0,
        subCategoryCount: node.subCategories?.length ?? 0,
        status: node.status || 'Active',
        treePrefix,
        hasChildren,
        ancestorIds: ancestors
      });

      if (hasChildren) {
        result.push(...this.flattenTreeNodes(node.subCategories!, level + 1, node.name, [...ancestors, node.id]));
      }
    });

    return result;
  }

  private buildTreeFromFlatList(categories: Category[]): FlatTreeItem[] {
    const map = new Map<string | null, Category[]>();
    categories.forEach((cat) => {
      const key = cat.parentCategoryId || null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cat);
    });

    const result: FlatTreeItem[] = [];

    const recurse = (parentId: string | null, level: number, parentName: string, ancestors: string[]) => {
      const children = map.get(parentId) || [];
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        const levelNum = level + 1;
        const levelLabel = level === 0
          ? 'Root Category / Level 1'
          : `Subcategory / Level ${levelNum}, Parent: ${parentName}`;

        let treePrefix = '';
        if (level === 0) {
          treePrefix = '📁 ';
        } else {
          const branchSymbol = isLast ? '└── ↳ ' : '├── ↳ ';
          const indentSpaces = '   '.repeat(level - 1);
          treePrefix = `${indentSpaces}${branchSymbol}`;
        }

        const childSubCategories = map.get(child.id) || [];
        const hasChildren = childSubCategories.length > 0;

        result.push({
          id: child.id,
          name: child.name,
          imageUrl: child.imageUrl,
          parentCategoryId: child.parentCategoryId,
          parentCategoryName: child.parentCategoryName || parentName || null,
          level,
          levelLabel,
          directProductCount: child.directProductCount ?? child.productCount ?? 0,
          totalProductCount: child.totalProductCount ?? child.productCount ?? 0,
          subCategoryCount: child.subCategoryCount ?? childSubCategories.length,
          status: child.status || 'Active',
          treePrefix,
          hasChildren,
          ancestorIds: ancestors
        });

        if (hasChildren) {
          recurse(child.id, level + 1, child.name, [...ancestors, child.id]);
        }
      });
    };

    recurse(null, 0, '', []);

    // Append orphans if any
    const processedIds = new Set(result.map((r) => r.id));
    categories.forEach((cat) => {
      if (!processedIds.has(cat.id)) {
        result.push({
          id: cat.id,
          name: cat.name,
          imageUrl: cat.imageUrl,
          parentCategoryId: cat.parentCategoryId,
          parentCategoryName: cat.parentCategoryName || null,
          level: 0,
          levelLabel: 'Root Category / Level 1',
          directProductCount: cat.productCount ?? 0,
          totalProductCount: cat.productCount ?? 0,
          subCategoryCount: cat.subCategoryCount ?? 0,
          status: cat.status || 'Active',
          treePrefix: '📁 ',
          hasChildren: false,
          ancestorIds: []
        });
      }
    });

    return result;
  }

  toggleCollapse(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const current = new Set(this.collapsedCategoryIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.collapsedCategoryIds.set(current);
  }

  isCollapsed(id: string): boolean {
    return this.collapsedCategoryIds().has(id);
  }

  expandAll(): void {
    this.collapsedCategoryIds.set(new Set());
  }

  collapseAll(): void {
    const parentIds = new Set<string>();
    this.treeItems().forEach((item) => {
      if (item.hasChildren) {
        parentIds.add(item.id);
      }
    });
    this.collapsedCategoryIds.set(parentIds);
  }

  getImageUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.apiUrl}${path}`;
  }

  deleteCategory(id: string, name?: string): void {
    const categoryName = name ? `"${name}"` : 'this category';
    if (confirm(`Are you sure you want to delete ${categoryName}? Action cannot be undone if it has no child categories or active products.`)) {
      this.deleteMutation.mutate(id);
    }
  }
}
