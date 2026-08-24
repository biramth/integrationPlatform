import { Plus, Trash2 } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';

// Section "Contacts d'urgence" du formulaire DUT1 : remplace la saisie
// père/mère — tout le monde ne vit pas avec ses parents (ou ceux-ci ne sont
// plus là), donc on demande des numéros à contacter en cas d'urgence,
// répétés autant que nécessaire (famille, tuteur, ami…).
export default function EmergencyContactsEditor({ contacts, errors = {}, onChange }) {
  function patchItem(index, patch) {
    onChange(contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addItem() {
    onChange([...contacts, { name: '', phone: '' }]);
  }

  function removeItem(index) {
    onChange(contacts.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">
        Numéro(s) à contacter en cas d'urgence <span className="text-danger">*</span>
      </p>
      {contacts.map((contact, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contact {index + 1}
            </p>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="flex items-center gap-1 text-xs text-danger transition-opacity hover:opacity-70"
            >
              <Trash2 className="h-3.5 w-3.5" /> Retirer
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nom"
              placeholder="Ex : Awa Ndiaye (grande sœur)"
              value={contact.name}
              onChange={(e) => patchItem(index, { name: e.target.value })}
            />
            <Input
              label="Téléphone"
              type="tel"
              required
              placeholder="Ex : +221 77 000 00 00"
              value={contact.phone}
              onChange={(e) => patchItem(index, { phone: e.target.value })}
            />
          </div>
        </div>
      ))}
      {errors.emergencyContacts && <span className="text-xs text-danger">{errors.emergencyContacts}</span>}
      <Button type="button" variant="secondary" onClick={addItem} className="w-full sm:w-auto">
        <Plus className="h-4 w-4" /> Ajouter un contact
      </Button>
    </div>
  );
}
