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
import { queryOne, queryMany, executeQuery } from '@/db/neon';

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
export type UserRoleType = 'user' | 'admin' | 'business';

export const USER_ROLES: UserRoleType[] = ['user', 'admin', 'business'];

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
  /** When the user requested a business account upgrade */
  businessAccountRequestedAt?: Date | null;
  /** Record creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

const USER_SELECT_FIELDS = `
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
  business_account_requested_at as "businessAccountRequestedAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

let ensureUserBusinessColumnsPromise: Promise<void> | null = null;

const ensureUserBusinessColumns = async (): Promise<void> => {
  if (!ensureUserBusinessColumnsPromise) {
    ensureUserBusinessColumnsPromise = (async () => {
      await executeQuery(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS business_account_requested_at TIMESTAMP NULL`,
      );
    })().catch((error) => {
      ensureUserBusinessColumnsPromise = null;
      throw error;
    });
  }

  await ensureUserBusinessColumnsPromise;
};

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
    await ensureUserBusinessColumns();

    const user = await queryOne<User>(
      `
        SELECT
          ${USER_SELECT_FIELDS}
        FROM ${TABLE_NAME}
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email.trim()],
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
    await ensureUserBusinessColumns();

    const user = await queryOne<User>(
      `
        SELECT
          ${USER_SELECT_FIELDS}
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UserBrief = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

/**
 * Lightweight user rows for avatars and display names.
 */
export async function getUsersBriefByIds(ids: string[]): Promise<Map<string, UserBrief>> {
  const unique = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter((id) => UUID_RE.test(id)))];

  if (!unique.length) {
    return new Map();
  }

  try {
    const rows = await queryMany<UserBrief>(
      `
        SELECT
          id::text AS id,
          first_name AS "firstName",
          last_name AS "lastName",
          email,
          photo_url AS "photoURL"
        FROM ${TABLE_NAME}
        WHERE id = ANY($1::uuid[])
      `,
      [unique],
    );

    const map = new Map<string, UserBrief>();
    rows.forEach((row) => {
      map.set(row.id.toLowerCase(), row);
    });
    return map;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_USERS_BRIEF_BY_IDS_ERROR',
        message: `Failed to fetch users: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

/**
 * Profile photo keys/URLs for many users (for chat avatars, etc.).
 */
export async function getUserPhotoURLsByIds(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter((id) => UUID_RE.test(id)))];

  if (!unique.length) {
    return new Map();
  }

  try {
    const rows = await queryMany<{ id: string; photoURL: string | null }>(
      `
        SELECT id::text AS id, photo_url AS "photoURL"
        FROM ${TABLE_NAME}
        WHERE id = ANY($1::uuid[])
      `,
      [unique],
    );

    const map = new Map<string, string>();
    rows.forEach((row) => {
      const photo = row.photoURL != null ? String(row.photoURL).trim() : '';
      if (photo) {
        map.set(row.id.toLowerCase(), photo);
      }
    });
    
    return map;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_USER_PHOTOS_BY_IDS_ERROR',
        message: `Failed to fetch user photos: ${error.message}`,
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
    await ensureUserBusinessColumns();

    const users = await queryMany<User>(
      `
        SELECT
          ${USER_SELECT_FIELDS}
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

export type CommunityDirectoryUser = Omit<User, 'password'>;

/**
 * Public community directory for friends/neighbors (no password field).
 */
export async function getCommunityDirectoryUsers(
  limit: number = 100,
  offset: number = 0,
): Promise<CommunityDirectoryUser[]> {
  try {
    return await queryMany<CommunityDirectoryUser>(
      `
        SELECT
          id,
          email,
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
        WHERE COALESCE(LOWER(state), 'active') NOT IN ('blocked', 'deleted')
        ORDER BY created_at DESC
        LIMIT $1
        OFFSET $2
      `,
      [limit, offset],
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_COMMUNITY_DIRECTORY_USERS_ERROR',
        message: `Failed to fetch community users: ${error.message}`,
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
        WHERE LOWER(email) = LOWER($1)
      `,
      [email.trim()],
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
/**
 * Update a user's password hash.
 */
export async function updateUserPassword(id: string, hashedPassword: string): Promise<User> {
  try {
    const updatedUser = await queryOne<User>(
      `
        UPDATE ${TABLE_NAME}
        SET password = $2, updated_at = NOW()
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
      [id, hashedPassword],
    );

    if (!updatedUser) {
      throw new DatabaseError({
        code: 'UPDATE_USER_PASSWORD_FAILED',
        message: 'Failed to update password: User not found',
      });
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'UPDATE_USER_PASSWORD_ERROR',
        message: `Failed to update user password: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}

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

export async function updateUserRole(id: string, role: UserRoleType): Promise<User> {
  try {
    await ensureUserBusinessColumns();

    const normalizedRole = String(role || '')
      .trim()
      .toLowerCase() as UserRoleType;

    if (!USER_ROLES.includes(normalizedRole)) {
      throw new DatabaseError({
        code: 'INVALID_USER_ROLE',
        message: 'Invalid user role',
      });
    }

    const updatedUser = await queryOne<User>(
      `
        UPDATE ${TABLE_NAME}
        SET
          role = $2,
          business_account_requested_at = CASE
            WHEN $2 = 'business' THEN NULL
            ELSE business_account_requested_at
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          ${USER_SELECT_FIELDS}
      `,
      [id, normalizedRole],
    );

    if (!updatedUser) {
      throw new DatabaseError({
        code: 'UPDATE_USER_ROLE_FAILED',
        message: 'Failed to update user role: User not found',
      });
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'UPDATE_USER_ROLE_ERROR',
      message: `Failed to update user role: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function requestBusinessAccount(id: string): Promise<User> {
  try {
    await ensureUserBusinessColumns();

    const existing = await getUserById(id);

    if (!existing) {
      throw new DatabaseError({
        code: 'REQUEST_BUSINESS_ACCOUNT_FAILED',
        message: 'User not found',
      });
    }

    if (existing.role === 'business') {
      throw new DatabaseError({
        code: 'BUSINESS_ACCOUNT_ALREADY_ACTIVE',
        message: 'Business account is already active',
      });
    }

    if (existing.businessAccountRequestedAt) {
      throw new DatabaseError({
        code: 'BUSINESS_ACCOUNT_ALREADY_REQUESTED',
        message: 'Business account request is already pending',
      });
    }

    const updatedUser = await queryOne<User>(
      `
        UPDATE ${TABLE_NAME}
        SET business_account_requested_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING
          ${USER_SELECT_FIELDS}
      `,
      [id],
    );

    if (!updatedUser) {
      throw new DatabaseError({
        code: 'REQUEST_BUSINESS_ACCOUNT_FAILED',
        message: 'Failed to request business account',
      });
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'REQUEST_BUSINESS_ACCOUNT_ERROR',
      message: `Failed to request business account: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getAdminUsers(): Promise<Omit<User, 'password'>[]> {
  try {
    await ensureUserBusinessColumns();

    return await queryMany<Omit<User, 'password'>>(
      `
        SELECT
          id,
          email,
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
          business_account_requested_at as "businessAccountRequestedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM ${TABLE_NAME}
        WHERE LOWER(role) = 'admin'
        ORDER BY created_at ASC
      `,
    );
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new DatabaseError({
        code: 'GET_ADMIN_USERS_ERROR',
        message: `Failed to fetch admin users: ${error.message}`,
        detail: error.detail,
      });
    }
    throw error;
  }
}
