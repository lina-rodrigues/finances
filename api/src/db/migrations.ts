import { Month } from "../models/Month.js";

/** Drop legacy unique index on yearMonth alone (pre–per-user months). */
export async function migrateMonthIndexes(): Promise<void> {
  const collection = Month.collection;
  const indexes = await collection.indexes();

  const legacyYearMonthIndex = indexes.find(
    (index) =>
      index.key &&
      Object.keys(index.key).length === 1 &&
      index.key.yearMonth === 1 &&
      index.unique === true,
  );

  if (legacyYearMonthIndex?.name) {
    await collection.dropIndex(legacyYearMonthIndex.name);
    console.log(`Dropped legacy Month index: ${legacyYearMonthIndex.name}`);
  }

  await Month.syncIndexes();
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

export { isDuplicateKeyError };
