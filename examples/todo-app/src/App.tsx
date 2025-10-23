import { useEffect, useState } from "react";
import "./App.css";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all todos on mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/todos");
      if (!response.ok) throw new Error("Failed to fetch todos");
      const data = await response.json();
      // Handle both array format and {todos: [...]} format
      setTodos(Array.isArray(data) ? data : data.todos || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch todos");
    } finally {
      setLoading(false);
    }
  };

  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTodoTitle,
          completed: false,
        }),
      });

      if (!response.ok) throw new Error("Failed to create todo");
      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setNewTodoTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      });

      if (!response.ok) throw new Error("Failed to update todo");
      const updatedTodo = await response.json();
      setTodos(todos.map((t) => (t.id === id ? updatedTodo : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete todo");
      setTodos(todos.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo");
    }
  };

  if (loading) {
    return (
      <div className="App">
        <h1>📝 Todo List</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>📝 Todo List</h1>
      <p className="subtitle">
        Powered by AI-generated mocks via @the-artik-tao/mock-sandbox-core
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={createTodo} className="add-todo-form">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="todo-input"
        />
        <button type="submit" className="add-button">
          Add Todo
        </button>
      </form>

      <div className="stats">
        <span>{todos.filter((t) => !t.completed).length} active</span>
        <span>•</span>
        <span>{todos.filter((t) => t.completed).length} completed</span>
        <span>•</span>
        <span>{todos.length} total</span>
      </div>

      <ul className="todo-list">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className={`todo-item ${todo.completed ? "completed" : ""}`}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              className="todo-checkbox"
            />
            <span className="todo-title">{todo.title}</span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="delete-button"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <p className="empty-state">No todos yet. Add one above!</p>
      )}
    </div>
  );
}

export default App;
