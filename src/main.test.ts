// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const html = `
  <form class="todo-form">
    <input type="text" id="todo-input" />
    <button type="submit">Add</button>
  </form>
  <p id="error-message"></p>
  <ul class="todo-list" id="todo-list"></ul>
  <button id="toggle-all">Toggle all</button>
  <button id="clear-completed">Clear completed</button>
  <button id="clear-all">Clear all</button>
  <button id="export-todos">Export</button>
  <button id="import-todos">Import</button>
  <input type="file" id="import-file" />
  <p id="import-error" hidden>Invalid todos file</p>
  <input type="color" id="colorPicker" />
`;

let app: typeof import('./main');

const addViaForm = (text: string): void => {
  const input = document.getElementById('todo-input') as HTMLInputElement;
  input.value = text;
  document
    .querySelector('.todo-form')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
};

const texts = (): (string | null)[] =>
  Array.from(document.querySelectorAll('.todo-item span')).map(span => span.textContent);

const click = (selector: string, index = 0): void => {
  document.querySelectorAll<HTMLElement>(selector)[index].click();
};

const chooseFile = (content: string): void => {
  const input = document.getElementById('import-file') as HTMLInputElement;
  const file = new File([content], 'todos.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
};

const loadApp = async (): Promise<void> => {
  document.body.innerHTML = html;
  vi.resetModules();
  app = await import('./main');
};

beforeEach(async () => {
  let now = 1000;
  vi.spyOn(Date, 'now').mockImplementation(() => now++);
  localStorage.clear();
  await loadApp();
});

describe('Todo app', () => {
  it('adds a todo, clears the input and shows no error', () => {
    addViaForm('buy milk');
    expect(texts()).toEqual(['buy milk']);
    expect((document.getElementById('todo-input') as HTMLInputElement).value).toBe('');
    expect(document.getElementById('error-message')!.style.display).toBe('none');
  });

  it('shows the error and adds nothing for empty input', () => {
    addViaForm('   ');
    expect(texts()).toEqual([]);
    expect(document.getElementById('error-message')!.style.display).toBe('block');
  });

  it('removes only the clicked todo', () => {
    addViaForm('a');
    addViaForm('b');
    addViaForm('c');
    document.querySelectorAll('.todo-item')[1].querySelector('button')!.click();
    expect(texts()).toEqual(['a', 'c']);
  });

  it('edits a todo through the prompt', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('edited');
    addViaForm('original');
    click('#editBtn');
    expect(texts()).toEqual(['edited']);
  });

  it('toggles a todo as completed and back', () => {
    addViaForm('a');
    click('.toggle-btn');
    expect(app.todos[0].completed).toBe(true);
    expect(document.querySelector('.toggle-btn')!.textContent).toBe('Undo');
    click('.toggle-btn');
    expect(app.todos[0].completed).toBe(false);
  });

  it('clears only the completed todos', () => {
    addViaForm('a');
    addViaForm('b');
    addViaForm('c');
    click('.toggle-btn', 1);
    click('#clear-completed');
    expect(texts()).toEqual(['a', 'c']);
  });

  it('toggles all todos on, then off', () => {
    addViaForm('a');
    addViaForm('b');
    click('#toggle-all');
    expect(app.todos.every(todo => todo.completed)).toBe(true);
    click('#toggle-all');
    expect(app.todos.every(todo => !todo.completed)).toBe(true);
  });

  it('saves todos and loads them again when the page reopens', async () => {
    addViaForm('a');
    addViaForm('b');
    click('.toggle-btn', 1);
    await loadApp();
    expect(texts()).toEqual(['a', 'b']);
    expect(app.todos.map(todo => todo.completed)).toEqual([false, true]);
  });

  it('ignores corrupted saved data', async () => {
    localStorage.setItem('todos', 'not json');
    await loadApp();
    expect(texts()).toEqual([]);
  });

  it('clears all todos and the saved list', async () => {
    addViaForm('a');
    click('#clear-all');
    expect(texts()).toEqual([]);
    await loadApp();
    expect(texts()).toEqual([]);
  });

  it('exports the todos as a JSON file', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:todos');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    addViaForm('a');
    click('#export-todos');
    const blob = createObjectURL.mock.calls[0][0];
    expect(JSON.parse(await blob.text())).toEqual(app.todos);
    expect(anchorClick).toHaveBeenCalledOnce();
    anchorClick.mockRestore();
  });

  it('imports todos from a JSON file', async () => {
    addViaForm('old');
    chooseFile(JSON.stringify([{ id: 1, text: 'imported', completed: true }]));
    await vi.waitFor(() => expect(texts()).toEqual(['imported']));
    expect(app.todos[0].completed).toBe(true);
  });

  it('rejects an invalid file and keeps the list', async () => {
    addViaForm('keep');
    chooseFile('[{"bad":true}]');
    await vi.waitFor(() => expect(document.getElementById('import-error')!.hidden).toBe(false));
    expect(texts()).toEqual(['keep']);
  });
});
