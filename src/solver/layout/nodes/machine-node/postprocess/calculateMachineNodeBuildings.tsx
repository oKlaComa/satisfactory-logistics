import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { getRecipeProductPerBuilding } from '@/recipes/FactoryRecipe';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import type { MachineGroup, SolverNodeState } from '@/solver/store/Solver';

function calculatePowerShards(overclock: number): number {
  return overclock > 1 ? Math.ceil((overclock - 1) * 2) : 0;
}

export interface MachineGroupCalc {
  count: number;
  overclock: number;
  somersloops: number;
  amplifiedRate: number;
  production: number;
  power: number;
  powerShards: number;
  totalSomersloops: number;
}

export function calculateMachineNodeBuildings(
  data: IMachineNodeData,
  nodeState: SolverNodeState | null | undefined,
) {
  const { recipe, value, originalValue, amplifiedValue } = data;

  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);

  // somersloops is per-machine (0..slots). Clamp for backward compat
  // with old saves where the value was a total.
  const somersloops = nodeState?.somersloops
    ? Math.min(nodeState.somersloops, building.somersloopSlots)
    : 0;

  // State-based values
  const overclock = nodeState?.overclock ?? 1;

  // Compute amplifiedRate using the same formula as the LP solver:
  // sloopRatio = min(somersloops / slots, 1)
  const sloopRatio =
    building.somersloopSlots > 0 && somersloops > 0
      ? Math.min(somersloops / building.somersloopSlots, 1)
      : 0;
  const amplifiedRate = 1 + sloopRatio;
  const buildingsAmount = value / perBuilding / overclock / amplifiedRate;

  const fullBuildingsAmount = Math.floor(buildingsAmount);
  const remainder = buildingsAmount - fullBuildingsAmount;
  const partialBuildingAmount = remainder > 0.0001 ? Math.ceil(remainder) : 0;
  const partialBuildingOverclock = remainder * overclock;

  const roundedBuildingsAmount = fullBuildingsAmount + partialBuildingAmount;

  // somersloops is already per-machine
  const somersloopsPerMachine = somersloops;
  // All buildings are boosted when somersloops > 0 (uniform distribution)
  const boostedBuildings = somersloops > 0 ? roundedBuildingsAmount : 0;
  const normalBuildings = roundedBuildingsAmount - boostedBuildings;
  const normalPower =
    normalBuildings *
    building.powerConsumption *
    overclock ** building.powerConsumptionExponent;
  const boostedPower =
    boostedBuildings *
    building.powerConsumption *
    overclock ** building.somersloopPowerConsumptionExponent;
  const totalPower = normalPower + boostedPower;

  const powerShardsPerMachine = calculatePowerShards(overclock);
  const partialBuildingPowerShards = calculatePowerShards(
    partialBuildingOverclock,
  );
  const totalPowerShards =
    powerShardsPerMachine * fullBuildingsAmount +
    partialBuildingPowerShards * partialBuildingAmount;

  // Machine groups calculation
  let groupCalcs: MachineGroupCalc[] | undefined;
  let groupsTotalProduction = 0;
  let groupsTotalPower = 0;
  let groupsTotalShards = 0;
  let groupsTotalSomersloops = 0;

  if (nodeState?.machineGroups && nodeState.machineGroups.length > 0) {
    groupCalcs = nodeState.machineGroups.map(group => {
      const gSloopRatio =
        building.somersloopSlots > 0 && group.somersloops > 0
          ? Math.min(group.somersloops / building.somersloopSlots, 1)
          : 0;
      const gAmplifiedRate = 1 + gSloopRatio;
      const gProduction =
        group.count * perBuilding * group.overclock * gAmplifiedRate;
      const gShards = calculatePowerShards(group.overclock) * group.count;
      const gBoosted = group.somersloops > 0 ? group.count : 0;
      const gNormal = group.count - gBoosted;
      const gPower =
        gNormal *
          building.powerConsumption *
          group.overclock ** building.powerConsumptionExponent +
        gBoosted *
          building.powerConsumption *
          group.overclock ** building.somersloopPowerConsumptionExponent;

      return {
        count: group.count,
        overclock: group.overclock,
        somersloops: group.somersloops,
        amplifiedRate: gAmplifiedRate,
        production: gProduction,
        power: gPower,
        powerShards: gShards,
        totalSomersloops: group.somersloops * group.count,
      };
    });

    groupsTotalProduction = groupCalcs.reduce((s, g) => s + g.production, 0);
    groupsTotalPower = groupCalcs.reduce((s, g) => s + g.power, 0);
    groupsTotalShards = groupCalcs.reduce((s, g) => s + g.powerShards, 0);
    groupsTotalSomersloops = groupCalcs.reduce(
      (s, g) => s + g.totalSomersloops,
      0,
    );
  }

  return {
    overclock,
    somersloops,
    somersloopsPerMachine,
    buildingsAmount,
    amplifiedRate,
    perBuilding,
    building,
    product,
    data,
    roundedBuildingsAmount,
    fullBuildingsAmount,
    partialBuildingAmount,
    partialBuildingOverclock,
    totalPower,
    boostedBuildings,
    powerShardsPerMachine,
    partialBuildingPowerShards,
    totalPowerShards,
    groupCalcs,
    groupsTotalProduction,
    groupsTotalPower,
    groupsTotalShards,
    groupsTotalSomersloops,
    requiredProduction: value,
  };
}
