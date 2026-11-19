import { DatabaseError } from '@/db/errors';
import { queryOne, queryMany, executeQuery } from '@/db/neon';

// ----------------------------------------------------------------------

const COUNTS_TABLE = 'page_visit_counts';
const VIEWERS_TABLE = 'page_visit_viewers';
const DAILY_TABLE = 'page_visit_daily';
const USERS_TABLE = 'cosset_users';

export const PAGE_VISIT_CATALOG: Array<{ pageKey: string; label: string }> = [
  { pageKey: 'home', label: 'Homepage' },
  { pageKey: 'blogs', label: 'Blogs' },
  { pageKey: 'albums', label: 'Albums' },
  { pageKey: 'drawers', label: 'Drawers' },
  { pageKey: 'bookshelf', label: 'Bookshelf' },
  { pageKey: 'documentation', label: 'Documentation' },
  { pageKey: 'journey', label: 'Journey' },
  { pageKey: 'community.posts', label: 'Community Posts' },
  { pageKey: 'community.coffee-shops', label: 'Coffee Shops' },
  { pageKey: 'community.cinema', label: 'Cinema' },
  { pageKey: 'community.friends', label: 'Friends' },
  { pageKey: 'community.neighbors', label: 'Neighbors' },
];

const PAGE_LABEL_BY_KEY = Object.fromEntries(
  PAGE_VISIT_CATALOG.map((item) => [item.pageKey, item.label]),
) as Record<string, string>;

export type PageVisitStat = {
  pageKey: string;
  label: string;
  totalVisits: number;
  uniqueVisitors: number;
  updatedAt: Date | null;
};

export type PageVisitCustomerStat = {
  customerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  photoURL: string | null;
  plan: string | null;
  role: string | null;
  totalVisits: number;
  pagesVisited: number;
  lastVisitedAt: Date | null;
};

export type PageVisitDailyStat = {
  visitDate: string;
  pageKey: string;
  label: string;
  visitCount: number;
};

let ensureTablesPromise: Promise<void> | null = null;

export async function ensurePageVisitTables(): Promise<void> {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${COUNTS_TABLE} (
            page_key VARCHAR(64) PRIMARY KEY,
            label VARCHAR(128) NOT NULL,
            total_visits BIGINT NOT NULL DEFAULT 0,
            unique_visitors BIGINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      );

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${VIEWERS_TABLE} (
            page_key VARCHAR(64) NOT NULL,
            viewer_key VARCHAR(128) NOT NULL,
            customer_id VARCHAR(255) NULL,
            visit_count INTEGER NOT NULL DEFAULT 1,
            first_visited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_visited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (page_key, viewer_key)
          )
        `,
      );

      await executeQuery(
        `ALTER TABLE ${VIEWERS_TABLE} ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255) NULL`,
      );

      await executeQuery(
        `
          CREATE TABLE IF NOT EXISTS ${DAILY_TABLE} (
            visit_date DATE NOT NULL,
            page_key VARCHAR(64) NOT NULL,
            visit_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (visit_date, page_key)
          )
        `,
      );

      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_page_visit_viewers_page ON ${VIEWERS_TABLE} (page_key)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_page_visit_viewers_customer ON ${VIEWERS_TABLE} (customer_id)`,
      );
      await executeQuery(
        `CREATE INDEX IF NOT EXISTS idx_page_visit_daily_date ON ${DAILY_TABLE} (visit_date)`,
      );

      await Promise.all(
        PAGE_VISIT_CATALOG.map((item) =>
          executeQuery(
            `
              INSERT INTO ${COUNTS_TABLE} (page_key, label, total_visits, unique_visitors, updated_at)
              VALUES ($1, $2, 0, 0, NOW())
              ON CONFLICT (page_key) DO UPDATE
                SET label = EXCLUDED.label
            `,
            [item.pageKey, item.label],
          ),
        ),
      );
    })().catch((error) => {
      ensureTablesPromise = null;
      throw error;
    });
  }

  await ensureTablesPromise;
}

function normalizePageKey(value: unknown): string | null {
  const pageKey = String(value || '')
    .trim()
    .toLowerCase();

  if (!pageKey || pageKey.length > 64 || !/^[a-z0-9._-]+$/.test(pageKey)) {
    return null;
  }

  return pageKey;
}

function resolveLabel(pageKey: string, provided?: string | null): string {
  const catalogLabel = PAGE_LABEL_BY_KEY[pageKey];
  if (catalogLabel) {
    return catalogLabel;
  }

  const custom = String(provided || '').trim();
  if (custom) {
    return custom.slice(0, 128);
  }

  return pageKey
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function recordPageVisit(input: {
  pageKey: string;
  viewerKey: string;
  customerId?: string | null;
  label?: string | null;
}): Promise<{ totalVisits: number; uniqueVisitors: number; isNewVisitor: boolean }> {
  try {
    await ensurePageVisitTables();

    const pageKey = normalizePageKey(input.pageKey);
    if (!pageKey) {
      throw new DatabaseError({
        code: 'INVALID_PAGE_KEY',
        message: 'pageKey is invalid',
      });
    }

    const viewerKey = String(input.viewerKey || '')
      .trim()
      .slice(0, 128);
    if (!viewerKey) {
      throw new DatabaseError({
        code: 'INVALID_VIEWER_KEY',
        message: 'viewerKey is required',
      });
    }

    const customerId = String(input.customerId || '').trim() || null;
    const label = resolveLabel(pageKey, input.label);

    await executeQuery(
      `
        INSERT INTO ${COUNTS_TABLE} (page_key, label, total_visits, unique_visitors, updated_at)
        VALUES ($1, $2, 0, 0, NOW())
        ON CONFLICT (page_key) DO UPDATE
          SET label = EXCLUDED.label
      `,
      [pageKey, label],
    );

    const viewerRow = await queryOne<{ visitCount: number }>(
      `
        INSERT INTO ${VIEWERS_TABLE} (
          page_key,
          viewer_key,
          customer_id,
          visit_count,
          first_visited_at,
          last_visited_at
        )
        VALUES ($1, $2, $3, 1, NOW(), NOW())
        ON CONFLICT (page_key, viewer_key) DO UPDATE
          SET
            visit_count = ${VIEWERS_TABLE}.visit_count + 1,
            last_visited_at = NOW(),
            customer_id = COALESCE(EXCLUDED.customer_id, ${VIEWERS_TABLE}.customer_id)
        RETURNING visit_count as "visitCount"
      `,
      [pageKey, viewerKey, customerId],
    );

    const isNewVisitor = Number(viewerRow?.visitCount || 0) === 1;

    const updated = await queryOne<{ totalVisits: number; uniqueVisitors: number }>(
      `
        UPDATE ${COUNTS_TABLE}
        SET
          total_visits = total_visits + 1,
          unique_visitors = unique_visitors + CASE WHEN $2 THEN 1 ELSE 0 END,
          updated_at = NOW()
        WHERE page_key = $1
        RETURNING
          total_visits as "totalVisits",
          unique_visitors as "uniqueVisitors"
      `,
      [pageKey, isNewVisitor],
    );

    await executeQuery(
      `
        INSERT INTO ${DAILY_TABLE} (visit_date, page_key, visit_count)
        VALUES (CURRENT_DATE, $1, 1)
        ON CONFLICT (visit_date, page_key) DO UPDATE
          SET visit_count = ${DAILY_TABLE}.visit_count + 1
      `,
      [pageKey],
    );

    return {
      totalVisits: Number(updated?.totalVisits || 0),
      uniqueVisitors: Number(updated?.uniqueVisitors || 0),
      isNewVisitor,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'RECORD_PAGE_VISIT_ERROR',
      message: `Failed to record page visit: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getPageVisitStats(): Promise<PageVisitStat[]> {
  try {
    await ensurePageVisitTables();

    const rows = await queryMany<PageVisitStat>(
      `
        SELECT
          page_key as "pageKey",
          label,
          total_visits as "totalVisits",
          unique_visitors as "uniqueVisitors",
          updated_at as "updatedAt"
        FROM ${COUNTS_TABLE}
        ORDER BY
          CASE
            WHEN page_key = 'home' THEN 0
            WHEN page_key = 'blogs' THEN 1
            WHEN page_key = 'albums' THEN 2
            WHEN page_key = 'drawers' THEN 3
            WHEN page_key = 'bookshelf' THEN 4
            WHEN page_key = 'documentation' THEN 5
            WHEN page_key = 'journey' THEN 6
            WHEN page_key = 'community.posts' THEN 7
            WHEN page_key = 'community.coffee-shops' THEN 8
            WHEN page_key = 'community.cinema' THEN 9
            WHEN page_key = 'community.friends' THEN 10
            WHEN page_key = 'community.neighbors' THEN 11
            ELSE 100
          END,
          label ASC
      `,
    );

    return rows.map((row) => ({
      pageKey: row.pageKey,
      label: row.label,
      totalVisits: Number(row.totalVisits || 0),
      uniqueVisitors: Number(row.uniqueVisitors || 0),
      updatedAt: row.updatedAt ?? null,
    }));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'GET_PAGE_VISIT_STATS_ERROR',
      message: `Failed to fetch page visit stats: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getPageVisitCustomerStats(
  limit = 50,
): Promise<PageVisitCustomerStat[]> {
  try {
    await ensurePageVisitTables();

    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 50, 1), 200);

    const rows = await queryMany<PageVisitCustomerStat>(
      `
        SELECT
          COALESCE(v.customer_id, REPLACE(v.viewer_key, 'user:', '')) as "customerId",
          u.email,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.photo_url as "photoURL",
          u.plan,
          u.role,
          SUM(v.visit_count)::int as "totalVisits",
          COUNT(DISTINCT v.page_key)::int as "pagesVisited",
          MAX(v.last_visited_at) as "lastVisitedAt"
        FROM ${VIEWERS_TABLE} v
        LEFT JOIN ${USERS_TABLE} u
          ON u.id::text = COALESCE(v.customer_id, REPLACE(v.viewer_key, 'user:', ''))
        WHERE
          v.customer_id IS NOT NULL
          OR v.viewer_key LIKE 'user:%'
        GROUP BY
          COALESCE(v.customer_id, REPLACE(v.viewer_key, 'user:', '')),
          u.email,
          u.first_name,
          u.last_name,
          u.photo_url,
          u.plan,
          u.role
        ORDER BY SUM(v.visit_count) DESC, MAX(v.last_visited_at) DESC NULLS LAST
        LIMIT $1
      `,
      [safeLimit],
    );

    return rows.map((row) => ({
      customerId: String(row.customerId || ''),
      email: row.email ?? null,
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      photoURL: row.photoURL ?? null,
      plan: row.plan ?? null,
      role: row.role ?? null,
      totalVisits: Number(row.totalVisits || 0),
      pagesVisited: Number(row.pagesVisited || 0),
      lastVisitedAt: row.lastVisitedAt ?? null,
    }));
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'GET_PAGE_VISIT_CUSTOMER_STATS_ERROR',
      message: `Failed to fetch customer page visit stats: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export type PageVisitCustomerPageStat = {
  pageKey: string;
  label: string;
  visitCount: number;
  firstVisitedAt: Date | null;
  lastVisitedAt: Date | null;
};

export type PageVisitCustomerDetail = {
  customerId: string;
  totalVisits: number;
  pagesVisited: number;
  lastVisitedAt: Date | null;
  pages: PageVisitCustomerPageStat[];
};

export async function getPageVisitStatsForCustomer(
  customerId: string,
): Promise<PageVisitCustomerDetail> {
  try {
    await ensurePageVisitTables();

    const normalizedCustomerId = String(customerId || '').trim();
    if (!normalizedCustomerId) {
      return {
        customerId: '',
        totalVisits: 0,
        pagesVisited: 0,
        lastVisitedAt: null,
        pages: [],
      };
    }

    const viewerKey = `user:${normalizedCustomerId}`;

    const rows = await queryMany<{
      pageKey: string;
      label: string | null;
      visitCount: number;
      firstVisitedAt: Date | null;
      lastVisitedAt: Date | null;
    }>(
      `
        SELECT
          v.page_key as "pageKey",
          COALESCE(c.label, v.page_key) as label,
          v.visit_count as "visitCount",
          v.first_visited_at as "firstVisitedAt",
          v.last_visited_at as "lastVisitedAt"
        FROM ${VIEWERS_TABLE} v
        LEFT JOIN ${COUNTS_TABLE} c ON c.page_key = v.page_key
        WHERE
          v.customer_id = $1
          OR v.viewer_key = $2
        ORDER BY v.visit_count DESC, v.last_visited_at DESC NULLS LAST
      `,
      [normalizedCustomerId, viewerKey],
    );

    const pages: PageVisitCustomerPageStat[] = rows.map((row) => ({
      pageKey: row.pageKey,
      label: row.label || resolveLabel(row.pageKey),
      visitCount: Number(row.visitCount || 0),
      firstVisitedAt: row.firstVisitedAt ?? null,
      lastVisitedAt: row.lastVisitedAt ?? null,
    }));

    const totalVisits = pages.reduce((sum, page) => sum + page.visitCount, 0);
    const lastVisitedAt =
      pages.reduce<Date | null>((latest, page) => {
        if (!page.lastVisitedAt) return latest;
        if (!latest) return page.lastVisitedAt;
        return new Date(page.lastVisitedAt).getTime() > new Date(latest).getTime()
          ? page.lastVisitedAt
          : latest;
      }, null);

    return {
      customerId: normalizedCustomerId,
      totalVisits,
      pagesVisited: pages.length,
      lastVisitedAt,
      pages,
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'GET_PAGE_VISIT_CUSTOMER_DETAIL_ERROR',
      message: `Failed to fetch customer page visit detail: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export async function getPageVisitDailyStats(days = 14): Promise<PageVisitDailyStat[]> {
  try {
    await ensurePageVisitTables();

    const safeDays = Math.min(Math.max(Math.trunc(days) || 14, 1), 90);

    const rows = await queryMany<{
      visitDate: Date | string;
      pageKey: string;
      label: string | null;
      visitCount: number;
    }>(
      `
        SELECT
          d.visit_date as "visitDate",
          d.page_key as "pageKey",
          COALESCE(c.label, d.page_key) as label,
          d.visit_count as "visitCount"
        FROM ${DAILY_TABLE} d
        LEFT JOIN ${COUNTS_TABLE} c ON c.page_key = d.page_key
        WHERE d.visit_date >= CURRENT_DATE - ($1::int - 1)
        ORDER BY d.visit_date ASC, d.page_key ASC
      `,
      [safeDays],
    );

    return rows.map((row) => {
      const visitDate =
        row.visitDate instanceof Date
          ? row.visitDate.toISOString().slice(0, 10)
          : String(row.visitDate).slice(0, 10);

      return {
        visitDate,
        pageKey: row.pageKey,
        label: row.label || resolveLabel(row.pageKey),
        visitCount: Number(row.visitCount || 0),
      };
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError({
      code: 'GET_PAGE_VISIT_DAILY_STATS_ERROR',
      message: `Failed to fetch daily page visit stats: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
