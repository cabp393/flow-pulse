import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Layout } from '../models/domain';

const cloneLayout = (layout: Layout): Layout => structuredClone(layout);

export interface LayoutDraftState {
  draft?: Layout;
  isDirty: boolean;
  resetToSaved: () => void;
  discardChanges: () => void;
  commitDraft: () => Layout | undefined;
  updateDraft: (updater: (layout: Layout) => Layout) => void;
}

export const useLayoutDraft = (savedLayout?: Layout): LayoutDraftState => {
  const [draft, setDraft] = useState<Layout | undefined>(() => (savedLayout ? cloneLayout(savedLayout) : undefined));
  const [baseLayout, setBaseLayout] = useState<Layout | undefined>(() => (savedLayout ? cloneLayout(savedLayout) : undefined));

  useEffect(() => {
    if (!savedLayout) {
      setDraft(undefined);
      setBaseLayout(undefined);
      return;
    }
    setDraft(cloneLayout(savedLayout));
    setBaseLayout(cloneLayout(savedLayout));
  }, [savedLayout?.layoutId]);

  const isDirty = useMemo(() => {
    if (!draft || !baseLayout) return false;
    return JSON.stringify(draft) !== JSON.stringify(baseLayout);
  }, [baseLayout, draft]);

  const resetToSaved = useCallback(() => {
    if (!savedLayout) return;
    const cloned = cloneLayout(savedLayout);
    setDraft(cloned);
    setBaseLayout(cloned);
  }, [savedLayout]);

  const discardChanges = useCallback(() => {
    if (!baseLayout) return;
    setDraft(cloneLayout(baseLayout));
  }, [baseLayout]);

  const commitDraft = useCallback(() => {
    if (!draft) return undefined;
    const committed = cloneLayout(draft);
    setBaseLayout(committed);
    return committed;
  }, [draft]);

  const updateDraft = useCallback((updater: (layout: Layout) => Layout) => {
    setDraft((current) => {
      if (!current) return current;
      return updater(cloneLayout(current));
    });
  }, []);

  return {
    draft,
    isDirty,
    resetToSaved,
    discardChanges,
    commitDraft,
    updateDraft,
  };
};
