export function recordToFormValues(record) {
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
    fatherName: record.father_name || '',
    fatherPhone: record.father_phone || '',
    motherName: record.mother_name || '',
    motherPhone: record.mother_phone || '',
  };
}
