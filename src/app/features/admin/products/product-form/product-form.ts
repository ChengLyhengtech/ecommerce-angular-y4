import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, Observable, lastValueFrom } from 'rxjs';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { ProductService } from '../../../../core/services/product.service';
import { CategoryService } from '../../../../core/services/category.service';
import { BrandService } from '../../../../core/services/brand.service';
import { Category } from '../../../../core/models/category.model';
import { Product, ProductImage, VariantCreateDto } from '../../../../core/models/product.model';
import { environment } from '../../../../../environments/environment';

interface SelectedImageFile {
  file: File;
  previewUrl: string;
  variantSku: string;
  isPrimary: boolean;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public apiUrl = environment.apiUrl;
  private queryClient = injectQueryClient();

  productForm!: FormGroup;
  isEditMode = signal<boolean>(false);
  productId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Creation Mode Image Files
  selectedFiles = signal<SelectedImageFile[]>([]);

  // Edit Mode Existing Images
  existingImages = signal<ProductImage[]>([]);

  // TanStack Query for Categories
  categoriesQuery = injectQuery(() => ({
    queryKey: ['categories'],
    queryFn: () => lastValueFrom(this.categoryService.getCategories())
  }));

  // TanStack Query for Brands
  brandsQuery = injectQuery(() => ({
    queryKey: ['brands'],
    queryFn: () => lastValueFrom(this.brandService.getBrands())
  }));

  // TanStack Query for Product Details (in edit mode)
  productQuery = injectQuery(() => {
    const id = this.productId();
    return {
      queryKey: ['product', id],
      queryFn: () => lastValueFrom(this.productService.getProductById(id!)),
      enabled: !!id
    };
  });

  // Derived loading state
  isLoading = () => this.productQuery.isPending() && this.isEditMode();

  // Create Product Mutation
  createProductMutation = injectMutation(() => ({
    mutationFn: (productDto: any) => lastValueFrom(this.productService.createProduct(productDto)),
    onSuccess: () => {
      this.showSuccess('Product created successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['products'] });
      setTimeout(() => {
        this.router.navigate(['/admin/products']);
      }, 1500);
    },
    onError: (err) => {
      console.error('Failed to create product:', err);
      this.errorMessage.set('Failed to create product. Make sure SKU codes are unique.');
    }
  }));

  // Update Product Mutation
  updateProductMutation = injectMutation(() => ({
    mutationFn: async ({ id, coreUpdateDto, variantsWithNewInfo, selectedFilesToUpload }: { id: string; coreUpdateDto: any; variantsWithNewInfo: any[]; selectedFilesToUpload: SelectedImageFile[] }) => {
      // 1. Update product core details
      await lastValueFrom(this.productService.updateProductCore(id, coreUpdateDto));

      // 2. Perform variant updates and creations
      const variantOpsPromises = variantsWithNewInfo.map(async (v) => {
        if (v.id) {
          // Update existing variant
          const variantUpdateDto = {
            color: v.color,
            size: v.size,
            physicalQuantity: Number(v.physicalQuantity),
            sku: v.sku
          };
          return lastValueFrom(this.productService.updateProductVariant(v.id, variantUpdateDto));
        } else {
          // Create new variant and get its database ID to upload the queued files
          const variantCreateDto: VariantCreateDto = {
            color: v.color,
            size: v.size,
            initialPhysicalQuantity: Number(v.physicalQuantity),
            sku: v.sku
          };
          const res = await lastValueFrom(this.productService.createProductVariant(id, variantCreateDto));
          const newVariantId = res.id;
          if (newVariantId && selectedFilesToUpload.length > 0) {
            const filesForThisVariant = selectedFilesToUpload.filter(f => f.variantSku === v.sku);
            const uploadPromises = filesForThisVariant.map(f =>
              lastValueFrom(this.productService.uploadProductImage(id, f.file, f.isPrimary, newVariantId))
            );
            await Promise.all(uploadPromises);
          }
          return res;
        }
      });

      await Promise.all(variantOpsPromises);
    },
    onSuccess: () => {
      this.selectedFiles.set([]); // Clear selected files
      this.showSuccess('Product updated successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['products'] });
      this.queryClient.invalidateQueries({ queryKey: ['product', this.productId()] });
      setTimeout(() => {
        this.router.navigate(['/admin/products']);
      }, 1500);
    },
    onError: (err) => {
      console.error('Failed to update product details or variants:', err);
      this.errorMessage.set('Failed to update product. Make sure all fields are valid and SKUs are unique.');
    }
  }));

  // Delete Variant Mutation
  deleteVariantMutation = injectMutation(() => ({
    mutationFn: ({ variantId }: { variantId: string; index: number }) =>
      lastValueFrom(this.productService.deleteProductVariant(variantId)),
    onSuccess: (res, variables) => {
      this.variants.removeAt(variables.index);
      this.showSuccess('Variant deleted successfully.');
      this.queryClient.invalidateQueries({ queryKey: ['product', this.productId()] });
      this.queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate product list query cache
    },
    onError: (err) => {
      console.error('Failed to delete variant:', err);
      this.errorMessage.set('Failed to delete variant. Please try again.');
    }
  }));

  // Image Upload Mutation
  uploadImageMutation = injectMutation(() => ({
    mutationFn: ({ productId, file, isPrimary, variantId }: { productId: string; file: File; isPrimary: boolean; variantId?: string }) =>
      lastValueFrom(this.productService.uploadProductImage(productId, file, isPrimary, variantId)),
    onSuccess: () => {
      this.showSuccess('Image uploaded and linked successfully.');
      this.queryClient.invalidateQueries({ queryKey: ['product', this.productId()] });
    },
    onError: (err) => {
      console.error('Failed to upload image:', err);
      this.errorMessage.set('Failed to upload image. Please check file size/format.');
    }
  }));

  // Set Primary Image Mutation
  setPrimaryImageMutation = injectMutation(() => ({
    mutationFn: (imageId: string) => lastValueFrom(this.productService.setProductImagePrimary(imageId)),
    onSuccess: (res) => {
      this.showSuccess(res.message || 'Primary image status reassigned successfully.');
      this.queryClient.invalidateQueries({ queryKey: ['product', this.productId()] });
    },
    onError: (err) => {
      console.error('Failed to set primary image:', err);
      this.errorMessage.set('Failed to set primary image. Please try again.');
    }
  }));

  // Derived saving state
  isSaving = () =>
    this.createProductMutation.isPending() ||
    this.updateProductMutation.isPending() ||
    this.deleteVariantMutation.isPending() ||
    this.uploadImageMutation.isPending() ||
    this.setPrimaryImageMutation.isPending();

  constructor() {
    // Populate form data once productQuery data is available
    effect(() => {
      const product = this.productQuery.data();
      if (product) {
        this.productForm.patchValue({
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          discountPercentage: product.discountPercentage,
          categoryId: product.categoryId,
          brandId: product.brandId
        });

        // Clear existing variants in FormArray
        this.variants.clear();

        // Add variants from response
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(v => this.addVariant(v));
        }

        // Store existing images
        this.existingImages.set(product.images || []);
      }
    });
  }

  ngOnInit(): void {
    this.initForm();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.productId.set(id);
      } else {
        this.isEditMode.set(false);
        this.productId.set(null);
        // In create mode, add at least one default variant
        this.addVariant();
      }
    });
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', [Validators.required]],
      basePrice: [null, [Validators.required, Validators.min(0.01)]],
      discountPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      categoryId: ['', [Validators.required]],
      brandId: ['', [Validators.required]],
      variants: this.fb.array([])
    });
  }

  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  addVariant(variant?: any): void {
    const variantGroup = this.fb.group({
      id: [variant?.id || ''],
      color: [variant?.color || '', Validators.required],
      size: [variant?.size || '', Validators.required],
      physicalQuantity: [variant?.availableStock ?? variant?.physicalQuantity ?? 0, [Validators.required, Validators.min(0)]],
      sku: [variant?.sku || '', Validators.required]
    });

    this.variants.push(variantGroup);
  }

  removeVariant(index: number): void {
    const variantGroup = this.variants.at(index);
    const variantId = variantGroup.get('id')?.value;

    if (this.isEditMode() && variantId) {
      if (confirm('Are you sure you want to delete this variant? This action is immediate and cannot be undone.')) {
        this.deleteVariantMutation.mutate({ variantId, index });
      }
    } else {
      // Create mode or unsaved new variant in edit mode
      // Remove any uploaded images associated with this variant's SKU
      const sku = variantGroup.get('sku')?.value;
      if (sku) {
        this.selectedFiles.update(files => files.filter(f => f.variantSku !== sku));
      }
      this.variants.removeAt(index);
    }
  }

  // Generate SKU helper based on name, color and size
  generateSku(index: number): void {
    const name = this.productForm.get('name')?.value || 'prod';
    const variantGroup = this.variants.at(index);
    const color = variantGroup.get('color')?.value || '';
    const size = variantGroup.get('size')?.value || '';

    if (color || size) {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 10);
      const cleanColor = color.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanSize = size.toLowerCase().replace(/[^a-z0-9]/g, '');

      const parts = [cleanName];
      if (cleanColor) parts.push(cleanColor);
      if (cleanSize) parts.push(cleanSize);

      variantGroup.patchValue({
        sku: parts.join('-')
      });
    }
  }

  // Handle local image file selection (Create mode)
  onFileSelected(event: Event, variantIndex: number): void {
    const input = event.target as HTMLInputElement;
    const sku = this.variants.at(variantIndex).get('sku')?.value;

    if (!sku) {
      alert('Please fill in the Variant SKU before selecting images.');
      input.value = '';
      return;
    }

    if (input.files && input.files.length > 0) {
      const newFiles: SelectedImageFile[] = [];
      const currentFiles = this.selectedFiles();

      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const previewUrl = URL.createObjectURL(file);

        // Rule: If it's the very first image uploaded in general, mark it primary.
        const isFirstGlobalImage = currentFiles.length === 0 && newFiles.length === 0;

        newFiles.push({
          file,
          previewUrl,
          variantSku: sku,
          isPrimary: isFirstGlobalImage
        });
      }

      this.selectedFiles.set([...currentFiles, ...newFiles]);
      input.value = ''; // Reset input element
    }
  }

  // Set primary image (Create mode)
  setPrimaryImage(index: number): void {
    this.selectedFiles.update(files =>
      files.map((file, i) => ({
        ...file,
        isPrimary: i === index
      }))
    );
  }

  // Remove local image file (Create mode)
  removeSelectedFile(index: number): void {
    const currentFiles = this.selectedFiles();
    const fileToRemove = currentFiles[index];

    // Revoke URL to avoid memory leak
    if (fileToRemove?.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }

    const updatedFiles = currentFiles.filter((_, i) => i !== index);

    // If the primary image was removed, assign the primary role to the first remaining file (if any)
    if (fileToRemove?.isPrimary && updatedFiles.length > 0) {
      updatedFiles[0].isPrimary = true;
    }

    this.selectedFiles.set(updatedFiles);
  }

  // Direct image upload (Edit mode)
  onUploadImageEdit(event: Event, variantId?: string): void {
    const input = event.target as HTMLInputElement;
    const productId = this.productId();

    if (!productId) return;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Set primary if there are no existing images
      const isPrimary = this.existingImages().length === 0;

      this.uploadImageMutation.mutate({
        productId,
        file,
        isPrimary,
        variantId
      });
      input.value = '';
    }
  }

  onSetPrimaryImageEdit(imageId: string): void {
    const productId = this.productId();
    if (!productId) return;

    this.setPrimaryImageMutation.mutate(imageId);
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields correctly.');
      return;
    }

    const formValues = this.productForm.value;

    if (formValues.variants.length === 0) {
      this.errorMessage.set('At least one variant must be added.');
      return;
    }

    this.errorMessage.set(null);

    if (this.isEditMode()) {
      this.saveEditProduct(formValues);
    } else {
      this.saveCreateProduct(formValues);
    }
  }

  private saveCreateProduct(formValues: any): void {
    const files = this.selectedFiles().map(f => f.file);
    const targetSkus = this.selectedFiles().map(f => f.variantSku);
    const isPrimaries = this.selectedFiles().map(f => f.isPrimary);

    const productDto = {
      name: formValues.name,
      description: formValues.description,
      basePrice: Number(formValues.basePrice),
      discountPercentage: Number(formValues.discountPercentage),
      categoryId: formValues.categoryId,
      brandId: formValues.brandId,
      variants: formValues.variants.map((v: any) => ({
        color: v.color,
        size: v.size,
        initialPhysicalQuantity: Number(v.physicalQuantity),
        sku: v.sku
      })),
      images: files.length > 0 ? files : undefined,
      imageTargetSkus: targetSkus.length > 0 ? targetSkus : undefined,
      imageIsPrimary: isPrimaries.length > 0 ? isPrimaries : undefined
    };

    this.createProductMutation.mutate(productDto);
  }

  private saveEditProduct(formValues: any): void {
    const productId = this.productId();
    if (!productId) return;

    const coreUpdateDto = {
      name: formValues.name,
      description: formValues.description,
      basePrice: Number(formValues.basePrice),
      discountPercentage: Number(formValues.discountPercentage),
      categoryId: formValues.categoryId,
      brandId: formValues.brandId
    };

    this.updateProductMutation.mutate({
      id: productId,
      coreUpdateDto,
      variantsWithNewInfo: formValues.variants,
      selectedFilesToUpload: this.selectedFiles()
    });
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
