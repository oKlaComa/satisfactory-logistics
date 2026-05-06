import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Switch,
  Tooltip,
} from '@mantine/core';
import { useInputState } from '@mantine/hooks';
import { IconCircleCheckFilled, IconTrash } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useStore } from '@/core/zustand';
import { useFactoryContext } from '@/FactoryContext';
import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type { MachineGroup } from '@/solver/store/Solver';
import { useSolverSolution } from '@/solver/layout/solution-context/SolverSolutionContext';
import type { IMachineNodeData } from './MachineNode';
import { MachineGroupsEditor } from './MachineGroupsEditor';
import { MachineNodeProductionConfig } from './MachineNodeProductionConfig';
import { calculateMachineNodeBuildings } from './postprocess/calculateMachineNodeBuildings';
import {
  SwitchRecipeAction,
  useRecipeAlternatesInputState,
} from './SwitchRecipeAction';
import { showConfettiWhenFactoryBuilt } from './showConfettiWhenFactoryBuilt';

export interface IMachineNodeActionsProps {
  id: string;
  data: IMachineNodeData;

  buildingsAmount: number;
  overclockValue: number | string;
  setOverclockValue: (value: number | string) => void;
}

export function MachineNodeActions(props: IMachineNodeActionsProps) {
  const { data, buildingsAmount, overclockValue, setOverclockValue } = props;
  const { recipe, value } = data;

  const solverId = useFactoryContext();
  const { solution } = useSolverSolution();

  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );

  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const slotsPerBuilding = building.somersloopSlots;
  const roundedBuildings = Math.ceil(buildingsAmount - 0.0001);

  const {
    recipes,
    allowedRecipes,
    setAllowedRecipes,
    changed: recipesChanged,
  } = useRecipeAlternatesInputState(data.recipe.id);

  const storedPerMachine = nodeState?.somersloops
    ? Math.min(nodeState.somersloops, slotsPerBuilding)
    : undefined;
  const [somersloopsValue, setSomersloopsValue] = useInputState(
    (storedPerMachine ?? '') as number | string,
  );

  const perMachineSomersloops = Number(somersloopsValue) || 0;
  const totalSomersloops = perMachineSomersloops * roundedBuildings;

  const hasStoredGroups =
    !!nodeState?.machineGroups && nodeState.machineGroups.length > 0;
  const [useGroups, setUseGroups] = useState(hasStoredGroups);
  const [groups, setGroups] = useState<MachineGroup[]>(() => {
    if (hasStoredGroups) return nodeState!.machineGroups!;
    const oc = nodeState?.overclock ?? 1;
    const sl = storedPerMachine ?? 0;
    return [{ count: roundedBuildings || 1, overclock: oc, somersloops: sl }];
  });

  const machineCalc = calculateMachineNodeBuildings(
    data,
    useGroups ? { ...nodeState, machineGroups: groups } : nodeState,
  );

  const isApplyDisabled = (() => {
    if (recipesChanged) return false;
    if (useGroups) {
      const stored = nodeState?.machineGroups;
      if (!stored && groups.length > 0) return false;
      if (stored && JSON.stringify(stored) !== JSON.stringify(groups))
        return false;
      return true;
    }
    if (perMachineSomersloops !== (storedPerMachine ?? 0)) return false;
    if (overclockValue !== nodeState?.overclock) return false;
    return true;
  })();

  const handleApply = () => {
    if (recipesChanged) {
      useStore
        .getState()
        .setAllowedRecipes(solverId!, all =>
          all
            ?.filter(id => !recipes.some(r => r.id === id))
            .concat(allowedRecipes),
        );
    }

    if (useGroups) {
      useStore.getState().updateSolverNode(solverId!, props.id, node => {
        node.machineGroups = groups;
        const totalOc =
          groups.reduce((s, g) => s + g.overclock * g.count, 0) /
          Math.max(groups.reduce((s, g) => s + g.count, 0), 1);
        node.overclock = totalOc || undefined;
        const totalSl = groups.reduce(
          (s, g) => s + g.somersloops * g.count,
          0,
        );
        const totalCount = groups.reduce((s, g) => s + g.count, 0);
        node.somersloops =
          totalCount > 0 ? Math.round(totalSl / totalCount) : undefined;
        node.somersloopsTotal = totalSl || undefined;
      });
    } else {
      if (perMachineSomersloops !== (storedPerMachine ?? 0)) {
        useStore
          .getState()
          .updateSolverSomersloops(
            solution.graph,
            solverId!,
            props.id,
            perMachineSomersloops,
            totalSomersloops,
          );
      }

      useStore.getState().updateSolverNode(solverId!, props.id, node => {
        node.somersloops = perMachineSomersloops || undefined;
        node.somersloopsTotal = totalSomersloops || undefined;
        node.overclock = overclockValue ? Number(overclockValue) : undefined;
        node.machineGroups = undefined;
      });
    }
  };

  const handleToggleGroups = useCallback(
    (checked: boolean) => {
      setUseGroups(checked);
      if (checked && groups.length === 0) {
        const oc = nodeState?.overclock ?? 1;
        const sl = storedPerMachine ?? 0;
        setGroups([
          { count: roundedBuildings || 1, overclock: oc, somersloops: sl },
        ]);
      }
    },
    [groups.length, nodeState?.overclock, storedPerMachine, roundedBuildings],
  );

  return (
    <Stack gap="sm" align="flex-start">
      <Group justify="space-between" w="100%">
        <Group gap="sm">
          <Tooltip label="Ignore this recipe">
            <ActionIcon
              data-tutorial-id="machine-action-ignore"
              color="red"
              variant="outline"
              onClick={() =>
                useStore.getState().toggleRecipe(solverId!, {
                  recipeId: recipe.id,
                  use: false,
                })
              }
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip
            label={
              nodeState?.done ? (
                <span>Remove built marker</span>
              ) : (
                <span>Mark as built</span>
              )
            }
          >
            <ActionIcon
              data-tutorial-id="machine-action-done"
              color="green"
              variant={nodeState?.done ? 'filled' : 'outline'}
              onClick={() => {
                useStore
                  .getState()
                  .updateSolverNode(solverId!, props.id, node => {
                    node.done = !node.done;
                  });
                showConfettiWhenFactoryBuilt(solution, solverId!);
              }}
            >
              <IconCircleCheckFilled size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Remove recipe and replace it with an Input of the same amount.">
            <ActionIcon
              color="blue"
              variant="outline"
              onClick={() =>
                useStore.getState().upsertFactoryInput(solverId!, {
                  resource: recipe.products[0].resource,
                  amount: value,
                })
              }
            >
              <FactoryInputIcon size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Button
          variant={isApplyDisabled ? 'default' : 'filled'}
          color="blue"
          size="xs"
          disabled={isApplyDisabled}
          onClick={handleApply}
        >
          Apply
        </Button>
      </Group>

      <Switch
        size="xs"
        label="Machine groups"
        checked={useGroups}
        onChange={e => handleToggleGroups(e.currentTarget.checked)}
      />

      {useGroups ? (
        <MachineGroupsEditor
          groups={groups}
          groupCalcs={machineCalc.groupCalcs}
          slotsPerBuilding={slotsPerBuilding}
          requiredProduction={machineCalc.requiredProduction}
          totalProduction={machineCalc.groupsTotalProduction}
          totalShards={machineCalc.groupsTotalShards}
          totalSomersloops={machineCalc.groupsTotalSomersloops}
          onChange={setGroups}
        />
      ) : (
        <MachineNodeProductionConfig
          id={props.id}
          buildingsAmount={buildingsAmount}
          machine={props.data}
          overclockValue={overclockValue}
          setOverclockValue={setOverclockValue}
          somersloopsValue={somersloopsValue}
          setSomersloopsValue={setSomersloopsValue}
        />
      )}

      <SwitchRecipeAction
        recipeId={recipe.id}
        recipes={recipes}
        allowedRecipes={allowedRecipes}
        setAllowedRecipes={setAllowedRecipes}
      />
    </Stack>
  );
}
