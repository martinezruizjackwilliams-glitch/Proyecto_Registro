import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGruposDocente, getAsistenciaGrupoRango, getMatriculasGrupo } from '../services/attendance';
import { supabase } from '../services/supabase';
import type { GrupoClase, RegistroAsistencia, Estudiante, Matricula } from '../types';
import { AnimatedPage } from '../components/AnimatedPage';
import { AnimatedList, itemVariant } from '../components/AnimatedList';
import { motion } from 'framer-motion';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import ExcelJS from 'exceljs';
// Observaciones generadas ya no se usan en el nuevo formato
import { useBranding } from '../contexts/BrandingContext';

interface ReportsPageProps {
    userName: string;
}

export default function ReportsPage({ userName }: ReportsPageProps) {
    const { id: initialGrupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { orgName } = useBranding();

    const [grupos, setGrupos] = useState<GrupoClase[]>([]);
    const [selectedGrupo, setSelectedGrupo] = useState(initialGrupoId || '');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [records, setRecords] = useState<(RegistroAsistencia & { estudiante: Estudiante })[]>([]);
    const [reportesFiltrados, setReportesFiltrados] = useState<(RegistroAsistencia & { estudiante: Estudiante })[]>([]);
    const [filtroTexto, setFiltroTexto] = useState('');
    const [matriculas, setMatriculas] = useState<(Matricula & { estudiante: Estudiante })[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Calculate stats with UNIQUE students per date - FIXED
    const getUniqueCount = (estadoFilter: string) => {
        const filtered = reportesFiltrados.filter(r => estadoFilter === 'all' || r.estado === estadoFilter);
        const uniqueIds = new Set(filtered.map(r => r.id_estudiante));
        return uniqueIds.size;
    };
    
    const getUniqueCountByGender = (estadoFilter: string, gender: string) => {
        const filtered = reportesFiltrados.filter(r => 
            (estadoFilter === 'all' || r.estado === estadoFilter) && 
            r.estudiante?.sexo === gender
        );
        const uniqueIds = new Set(filtered.map(r => r.id_estudiante));
        return uniqueIds.size;
    };
    
    // Debug: check for undefined/null genders
    const checkGenders = () => {
        const allStudents = [...new Set(reportesFiltrados.map(r => r.id_estudiante))];
        const withGender = new Set();
        const withoutGender = new Set();
        reportesFiltrados.filter(r => r.estado === 'presente').forEach(r => {
            if (r.estudiante?.sexo === 'M' || r.estudiante?.sexo === 'F') {
                withGender.add(r.id_estudiante);
            } else {
                withoutGender.add(r.id_estudiante);
            }
        });
        console.log('[Gender debug] Students with gender:', withGender.size, 'without:', withoutGender.size);
        return { withGender: withGender.size, withoutGender: withoutGender.size };
    };
    checkGenders();

    // Count enrolled students by gender from matriculas
    const getEnrolledByGender = (gender: string) => {
        const filtered = matriculas.filter(m => m.estudiante?.sexo === gender);
        return filtered.length;
    };

    const totalMatriculados = matriculas.length;
    const totalRecords = reportesFiltrados.length;
    const presentes = getUniqueCount('presente') + getUniqueCount('tarde');
    const tardes = getUniqueCount('tarde');
    // Ausentes = Total Matriculados - Presentes (correct approach)
    const ausentes = totalMatriculados - presentes;
    
    console.log('[Reports Stats]:', {
        totalMatriculados,
        totalRecords,
        presentes,
        tardes,
        ausentes,
        reportesFiltradosLength: reportesFiltrados.length
    });
    
    // By gender - enrolled minus present
    const enrolledH = getEnrolledByGender('M');
    const enrolledF = getEnrolledByGender('F');
    const presentesH = getUniqueCountByGender('presente', 'M') + getUniqueCountByGender('tarde', 'M');
    const presentesF = getUniqueCountByGender('presente', 'F') + getUniqueCountByGender('tarde', 'F');
    const ausentesH = enrolledH - presentesH;
    const ausentesF = enrolledF - presentesF;
    const tardesH = getUniqueCountByGender('tarde', 'M');
    const tardesF = getUniqueCountByGender('tarde', 'F');

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        loadGrupos();
        // Default date range: this month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setFechaInicio(getLocalDateString(firstDay));
        setFechaFin(getLocalDateString(now));
    }, []);

    const aplicarFiltro = () => {
        if (!filtroTexto.trim()) {
            setReportesFiltrados(records);
            return;
        }

        // Normalizar el término de búsqueda: minúsculas + sin espacios extra
        const terminoBusqueda = filtroTexto.toLowerCase().trim();

        const resultados = records.filter((reporte) => {
            // Comparar nombre del estudiante (null-safe, lowercase, trim)
            const nombreNorm = (reporte.estudiante?.nombre_completo ?? '').toLowerCase().trim();
            const coincideNombre = nombreNorm.includes(terminoBusqueda);

            // Comparar fecha (null-safe, lowercase, trim)
            const fechaNorm = (reporte.fecha_clase ?? '').toLowerCase().trim();
            const coincideFecha = fechaNorm.includes(terminoBusqueda);

            return coincideNombre || coincideFecha;
        });

        setReportesFiltrados(resultados);
    };

    useEffect(() => {
        aplicarFiltro();
    }, [filtroTexto, records]);

    const loadGrupos = async () => {
        try {
            const data = await getGruposDocente();
            setGrupos(data);
            if (initialGrupoId) {
                setSelectedGrupo(initialGrupoId);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async () => {
        if (!selectedGrupo || !fechaInicio || !fechaFin) return;
        setLoading(true);
        try {
            const [data, mats] = await Promise.all([
                getAsistenciaGrupoRango(selectedGrupo, fechaInicio, fechaFin),
                getMatriculasGrupo(selectedGrupo),
            ]);
            console.log('[Reports] Data:', data?.length, 'records');
            console.log('[Reports] Matriculas:', mats?.length);
            setRecords(data);
            setReportesFiltrados(data);
            setMatriculas(mats);
            setLoaded(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

const exportExcel = async () => {
        if (reportesFiltrados.length === 0) return;

        const grupo = grupos.find(g => g.id === selectedGrupo);
        const fechaReporte = new Date().toLocaleString('es-NI', { 
            year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });

        let estadisticasRiesgo: any[] = [];
        try {
            const { data, error } = await supabase
                .from('vista_estadisticas_asistencia')
                .select('*')
                .eq('id_grupo', selectedGrupo);
                
            if (error) throw error;
            estadisticasRiesgo = data || [];
        } catch (e: any) {
            console.error('Error fetching statistics from view', e);
        }

        const porcentaje = totalRecords > 0 ? Math.round((presentes / totalRecords) * 100) : 0;

        // ==============================================
        // CREAR WORKBOOK CON EXCELJS
        // ==============================================
        const wb = new ExcelJS.Workbook();
        wb.creator = userName;
        wb.created = new Date();

        // ==============================================
        // HOJA 1: DASHBOARD EJECUTIVO
        // ==============================================
        const ws1 = wb.addWorksheet("1. Dashboard");
        
        // Estilos
        const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C63FF' }, bgColor: { argb: 'FF6C63FF' } };
        const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        const kpiFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' }, bgColor: { argb: 'FF1E3A8A' } };
        const kpiFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 };
        
        // KPI Title
        ws1.mergeCells('A1:D1');
        ws1.getCell('A1').value = `${orgName || 'INSTITUCIÓN'} - INFORME DE ASISTENCIA`;
        ws1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
        ws1.getCell('A1').alignment = { horizontal: 'center' };

        ws1.mergeCells('A2:D2');
        ws1.getCell('A2').value = `Asignatura: ${grupo?.nombre_asignatura} | Período: ${fechaInicio === fechaFin ? fechaInicio : fechaInicio + ' al ' + fechaFin}`;
        ws1.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };
        ws1.getCell('A2').alignment = { horizontal: 'center' };

        // KPIs Grid (A4:D7)
        const clasesImpartidas = Object.keys(reportesFiltrados.reduce((acc: Record<string, boolean>, r) => { 
            const key = r.fecha_clase || ''; 
            if (key) acc[key] = true; 
            return acc; 
        }, {})).length;
        
        const kpis = [
            ['Total Estudiantes', 'Clases Impartidas', '% Asistencia', '% Ausencias'],
            [matriculas.length, clasesImpartidas, `${porcentaje}%`, `${totalRecords > 0 ? Math.round((ausentes / totalRecords) * 100) : 0}%`]
        ];

        kpis[0].forEach((val, colIdx) => {
            const cell = ws1.getCell(4, colIdx + 1);
            cell.value = val;
            cell.fill = kpiFill;
            cell.font = kpiFont;
            cell.alignment = { horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        kpis[1].forEach((val, colIdx) => {
            const cell = ws1.getCell(5, colIdx + 1);
            cell.value = val;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' }, bgColor: { argb: 'FFF1F5F9' } };
            cell.font = { size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
            cell.alignment = { horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        // Estudiantes en Riesgo (Starting row 7)
        ws1.getCell('A7').value = 'ESTUDIANTES EN RIESGO';
        ws1.getCell('A7').font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };

        const riesgoHeaders = ['Estudiante', 'Carnet', 'Faltas Totales', '% Inasistencia', 'Nivel'];
        riesgoHeaders.forEach((val, colIdx) => {
            const cell = ws1.getCell(8, colIdx + 1);
            cell.value = val;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' }, bgColor: { argb: 'FF334155' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        let rowIdx = 9;
        if (estadisticasRiesgo.length > 0) {
            estadisticasRiesgo.forEach((est) => {
                if (est.total_sesiones >= 3) {
                    const pct = Math.round((est.faltas / est.total_sesiones) * 100);
                    let nivel = pct >= 50 ? 'ALTO' : pct >= 25 ? 'MEDIO' : 'BAJO';
                    let nivelColor = nivel === 'ALTO' ? 'FFDC2626' : nivel === 'MEDIO' ? 'FFF59E0A' : 'FF22C55E';
                    
                    // Estudiante
                    ws1.getCell(rowIdx, 1).value = est.nombre_completo || '';
                    ws1.getCell(rowIdx, 1).alignment = { horizontal: 'left' };
                    
                    // Carnet
                    ws1.getCell(rowIdx, 2).value = est.carnet || '';
                    ws1.getCell(rowIdx, 2).alignment = { horizontal: 'center' };
                    
                    // Faltas
                    ws1.getCell(rowIdx, 3).value = est.faltas;
                    ws1.getCell(rowIdx, 3).alignment = { horizontal: 'center' };
                    
                    // %
                    ws1.getCell(rowIdx, 4).value = `${pct}%`;
                    ws1.getCell(rowIdx, 4).alignment = { horizontal: 'center' };
                    
                    // Nivel con color
                    ws1.getCell(rowIdx, 5).value = nivel;
                    ws1.getCell(rowIdx, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: nivelColor }, bgColor: { argb: nivelColor } };
                    ws1.getCell(rowIdx, 5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    ws1.getCell(rowIdx, 5).alignment = { horizontal: 'center' };
                    ws1.getCell(rowIdx, 5).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                    
                    rowIdx++;
                }
            });
        }

        if (rowIdx === 9) {
            ws1.getCell('A9').value = 'No hay estudiantes en riesgo académico';
            ws1.getCell('A9').font = { italic: true, color: { argb: 'FF64748B' } };
        }

        // Column widths
        ws1.getColumn(1).width = 35;
        ws1.getColumn(2).width = 15;
        ws1.getColumn(3).width = 15;
        ws1.getColumn(4).width = 15;
        ws1.getColumn(5).width = 12;

        // ==============================================
        // HOJA 2: MATRIZ PIVOTEADA (PRIORIDAD MÁXIMA)
        // ==============================================
        const ws2 = wb.addWorksheet("2. Matriz de Control");

        // Obtener fechas únicas ordenadas
        const uniqueDatesSet = new Set(reportesFiltrados.map(r => r.fecha_clase || new Date(r.fecha_hora_escaneo).toLocaleDateString('es-CA')));
        const allDates = Array.from(uniqueDatesSet).sort().reverse();
        
        // Header: Estudiante + Fechas
        ws2.getCell(1, 1).value = 'Estudiante';
        ws2.getCell(1, 1).fill = headerFill;
        ws2.getCell(1, 1).font = headerFont;
        ws2.getCell(1, 1).alignment = { horizontal: 'center' };
        
        allDates.forEach((fecha, idx) => {
            const colNum = idx + 2;
            ws2.getCell(1, colNum).value = fecha;
            ws2.getCell(1, colNum).fill = headerFill;
            ws2.getCell(1, colNum).font = headerFont;
            ws2.getCell(1, colNum).alignment = { horizontal: 'center' };
            ws2.getColumn(colNum).width = 12;
        });

        // Construir matriz: estudiante -> fecha -> estado
        const studentDateMatrix: Record<string, Record<string, string>> = {};
        reportesFiltrados.forEach(r => {
            const studentName = r.estudiante?.nombre_completo || '';
            const fecha = r.fecha_clase || new Date(r.fecha_hora_escaneo).toLocaleDateString('es-CA');
            if (!studentDateMatrix[studentName]) studentDateMatrix[studentName] = {};
            studentDateMatrix[studentName][fecha] = r.estado;
        });

        // Obtener estudiantes únicos
        const estudiantes = [...new Set(reportesFiltrados.map(r => r.estudiante?.nombre_completo || ''))].sort();

        // Llenar matriz
        let dataRow = 2;
        estudiantes.forEach((estName) => {
            ws2.getCell(dataRow, 1).value = estName;
            ws2.getCell(dataRow, 1).alignment = { horizontal: 'left' };
            ws2.getCell(dataRow, 1).font = { size: 10 };
            
            allDates.forEach((fecha, idx) => {
                const colNum = idx + 2;
                const estado = studentDateMatrix[estName]?.[fecha] || '-';
                const cell = ws2.getCell(dataRow, colNum);
                
                cell.value = estado === 'presente' ? 'P' : estado === 'ausente' ? 'A' : estado === 'tarde' ? 'T' : '-';
                cell.alignment = { horizontal: 'center' };
                
                // Colores según estado
                if (estado === 'presente') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' }, bgColor: { argb: 'FF22C55E' } };
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                } else if (estado === 'ausente') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' }, bgColor: { argb: 'FFDC2626' } };
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                } else if (estado === 'tarde') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0A' }, bgColor: { argb: 'FFF59E0A' } };
                    cell.font = { bold: true, color: { argb: 'FF000000' } };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' }, bgColor: { argb: 'FFF1F5F9' } };
                }
            });
            
            dataRow++;
        });

        // Freeze panes (Columna A freeze)
        ws2.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
        
        ws2.getColumn(1).width = 35;

        // ==============================================
        // HOJA 3: BASE DE DATOS CRUDA
        // ==============================================
        const ws3 = wb.addWorksheet("3. Datos Crudos");

        const rawHeaders = ['N°', 'Estudiante', 'Carnet', 'Sexo', 'Municipio', 'Fecha', 'Hora', 'Estado'];
        rawHeaders.forEach((val, colIdx) => {
            const cell = ws3.getCell(1, colIdx + 1);
            cell.value = val;
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        reportesFiltrados.forEach((r, i) => {
            const rowNum = i + 2;
            ws3.getCell(rowNum, 1).value = i + 1;
            ws3.getCell(rowNum, 2).value = r.estudiante?.nombre_completo || '';
            ws3.getCell(rowNum, 3).value = r.estudiante?.carnet || '';
            ws3.getCell(rowNum, 4).value = r.estudiante?.sexo || '';
            ws3.getCell(rowNum, 5).value = r.estudiante?.municipio_procedencia || 'N/A';
            ws3.getCell(rowNum, 6).value = r.fecha_clase || new Date(r.fecha_hora_escaneo).toLocaleDateString('es-NI');
            ws3.getCell(rowNum, 7).value = new Date(r.fecha_hora_escaneo).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
            ws3.getCell(rowNum, 8).value = r.estado === 'presente' ? 'Presente' : r.estado === 'ausente' ? 'Ausente' : 'Tarde';
            
            // Color según estado
            if (r.estado === 'presente') {
                ws3.getCell(rowNum, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' }, bgColor: { argb: 'FF22C55E' } };
                ws3.getCell(rowNum, 8).font = { color: { argb: 'FFFFFFFF' } };
            } else if (r.estado === 'ausente') {
                ws3.getCell(rowNum, 8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' }, bgColor: { argb: 'FFDC2626' } };
                ws3.getCell(rowNum, 8).font = { color: { argb: 'FFFFFFFF' } };
            }
        });

        ws3.getColumn(1).width = 5;
        ws3.getColumn(2).width = 40;
        ws3.getColumn(3).width = 15;
        ws3.getColumn(4).width = 8;
        ws3.getColumn(5).width = 20;
        ws3.getColumn(6).width = 12;
        ws3.getColumn(7).width = 10;
        ws3.getColumn(8).width = 12;

        // ==============================================
        // EXPORTAR
        // ==============================================
        const fileName = `Asistencia_${grupo?.nombre_asignatura?.replace(/\s+/g, '_') || 'reporte'}_${fechaInicio}_${fechaFin}.xlsx`;

        try {
            const buffer = await wb.xlsx.writeBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            
            const canShare = await Share.canShare();
            if (canShare.value) {
                const writeResult = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache,
                });

                await Share.share({
                    title: 'Reporte de Asistencia',
                    text: `Informe de asistencia - ${orgName}`,
                    url: writeResult.uri,
                    dialogTitle: 'Compartir Reporte',
                });
            } else {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Error sharing Excel:', err);
            alert('Ocurrió un error al intentar compartir el reporte.');
        }
    };

    const compartirReporteTexto = () => {
        if (!selectedGrupo || reportesFiltrados.length === 0) return;

        const partesFecha = fechaInicio.split('-');
        const fechaFormateada = partesFecha.length === 3 
            ? `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0].slice(-2)}`
            : fechaInicio;

        const currentGrupo = grupos.find(g => g.id === selectedGrupo);

        const pAsistencia = totalRecords > 0 ? Math.round((presentes / totalRecords) * 100) : 0;
        const nivelRendimiento = pAsistencia >= 90 ? 'Excelente' : pAsistencia >= 75 ? 'Bueno' : pAsistencia >= 60 ? 'Regular' : 'Bajo';

        const text = `REGISTRO DE ASISTENCIA

Rendimiento: ${pAsistencia}% (${nivelRendimiento})
Fecha: ${fechaFormateada}
Modulo: ${currentGrupo?.nombre_asignatura || 'N/A'}
Sede/Aula: ${currentGrupo?.sede || 'N/A'} - ${currentGrupo?.aula || 'N/A'}
Grupo: ${currentGrupo?.codigo_grupo || 'N/A'}

DESGLOSE:
Mujeres Presentes: ${presentesF}
Varones Presentes: ${presentesH}
Total Presentes: ${presentes}
Ausentes: ${ausentes}
Tardanzas: ${tardes}

Docente: ${userName}

--
Sistema de Control de Asistencia - ${orgName || 'SENTINEL'}`;

        window.open('whatsapp://send?text=' + encodeURIComponent(text), '_system');
    };

    const dateGroups = reportesFiltrados.reduce((acc, r) => {
        if (!acc[r.fecha_clase]) acc[r.fecha_clase] = [];
        acc[r.fecha_clase].push(r);
        return acc;
    }, {} as Record<string, typeof reportesFiltrados>);

    return (
        <AnimatedPage className="app-layout">
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => initialGrupoId ? navigate(-1) : navigate('/')} aria-label="Volver">←</button>
                    <div style={{ flex: 1, marginLeft: 'var(--space-md)' }}>
                        <h1>Reportes</h1>
                        <p className="subtitle">Consulta y exporta asistencia</p>
                    </div>
                </div>
            </header>

            <main className="page">
                {/* Filters */}
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="report-clase">Clase</label>
                        <select
                            id="report-clase"
                            className="form-input"
                            value={selectedGrupo}
                            onChange={(e) => setSelectedGrupo(e.target.value)}
                        >
                            <option value="">Selecciona una clase</option>
                            {grupos.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.nombre_asignatura} {g.codigo_grupo ? `(${g.codigo_grupo})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="fecha-inicio">Desde</label>
                            <input
                                id="fecha-inicio"
                                className="form-input"
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="fecha-fin">Hasta</label>
                            <input
                                id="fecha-fin"
                                className="form-input"
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="filtro-texto">Filtro Rápido</label>
                        <input
                            id="filtro-texto"
                            className="form-input"
                            type="text"
                            placeholder="Buscar estudiante o fecha..."
                            value={filtroTexto}
                            onChange={(e) => setFiltroTexto(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleSearch}
                        disabled={!selectedGrupo || loading}
                    >
                        {loading ? (
                            <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Buscando...</>
                        ) : (
                            '🔍 Consultar'
                        )}
                    </button>
                </div>

                {loaded && (
                    <>
                        {/* Summary Stats with gender breakdown */}
                        <div className="stats-grid">
                            <div className="stat-card stat-total" style={{ borderBottom: '4px solid var(--color-text-secondary)', background: 'var(--color-bg)' }}>
                                <p className="stat-number">{matriculas.length}</p>
                                <p className="stat-label">Matriculados</p>
                            </div>
                            <div className="stat-card stat-present" style={{ borderBottom: '4px solid var(--color-success)', background: 'rgba(46,125,50,0.05)' }}>
                                <p className="stat-number" style={{ color: 'var(--color-success)' }}>{presentes}</p>
                                <p className="stat-label">Presencias</p>
                                {presentes > 0 && (
                                    <p style={{ fontSize: '10px', marginTop: 2, opacity: 0.8 }}>
                                        {presentesH > 0 && `${presentesH} H`}
                                        {presentesH > 0 && presentesF > 0 && ' / '}
                                        {presentesF > 0 && `${presentesF} M`}
                                        {(presentesH + presentesF) < presentes && ` + ${presentes - (presentesH + presentesF)}`}
                                    </p>
                                )}
                            </div>
                            <div className="stat-card stat-late" style={{ borderBottom: '4px solid #FBC02D', background: 'rgba(251,192,45,0.05)' }}>
                                <p className="stat-number" style={{ color: '#FBC02D' }}>{tardes}</p>
                                <p className="stat-label">Tardanzas</p>
                                {(tardesH > 0 || tardesF > 0) && (
                                    <p style={{ fontSize: '10px', marginTop: 2, opacity: 0.8 }}>{tardesH} H / {tardesF} M</p>
                                )}
                            </div>
                            <div className="stat-card stat-absent" style={{ borderBottom: '4px solid var(--color-error)', background: 'rgba(211,47,47,0.05)' }}>
                                <p className="stat-number" style={{ color: 'var(--color-error)' }}>{ausentes}</p>
                                <p className="stat-label">Ausencias</p>
                                {(ausentesH > 0 || ausentesF > 0) && (
                                    <p style={{ fontSize: '10px', marginTop: 2, opacity: 0.8 }}>{ausentesH} H / {ausentesF} M</p>
                                )}
                            </div>
                        </div>

                        {/* Rendimiento General Progress Bar */}
                        {totalRecords > 0 && (
                            <div style={{ marginBottom: 'var(--space-lg)', padding: '0 var(--space-xs)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 'var(--font-size-xs)' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Porcentaje general de asistencia</span>
                                    <span style={{ fontWeight: 600 }}>{Math.round((presentes / totalRecords) * 100)}%</span>
                                </div>
                                <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#e0e0e0' }}>
                                    <div style={{ width: `${(presentes / totalRecords) * 100}%`, background: 'var(--color-success)' }} />
                                    <div style={{ width: `${(tardes / totalRecords) * 100}%`, background: '#FBC02D' }} />
                                    <div style={{ width: `${(ausentes / totalRecords) * 100}%`, background: 'var(--color-error)' }} />
                                </div>
                            </div>
                        )}

                        {/* Export Buttons */}
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                            <button className="btn btn-secondary btn-sm" onClick={exportExcel} style={{ flex: 1 }}>
                                📊 Exportar Excel
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1 }}
                                onClick={compartirReporteTexto}
                            >
                                📤 Compartir
                            </button>
                        </div>

                        {/* Records by Date */}
                        {Object.keys(dateGroups).length === 0 ? (
                            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                                <img src={new URL('../assets/illustrations/empty-attendance.png', import.meta.url).href} alt="Sin registros" className="empty-state-img" />
                                <h3>Sin registros</h3>
                                <p>No se encontraron registros de asistencia en este rango</p>
                            </div>
                        ) : (
                            Object.entries(dateGroups)
                                .sort(([a], [b]) => b.localeCompare(a))
                                .map(([fecha, dayRecords]) => (
                                    <div key={fecha} style={{ marginBottom: 'var(--space-lg)' }}>
                                        <p className="section-title" style={{ marginTop: 0 }}>
                                            📅 {new Date(fecha + 'T12:00:00').toLocaleDateString('es-NI', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'short',
                                            })} ({dayRecords.length})
                                        </p>
                                        <AnimatedList>
                                            {dayRecords.map((r) => (
                                                <motion.li variants={itemVariant} key={r.id} className="list-item">
                                                    <div className="list-item-avatar" style={{
                                                        fontSize: 'var(--font-size-sm)',
                                                        background: r.estado === 'presente' ? 'rgba(46,125,50,0.1)' :
                                                            r.estado === 'tarde' ? 'rgba(251,192,45,0.15)' : 'rgba(211,47,47,0.1)',
                                                        color: r.estado === 'presente' ? 'var(--color-success)' :
                                                            r.estado === 'tarde' ? '#E65100' : 'var(--color-error)',
                                                    }}>
                                                        {r.estado === 'presente' ? '✅' : r.estado === 'tarde' ? '⚠️' : '❌'}
                                                    </div>
                                                    <div className="list-item-content">
                                                        <div className="list-item-name">
                                                            {r.estudiante?.nombre_completo}
                                                            {r.estudiante?.sexo && (
                                                                <span style={{ marginLeft: 5, fontSize: '11px', color: r.estudiante.sexo === 'M' ? '#1565C0' : '#880E4F' }}>
                                                                    {r.estudiante.sexo === 'M' ? '♂' : '♀'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="list-item-detail">
                                                            {new Date(r.fecha_hora_escaneo).toLocaleTimeString('es-NI', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </div>
                                                    </div>
                                                    <span className={`card-badge badge-${r.estado === 'presente' ? 'present' : r.estado === 'tarde' ? 'late' : 'absent'}`}>
                                                        {r.estado}
                                                    </span>
                                                </motion.li>
                                            ))}
                                        </AnimatedList>
                                    </div>
                                ))
                        )}
                    </>
                )}
            </main>
        </AnimatedPage>
    );
}
