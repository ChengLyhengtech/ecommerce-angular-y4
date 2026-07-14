import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { BrandService } from '../../../../core/services/brand.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './brand-form.html',
  styleUrl: './brand-form.css',
})
export class BrandFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private brandService = inject(BrandService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public apiUrl = environment.apiUrl;
  private queryClient = injectQueryClient();

  brandForm!: FormGroup;
  isEditMode = signal<boolean>(false);
  brandId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Logo upload properties
  selectedLogoFile = signal<File | null>(null);
  logoPreviewUrl = signal<string | null>(null);
  existingLogoUrl = signal<string | null>(null);

  // TanStack Query to fetch brand details (in edit mode)
  brandQuery = injectQuery(() => {
    const id = this.brandId();
    return {
      queryKey: ['brand', id],
      queryFn: () => lastValueFrom(this.brandService.getBrandById(id!)),
      enabled: !!id
    };
  });

  // Derived loading state
  isLoading = () => this.brandQuery.isPending() && this.isEditMode();

  // Create Mutation
  createMutation = injectMutation(() => ({
    mutationFn: (data: { name: string; logoImage: File }) =>
      lastValueFrom(this.brandService.createBrand(data)),
    onSuccess: () => {
      this.successMessage.set('Brand created successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['brands'] });
      setTimeout(() => {
        this.router.navigate(['/admin/brands']);
      }, 1500);
    },
    onError: (err) => {
      console.error('BrandFormComponent - Failed to create brand:', err);
      this.errorMessage.set('Failed to create brand. Please verify the name is unique.');
    }
  }));

  // Update Mutation
  updateMutation = injectMutation(() => ({
    mutationFn: ({ id, data }: { id: string; data: { name: string; logoImage?: File } }) =>
      lastValueFrom(this.brandService.updateBrand(id, data)),
    onSuccess: () => {
      this.successMessage.set('Brand updated successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['brands'] });
      this.queryClient.invalidateQueries({ queryKey: ['brand', this.brandId()] });
      setTimeout(() => {
        this.router.navigate(['/admin/brands']);
      }, 1500);
    },
    onError: (err) => {
      console.error('BrandFormComponent - Failed to update brand:', err);
      this.errorMessage.set('Failed to update brand. Please verify the fields and try again.');
    }
  }));

  // Derived saving state
  isSaving = () => this.createMutation.isPending() || this.updateMutation.isPending();

  constructor() {
    // Populate form data once brandQuery yields data
    effect(() => {
      const brand = this.brandQuery.data();
      if (brand) {
        this.brandForm.patchValue({
          name: brand.name
        });
        if (brand.logoUrl) {
          this.existingLogoUrl.set(brand.logoUrl);
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
        this.brandId.set(id);
      } else {
        this.isEditMode.set(false);
        this.brandId.set(null);
      }
    });
  }

  private initForm(): void {
    this.brandForm = this.fb.group({
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

      this.selectedLogoFile.set(file);

      // Create local preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreviewUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    const name = this.brandForm.get('name')?.value;

    // In create mode, logo image is required
    if (!this.isEditMode() && !this.selectedLogoFile()) {
      this.errorMessage.set('Please select a logo image for the brand.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.isEditMode()) {
      const id = this.brandId();
      if (!id) return;

      this.updateMutation.mutate({
        id,
        data: {
          name,
          logoImage: this.selectedLogoFile() || undefined
        }
      });
    } else {
      this.createMutation.mutate({
        name,
        logoImage: this.selectedLogoFile()!
      });
    }
  }
}
