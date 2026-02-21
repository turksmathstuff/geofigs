export class CommandStack {
  constructor(limit = 100) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  record(command) {
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) {
      return false;
    }
    cmd.undo();
    this.redoStack.push(cmd);
    return true;
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) {
      return false;
    }
    cmd.redo();
    this.undoStack.push(cmd);
    return true;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
