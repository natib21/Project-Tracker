import { Modal } from './Modal';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help & support"
      subtitle="Workspace roles, budgets and task priorities"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="alert alert-info" style={{ marginBottom: 0 }}>
          <div className="alert-title">Roles & permissions</div>
          <div style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            <strong>Admins</strong> can create, edit, and delete projects and invite team members.{' '}
            <strong>Members</strong> can view projects and add, edit, or delete tasks.
          </div>
        </div>

        <div className="alert alert-info" style={{ marginBottom: 0 }}>
          <div className="alert-title">ETB Budgets & priorities</div>
          <div style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Project spending automatically sums all task estimated costs in ETB. New tasks default
            to Medium priority and can be filtered by Low, Medium, or High.
          </div>
        </div>

        <div className="alert alert-info" style={{ marginBottom: 0 }}>
          <div className="alert-title">Demo accounts</div>
          <div style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Admin: <code>demo.admin@example.com</code> · Member:{' '}
            <code>demo.member@example.com</code> (Password: <code>Demo12345!</code>)
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ marginTop: '18px' }}>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
