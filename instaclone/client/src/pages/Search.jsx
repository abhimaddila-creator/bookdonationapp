import { useState } from "react";
import { searchUsers } from "../services/userService";
import UserCard from "../components/UserCard";
import Spinner from "../components/Spinner";
import Icon from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { formatError } from "../utils";

export default function Search() {
  const { currentUser } = useAuth();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!term.trim()) return;
    setLoading(true);
    setError("");
    try {
      const users = await searchUsers(term);
      // Never show yourself in results.
      setResults(users.filter((u) => u.uid !== currentUser.uid));
      setSearched(true);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page narrow">
      <h1 className="page-title">Search</h1>

      <form className="search-box" onSubmit={handleSearch}>
        <Icon name="search" size={18} />
        <input
          className="input"
          type="text"
          placeholder="Search by name or username..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn-primary" type="submit">
          Search
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {loading && (
        <div className="center-loading">
          <Spinner />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="empty">
          <h2 className="empty-title">No users found</h2>
          <p>Try a different name or username.</p>
        </div>
      )}

      <div className="results">
        {!loading &&
          results.map((user) => <UserCard key={user.uid} user={user} />)}
      </div>
    </div>
  );
}