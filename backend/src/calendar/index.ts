import { Router } from 'express';

import { requireAuth } from '../middleware/requireAuth';
import { CalendarController } from './controller';

export const calendarRoutes = Router();
const ctrl = new CalendarController();

calendarRoutes.use(requireAuth);

calendarRoutes.get('/events', ctrl.listEvents.bind(ctrl));
calendarRoutes.post('/events', ctrl.createEvent.bind(ctrl));
calendarRoutes.patch('/events/:id', ctrl.updateEvent.bind(ctrl));
calendarRoutes.delete('/events/:id', ctrl.deleteEvent.bind(ctrl));

calendarRoutes.get('/upcoming', ctrl.upcomingSummary.bind(ctrl));

calendarRoutes.get('/availability/me', ctrl.getMyAvailability.bind(ctrl));
calendarRoutes.put('/availability/me', ctrl.updateMyAvailability.bind(ctrl));
calendarRoutes.post('/availability/me/blocks', ctrl.addBlockedPeriod.bind(ctrl));
calendarRoutes.delete('/availability/me/blocks/:id', ctrl.deleteBlockedPeriod.bind(ctrl));
calendarRoutes.get('/availability/:prestataireId', ctrl.getProviderSlots.bind(ctrl));

calendarRoutes.get('/appointments', ctrl.listAppointments.bind(ctrl));
calendarRoutes.post('/appointments', ctrl.createAppointmentRequest.bind(ctrl));
calendarRoutes.patch('/appointments/:id/respond', ctrl.respondToAppointment.bind(ctrl));
