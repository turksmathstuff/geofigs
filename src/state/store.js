import { createEmptyFigureDoc, cloneFigureDoc } from "./figureDoc.js";
import { CommandStack } from "./commandStack.js";

export class AppStore {
  constructor() {
    this.doc = createEmptyFigureDoc();
    this.selection = new Set();
    this.commandStack = new CommandStack();
    this.backgroundImageAssets = new Map();
  }

  setDoc(doc) {
    this.doc = cloneFigureDoc(doc);
    this.doc.metadata.updatedAt = new Date().toISOString();
    this.clearSelection();
  }

  snapshot() {
    return cloneFigureDoc(this.doc);
  }

  comparableSnapshot(doc) {
    return {
      canvas: doc.canvas,
      objects: doc.objects,
      annotations: doc.annotations,
      styles: doc.styles,
      title: doc.metadata?.title || "",
    };
  }

  setBackgroundImageAssets(assets = {}) {
    this.backgroundImageAssets = new Map(Object.entries(assets));
  }

  getBackgroundImageAsset(assetId) {
    if (!assetId) {
      return null;
    }
    return this.backgroundImageAssets.get(assetId) || null;
  }

  exportBackgroundImageAssets() {
    return Object.fromEntries(this.backgroundImageAssets.entries());
  }

  commitSnapshot(label, before, after, applyDoc) {
    const beforeCmp = this.comparableSnapshot(before);
    const afterCmp = this.comparableSnapshot(after);
    if (JSON.stringify(beforeCmp) === JSON.stringify(afterCmp)) {
      return;
    }
    this.commandStack.record({
      label,
      undo: () => applyDoc(before, true),
      redo: () => applyDoc(after, true),
    });
  }

  clearSelection() {
    this.selection.clear();
  }

  toggleSelection(id, multiSelect) {
    if (!multiSelect) {
      this.selection.clear();
    }
    if (this.selection.has(id)) {
      this.selection.delete(id);
    } else {
      this.selection.add(id);
    }
  }

  selectedIds() {
    return [...this.selection];
  }
}
