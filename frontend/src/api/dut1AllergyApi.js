import axiosClient from './axiosClient';

export function setDut1Allergies(dut1Id, allergiesMap) {
  const allergies = Object.entries(allergiesMap).map(([allergenId, severity]) => ({
    allergenId: Number(allergenId),
    severity,
  }));
  return axiosClient.put(`/dut1/${dut1Id}/allergies`, { allergies }).then((res) => res.data);
}

export function setDut1UnmetCriteria(dut1Id, criterionIds) {
  return axiosClient.put(`/dut1/${dut1Id}/aptitude-criteria`, { criterionIds }).then((res) => res.data);
}
