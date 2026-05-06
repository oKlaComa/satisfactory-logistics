import type { Edge, Node } from '@xyflow/react';
import { max } from 'lodash';
import { useMemo } from 'react';
import { useStore } from '@/core/zustand';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import type { IInputEdgeData } from './edges/input-edge/InputEdge';
import type { IFactoryNodeData } from './nodes/factory-node/FactoryNode';

export function useFactoriesGraph() {
  const factories = useGameFactories();
  const gameId = useStore(state => state.games.selected);
  const savedLayout = useStore(
    state => state.charts.graphLayouts?.[gameId ?? ''],
  );

  return useMemo(() => {
    const nodes: Node<IFactoryNodeData>[] = [];
    const edges: Edge<IInputEdgeData>[] = [];

    const disabledIds = new Set(
      factories.filter(f => f?.progress === 'disabled').map(f => f!.id),
    );

    const maxInputAmount =
      max(
        factories
          .filter(f => f && f.progress !== 'disabled')
          .flatMap(
            factory => factory?.inputs?.map(input => input.amount ?? 0) ?? [],
          ),
      ) ?? 1;

    const hasSavedLayout =
      savedLayout && Object.keys(savedLayout).length > 0;

    for (const factory of factories) {
      if (!factory || factory.progress === 'disabled') continue;

      const savedPos = savedLayout?.[factory.id];
      nodes.push({
        id: factory.id,
        type: 'Factory',
        position: savedPos ?? { x: 0, y: 0 },
        data: {
          label: factory.name ?? 'Factory',
          factory,
        },
      });

      const inputs = factory.inputs ?? [];

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        if (!input.factoryId) continue;
        if (disabledIds.has(input.factoryId)) continue;

        edges.push({
          id: `${factory.id}-i${i}`,
          source: input.factoryId,
          target: factory.id,
          type: 'Input',
          data: {
            input,
            scaledValue: (input.amount ?? 0) / maxInputAmount,
          },
        });
      }
    }

    return { nodes, edges, hasSavedLayout: !!hasSavedLayout };
  }, [factories, savedLayout]);
}
