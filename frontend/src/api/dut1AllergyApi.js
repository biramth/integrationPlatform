import axiosClient from './axiosClient';

export function setDut1Allergies(dut1Id, allergenIds) {
  return axiosClient.put(`/dut1/${dut1Id}/allergies`, { allergenIds }).then((res) => res.data);
}
