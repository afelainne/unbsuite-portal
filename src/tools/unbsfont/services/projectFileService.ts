import { FontMetadata, GlyphData } from '../types';

export interface ProjectFilePayload {
    version: number;
    exportedAt: string;
    metadata: FontMetadata;
    styleMap: Record<string, GlyphData[]>;
    currentStyle: string;
    glyphCount: number;
}

export const PROJECT_FILE_EXTENSION = '.unbsfo';
const PROJECT_FILE_MIME = 'application/json';
const PROJECT_FILE_VERSION = 1;

type StyleMap = Record<string, GlyphData[]>;

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const sanitizeFilename = (name: string): string => {
    const cleaned = name.replace(/[<>:"/\\|?*]/g, '').trim();
    return cleaned.length === 0 ? 'font-project' : cleaned.replace(/\s+/g, '-');
};

const createBlobFromPayload = (payload: ProjectFilePayload) => {
    const json = JSON.stringify(payload, null, 2);
    return new Blob([json], { type: PROJECT_FILE_MIME });
};

export const buildProjectFilePayload = (
    metadata: FontMetadata,
    styleMap: StyleMap,
    currentStyle: string
): ProjectFilePayload => {
    const safeStyleMap = deepClone(styleMap);
    const glyphCount = Object.values(safeStyleMap).reduce((total, glyphList) => {
        return total + glyphList.filter(g => g.pathData && g.pathData.length > 0).length;
    }, 0);

    return {
        version: PROJECT_FILE_VERSION,
        exportedAt: new Date().toISOString(),
        metadata: deepClone(metadata),
        styleMap: safeStyleMap,
        currentStyle,
        glyphCount
    };
};

export const downloadProjectFile = (payload: ProjectFilePayload, fileName?: string) => {
    const blob = createBlobFromPayload(payload);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const normalizedName = sanitizeFilename(fileName || 'font-project');
    link.href = url;
    link.download = normalizedName.endsWith(PROJECT_FILE_EXTENSION)
        ? normalizedName
        : `${normalizedName}${PROJECT_FILE_EXTENSION}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const isValidStyleMap = (value: unknown): value is StyleMap => {
    if (!value || typeof value !== 'object') return false;
    return Object.values(value).every(list => Array.isArray(list));
};

export const parseProjectFile = async (file: File): Promise<ProjectFilePayload> => {
    const text = await file.text();
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch (err) {
        throw new Error('Invalid file: JSON could not be read.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid file: base structure not recognized.');
    }

    const payload = parsed as Partial<ProjectFilePayload>;
    if (!payload.metadata || !payload.styleMap || typeof payload.currentStyle !== 'string') {
        throw new Error('Invalid file: metadata, styles or current style missing.');
    }

    if (!isValidStyleMap(payload.styleMap)) {
        throw new Error('Invalid file: style map corrupted.');
    }

    return {
        version: typeof payload.version === 'number' ? payload.version : PROJECT_FILE_VERSION,
        exportedAt: payload.exportedAt || new Date().toISOString(),
        metadata: payload.metadata,
        styleMap: payload.styleMap,
        currentStyle: payload.currentStyle,
        glyphCount: typeof payload.glyphCount === 'number'
            ? payload.glyphCount
            : Object.values(payload.styleMap).reduce((total, glyphList) => {
                return total + glyphList.filter(g => g.pathData && g.pathData.length > 0).length;
            }, 0)
    };
};
