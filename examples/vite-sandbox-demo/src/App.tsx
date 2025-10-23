import { useEffect, useState } from "react";
import "./App.css";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchPosts();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/posts");
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  };

  const fetchUserById = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      console.log("User details:", data);
      setSelectedUserId(userId);
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const createPost = async () => {
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Post",
          content: "This is a test post",
          authorId: users[0]?.id || "1",
        }),
      });
      const data = await response.json();
      console.log("Created post:", data);
      fetchPosts();
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <h1>Mock Sandbox Demo</h1>

      <section>
        <h2>Users ({users.length})</h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.name} ({user.email})
              <button onClick={() => fetchUserById(user.id)}>Details</button>
              {selectedUserId === user.id && " ✓"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Posts ({posts.length})</h2>
        <button onClick={createPost}>Create New Post</button>
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <strong>{post.title}</strong>
              <p>{post.content}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
