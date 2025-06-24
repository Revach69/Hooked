import { base44 } from './base44Client';

const entities = base44?.entities;

export const Event = entities?.Event;

export const EventProfile = entities?.EventProfile;

export const Like = entities?.Like;

export const Message = entities?.Message;

export const ContactShare = entities?.ContactShare;

export const EventFeedback = entities?.EventFeedback;



// auth sdk:
export const User = base44.auth;