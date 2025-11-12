export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  image: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  image?: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}
