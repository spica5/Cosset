import { queryMany } from '@/db/neon';

// ----------------------------------------------------------------------

type KeyRow = { key: string };
type TableRow = { tableName: string };

const SCALAR_SOURCES: Array<{ table: string; column: string }> = [
  { table: 'cosset_users', column: 'photo_url' },
  { table: 'albums', column: 'cover_url' },
  { table: 'album_images', column: 'file_url' },
  { table: 'guest_area', column: 'picture_url' },
  { table: 'mail_background_images', column: 'image_key' },
  { table: 'user_mails', column: 'paper_background_image' },
  { table: 'journey_diary_representative_pictures', column: 'image_key' },
  { table: 'journey_diary_notes', column: 'image_key' },
  { table: 'journey_diary_memorial_things', column: 'image_key' },
  { table: 'journey_diary_memorial_thing_images', column: 'image_key' },
  { table: 'journey_diary_locations', column: 'representative_image' },
  { table: 'bookshelf_ebook', column: 'cover_image' },
  { table: 'bookshelf_ebook', column: 'file_url' },
  { table: 'bookshelf_audiobook', column: 'cover_image' },
  { table: 'bookshelf_audiobook', column: 'file_url' },
  { table: 'bookshelf_introduce', column: 'cover_image' },
  { table: 'bookshelf_introduce', column: 'file_url' },
  { table: 'cinema_films', column: 'poster_image' },
  { table: 'cinema_films', column: 'video_url' },
  { table: 'cinema_chat_logs', column: 'file_url' },
  { table: 'coffee_shop_chat_logs', column: 'file_url' },
  { table: 'brand_stores', column: 'cover_image' },
  { table: 'brand_stores', column: 'logo_image' },
  { table: 'brand_categories', column: 'cover_image' },
  { table: 'coffee_shops', column: 'cover_image' },
  { table: 'coffee_shops', column: 'background' },
  { table: 'blogs', column: 'file' },
  { table: 'notification', column: 'avatar_url' },
  { table: 'design_space', column: 'background' },
];

const TEXT_SEARCH_SOURCES: Array<{ table: string; columns: string[]; castJson?: boolean }> = [
  { table: 'brand_products', columns: ['image_url'] },
  { table: 'collection_items', columns: ['images', 'videos', 'files'] },
  { table: 'gifts', columns: ['images'] },
  { table: 'community_posts', columns: ['files'] },
  { table: 'coffee_shops', columns: ['files', 'menu', 'music', 'atmosphere'] },
  { table: 'user_mails', columns: ['attachments'], castJson: true },
  { table: 'design_space', columns: ['rooms', 'effects'] },
];

async function getExistingTables(tableNames: string[]): Promise<Set<string>> {
  const unique = [...new Set(tableNames)];
  if (!unique.length) {
    return new Set();
  }

  const rows = await queryMany<TableRow>(
    `
    SELECT tablename AS "tableName"
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY($1::text[])
    `,
    [unique],
  );

  return new Set(rows.map((row) => row.tableName));
}

/**
 * Return which of the given storage object keys are referenced in the database.
 * Covers scalar key columns and common multi-key / JSON text fields.
 */
export async function findReferencedStorageKeys(keys: string[]): Promise<string[]> {
  const normalized = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  if (!normalized.length) {
    return [];
  }

  const allTables = [
    ...SCALAR_SOURCES.map((item) => item.table),
    ...TEXT_SEARCH_SOURCES.map((item) => item.table),
  ];
  const existingTables = await getExistingTables(allTables);

  const unionParts: string[] = [];

  SCALAR_SOURCES.forEach(({ table, column }) => {
    if (!existingTables.has(table)) {
      return;
    }
    unionParts.push(`
      SELECT ${column} AS key
      FROM ${table}
      WHERE ${column} = ANY($1::text[])
    `);
  });

  TEXT_SEARCH_SOURCES.forEach(({ table, columns, castJson }) => {
    if (!existingTables.has(table)) {
      return;
    }

    const predicates = columns
      .map((column) => {
        const expression = castJson ? `${column}::text` : column;
        return `${expression} ILIKE '%' || k.key || '%'`;
      })
      .join('\n           OR ');

    unionParts.push(`
      SELECT k.key
      FROM unnest($1::text[]) AS k(key)
      WHERE EXISTS (
        SELECT 1 FROM ${table} t
        WHERE ${predicates}
      )
    `);
  });

  if (!unionParts.length) {
    return [];
  }

  const rows = await queryMany<KeyRow>(
    `
    SELECT DISTINCT key
    FROM (
      ${unionParts.join('\nUNION ALL\n')}
    ) matched
    WHERE key IS NOT NULL AND btrim(key) <> ''
    `,
    [normalized],
  );

  return rows.map((row) => row.key).filter(Boolean);
}
