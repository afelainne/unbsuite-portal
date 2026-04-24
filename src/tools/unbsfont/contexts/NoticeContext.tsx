import React, { createContext, useContext } from 'react';

export type NoticeVariant = 'info' | 'success' | 'warning' | 'error';

interface NoticeContextValue {
    pushNotice: (message: string, variant?: NoticeVariant) => void;
}

const noop = () => undefined;

export const NoticeContext = createContext<NoticeContextValue>({
    pushNotice: noop,
});

export const useNotice = (): NoticeContextValue => useContext(NoticeContext);
