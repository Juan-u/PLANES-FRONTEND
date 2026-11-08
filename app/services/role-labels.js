const DISPLAY_LABELS = Object.freeze({
  pending: 'Pendiente',
  pending_approval: 'Pendiente de aprobación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  open: 'Abierto',
  closed: 'Cerrado',
  active: 'Activo',
  scheduled: 'Programado',
  revoked: 'Revocado',
  expired: 'Vencido',
  privileged: 'Privilegiado',
  ordinary: 'Ordinario',
  assign: 'Asignar rol',
  revoke: 'Revocar rol',
  approve: 'Aprobar',
  reject: 'Rechazar',
  'assign-role': 'Asignar roles',
  'revoke-role': 'Revocar roles',
  'approve-role-change': 'Aprobar cambios de roles'
});

const ROLE_LABELS = Object.freeze({
  system_administrator: 'Administrador del sistema',
  technology_administrator: 'Administrador de tecnología',
  planning_coordinator: 'Coordinador de planeación',
  plan_author: 'Responsable de elaboración de planes',
  plan_approver: 'Aprobador de planes y seguimientos',
  activity_responsible: 'Responsable de actividades',
  collaborator: 'Colaborador',
  auditor: 'Auditor',
  'visual-followup-reviewer-aedfe07c': 'Revisor de seguimiento visual'
});

const ROLE_DESCRIPTIONS = Object.freeze({
  system_administrator: 'Administración total del sistema.',
  technology_administrator: 'Administración de usuarios, catálogos y seguridad.',
  planning_coordinator: 'Coordinación de planeación y consolidación.',
  plan_author: 'Elaboración de planes.',
  plan_approver: 'Aprobación de planes y seguimientos.',
  activity_responsible: 'Responsabilidad de actividades asignadas.',
  collaborator: 'Colaboración en actividades asignadas.',
  auditor: 'Consulta de trazabilidad y reportes.',
  'visual-followup-reviewer-aedfe07c': 'Revisión visual del seguimiento de planes de acción.'
});

const PERMISSION_RESOURCES = Object.freeze({
  users: { label: 'usuarios', subject: 'cuentas de usuario' },
  roles: { label: 'roles', subject: 'roles' },
  permissions: { label: 'permisos', subject: 'permisos' },
  assignments: { label: 'asignaciones de roles', subject: 'asignaciones de roles' },
  requests: { label: 'solicitudes de cambio', subject: 'solicitudes de cambio de roles' },
  catalog: { label: 'catálogo', subject: 'elementos del catálogo' },
  plans: { label: 'planes', subject: 'planes de acción' },
  activities: { label: 'actividades', subject: 'actividades' },
  followup: { label: 'seguimientos', subject: 'registros de seguimiento' },
  milestones: { label: 'hitos', subject: 'hitos' },
  indicators: { label: 'indicadores', subject: 'indicadores' },
  consolidation: { label: 'consolidación', subject: 'registros de consolidación' },
  corrective: { label: 'acciones correctivas', subject: 'acciones correctivas' },
  appeals: { label: 'apelaciones', subject: 'apelaciones' },
  incidents: { label: 'incidentes', subject: 'incidentes' },
  reports: { label: 'informes', subject: 'informes' },
  evidence: { label: 'evidencias', subject: 'evidencias' },
  notifications: { label: 'notificaciones', subject: 'notificaciones' },
  audit: { label: 'auditoría', subject: 'registros de auditoría' },
  security: { label: 'seguridad', subject: 'controles de seguridad' }
});

const PERMISSION_OPERATIONS = Object.freeze({
  read: 'Consultar',
  create: 'Crear',
  update: 'Actualizar',
  deactivate: 'Desactivar',
  manage: 'Administrar',
  submit: 'Enviar',
  approve: 'Aprobar',
  archive: 'Archivar',
  assign: 'Asignar',
  close: 'Cerrar',
  resolve: 'Resolver',
  export: 'Exportar',
  upload: 'Cargar',
  verify: 'Verificar',
  escalate: 'Escalar'
});

const MANAGEMENT_DESCRIPTIONS = Object.freeze({
  users: 'Permite administrar cuentas de usuario conforme a las responsabilidades y autorizaciones establecidas.',
  roles: 'Permite crear y configurar roles del sistema conforme a las autorizaciones establecidas.',
  permissions: 'Permite administrar el catálogo y la activación de permisos del sistema.',
  catalog: 'Permite administrar los elementos disponibles en el catálogo del sistema.',
  notifications: 'Permite configurar la gestión de notificaciones del sistema.',
  security: 'Permite administrar la configuración de seguridad autorizada del sistema.'
});

const ROLE_OPERATION_DETAILS = Object.freeze({
  'assign-role': Object.freeze({
    name: 'Asignar roles',
    description: 'Permite asignar roles a los usuarios de acuerdo con las responsabilidades y autorizaciones establecidas.'
  }),
  'revoke-role': Object.freeze({
    name: 'Revocar roles',
    description: 'Permite solicitar y gestionar la revocación de roles conforme a las autorizaciones establecidas.'
  }),
  'approve-role-change': Object.freeze({
    name: 'Aprobar cambios de roles',
    description: 'Permite aprobar o rechazar solicitudes de modificación de roles, conforme a las autorizaciones establecidas.'
  })
});

const AUTOMATIC_DECISION_REASONS = Object.freeze({
  approval_window_expired: 'La solicitud venció porque terminó el plazo de aprobación.',
  'Synthetic second approval for visual testing': 'Segunda aprobación simulada para pruebas visuales.'
});

function descriptionForPermission(operation, resource, subject) {
  if (operation === 'manage') return MANAGEMENT_DESCRIPTIONS[resource];
  if (operation === 'read') return `Permite consultar ${subject} dentro del ámbito autorizado.`;
  if (operation === 'create') return `Permite registrar ${subject} conforme a las responsabilidades asignadas.`;
  if (operation === 'update') return `Permite actualizar ${subject} dentro del ámbito autorizado.`;
  if (operation === 'deactivate') return 'Permite desactivar cuentas de usuario sin eliminar su historial.';
  if (operation === 'submit') return `Permite enviar ${subject} para su revisión y aprobación.`;
  if (operation === 'approve') return `Permite revisar y aprobar ${subject} conforme al flujo establecido.`;
  if (operation === 'archive') return `Permite archivar ${subject} conservando su trazabilidad.`;
  if (operation === 'assign') return `Permite asignar ${subject} de acuerdo con las responsabilidades autorizadas.`;
  if (operation === 'close') return `Permite cerrar ${subject} una vez atendidos sus requisitos.`;
  if (operation === 'resolve') return `Permite resolver ${subject} conforme al procedimiento establecido.`;
  if (operation === 'export' && resource === 'audit') return 'Permite exportar registros de auditoría para revisión y trazabilidad.';
  if (operation === 'export') return `Permite exportar ${subject} disponibles dentro del ámbito autorizado.`;
  if (operation === 'upload') return 'Permite cargar evidencias relacionadas con los planes y actividades autorizados.';
  if (operation === 'verify') return 'Permite verificar evidencias asociadas a las actividades autorizadas.';
  if (operation === 'escalate') return 'Permite escalar notificaciones para su atención conforme al flujo establecido.';
  return null;
}

export function labelForDisplay(value) {
  const key = String(value ?? '').toLowerCase();
  return DISPLAY_LABELS[key] ?? ROLE_LABELS[key] ??
    (/^browser role(?:\s+.*)?$/i.test(String(value ?? '')) ? 'Rol de consulta' : value || 'Sin estado');
}

export function roleDescriptionForDisplay(roleName, description) {
  const key = String(roleName ?? '').toLowerCase();
  if (ROLE_DESCRIPTIONS[key]) return ROLE_DESCRIPTIONS[key];
  if (/^browser role(?:\s+.*)?$/i.test(String(roleName ?? ''))) return 'Rol de consulta.';
  return description ?? '';
}

export function permissionLabelForDisplay(code, description) {
  return permissionDetailsForDisplay(code, description).name;
}

export function permissionDetailsForDisplay(code) {
  const technicalCode = String(code ?? '');
  if (ROLE_OPERATION_DETAILS[technicalCode]) {
    return Object.freeze({ code: technicalCode, ...ROLE_OPERATION_DETAILS[technicalCode] });
  }
  const match = /^M\d{2}\.([a-z]+)\.([a-z]+)$/.exec(String(code ?? ''));
  const resource = match && PERMISSION_RESOURCES[match[1]];
  const operation = match && PERMISSION_OPERATIONS[match[2]];
  const description = resource && operation
    ? descriptionForPermission(match[2], match[1], resource.subject)
    : null;
  if (resource && operation && description) {
    const approvalSuffix = match[2] === 'submit' ? ' para aprobación' : '';
    return Object.freeze({
      code: technicalCode,
      name: `${operation} ${resource.label}${approvalSuffix}`,
      description
    });
  }
  return Object.freeze({
    code: technicalCode,
    name: technicalCode || 'Permiso no identificado',
    description: 'No hay una descripción disponible para este permiso.'
  });
}

export function decisionReasonForDisplay(reason) {
  if (typeof reason !== 'string') return reason ?? '—';
  return Object.hasOwn(AUTOMATIC_DECISION_REASONS, reason)
    ? AUTOMATIC_DECISION_REASONS[reason]
    : reason;
}
