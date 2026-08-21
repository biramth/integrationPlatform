import { ROLE_LABELS } from './roles';

export const ACTION_LABELS = {
  'dut1.create': 'Création dossier',
  'dut1.update': 'Modification dossier',
  'dut1.delete': 'Suppression dossier',
  'dut1.export_csv': 'Export CSV dossiers',
  'dut1.export_contacts_csv': 'Export CSV contacts',
  'dut1.complete_complementary': 'Complément de dossier (phase 2)',
  'dut1.update_admission': "Modification statut d'admission",
  'dut1.set_allergies': 'Modification allergies',
  'dut1.room_reassign': 'Réaffectation de chambre',
  'dut1.set_luggage_count': 'Modification nombre de bagages déclarés',
  'agent.create': 'Création compte agent',
  'agent.update': 'Modification compte agent',
  'agent.reset_password': 'Réinitialisation mot de passe',
  'agent.deactivate': 'Désactivation compte agent',
  'agent.hard_delete': 'Suppression définitive compte agent',
  'platform.reset_attempt': 'Tentative de réinitialisation plateforme',
  'platform.reset': 'Réinitialisation plateforme',
  'health_restriction.create': "Déclaration d'une restriction d'aptitude",
  'health_restriction.resolve': "Résolution d'une restriction d'aptitude",
  'health_restriction.delete': "Suppression d'une restriction d'aptitude",
  'room.create': 'Création chambre',
  'room.update': 'Modification chambre',
  'room.update_mattress_count': 'Modification nombre de matelas',
  'room.delete': 'Suppression chambre',
  'luggage_item.create': "Ajout d'un bagage",
  'luggage_item.delete': "Suppression d'un bagage",
  'meal_service.create': 'Création service de repas',
  'dish.create': "Ajout d'un plat",
  'dish.delete': "Suppression d'un plat",
  'activity.create': "Création d'activité",
  'activity.update': "Modification d'activité",
  'activity.delete': "Suppression d'activité",
  'allergen.create': "Création d'allergène",
  'allergen.update': "Modification d'allergène",
  'allergen.delete': "Suppression d'allergène",
  'admitted_students.import': 'Import candidats admis',
  'rooms.import': 'Import chambres',
};

export const RESOURCE_TYPE_LABELS = {
  dut1_record: 'Dossier DUT1',
  user: 'Compte agent',
  platform: 'Plateforme',
  health_restriction: "Restriction d'aptitude",
  room: 'Chambre',
  luggage_item: 'Bagage',
  meal_service: 'Service de repas',
  dish: 'Plat',
  activity: 'Activité',
  allergen: 'Allergène',
  admitted_students: 'Candidats admis',
};

export const COMMISSION_LABELS = {
  ...ROLE_LABELS,
  global: 'Plateforme (global)',
};

export function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

export function resourceTypeLabel(resourceType) {
  return RESOURCE_TYPE_LABELS[resourceType] || resourceType;
}

export function commissionLabel(commission) {
  return COMMISSION_LABELS[commission] || commission;
}
