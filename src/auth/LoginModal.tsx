import {
  Alert,
  Button,
  Divider,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconCloudOff } from '@tabler/icons-react';
import { type FormEvent, type ReactNode, useCallback, useState } from 'react';
import { supabaseClient } from '@/core/supabase';
import { useIsOnline } from '@/pwa/useNetworkStatus';

export interface ILoginModalProps {
  opened: boolean;
  close: () => void;
  message?: ReactNode;
}

export function LoginModal(props: ILoginModalProps) {
  const { opened, close, message } = props;
  const isOnline = useIsOnline();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const { error: authError } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password,
          });
        if (authError) {
          setError(authError.message);
        } else {
          setEmail('');
          setPassword('');
          close();
        }
      } catch (err: any) {
        setError(err?.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [email, password, close],
  );

  return (
    <Modal size="sm" opened={opened} onClose={close} title="Authentication">
      {isOnline ? (
        <>
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.currentTarget.value)}
                required
                autoFocus
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.currentTarget.value)}
                required
              />
              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={loading} fullWidth>
                Log in
              </Button>
            </Stack>
          </form>
          <Divider mt="xl" mb="md" />
          <Text ta="center" size="sm" c="dark.2">
            {message ??
              'After login you can save your factories on the server, so you can access them from any device.'}
          </Text>
        </>
      ) : (
        <Alert
          color="yellow"
          icon={<IconCloudOff size={18} />}
          title="You're offline"
        >
          Sign in requires an internet connection. Reconnect and try again.
        </Alert>
      )}
    </Modal>
  );
}
