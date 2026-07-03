let nextId = 1;

export function makeId(prefix = "obj") {
  const value = `${prefix}_${String(nextId).padStart(6, "0")}`;
  nextId += 1;
  return value;
}

export function resetIds() {
  nextId = 1;
}

export function seedIdsFromDoc(doc) {
  let maxSuffix = 0;
  const scan = (items) => {
    for (const item of items || []) {
      if (typeof item?.id !== "string") continue;
      const match = item.id.match(/_(\d+)$/);
      if (!match) continue;
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > maxSuffix) {
        maxSuffix = value;
      }
    }
  };
  scan(doc?.objects);
  scan(doc?.annotations);
  if (maxSuffix >= nextId) {
    nextId = maxSuffix + 1;
  }
}
