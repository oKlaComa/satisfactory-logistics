import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { getLayoutedElements } from '@/core/graph-layout/getLayoutedElements';
import { log } from '@/core/logger/log';
import '@xyflow/react/dist/style.css';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { InputEdge } from './edges/input-edge/InputEdge';
import { FactoryNode } from './nodes/factory-node/FactoryNode';

const logger = log.getLogger('factories:graph-layout');
logger.setLevel('info');

interface FactoriesGraphLayoutProps {
  nodes: Node[];
  edges: Edge[];
  hasSavedLayout?: boolean;
  children?: ReactNode;
}

const nodeTypes = {
  Factory: FactoryNode,
};

const edgeTypes = {
  Input: InputEdge,
};

export const FactoriesGraphLayout = (props: FactoriesGraphLayoutProps) => {
  const { fitView, getNodes, getEdges } = useReactFlow();
  const navigate = useNavigate();

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      navigate(`/factories/${node.id}`);
    },
    [navigate],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(props.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(props.edges);
  const [opacity, setOpacity] = useState(0);

  const nodesInitialized = useNodesInitialized();
  const [initialLayoutFinished, setInitialLayoutFinished] = useState(false);
  const [initialFitViewFinished, setInitialFitViewFinished] = useState(false);

  useEffect(() => {
    logger.debug('Initializing nodes...');
    setOpacity(0);

    setNodes([...props.nodes]);
    setEdges([...props.edges]);
    setInitialLayoutFinished(false);
    setInitialFitViewFinished(false);

    setTimeout(() => {}, 1);
  }, [props.edges, props.nodes, setEdges, setNodes]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const hasRealMeasurements =
      nodes[0]?.measured?.width && nodes[0]?.measured?.height;
    logger.debug(
      `Check for re-layout: nodesInitialized=${nodesInitialized}, initialLayoutFinished=${initialLayoutFinished} hasRealMeasurements=${hasRealMeasurements}`,
    );

    if (nodesInitialized && hasRealMeasurements && !initialLayoutFinished) {
      if (props.hasSavedLayout) {
        logger.info('Using saved layout');
      } else {
        logger.info('-> Layouting (initial layout in progress)');
        const layouted = getLayoutedElements(getNodes(), getEdges());
        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);
      }
      setInitialLayoutFinished(true);
    }

    if (nodesInitialized && initialLayoutFinished && !initialFitViewFinished) {
      logger.debug('-> Fitting view...');
      setInitialFitViewFinished(true);
      fitView().then(() => {
        setOpacity(1);
        logger.debug('-> Fitting view completed');
      });
    }
  }, [nodesInitialized, initialLayoutFinished, initialFitViewFinished]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      const hasPositionChange = changes.some(
        c => c.type === 'position' && !c.dragging && c.position,
      );
      if (!hasPositionChange) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const gameId = useStore.getState().games.selected;
        if (!gameId) return;
        const currentNodes = getNodes();
        const layout: Record<string, { x: number; y: number }> = {};
        for (const node of currentNodes) {
          layout[node.id] = {
            x: node.position.x,
            y: node.position.y,
          };
        }
        useStore.getState().setChartGraphLayout(gameId, layout);
        logger.debug('Saved chart layout (%d nodes)', currentNodes.length);
      }, 300);
    },
    [onNodesChange, getNodes],
  );

  const ref = useRef<HTMLDivElement>(null);

  return (
    <ReactFlow
      data-tutorial-id="charts-graph"
      ref={ref}
      minZoom={0.2}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDoubleClick={onNodeDoubleClick}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
      snapToGrid
      colorMode="dark"
      proOptions={{
        hideAttribution: true,
      }}
      snapGrid={[10, 10]}
    >
      <Controls showFitView />
      <MiniMap pannable={true} nodeStrokeWidth={3} />

      <svg>
        <defs>
          <linearGradient id="edge-gradient">
            <stop offset="0%" stopColor="var(--mantine-color-gray-7)" />
            <stop offset="100%" stopColor="var(--mantine-color-gray-4)" />
          </linearGradient>
          <linearGradient id="edge-gradient-reverse">
            <stop offset="0%" stopColor="var(--mantine-color-gray-4)" />
            <stop offset="100%" stopColor="var(--mantine-color-gray-7)" />
          </linearGradient>

          <marker
            id="edge-circle"
            viewBox="-5 -5 10 10"
            refX="0"
            refY="0"
            markerUnits="strokeWidth"
            markerWidth="10"
            markerHeight="10"
            orient="auto"
          >
            <circle stroke="#2a8af6" strokeOpacity="0.75" r="2" cx="0" cy="0" />
          </marker>
        </defs>
      </svg>
      <Background
        bgColor="var(--mantine-color-dark-7)"
        color="var(--mantine-color-dark-4)"
        variant={BackgroundVariant.Dots}
        gap={[10, 10]}
      />
      {props.children}
    </ReactFlow>
  );
};
