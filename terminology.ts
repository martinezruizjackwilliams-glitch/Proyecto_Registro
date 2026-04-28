export type EntityType = 'estudiante' | 'empleado' | null;

export function getStudentTerm(entityType: EntityType, plural: boolean = false): string {
    const isEmployee = entityType === 'empleado';
    if (plural) {
        return isEmployee ? 'Colaboradores' : 'Estudiantes';
    }
    return isEmployee ? 'Colaborador' : 'Estudiante';
}

export function getStudentTermUpper(entityType: EntityType, plural: boolean = false): string {
    return getStudentTerm(entityType, plural).toUpperCase();
}
