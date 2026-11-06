// Import the CSS file so the styles are applied to the HTML elements
import './style.css';

/**
 * A single todo item.
 */
export interface Todo {
  /** Unique identifier, created from the timestamp when the todo is added. */
  id: number;
  /** The text the user typed. */
  text: string;
  /** Whether the todo has been marked as done. */
  completed: boolean;
}

/** The localStorage key under which the todos are saved. */
const STORAGE_KEY = 'todos';

/**
 * Checks that an unknown value has the shape of a {@link Todo}.
 * Used to validate data that comes from localStorage or from an imported file.
 * @param value - The value to check.
 * @returns True if the value is a valid todo.
 */
const isTodo = (value: unknown): value is Todo =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Todo).id === 'number' &&
  typeof (value as Todo).text === 'string' &&
  typeof (value as Todo).completed === 'boolean';

/**
 * Reads the saved todos from localStorage.
 * Invalid entries are dropped, and unreadable data gives an empty list.
 * @returns The saved todos.
 */
const loadTodos = (): Todo[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter(isTodo) : [];
  } catch {
    return [];
  }
};

/** The current list of todos, loaded from localStorage when the page opens. */
export let todos: Todo[] = loadTodos();

/**
 * Saves the current list of todos to localStorage.
 * Logs an error instead of throwing if saving fails.
 */
const saveTodos = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    console.error('Could not save todos');
  }
};

// References to the HTML elements the app works with (they exist in index.html)
const todoInput = document.getElementById('todo-input') as HTMLInputElement;
const todoForm = document.querySelector('.todo-form') as HTMLFormElement;
const todoList = document.getElementById('todo-list') as HTMLUListElement;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;
const toggleAllButton = document.getElementById('toggle-all') as HTMLButtonElement;
const clearCompletedButton = document.getElementById('clear-completed') as HTMLButtonElement;
const clearAllButton = document.getElementById('clear-all') as HTMLButtonElement;
const exportButton = document.getElementById('export-todos') as HTMLButtonElement;
const importButton = document.getElementById('import-todos') as HTMLButtonElement;
const importFile = document.getElementById('import-file') as HTMLInputElement;
const importError = document.getElementById('import-error') as HTMLParagraphElement;

/**
 * Adds a new todo to the list and redraws it.
 * @param text - The text of the new todo.
 */
export const addTodo = (text: string): void => {
  const newTodo: Todo = {
    id: Date.now(), // Unique ID based on the current timestamp
    text: text,
    completed: false,
  };
  todos.push(newTodo);
  console.log("Todo added: ", todos);
  renderTodos();
};

/**
 * Saves the todos, then redraws the list in the page.
 * Each todo gets a Remove, an Edit and a Done/Undo button, and completed todos are struck through.
 */
const renderTodos = (): void => {
  saveTodos();
  todoList.innerHTML = '';

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.innerHTML = `
      <span>${todo.text}</span>
      <button>Remove</button>
         <button id="editBtn">Edit</button>
      <button class="toggle-btn">${todo.completed ? 'Undo' : 'Done'}</button>
    `;
    // The listeners use addEventListener instead of onclick in the template string, which is safer
    addRemoveButtonListener(li, todo.id);
    addEditButtonListener(li, todo.id);
    addToggleButtonListener(li, todo.id);
    const label = li.querySelector('span');
    if (todo.completed && label) {
      label.style.textDecoration = 'line-through';
    }
    todoList.appendChild(li);
  });
};

// There must be only ONE submit listener: a second one would read the already-cleared input and show the error
todoForm.addEventListener('submit', (event: Event) => {
  event.preventDefault(); // Prevent the page from reloading
  const text = todoInput.value.trim();

  if (text !== '') {
    todoInput.classList.remove('input-error');
    errorMessage.style.display = 'none';
    addTodo(text);
    todoInput.value = '';
  } else {
    console.log("Please enter a todo item");
    todoInput.classList.add('input-error');
    errorMessage.style.display = 'block';
  }
});

/**
 * Makes the Remove button of a list item delete its todo.
 * @param li - The list item that contains the buttons.
 * @param id - The id of the todo that the list item shows.
 */
const addRemoveButtonListener = (li: HTMLLIElement, id: number): void => {
  const removeButton = li.querySelector('button');
  removeButton?.addEventListener('click', () => removeTodo(id)); // Optional chaining avoids an error if the button is not found
};

/**
 * Removes the todo with the given id and redraws the list.
 * @param id - The id of the todo to remove.
 */
export const removeTodo = (id: number): void => {
  todos = todos.filter(todo => todo.id !== id);
  renderTodos();
};

/**
 * Makes the Edit button of a list item open the edit prompt for its todo.
 * @param li - The list item that contains the buttons.
 * @param id - The id of the todo that the list item shows.
 */
const addEditButtonListener = (li: HTMLLIElement, id:number) => {
  const editButton = li.querySelector('#editBtn')
  editButton?.addEventListener('click', () => editTodo(id)) 
}

/**
 * Asks the user for a new text with a prompt and updates the todo.
 * A cancelled or empty prompt leaves the todo unchanged.
 * @param id - The id of the todo to edit.
 */
const editTodo = (id:number) => {
  const todo = todos.find(todo => todo.id === id)
  if (todo) {
    const text = prompt('Edit todo', todo.text)
    if (text) {
      todo.text = text
      renderTodos()
    }
  }
}

/**
 * Switches a todo between completed and not completed, then redraws the list.
 * @param id - The id of the todo to toggle.
 */
export const toggleTodo = (id: number): void => {
  const todo = todos.find(todo => todo.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    renderTodos();
  }
};

/**
 * Makes the Done/Undo button of a list item toggle its todo.
 * @param li - The list item that contains the buttons.
 * @param id - The id of the todo that the list item shows.
 */
const addToggleButtonListener = (li: HTMLLIElement, id: number): void => {
  const toggleButton = li.querySelector('.toggle-btn');
  toggleButton?.addEventListener('click', () => toggleTodo(id));
};

/**
 * Removes every completed todo and redraws the list.
 */
export const clearCompleted = (): void => {
  todos = todos.filter(todo => !todo.completed);
  renderTodos();
};

/**
 * Marks every todo as completed, or as not completed if they all already were.
 * Does nothing on an empty list.
 */
export const toggleAll = (): void => {
  const allCompleted = todos.length > 0 && todos.every(todo => todo.completed);
  todos.forEach(todo => {
    todo.completed = !allCompleted;
  });
  renderTodos();
};

toggleAllButton.addEventListener('click', toggleAll);
clearCompletedButton.addEventListener('click', clearCompleted);

/**
 * Removes every todo, including the saved copy in localStorage.
 */
export const clearAll = (): void => {
  todos = [];
  renderTodos();
};

clearAllButton.addEventListener('click', clearAll);

/**
 * Downloads the current todos as a JSON file named todos.json.
 */
export const exportTodos = (): void => {
  const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'todos.json';
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Turns the text of a JSON file into a list of todos.
 * @param json - The JSON text to read.
 * @returns The todos found in the text.
 * @throws If the text is not valid JSON, or if it is not an array of valid todos.
 */
export const parseTodos = (json: string): Todo[] => {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed) || !parsed.every(isTodo)) {
    throw new Error('Invalid todos file');
  }
  return parsed;
};

/**
 * Replaces the current list with the todos from a JSON file.
 * An invalid file shows the import error and keeps the current list.
 * @param file - The file chosen by the user.
 */
const importTodos = async (file: File): Promise<void> => {
  try {
    todos = parseTodos(await file.text());
    importError.hidden = true;
    renderTodos();
  } catch {
    importError.hidden = false;
  }
};

exportButton.addEventListener('click', exportTodos);
importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const file = importFile.files?.[0];
  if (file) {
    await importTodos(file);
  }
  importFile.value = '';
});

// Color picker

/**
 * Changes the background color of the page.
 * @param color - A CSS color value, such as the one given by the color picker.
 */
const changeBackgroundColor = (color: string): void => {
  document.body.style.backgroundColor = color;
};

/**
 * Connects the color picker to the page background.
 * Logs an error if the color picker is missing from the page.
 */
const initializeColorPicker = (): void => {
  const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
  if (colorPicker) {
    colorPicker.addEventListener('input', (event: Event) => {
      const target = event.target as HTMLInputElement;
      changeBackgroundColor(target.value);
    });
  } else {
    console.error('Color picker element not found');
  }
};

// Wait until the DOM is fully loaded before connecting the color picker
document.addEventListener('DOMContentLoaded', () => {
  initializeColorPicker();
});

// Initial render: must stay at the end, after every function it uses is defined
renderTodos();
