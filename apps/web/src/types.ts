// API Response Types based on backend entities and DTOs

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
}

export interface OrganizationListItem {
  id: string;
  name: string;
  description?: string;
  role: string;
  memberCount: number;
  projectCount: number;
}

export interface Member {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  budget: number;
  spent: number;
  remaining: number;
  overBudget: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  estimatedCost: number;
}

export interface AuthResponse {
  user: User;
}

export interface CreateOrganizationDto {
  name: string;
  description?: string;
}

export interface AddMemberDto {
  email: string;
  role: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  budget: number;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  budget?: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  estimatedCost: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  estimatedCost?: number;
}
