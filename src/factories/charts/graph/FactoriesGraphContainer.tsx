import { ReactFlowProvider } from '@xyflow/react';
import { FactoriesGraphLayout } from './FactoriesGraphLayout';
import { useFactoriesGraph } from './useFactoriesGraph';

export interface IFactoriesGraphContainer {}

export function FactoriesGraphContainer(props: IFactoriesGraphContainer) {
  const { nodes, edges, hasSavedLayout } = useFactoriesGraph();
  return (
    <ReactFlowProvider>
      <FactoriesGraphLayout nodes={nodes} edges={edges} hasSavedLayout={hasSavedLayout}></FactoriesGraphLayout>
    </ReactFlowProvider>
  );
}
