import { RegistroAsistencia, Estudiante } from '../types';

export function generarObservacionesInteligentes(
    statsSesion: { presentes: number, ausentes: number, tardes: number, total: number },
    historialAsistencias: any[]
): string {
    const messages: string[] = [];

    const pAsistencia = statsSesion.total > 0 ? (statsSesion.presentes / statsSesion.total) * 100 : 0;
    const pTardes = statsSesion.total > 0 ? (statsSesion.tardes / statsSesion.total) * 100 : 0;

    if (pAsistencia > 90) {
        messages.push("El grupo presenta un nivel de retención excelente. La sesión se desarrolló con quórum casi total, asegurando el cumplimiento de los objetivos académicos del día.");
    } else if (pAsistencia < 70) {
        messages.push("⚠️ ALERTA: Se registra una participación inferior al 70%. Se recomienda al área académica investigar posibles factores de deserción o problemas de movilización en la sede.");
    }

    if (pTardes > 15) {
        messages.push("Se observa una incidencia significativa de llegadas tardías, lo cual podría estar afectando la asimilación del contenido inicial.");
    }

    // Utiliza la vista optimizada de DB para encontrar estudiantes con >= 3 ausencias acumuladas
    const estudiantesCriticos = historialAsistencias
        .filter(x => x.total_ausentes >= 3)
        .map(x => x.nombre_completo);

    if (estudiantesCriticos.length > 0) {
        messages.push(`🚨 ATENCIÓN: El/los estudiante(s) ${estudiantesCriticos.join(', ')} acumulan 3 o más inasistencias en este módulo, requiriendo seguimiento inmediato por parte de coordinación.`);
    }

    if (messages.length === 0) {
        messages.push("Sin observaciones destacadas para este reporte.");
    }

    return messages.join('\n\n');
}
