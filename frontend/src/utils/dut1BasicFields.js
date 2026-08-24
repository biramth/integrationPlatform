import { DEPARTMENTS, DEPARTMENT_LABELS } from './departments';

export const DUT1_BASIC_SECTIONS = [
  {
    title: 'Identité',
    fields: [
      { key: 'studentNumber', label: 'Numéro étudiant', type: 'text' },
      { key: 'lastName', label: 'Nom', type: 'text', required: true },
      { key: 'firstName', label: 'Prénom', type: 'text', required: true },
      { key: 'birthDate', label: 'Date de naissance', type: 'date', required: true },
      { key: 'birthPlace', label: 'Lieu de naissance', type: 'text', required: true },
      { key: 'gender', label: 'Genre', type: 'select', required: true, options: [
        { value: 'M', label: 'Masculin' },
        { value: 'F', label: 'Féminin' },
      ] },
      { key: 'department', label: 'Département', type: 'select', required: true, options: DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABELS[d] })) },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'phoneNumber', label: 'Numéro de téléphone (DUT1)', type: 'tel' },
      { key: 'address', label: 'Adresse', type: 'text' },
    ],
  },
  {
    title: "Contacts d'urgence",
    fields: [
      // Liste répétable nom + téléphone (autant de contacts que nécessaire),
      // rendue par EmergencyContactsEditor — pas un champ simple.
      { key: 'emergencyContacts', type: 'emergencyContacts', required: true },
    ],
  },
];

export const DUT1_BASIC_DEFAULTS = {
  studentNumber: '', lastName: '', firstName: '', birthDate: '', birthPlace: '', gender: '',
  department: '', phoneNumber: '', address: '',
  emergencyContacts: [{ name: '', phone: '' }],
};
