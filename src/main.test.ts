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

beforeEach(async () => {
  let now = 1000;
  vi.spyOn(Date, 'now').mockImplementation(() => now++);
  document.body.innerHTML = html;
  vi.resetModules();
  app = await import('./main');
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
});
