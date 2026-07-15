import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { BannerService } from '../../../../core/services/banner.service';
import { BannerCreateDto, BannerUpdateDto } from '../../../../core/models/banner.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-banner-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './banner-form.html',
  styleUrl: './banner-form.css',
})
export class BannerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bannerService = inject(BannerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private queryClient = injectQueryClient();

  bannerForm!: FormGroup;
  public apiUrl = environment.apiUrl;
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Edit Mode Signals
  isEditMode = signal<boolean>(false);
  bannerId = signal<string | null>(null);
  existingImageUrl = signal<string | null>(null);

  // TanStack Query for loading details when in Edit Mode
  bannerQuery = injectQuery(() => {
    const id = this.bannerId();
    return {
      queryKey: ['banner', id],
      queryFn: () => lastValueFrom(this.bannerService.getBannerById(id!)),
      enabled: !!id
    };
  });

  // Constructor reactive effects
  constructor() {
    effect(() => {
      const data = this.bannerQuery.data();
      if (data) {
        this.bannerForm.patchValue({
          name: data.name,
          linkUrl: data.linkUrl,
          position: data.position,
          sortOrder: data.sortOrder,
          isActive: data.isActive
        });
        this.existingImageUrl.set(data.imageUrl);
      }
    });
  }

  // TanStack Mutation for creation
  createMutation = injectMutation(() => ({
    mutationFn: (dto: BannerCreateDto) => lastValueFrom(this.bannerService.createBanner(dto)),
    onSuccess: () => {
      this.successMessage.set('Banner created successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['banners'] });
      setTimeout(() => {
        this.router.navigate(['/admin/banners']);
      }, 1500);
    },
    onError: (err) => {
      console.error('Failed to create banner:', err);
      this.errorMessage.set('Failed to create banner. Please verify file size and fields.');
    }
  }));

  // TanStack Mutation for update
  updateMutation = injectMutation(() => ({
    mutationFn: ({ id, dto }: { id: string; dto: BannerUpdateDto }) => 
      lastValueFrom(this.bannerService.updateBanner(id, dto)),
    onSuccess: () => {
      this.successMessage.set('Banner updated successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['banners'] });
      this.queryClient.invalidateQueries({ queryKey: ['banner', this.bannerId()] });
      setTimeout(() => {
        this.router.navigate(['/admin/banners']);
      }, 1500);
    },
    onError: (err) => {
      console.error('Failed to update banner:', err);
      this.errorMessage.set('Failed to update banner. Please check field requirements.');
    }
  }));

  isLoading = () => 
    this.createMutation.isPending() || 
    this.updateMutation.isPending() ||
    (this.isEditMode() && this.bannerQuery.isPending());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      this.bannerId.set(id);
      this.isEditMode.set(true);
      
      this.bannerForm = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        linkUrl: ['', [Validators.required]],
        position: [1, [Validators.required]],
        sortOrder: [0, [Validators.required, Validators.min(0)]],
        isActive: [true, [Validators.required]]
      });
    } else {
      this.bannerForm = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        linkUrl: ['', [Validators.required]],
        position: [1, [Validators.required]],
        sortOrder: [0, [Validators.required, Validators.min(0)]],
        isActive: [true, [Validators.required]]
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      // Create local URL for preview
      if (this.previewUrl()) {
        URL.revokeObjectURL(this.previewUrl()!);
      }
      this.previewUrl.set(URL.createObjectURL(file));
      this.errorMessage.set(null);
    }
  }

  removeSelectedFile(): void {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  onSubmit(): void {
    if (this.bannerForm.invalid) {
      this.bannerForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    const file = this.selectedFile();
    const formValue = this.bannerForm.value;
    this.errorMessage.set(null);

    if (this.isEditMode()) {
      const dto: BannerUpdateDto = {
        name: formValue.name,
        linkUrl: formValue.linkUrl,
        position: Number(formValue.position),
        sortOrder: Number(formValue.sortOrder),
        isActive: formValue.isActive,
        imageFile: file || undefined
      };
      this.updateMutation.mutate({ id: this.bannerId()!, dto });
    } else {
      if (!file) {
        this.errorMessage.set('Please upload a banner image file.');
        return;
      }
      const dto: BannerCreateDto = {
        name: formValue.name,
        linkUrl: formValue.linkUrl,
        position: Number(formValue.position),
        sortOrder: Number(formValue.sortOrder),
        imageFile: file
      };
      this.createMutation.mutate(dto);
    }
  }
}
