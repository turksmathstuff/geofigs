let nextId = 1;

export function makeId(prefix = "obj") {
  const value = `${prefix}_${String(nextId).padStart(6, "0")}`;
  nextId += 1;
  return value;
}

export function resetIds() {
  nextId = 1;
}
