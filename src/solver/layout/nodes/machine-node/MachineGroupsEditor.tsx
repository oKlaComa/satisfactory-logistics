import {
  ActionIcon,
  Badge,
  Button,
  Group,
  NumberInput,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useCallback } from 'react';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import type { MachineGroup } from '@/solver/store/Solver';
import type { MachineGroupCalc } from './postprocess/calculateMachineNodeBuildings';
import { roundOverclock } from './roundOverclock';

export interface MachineGroupsEditorProps {
  groups: MachineGroup[];
  groupCalcs: MachineGroupCalc[] | undefined;
  slotsPerBuilding: number;
  requiredProduction: number;
  totalProduction: number;
  totalShards: number;
  totalSomersloops: number;
  onChange: (groups: MachineGroup[]) => void;
}

export function MachineGroupsEditor(props: MachineGroupsEditorProps) {
  const {
    groups,
    groupCalcs,
    slotsPerBuilding,
    requiredProduction,
    totalProduction,
    totalShards,
    totalSomersloops,
    onChange,
  } = props;

  const updateGroup = useCallback(
    (index: number, patch: Partial<MachineGroup>) => {
      const next = groups.map((g, i) => (i === index ? { ...g, ...patch } : g));
      onChange(next);
    },
    [groups, onChange],
  );

  const addGroup = useCallback(() => {
    onChange([...groups, { count: 1, overclock: 1, somersloops: 0 }]);
  }, [groups, onChange]);

  const removeGroup = useCallback(
    (index: number) => {
      onChange(groups.filter((_, i) => i !== index));
    },
    [groups, onChange],
  );

  const surplus = totalProduction - requiredProduction;
  const isSufficient = surplus >= -0.01;
  const totalMachines = groups.reduce((s, g) => s + g.count, 0);

  return (
    <Stack gap="xs">
      <Table
        withColumnBorders
        horizontalSpacing={6}
        verticalSpacing={4}
        fz="xs"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={50} ta="center">
              #
            </Table.Th>
            <Table.Th w={70} ta="center">
              <Group gap={2} justify="center">
                <FactoryItemImage
                  size={12}
                  id={'Desc_CrystalShard_C' as FactoryItemId}
                />
                OC%
              </Group>
            </Table.Th>
            <Table.Th w={50} ta="center">
              <FactoryItemImage
                size={12}
                id={'Desc_WAT1_C' as FactoryItemId}
              />
            </Table.Th>
            <Table.Th w={70} ta="center">
              /min
            </Table.Th>
            <Table.Th w={30} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {groups.map((group, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <NumberInput
                  size="xs"
                  value={group.count}
                  onChange={v => updateGroup(i, { count: Number(v) || 1 })}
                  min={1}
                  max={999}
                  hideControls
                  styles={{ input: { textAlign: 'center', padding: '2px 4px' } }}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  size="xs"
                  value={Math.round(group.overclock * 100 * 10000) / 10000}
                  onValueChange={({ floatValue }) =>
                    updateGroup(i, {
                      overclock:
                        floatValue == null
                          ? 1
                          : roundOverclock(floatValue / 100),
                    })
                  }
                  suffix="%"
                  min={1}
                  max={250}
                  hideControls
                  styles={{ input: { textAlign: 'center', padding: '2px 4px' } }}
                />
              </Table.Td>
              <Table.Td>
                {slotsPerBuilding > 0 ? (
                  <NumberInput
                    size="xs"
                    value={group.somersloops}
                    onChange={v => updateGroup(i, { somersloops: Number(v) || 0 })}
                    min={0}
                    max={slotsPerBuilding}
                    hideControls
                    styles={{
                      input: { textAlign: 'center', padding: '2px 4px' },
                    }}
                  />
                ) : (
                  <Text size="xs" ta="center" c="dimmed">
                    -
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="xs" ta="center">
                  {groupCalcs?.[i] ? (
                    <RepeatingNumber value={groupCalcs[i].production} />
                  ) : (
                    '-'
                  )}
                </Text>
              </Table.Td>
              <Table.Td>
                {groups.length > 1 && (
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => removeGroup(i)}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="space-between" align="center">
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={<IconPlus size={12} />}
          onClick={addGroup}
        >
          Add group
        </Button>
        <Group gap="xs">
          {totalShards > 0 && (
            <Tooltip label="Total power shards">
              <Badge size="sm" variant="light" color="orange" leftSection={
                <FactoryItemImage
                  size={10}
                  id={'Desc_CrystalShard_C' as FactoryItemId}
                />
              }>
                {totalShards}
              </Badge>
            </Tooltip>
          )}
          {totalSomersloops > 0 && (
            <Tooltip label="Total somersloops">
              <Badge size="sm" variant="light" color="grape" leftSection={
                <FactoryItemImage
                  size={10}
                  id={'Desc_WAT1_C' as FactoryItemId}
                />
              }>
                {totalSomersloops}
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Group>

      <Group gap={4} justify="space-between">
        <Text size="xs" c="dimmed">
          {totalMachines} machine{totalMachines !== 1 ? 's' : ''}
        </Text>
        <Text size="xs" fw="bold" c={isSufficient ? 'green' : 'red'}>
          <RepeatingNumber value={totalProduction} />/min
          {!isSufficient && (
            <Text span c="red" size="xs">
              {' '}
              (need <RepeatingNumber value={requiredProduction} />)
            </Text>
          )}
        </Text>
      </Group>
    </Stack>
  );
}
