// Remplace window.confirm par une modale intégrée à l'interface : le host
// (ConfirmDialogHost, monté une seule fois dans main.jsx comme le Toaster)
// s'enregistre ici, et confirm() lui délègue l'affichage puis retourne une
// Promise résolue par le clic de l'utilisateur — même usage qu'un
// window.confirm classique (if (!(await confirm('…'))) return;), mais sans
// bloquer le thread ni sortir du style de l'appli.
let handler = null;

export function registerConfirmHandler(fn) {
  handler = fn;
}

export function confirm(options) {
  const opts = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    handler({ ...opts, resolve });
  });
}
