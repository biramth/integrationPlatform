import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { registerConfirmHandler } from './confirmService';

// Monté une seule fois à la racine (cf. main.jsx, comme le Toaster) : reçoit
// les demandes de confirm() via confirmService et affiche la modale
// correspondante, à la place d'un window.confirm bloquant.
export default function ConfirmDialogHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    registerConfirmHandler((req) => setRequest(req));
  }, []);

  function respond(result) {
    request?.resolve(result);
    setRequest(null);
  }

  return (
    <Modal open={!!request} onClose={() => respond(false)} title={request?.title || 'Confirmer'}>
      {request && (
        <div className="flex flex-col gap-4">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.message}</p>
          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => respond(false)}>
              {request.cancelLabel || 'Annuler'}
            </Button>
            <Button variant={request.danger ? 'danger' : 'primary'} onClick={() => respond(true)} autoFocus>
              {request.confirmLabel || 'Confirmer'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
