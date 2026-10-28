/**
 * Undo/redo over snapshots of the editor state. Snapshots are JSON strings,
 * recorded a moment after changes settle, so dragging a control makes one step.
 */
export default function createHistory(limit = 100) {
  let past = [];
  let future = [];
  let current = null;

  return {
    reset(snapshot) {
      past = [];
      future = [];
      current = snapshot;
    },
    record(snapshot) {
      if (snapshot === current) return false;
      if (current !== null) past.push(current);
      if (past.length > limit) past.shift();
      future = [];
      current = snapshot;
      return true;
    },
    undo() {
      if (!past.length) return null;
      future.push(current);
      current = past.pop();
      return current;
    },
    redo() {
      if (!future.length) return null;
      past.push(current);
      current = future.pop();
      return current;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    }
  };
}
