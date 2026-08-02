import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { ShopService } from '../../../core/services/shop.service';
import { DynamicContact, ShopProfile, ShopLocation } from '../../../core/models/shop.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-shop-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './shop-settings.html',
  styleUrl: './shop-settings.css'
})
export class ShopSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private shopService = inject(ShopService);
  private queryClient = injectQueryClient();

  apiUrl = environment.apiUrl;
  activeTab = signal<'profile' | 'location' | 'contacts'>('profile');

  // Messages
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Forms
  profileForm!: FormGroup;
  locationForm!: FormGroup;
  contactForm!: FormGroup;

  // File Upload State
  logoFile: File | null = null;
  logoPreview = signal<string | null>(null);

  bannerFile: File | null = null;
  bannerPreview = signal<string | null>(null);

  iconFile: File | null = null;
  iconPreview = signal<string | null>(null);

  // Modal State for Contacts
  isContactModalOpen = signal<boolean>(false);
  editingContactId = signal<string | null>(null);

  // TanStack Queries
  profileQuery = injectQuery(() => ({
    queryKey: ['shop-profile'],
    queryFn: () => lastValueFrom(this.shopService.getShopProfile())
  }));

  locationQuery = injectQuery(() => ({
    queryKey: ['shop-location'],
    queryFn: () => lastValueFrom(this.shopService.getShopLocation())
  }));

  contactsQuery = injectQuery(() => ({
    queryKey: ['shop-contacts-admin'],
    queryFn: () => lastValueFrom(this.shopService.getAllContactsAdmin())
  }));

  // --- Mutations ---

  // Update Profile Mutation
  updateProfileMutation = injectMutation(() => ({
    mutationFn: (dto: any) => lastValueFrom(this.shopService.updateShopProfile(dto)),
    onSuccess: () => {
      this.showSuccess('Shop profile details updated successfully!');
      this.logoFile = null;
      this.bannerFile = null;
      this.queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
    },
    onError: (err: any) => {
      console.error('Failed to update shop profile:', err);
      this.errorMessage.set('Failed to update shop profile. Please try again.');
    }
  }));

  // Update Location Mutation
  updateLocationMutation = injectMutation(() => ({
    mutationFn: (dto: any) => lastValueFrom(this.shopService.updateShopLocation(dto)),
    onSuccess: () => {
      this.showSuccess('Shop location and operating hours updated successfully!');
      this.queryClient.invalidateQueries({ queryKey: ['shop-location'] });
      this.queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
    },
    onError: (err: any) => {
      console.error('Failed to update shop location:', err);
      this.errorMessage.set('Failed to update shop location. Please check all fields.');
    }
  }));

  // Create Contact Mutation
  createContactMutation = injectMutation(() => ({
    mutationFn: (dto: any) => lastValueFrom(this.shopService.createContact(dto)),
    onSuccess: () => {
      this.showSuccess('Dynamic contact channel created successfully!');
      this.closeContactModal();
      this.queryClient.invalidateQueries({ queryKey: ['shop-contacts-admin'] });
      this.queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
    },
    onError: (err: any) => {
      console.error('Failed to create contact:', err);
      this.errorMessage.set('Failed to create dynamic contact channel.');
    }
  }));

  // Update Contact Mutation
  updateContactMutation = injectMutation(() => ({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => lastValueFrom(this.shopService.updateContact(id, dto)),
    onSuccess: () => {
      this.showSuccess('Dynamic contact channel updated successfully!');
      this.closeContactModal();
      this.queryClient.invalidateQueries({ queryKey: ['shop-contacts-admin'] });
      this.queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
    },
    onError: (err: any) => {
      console.error('Failed to update contact:', err);
      this.errorMessage.set('Failed to update dynamic contact channel.');
    }
  }));

  // Toggle Contact Active Mutation
  toggleActiveMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.shopService.toggleContactActive(id)),
    onSuccess: () => {
      this.showSuccess('Contact status toggled successfully.');
      this.queryClient.invalidateQueries({ queryKey: ['shop-contacts-admin'] });
      this.queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
    },
    onError: (err: any) => {
      console.error('Failed to toggle contact active:', err);
      this.errorMessage.set('Failed to change contact active status.');
    }
  }));

  // Delete Contact Mutation
  deleteContactMutation = injectMutation(() => ({
    mutationFn: (id: string) => lastValueFrom(this.shopService.deleteContact(id)),
    onSuccess: () => {
      this.showSuccess('Dynamic contact entity and icon asset deleted successfully.');
      this.queryClient.invalidateQueries({ queryKey: ['shop-contacts-admin'] });
      this.queryClient.invalidateQueries({ queryKey: ['shop-profile'] });
    },
    onError: (err: any) => {
      console.error('Failed to delete contact:', err);
      this.errorMessage.set('Failed to delete contact channel.');
    }
  }));

  isSaving = () =>
    this.updateProfileMutation.isPending() ||
    this.updateLocationMutation.isPending() ||
    this.createContactMutation.isPending() ||
    this.updateContactMutation.isPending() ||
    this.toggleActiveMutation.isPending() ||
    this.deleteContactMutation.isPending();

  constructor() {
    this.initForms();

    // Sync Profile Form data
    effect(() => {
      const profile = this.profileQuery.data();
      if (profile) {
        this.profileForm.patchValue({
          shopName: profile.shopName || '',
          description: profile.description || '',
          email: profile.email || '',
          phone: profile.phone || ''
        });

        if (profile.logoUrl) {
          this.logoPreview.set(this.getImageUrl(profile.logoUrl));
        }
        if (profile.bannerUrl) {
          this.bannerPreview.set(this.getImageUrl(profile.bannerUrl));
        }
      }
    });

    // Sync Location Form data
    effect(() => {
      const loc = this.locationQuery.data();
      const prof = this.profileQuery.data();
      if (loc || prof) {
        this.locationForm.patchValue({
          address: loc?.address || prof?.address || '',
          googleMapUrl: loc?.googleMapUrl || prof?.googleMapUrl || '',
          latitude: loc?.latitude ?? prof?.latitude ?? null,
          longitude: loc?.longitude ?? prof?.longitude ?? null,
          openingHours: loc?.openingHours || prof?.openingHours || ''
        });
      }
    });
  }

  ngOnInit(): void { }

  private initForms(): void {
    this.profileForm = this.fb.group({
      shopName: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', [Validators.maxLength(1000)]],
      email: ['', [Validators.email]],
      phone: ['']
    });

    this.locationForm = this.fb.group({
      address: ['', [Validators.required]],
      googleMapUrl: [''],
      latitude: [null],
      longitude: [null],
      openingHours: ['']
    });

    this.contactForm = this.fb.group({
      title: ['', [Validators.required]],
      contactType: ['Social', [Validators.required]],
      profileUrl: ['', [Validators.required]],
      displayOrder: [0, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });
  }

  setTab(tab: 'profile' | 'location' | 'contacts'): void {
    this.activeTab.set(tab);
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.apiUrl}${path}`;
  }

  // --- Profile Image Upload Handlers ---
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.logoFile = file;
      this.logoPreview.set(URL.createObjectURL(file));
    }
  }

  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.bannerFile = file;
      this.bannerPreview.set(URL.createObjectURL(file));
    }
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required shop profile fields.');
      return;
    }

    this.errorMessage.set(null);
    const formVals = this.profileForm.value;

    const dto = {
      shopName: formVals.shopName,
      description: formVals.description,
      email: formVals.email,
      phone: formVals.phone,
      logoImage: this.logoFile || undefined,
      bannerImage: this.bannerFile || undefined
    };

    this.updateProfileMutation.mutate(dto);
  }

  // --- Location Save Handler ---
  onSaveLocation(): void {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      this.errorMessage.set('Please provide a valid shop address.');
      return;
    }

    this.errorMessage.set(null);
    const formVals = this.locationForm.value;

    const dto = {
      address: formVals.address,
      googleMapUrl: formVals.googleMapUrl,
      latitude: formVals.latitude !== null && formVals.latitude !== '' ? Number(formVals.latitude) : undefined,
      longitude: formVals.longitude !== null && formVals.longitude !== '' ? Number(formVals.longitude) : undefined,
      openingHours: formVals.openingHours
    };

    this.updateLocationMutation.mutate(dto);
  }

  // --- Contacts Modal & Actions ---
  openCreateContactModal(): void {
    this.editingContactId.set(null);
    this.iconFile = null;
    this.iconPreview.set(null);

    const currentCount = this.contactsQuery.data()?.length || 0;
    this.contactForm.reset({
      title: '',
      contactType: 'Social',
      profileUrl: '',
      displayOrder: currentCount + 1,
      isActive: true
    });

    this.isContactModalOpen.set(true);
  }

  openEditContactModal(contact: DynamicContact): void {
    this.editingContactId.set(contact.id);
    this.iconFile = null;
    this.iconPreview.set(contact.iconUrl ? this.getImageUrl(contact.iconUrl) : null);

    this.contactForm.patchValue({
      title: contact.title,
      contactType: contact.contactType || 'Social',
      profileUrl: contact.profileUrl,
      displayOrder: contact.displayOrder ?? 0,
      isActive: contact.isActive ?? true
    });

    this.isContactModalOpen.set(true);
  }

  closeContactModal(): void {
    this.isContactModalOpen.set(false);
    this.editingContactId.set(null);
    this.iconFile = null;
    this.iconPreview.set(null);
  }

  onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.iconFile = file;
      this.iconPreview.set(URL.createObjectURL(file));
    }
  }

  onSaveContact(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required contact fields.');
      return;
    }

    this.errorMessage.set(null);
    const formVals = this.contactForm.value;

    const dto = {
      title: formVals.title,
      contactType: formVals.contactType,
      profileUrl: formVals.profileUrl,
      displayOrder: Number(formVals.displayOrder || 0),
      isActive: formVals.isActive,
      iconImage: this.iconFile || undefined
    };

    const id = this.editingContactId();
    if (id) {
      this.updateContactMutation.mutate({ id, dto });
    } else {
      this.createContactMutation.mutate(dto);
    }
  }

  onToggleContactActive(contact: DynamicContact): void {
    this.toggleActiveMutation.mutate(contact.id);
  }

  onDeleteContact(contact: DynamicContact): void {
    if (confirm(`Are you sure you want to delete "${contact.title}"? This will remove its physical icon asset.`)) {
      this.deleteContactMutation.mutate(contact.id);
    }
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
