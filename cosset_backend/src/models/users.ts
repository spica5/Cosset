/**
 * Users Model
 *
 * Provides functions to query and manage users in the database.
 * This module demonstrates best practices for using the Neon database handler.
 *
 * @module models/users
 *
 * @example
 * ```ts
 * import { getUserByEmail, getAllUsers } from '@/models/users';
 *
 * const user = await getUserByEmail('john@example.com');
 * const users = await getAllUsers(20, 0);
 * ```
 */

import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany } from '@/db/neon';

/**
 * Table name for users
 */
const TABLE_NAME = 'cosset_users';

/**
 * User plan type enum
 */
export type UserPlanType = 'FREE' | 'PAID' | 'EXTRA-PAID';

/**
 * User role type enum
 */
export type UserRoleType = 'user' | 'admin';

/**
 * User record from the database
 */
export interface User {
  /** Unique identifier (UUID) */
  id: string;
  /** Email address (unique) */
  email: string;
  /** Password hash */
  password: string;
  /** User plan type */
  plan: UserPlanType;
  /** User role type */
  role: UserRoleType;
  /** Phone number (optional) */
  phoneNumber?: string;
  /** First name (optional) */
  firstName?: string;
  /** Last name (optional) */
  lastName?: string;
  /** Photo URL (optional) */
  photoURL?: string;
  /** Country (optional) */
  country?: string;
  /** Address (optional) */
  address?: string;
  /** State (optional) */
  state?: string;
  /** City (optional) */
  city?: string;
  /** Zip code (optional) */
  zipCode?: string;
  /** About/bio (optional) */
  about?: string;
  /** Whether profile is public */
  isPublic: boolean;
  /** Record creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Get user by email address
 *
 * Fetches a single user record from the users table by email.
 * Returns null if no user is found with the given email.
 *
 * @param email - User email address to search for
 * @returns User object if found, null if not found
 * @throws {DatabaseError} If query execution fails
 *
 * @example
 * ```ts
 * import { getUserByEmail } from '@/models/users';
 *
 * const user = await getUserByEmail('john@example.com');
 * if (!user) {
 *   console.log('User not found');
 *   return;
 * }
 *
 * console.log(`User: ${user.firstName} ${user.lastName}`);
 * ```
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await queryOne<User>(
      `
        SELECT
          id,
          email,
          password,
          plan as "plan",
          role as "role",
          phone_number as "phoneNumber",
          first_name as "firstName",
          last_name as "lastName",
          photo_url as "photoURL",
          country,
          address,
          state,
          city,
          zip_code as "zipCode",
          about,
          is_public as "isPublic",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    return user;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_USER_BY_EMAIL_ERROR',
        message: `Failed to fetch user by email: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get user by ID
 *
 * Fetches a single user record from the users table by ID.
 * Returns null if no user is found with the given ID.
 *
 * @param id - User ID (UUID)
 * @returns User object if found, null if not found
 * @throws {DatabaseError} If query execution fails
 *
 * @example
 * ```ts
 * import { getUserById } from '@/models/users';
 *
 * const user = await getUserById('550e8400-e29b-41d4-a716-446655440000');
 * if (user) {
 *   console.log(`User email: ${user.email}`);
 * }
 * ```
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await queryOne<User>(
      `
        SELECT
          id,
          email,
          password,
          plan as "plan",
          role as "role",
          phone_number as "phoneNumber",
          first_name as "firstName",
          last_name as "lastName",
          photo_url as "photoURL",
          country,
          address,
          state,
          city,
          zip_code as "zipCode",
          about,
          is_public as "isPublic",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return user;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_USER_BY_ID_ERROR',
        message: `Failed to fetch user by ID: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Get all users with pagination
 *
 * Fetches a paginated list of users from the database.
 * Results are ordered by most recently created first.
 *
 * @param limit - Number of records to return (default: 10)
 * @param offset - Number of records to skip (default: 0)
 * @returns Array of users (empty array if none found)
 * @throws {DatabaseError} If query execution fails
 *
 * @example
 * ```ts
 * import { getAllUsers } from '@/models/users';
 *
 * // Get first 20 users
 * const users = await getAllUsers(20, 0);
 *
 * // Get next page (users 20-40)
 * const nextPage = await getAllUsers(20, 20);
 *
 * console.log(`Found ${users.length} users`);
 * ```
 */
export async function getAllUsers(
  limit: number = 10,
  offset: number = 0,
): Promise<User[]> {
  try {
    const users = await queryMany<User>(
      `
        SELECT
          id,
          email,
          password,
          plan as "plan",
          role as "role",
          phone_number as "phoneNumber",
          first_name as "firstName",
          last_name as "lastName",
          photo_url as "photoURL",
          country,
          address,
          state,
          city,
          zip_code as "zipCode",
          about,
          is_public as "isPublic",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        ORDER BY created_at DESC
        LIMIT $1
        OFFSET $2
      `,
      [limit, offset],
    );

    return users;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ALL_USERS_ERROR',
        message: `Failed to fetch users: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Check if user exists by email
 *
 * Quick check to see if a user with the given email exists in the database.
 * Useful for validating email uniqueness before creating new users.
 *
 * @param email - User email address to check
 * @returns true if user exists, false otherwise
 * @throws {DatabaseError} If query execution fails
 *
 * @example
 * ```ts
 * import { userExistsByEmail } from '@/models/users';
 *
 * const exists = await userExistsByEmail('john@example.com');
 * if (exists) {
 *   return Response.json(
 *     { error: 'Email already registered' },
 *     { status: 400 }
 *   );
 * }
 * ```
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  try {
    const result = await queryOne<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM ${TABLE_NAME}
        WHERE email = $1
      `,
      [email],
    );

    return (result?.count ?? 0) > 0;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CHECK_USER_EXISTS_ERROR',
        message: `Failed to check if user exists: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Create a new user
 *
 * Inserts a new user record into the database.
 * Email must be unique.
 *
 * @param user - User data to insert (id, email, password, firstName, lastName, avatar)
 * @returns The created user object with timestamps
 * @throws {DatabaseError} If query execution fails or email already exists
 *
 * @example
 * ```ts
 * import { createUser } from '@/models/users';
 *
 * const newUser = await createUser({
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   email: 'john@example.com',
 *   password: '$2b$10$...',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   avatar: 'https://example.com/avatar.jpg',
 * });
 * ```
 */
export async function createUser(
  user: Omit<User, 'createdAt' | 'updatedAt'>,
): Promise<User> {
  try {
    const createdUser = await queryOne<User>(
      `
        INSERT INTO ${TABLE_NAME} (
          id,
          email,
          password,
          plan,
          role,
          phone_number,
          first_name,
          last_name,
          photo_url,
          country,
          address,
          state,
          city,
          zip_code,
          about,
          is_public,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        RETURNING
          id,
          email,
          password,
          plan as "plan",
          role as "role",
          phone_number as "phoneNumber",
          first_name as "firstName",
          last_name as "lastName",
          photo_url as "photoURL",
          country,
          address,
          state,
          city,
          zip_code as "zipCode",
          about,
          is_public as "isPublic",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        user.id,
        user.email,
        user.password,
        user.plan,
        user.role,
        user.phoneNumber || null,
        user.firstName || null,
        user.lastName || null,
        user.photoURL || null,
        user.country || null,
        user.address || null,
        user.state || null,
        user.city || null,
        user.zipCode || null,
        user.about || null,
        user.isPublic || false,
      ],
    );

    if (!createdUser) {
      throw new DatabaseError({
        code: 'CREATE_USER_FAILED',
        message: 'Failed to create user: No data returned',
      });
    }

    return createdUser;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'CREATE_USER_ERROR',
        message: `Failed to create user: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Update user profile information
 *
 * Fetches a single user record by id and updates the profile fields.
 * Returns the updated user record.
 *
 * @param id - User ID to update
 * @param updates - Partial user object with fields to update
 * @returns Updated user object
 * @throws {DatabaseError} If query execution fails
 *
 * @example
 * ```ts
 * import { updateUser } from '@/models/users';
 *
 * const updatedUser = await updateUser('user-123', {
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   phoneNumber: '+1234567890'
 * });
 * ```
 */
export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'email' | 'password' | 'plan' | 'role' | 'createdAt' | 'updatedAt'>>,
): Promise<User> {
  try {
    const fields: string[] = [];
    const values: (string | boolean | null)[] = [];
    let paramIndex = 2; // Start from $2 since $1 is the id
    const nextParam = () => {
      const currentParam = paramIndex;
      paramIndex += 1;
      return currentParam;
    };

    // Build dynamic UPDATE clause
    if (updates.phoneNumber !== undefined) {
      fields.push(`phone_number = $${nextParam()}`);
      values.push(updates.phoneNumber || null);
    }
    if (updates.firstName !== undefined) {
      fields.push(`first_name = $${nextParam()}`);
      values.push(updates.firstName || null);
    }
    if (updates.lastName !== undefined) {
      fields.push(`last_name = $${nextParam()}`);
      values.push(updates.lastName || null);
    }
    if (updates.photoURL !== undefined) {
      fields.push(`photo_url = $${nextParam()}`);
      values.push(updates.photoURL || null);
    }
    if (updates.country !== undefined) {
      fields.push(`country = $${nextParam()}`);
      values.push(updates.country || null);
    }
    if (updates.address !== undefined) {
      fields.push(`address = $${nextParam()}`);
      values.push(updates.address || null);
    }
    if (updates.state !== undefined) {
      fields.push(`state = $${nextParam()}`);
      values.push(updates.state || null);
    }
    if (updates.city !== undefined) {
      fields.push(`city = $${nextParam()}`);
      values.push(updates.city || null);
    }
    if (updates.zipCode !== undefined) {
      fields.push(`zip_code = $${nextParam()}`);
      values.push(updates.zipCode || null);
    }
    if (updates.about !== undefined) {
      fields.push(`about = $${nextParam()}`);
      values.push(updates.about || null);
    }
    if (updates.isPublic !== undefined) {
      fields.push(`is_public = $${nextParam()}`);
      values.push(updates.isPublic);
    }

    if (fields.length === 0) {
      // No fields to update, return the current user
      return (await getUserById(id))!;
    }

    fields.push(`updated_at = NOW()`);
    const updateClause = fields.join(', ');

    const updatedUser = await queryOne<User>(
      `
        UPDATE ${TABLE_NAME}
        SET ${updateClause}
        WHERE id = $1
        RETURNING
          id,
          email,
          password,
          plan as "plan",
          role as "role",
          phone_number as "phoneNumber",
          first_name as "firstName",
          last_name as "lastName",
          photo_url as "photoURL",
          country,
          address,
          state,
          city,
          zip_code as "zipCode",
          about,
          is_public as "isPublic",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [id, ...values],
    );

    if (!updatedUser) {
      throw new DatabaseError({
        code: 'UPDATE_USER_FAILED',
        message: 'Failed to update user: User not found or no data returned',
      });
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_USER_ERROR',
        message: `Failed to update user: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
