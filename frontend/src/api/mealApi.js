import axiosClient from './axiosClient';

export function listMealServices(date) {
  return axiosClient.get('/meal-services', { params: { date } }).then((res) => res.data);
}

export function createMealService(serviceDate, mealType) {
  return axiosClient.post('/meal-services', { serviceDate, mealType }).then((res) => res.data);
}

export function createDish(mealServiceId, name, allergenIds) {
  return axiosClient
    .post(`/meal-services/${mealServiceId}/dishes`, { name, allergenIds })
    .then((res) => res.data);
}

export function deleteDish(dishId) {
  return axiosClient.delete(`/dishes/${dishId}`).then((res) => res.data);
}
