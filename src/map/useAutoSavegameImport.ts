import { useEffect, useRef } from 'react';
import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import { startSavegameParsing } from '@/recipes/savegame/startSavegameParsing';

const logger = loglev.getLogger('map:auto-savegame');
const SAVE_URL = '/saves/latest.sav';
let lastImportedEtag: string | null = null;

export function useAutoSavegameImport(
  gameId: string | null | undefined,
): void {
  const isRunning = useRef(false);

  useEffect(() => {
    if (!gameId || isRunning.current) return;

    let cancelled = false;
    isRunning.current = true;

    (async () => {
      try {
        const head = await fetch(SAVE_URL, { method: 'HEAD' });
        if (!head.ok) {
          logger.info('No save file available');
          return;
        }

        const etag =
          head.headers.get('etag') ?? head.headers.get('last-modified');
        if (etag && etag === lastImportedEtag) {
          logger.debug('Save unchanged, skipping import');
          return;
        }

        if (cancelled) return;

        logger.info('Fetching latest save...');
        const resp = await fetch(SAVE_URL);
        if (!resp.ok || cancelled) return;

        const blob = await resp.blob();
        const file = new File([blob], 'latest.sav');

        logger.info('Parsing save (%d KB)...', Math.round(blob.size / 1024));
        const save = await startSavegameParsing(file, undefined, {
          extractInfrastructure: true,
        });

        if (cancelled) return;

        useStore
          .getState()
          .updateGameFromSavegame(gameId, save, {
            usedNodes: true,
            infrastructure: true,
          });

        if (save.infrastructure) {
          useStore.getState().setInfrastructure(gameId, save.infrastructure);
        }
        if (save.players) {
          useStore.getState().setPlayers(gameId, save.players);
        }

        lastImportedEtag = etag;
        logger.info(
          'Auto-imported save: %d nodes, %d structures',
          save.usedNodeIds.length,
          save.infrastructure
            ? save.infrastructure.buildings.count +
                save.infrastructure.splines.reduce((s, b) => s + b.count, 0)
            : 0,
        );
      } catch (err) {
        logger.warn('Auto-import failed', err);
      } finally {
        isRunning.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);
}
