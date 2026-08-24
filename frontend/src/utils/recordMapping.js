export function recordToFormValues(record) {
  // Contacts d'urgence (remplace père/mère) : dossiers antérieurs —
  // pré-remplis depuis les colonnes père/mère pour ne pas perdre les données
  // à la première re-sauvegarde.
  let contacts = Array.isArray(record.emergencyContacts)
    ? record.emergencyContacts.map((c) => ({ name: c.name || '', phone: c.phone || '' })).filter((c) => c.name || c.phone)
    : [];
  if (
    contacts.length === 0 &&
    (record.father_name || record.father_phone || record.mother_name || record.mother_phone)
  ) {
    contacts = [
      { name: record.father_name || '', phone: record.father_phone || '' },
      { name: record.mother_name || '', phone: record.mother_phone || '' },
    ].filter((c) => c.name || c.phone);
  }

  return {
    studentNumber: record.student_number || '',
    lastName: record.last_name || '',
    firstName: record.first_name || '',
    birthDate: record.birth_date || '',
    birthPlace: record.birth_place || '',
    gender: record.gender || '',
    department: record.department || '',
    phoneNumber: record.phone_number || '',
    address: record.address || '',
    emergencyContacts: contacts.length > 0 ? contacts : [{ name: '', phone: '' }],
  };
}
