import { UserRole } from '../types/models';

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Site Manager',
  asm: 'Assistant Site Manager',
  tsm: 'Trainee Site Manager',
  supervisor: 'Supervisor',
  user: 'User',
};

export const managementRoles: UserRole[] = ['admin', 'manager'];
export const siteTeamRoles: UserRole[] = ['admin', 'manager', 'asm', 'tsm'];
export const fieldRoles: UserRole[] = ['asm', 'tsm', 'supervisor'];

export function isManagerRole(role?: UserRole) {
  return Boolean(role && managementRoles.includes(role));
}

export function canManageUsers(role?: UserRole) {
  return role === 'admin';
}

export function canManageAsm(role?: UserRole) {
  return role === 'admin' || role === 'manager';
}

export function canControlProgramme(role?: UserRole, controlModeEnabled = false) {
  if (role === 'admin' || role === 'manager') return true;
  if (role === 'asm') return controlModeEnabled;
  return false;
}

export function canUpdateStage(role?: UserRole) {
  return role === 'admin' || role === 'manager' || role === 'asm' || role === 'tsm' || role === 'supervisor';
}
