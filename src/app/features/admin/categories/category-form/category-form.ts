import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { CategoryService } from '../../../../core/services/category.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public apiUrl = environment.apiUrl;
  private queryClient = injectQueryClient();

  categoryForm!: FormGroup;
  isEditMode = signal<boolean>(false);
  categoryId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Image upload properties
  selectedImageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  existingImageUrl = signal<string | null>(null);

  // TanStack Query to fetch category details (in edit mode)
  categoryQuery = injectQuery(() => {
    const id = this.categoryId();
    return {
      queryKey: ['category', id],
      queryFn: () => lastValueFrom(this.categoryService.getCategoryById(id!)),
      enabled: !!id
    };
  });

  // Derived loading state
  isLoading = () => this.categoryQuery.isPending() && this.isEditMode();

  // Create Mutation
  createMutation = injectMutation(() => ({
    mutationFn: (data: { name: string; image: File }) => 
      lastValueFrom(this.categoryService.createCategory(data)),
    onSuccess: () => {
      this.successMessage.set('Category created successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['categories'] });
      setTimeout(() => {
        this.router.navigate(['/admin/categories']);
      }, 1500);
    },
    onError: (err) => {
      console.error('CategoryFormComponent - Failed to create category:', err);
      this.errorMessage.set('Failed to create category. Please try again.');
    }
  }));

  // Update Mutation
  updateMutation = injectMutation(() => ({
    mutationFn: ({ id, data }: { id: string; data: { name: string; image?: File } }) => 
      lastValueFrom(this.categoryService.updateCategory(id, data)),
    onSuccess: () => {
      this.successMessage.set('Category updated successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['categories'] });
      this.queryClient.invalidateQueries({ queryKey: ['category', this.categoryId()] });
      setTimeout(() => {
        this.router.navigate(['/admin/categories']);
      }, 1500);
    },
    onError: (err) => {
      console.error('CategoryFormComponent - Failed to update category:', err);
      this.errorMessage.set('Failed to update category. Please verify the fields and try again.');
    }
  }));

  // Derived saving state
  isSaving = () => this.createMutation.isPending() || this.updateMutation.isPending();

  constructor() {
    // Reactively populate the form once category query yields data
    effect(() => {
      const category = this.categoryQuery.data();
      if (category) {
        this.categoryForm.patchValue({
          name: category.name
        });
        if (category.imageUrl) {
          this.existingImageUrl.set(category.imageUrl);
        }
      }
    });
  }

  ngOnInit(): void {
    this.initForm();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode.set(true);
        this.categoryId.set(id);
      } else {
        this.isEditMode.set(false);
        this.categoryId.set(null);
      }
    });
  }

  private initForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (png, jpeg, etc.)');
        input.value = '';
        return;
      }

      this.selectedImageFile.set(file);

      // Create local preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    const name = this.categoryForm.get('name')?.value;

    // In create mode, image is required
    if (!this.isEditMode() && !this.selectedImageFile()) {
      this.errorMessage.set('Please select an image for the category.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.isEditMode()) {
      const id = this.categoryId();
      if (!id) return;

      this.updateMutation.mutate({
        id,
        data: {
          name,
          image: this.selectedImageFile() || undefined
        }
      });
    } else {
      this.createMutation.mutate({
        name,
        image: this.selectedImageFile()!
      });
    }
  }
}
