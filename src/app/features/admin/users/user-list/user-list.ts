import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { injectQuery, injectMutation, injectQueryClient } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { UserResponseDto, UserCreateAdminDto, UserBanDto } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private queryClient = injectQueryClient();

  // Signals
  pageNumber = signal<number>(1);
  pageSize = signal<number>(10);
  searchQuery = signal<string>('');

  // Modals Visibility
  showCreateModal = signal<boolean>(false);
  showRoleModal = signal<boolean>(false);
  showBanModal = signal<boolean>(false);
  selectedUser = signal<UserResponseDto | null>(null);

  // Forms
  createUserForm!: FormGroup;
  roleForm!: FormGroup;
  banForm!: FormGroup;

  // TanStack Query for Users list
  usersQuery = injectQuery(() => {
    const page = this.pageNumber();
    const size = this.pageSize();
    return {
      queryKey: ['users', { page, size }],
      queryFn: () => lastValueFrom(this.userService.getUsers(page, size))
    };
  });

  // Create User Mutation
  createUserMutation = injectMutation(() => ({
    mutationFn: (dto: UserCreateAdminDto) => lastValueFrom(this.userService.createUser(dto)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['users'] });
      this.closeCreateModal();
      this.createUserForm.reset({ role: 'Admin' });
    },
    onError: (err) => {
      console.error('Failed to create user:', err);
      alert('Failed to create user. Make sure the email is unique and password is secure.');
    }
  }));

  // Update Role Mutation
  updateRoleMutation = injectMutation(() => ({
    mutationFn: ({ id, role }: { id: string; role: string }) => 
      lastValueFrom(this.userService.updateUserRole(id, role)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['users'] });
      this.closeRoleModal();
    },
    onError: (err) => {
      console.error('Failed to update role:', err);
      alert('Failed to update role. Please try again.');
    }
  }));

  // Ban User Mutation
  banUserMutation = injectMutation(() => ({
    mutationFn: ({ id, banData }: { id: string; banData: UserBanDto }) => 
      lastValueFrom(this.userService.banUser(id, banData)),
    onSuccess: () => {
      this.queryClient.invalidateQueries({ queryKey: ['users'] });
      this.closeBanModal();
    },
    onError: (err) => {
      console.error('Failed to update ban status:', err);
      alert('Failed to update ban status. Please try again.');
    }
  }));

  isLoading = () => 
    this.usersQuery.isPending() || 
    this.usersQuery.isFetching() ||
    this.createUserMutation.isPending() ||
    this.updateRoleMutation.isPending() ||
    this.banUserMutation.isPending();

  // Search filter computes local array
  filteredUsers = () => {
    const users = this.usersQuery.data() || [];
    const search = this.searchQuery().toLowerCase().trim();
    if (!search) return users;
    return users.filter(u => 
      u.fullName.toLowerCase().includes(search) || 
      u.email.toLowerCase().includes(search) ||
      u.roles.some(r => r.toLowerCase().includes(search))
    );
  };

  ngOnInit(): void {
    this.initForms();
  }

  private initForms(): void {
    this.createUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      role: ['Customer', [Validators.required]]
    });

    this.roleForm = this.fb.group({
      role: ['', [Validators.required]]
    });

    this.banForm = this.fb.group({
      isBanned: [false, [Validators.required]],
      banReason: ['', [Validators.maxLength(250)]]
    });
  }

  // Create User Modal Handlers
  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateUser(): void {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }
    const val = this.createUserForm.value;
    this.createUserMutation.mutate(val);
  }

  // Role Edit Modal Handlers
  openRoleModal(user: UserResponseDto): void {
    this.selectedUser.set(user);
    this.roleForm.patchValue({
      role: user.roles[0] || 'Customer'
    });
    this.showRoleModal.set(true);
  }

  closeRoleModal(): void {
    this.showRoleModal.set(false);
    this.selectedUser.set(null);
  }

  submitRoleUpdate(): void {
    if (this.roleForm.invalid) return;
    const user = this.selectedUser();
    if (!user) return;

    this.updateRoleMutation.mutate({
      id: user.id,
      role: this.roleForm.get('role')?.value
    });
  }

  // Ban Modal Handlers
  openBanModal(user: UserResponseDto): void {
    this.selectedUser.set(user);
    this.banForm.patchValue({
      isBanned: user.isBanned,
      banReason: user.banReason || ''
    });
    this.showBanModal.set(true);
  }

  closeBanModal(): void {
    this.showBanModal.set(false);
    this.selectedUser.set(null);
  }

  submitBanUpdate(): void {
    if (this.banForm.invalid) return;
    const user = this.selectedUser();
    if (!user) return;

    const val = this.banForm.value;
    const banData: UserBanDto = {
      isBanned: val.isBanned,
      banReason: val.isBanned ? val.banReason : undefined
    };

    this.banUserMutation.mutate({
      id: user.id,
      banData
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }
}

