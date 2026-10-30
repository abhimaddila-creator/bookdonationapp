import UserCard from "./UserCard";
import Spinner from "./Spinner";
import Icon from "./Icons";

export default function UserListModal({ title, users, loading, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <p className="empty-title">No {title.toLowerCase()} yet.</p>
          ) : (
            users.map((user) => <UserCard key={user.uid} user={user} />)
          )}
        </div>
      </div>
    </div>
  );
}