import { createEmptyFigureDoc, cloneFigureDoc } from "./figureDoc.js";
import { CommandStack } from "./commandStack.js";

export class AppStore {
  constructor() {
    this.doc = createEmptyFigureDoc();
    this.selection = new Set();
    this.commandStack = new CommandStack();
  }

  setDoc(doc) {
    this.doc = cloneFigureDoc(doc);
    this.doc.metadata.updatedAt = new Date().toISOString();
    this.clearSelection();
  }

  snapshot() {
    return cloneFigureDoc(this.doc);
  }

  commitSnapshot(label, before, after, applyDoc) {
    if (JSON.stringify(before) === JSON.stringify(after)) {
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
