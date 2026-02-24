export function createApplyDoc(ctx) {
  const {
    store,
    normalizedRayExtension,
    normalizedLineExtension,
    migratePointNamesToDraggableLabels,
    renderCurrentDoc,
    syncStyleInputsFromDoc,
  } = ctx;

  return function applyDoc(doc, fromCommand = false) {
    store.setDoc(doc);
    store.doc.styles.rayExtension = normalizedRayExtension(store.doc.styles.rayExtension);
    store.doc.styles.lineExtensionStart = normalizedLineExtension(store.doc.styles.lineExtensionStart);
    store.doc.styles.lineExtensionEnd = normalizedLineExtension(store.doc.styles.lineExtensionEnd);
    if (!Number.isFinite(store.doc.styles.fontSize) || store.doc.styles.fontSize < 20) {
      store.doc.styles.fontSize = 20;
    }
    migratePointNamesToDraggableLabels();
    if (!fromCommand) {
      store.commandStack.clear();
    }
    renderCurrentDoc();
    syncStyleInputsFromDoc();
  };
}
