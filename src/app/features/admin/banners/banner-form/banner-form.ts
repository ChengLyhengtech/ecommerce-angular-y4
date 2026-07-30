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
  
  selectedDesktopFile = signal<File | null>(null);
  selectedMobileFile = signal<File | null>(null);
  desktopPreviewUrl = signal<string | null>(null);
  mobilePreviewUrl = signal<string | null>(null);
  
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Edit Mode Signals
  isEditMode = signal<boolean>(false);
  bannerId = signal<string | null>(null);
  existingDesktopUrl = signal<string | null>(null);
  existingMobileUrl = signal<string | null>(null);
  existingImageUrl = signal<string | null>(null);

  bannerQuery = injectQuery(() => {
    const id = this.bannerId();
    return {
      queryKey: ['banner', id],
      queryFn: () => lastValueFrom(this.bannerService.getBannerById(id!)),
      enabled: !!id
    };
  });

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
        this.existingDesktopUrl.set(data.desktopImageUrl || data.imageUrl || null);
        this.existingMobileUrl.set(data.mobileImageUrl || data.imageUrl || null);
        this.existingImageUrl.set(data.imageUrl || null);
      }
    });
  }

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
      this.errorMessage.set('Failed to create banner. Please upload both desktop and mobile images.');
    }
  }));

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
    
    this.bannerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      linkUrl: [''],
      position: [1, [Validators.required]],
      sortOrder: [1, [Validators.required, Validators.min(0)]],
      isActive: [true, [Validators.required]]
    });

    if (id) {
      this.bannerId.set(id);
      this.isEditMode.set(true);
    }
  }

  onDesktopFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedDesktopFile.set(file);
      if (this.desktopPreviewUrl()) {
        URL.revokeObjectURL(this.desktopPreviewUrl()!);
      }
      this.desktopPreviewUrl.set(URL.createObjectURL(file));
      this.errorMessage.set(null);
    }
  }

  onMobileFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedMobileFile.set(file);
      if (this.mobilePreviewUrl()) {
        URL.revokeObjectURL(this.mobilePreviewUrl()!);
      }
      this.mobilePreviewUrl.set(URL.createObjectURL(file));
      this.errorMessage.set(null);
    }
  }

  removeDesktopFile(): void {
    if (this.desktopPreviewUrl()) {
      URL.revokeObjectURL(this.desktopPreviewUrl()!);
    }
    this.selectedDesktopFile.set(null);
    this.desktopPreviewUrl.set(null);
  }

  removeMobileFile(): void {
    if (this.mobilePreviewUrl()) {
      URL.revokeObjectURL(this.mobilePreviewUrl()!);
    }
    this.selectedMobileFile.set(null);
    this.mobilePreviewUrl.set(null);
  }

  onSubmit(): void {
    if (this.bannerForm.invalid) {
      this.bannerForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    const formValue = this.bannerForm.value;
    const desktopFile = this.selectedDesktopFile();
    const mobileFile = this.selectedMobileFile();
    this.errorMessage.set(null);

    if (this.isEditMode()) {
      const dto: BannerUpdateDto = {
        name: formValue.name,
        linkUrl: formValue.linkUrl || '',
        position: Number(formValue.position),
        sortOrder: Number(formValue.sortOrder),
        isActive: formValue.isActive,
        desktopImage: desktopFile || undefined,
        mobileImage: mobileFile || undefined
      };
      this.updateMutation.mutate({ id: this.bannerId()!, dto });
    } else {
      if (!desktopFile || !mobileFile) {
        this.errorMessage.set('Please upload both Desktop and Mobile banner images.');
        return;
      }
      const dto: BannerCreateDto = {
        name: formValue.name,
        linkUrl: formValue.linkUrl || '',
        position: Number(formValue.position),
        sortOrder: Number(formValue.sortOrder),
        desktopImage: desktopFile,
        mobileImage: mobileFile
      };
      this.createMutation.mutate(dto);
    }
  }
}
